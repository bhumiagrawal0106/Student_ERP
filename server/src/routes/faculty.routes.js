import express from 'express';
import { get, query, run } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['faculty', 'hod', 'admin']));

// Helper to get faculty employee_id
const getFacultyId = (req) => {
  if (req.faculty) return req.faculty.employee_id;
  if (req.query.employee_id && req.user.role === 'admin') return req.query.employee_id;
  const f = get('SELECT employee_id FROM faculty WHERE user_id = ?', [req.user.id]);
  return f ? f.employee_id : null;
};

// GET /api/faculty/dashboard
router.get('/dashboard', (req, res) => {
  const facId = getFacultyId(req);
  if (!facId) return res.status(404).json({ message: 'Faculty profile not found.' });

  const faculty = get('SELECT * FROM faculty WHERE employee_id = ?', [facId]);

  // Allocated subjects and sections
  const allocations = query(
    `SELECT a.*, s.name as subject_name, s.semester, s.branch, s.credits
     FROM faculty_subject_allocations a
     JOIN subjects s ON a.subject_code = s.code
     WHERE a.faculty_id = ?`,
    [facId]
  );

  // Mentor assignments (sections where this faculty is primary or secondary mentor)
  const mentorAssignments = query(
    `SELECT cm.*, 
            f1.name as primary_mentor_name, 
            f2.name as secondary_mentor_name
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     WHERE cm.primary_mentor_id = ? OR cm.secondary_mentor_id = ?`,
    [facId, facId]
  );

  // Pending leave requests for mentored sections
  let pendingLeaves = [];
  if (mentorAssignments.length > 0) {
    const sectionConditions = mentorAssignments
      .map(m => `(s.branch = '${m.branch}' AND s.current_semester = ${m.semester} AND s.section = '${m.section}')`)
      .join(' OR ');

    pendingLeaves = query(
      `SELECT l.*, s.name as student_name, s.branch, s.current_semester, s.section
       FROM leave_applications l
       JOIN students s ON l.student_roll_no = s.roll_number
       WHERE (${sectionConditions}) AND l.status = 'Pending'
       ORDER BY l.applied_on DESC`
    );
  }

  // Today's attendance marked count
  const today = new Date().toISOString().split('T')[0];
  const attendanceMarkedToday = get(
    `SELECT count(DISTINCT student_roll_no || '-' || period_number) as count FROM attendance WHERE marked_by = ? AND date = ?`,
    [facId, today]
  );

  res.json({
    faculty,
    allocations,
    mentorAssignments,
    pendingLeaves,
    todayStats: {
      attendanceMarkedToday: attendanceMarkedToday ? attendanceMarkedToday.count : 0,
      today
    }
  });
});

// GET /api/faculty/allocated-classes
router.get('/allocated-classes', (req, res) => {
  const facId = getFacultyId(req);
  const allocations = query(
    `SELECT a.*, s.name as subject_name, s.semester, s.branch, s.credits
     FROM faculty_subject_allocations a
     JOIN subjects s ON a.subject_code = s.code
     WHERE a.faculty_id = ?`,
    [facId]
  );
  res.json({ allocations });
});

// GET /api/faculty/students-by-section
router.get('/students-by-section', (req, res) => {
  const { branch, semester, section } = req.query;
  if (!branch || !semester || !section) {
    return res.status(400).json({ message: 'branch, semester, and section are required.' });
  }

  const students = query(
    `SELECT roll_number, name, erp_id, mobile_number, college_email, status
     FROM students
     WHERE branch = ? AND current_semester = ? AND section = ? AND status = 'active'
     ORDER BY roll_number ASC`,
    [branch, Number(semester), section]
  );

  res.json({ students });
});

// GET /api/faculty/attendance
router.get('/attendance', (req, res) => {
  const { date, periodNumber, subjectCode, branch, semester, section } = req.query;

  if (!date || !periodNumber || !subjectCode) {
    return res.status(400).json({ message: 'date, periodNumber, and subjectCode are required.' });
  }

  // Get enrolled students
  let students = [];
  if (branch && semester && section) {
    students = query(
      `SELECT roll_number, name, erp_id
       FROM students
       WHERE branch = ? AND current_semester = ? AND section = ? AND status = 'active'
       ORDER BY roll_number ASC`,
      [branch, Number(semester), section]
    );
  } else {
    // Infer from subject code semester
    const subj = get('SELECT semester, branch FROM subjects WHERE code = ?', [subjectCode]);
    if (subj) {
      students = query(
        `SELECT roll_number, name, erp_id
         FROM students
         WHERE branch = ? AND current_semester = ? AND status = 'active'
         ORDER BY roll_number ASC`,
        [subj.branch, subj.semester]
      );
    }
  }

  // Fetch existing attendance records for this period
  const records = query(
    'SELECT * FROM attendance WHERE date = ? AND period_number = ? AND subject_code = ?',
    [date, Number(periodNumber), subjectCode]
  );

  const recordMap = {};
  records.forEach(r => {
    recordMap[r.student_roll_no] = r.status;
  });

  res.json({
    date,
    periodNumber: Number(periodNumber),
    subjectCode,
    students,
    records: recordMap
  });
});

// POST /api/faculty/attendance (Mark or update attendance for 1 or more students in a period)
router.post('/attendance', (req, res) => {
  const facId = getFacultyId(req);
  const { date, periodNumber, subjectCode, attendanceList } = req.body;

  if (!date || !periodNumber || !subjectCode || !Array.isArray(attendanceList)) {
    return res.status(400).json({ message: 'date, periodNumber, subjectCode, and attendanceList are required.' });
  }

  const pNum = Number(periodNumber);
  if (pNum < 1 || pNum > 8) {
    return res.status(400).json({ message: 'Period number must be between 1 and 8.' });
  }

  for (const item of attendanceList) {
    const { rollNumber, status } = item;
    if (!rollNumber || !status) continue;
    if (!['Present', 'Absent', 'Extra'].includes(status)) continue;

    run(
      `INSERT INTO attendance (student_roll_no, date, period_number, subject_code, status, marked_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_roll_no, date, period_number)
       DO UPDATE SET status = excluded.status, subject_code = excluded.subject_code, marked_by = excluded.marked_by`,
      [rollNumber, date, pNum, subjectCode, status, facId]
    );
  }

  res.json({
    message: `Attendance for Period ${pNum} successfully saved for ${attendanceList.length} students!`
  });
});

// GET /api/faculty/marks
router.get('/marks', (req, res) => {
  const { subjectCode, branch, semester, section } = req.query;
  if (!subjectCode) {
    return res.status(400).json({ message: 'subjectCode is required.' });
  }

  const subj = get('SELECT * FROM subjects WHERE code = ?', [subjectCode]);
  if (!subj) return res.status(404).json({ message: 'Subject not found.' });

  const students = query(
    `SELECT roll_number, name, erp_id
     FROM students
     WHERE branch = ? AND current_semester = ? AND (section = ? OR ? IS NULL) AND status = 'active'
     ORDER BY roll_number ASC`,
    [branch || subj.branch, semester || subj.semester, section || null, section || null]
  );

  const marks = query(
    'SELECT * FROM sessional_marks WHERE subject_code = ? AND semester = ?',
    [subjectCode, semester || subj.semester]
  );

  // Map marks by roll number and exam type
  const marksMap = {};
  marks.forEach(m => {
    if (!marksMap[m.student_roll_no]) marksMap[m.student_roll_no] = {};
    marksMap[m.student_roll_no][m.exam_type] = {
      obtained: m.marks_obtained,
      max: m.max_marks,
      id: m.id
    };
  });

  res.json({
    subject: subj,
    students,
    marks: marksMap
  });
});

// POST /api/faculty/marks (Enter or update sessional marks)
router.post('/marks', (req, res) => {
  const facId = getFacultyId(req);
  const { subjectCode, semester, examType, marksList } = req.body;

  if (!subjectCode || !semester || !examType || !Array.isArray(marksList)) {
    return res.status(400).json({ message: 'subjectCode, semester, examType, and marksList are required.' });
  }

  if (!['ST1', 'ST2', 'PUT'].includes(examType)) {
    return res.status(400).json({ message: 'examType must be ST1, ST2, or PUT.' });
  }

  for (const item of marksList) {
    const { rollNumber, marksObtained, maxMarks } = item;
    if (!rollNumber || marksObtained === undefined || marksObtained === null || marksObtained === '') continue;

    const numMarks = Number(marksObtained);
    const numMax = Number(maxMarks || (examType === 'PUT' ? 50 : 30));

    if (numMarks < 0 || numMarks > numMax) {
      return res.status(400).json({
        message: `Marks obtained for ${rollNumber} (${numMarks}) cannot exceed maximum marks (${numMax}).`
      });
    }

    run(
      `INSERT INTO sessional_marks (student_roll_no, subject_code, semester, exam_type, marks_obtained, max_marks, entered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_roll_no, subject_code, semester, exam_type)
       DO UPDATE SET marks_obtained = excluded.marks_obtained, max_marks = excluded.max_marks, entered_by = excluded.entered_by, timestamp = CURRENT_TIMESTAMP`,
      [rollNumber, subjectCode, Number(semester), examType, numMarks, numMax, facId]
    );
  }

  res.json({ message: `Sessional marks for ${examType} updated successfully!` });
});

// GET /api/faculty/mentor-leaves
router.get('/mentor-leaves', (req, res) => {
  const facId = getFacultyId(req);

  // Find all sections where this faculty is mentor
  const mentorSections = query(
    'SELECT * FROM class_mentors WHERE primary_mentor_id = ? OR secondary_mentor_id = ?',
    [facId, facId]
  );

  if (mentorSections.length === 0) {
    return res.json({ leaves: [], isMentor: false });
  }

  const conditions = mentorSections
    .map(m => `(s.branch = '${m.branch}' AND s.current_semester = ${m.semester} AND s.section = '${m.section}')`)
    .join(' OR ');

  const leaves = query(
    `SELECT l.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number,
            cm.primary_mentor_id, cm.secondary_mentor_id
     FROM leave_applications l
     JOIN students s ON l.student_roll_no = s.roll_number
     LEFT JOIN class_mentors cm ON (s.branch = cm.branch AND s.current_semester = cm.semester AND s.section = cm.section)
     WHERE ${conditions}
     ORDER BY l.applied_on DESC`
  );

  res.json({
    leaves,
    isMentor: true,
    facultyId: facId
  });
});

// POST /api/faculty/mentor-leaves/:id/review (Approve or Reject as Primary or Secondary Mentor)
router.post('/mentor-leaves/:id/review', (req, res) => {
  const facId = getFacultyId(req);
  const leaveId = req.params.id;
  const { decision, remark } = req.body;

  if (!['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be either Approved or Rejected.' });
  }

  const leave = get(
    `SELECT l.*, s.branch, s.current_semester, s.section
     FROM leave_applications l
     JOIN students s ON l.student_roll_no = s.roll_number
     WHERE l.id = ?`,
    [leaveId]
  );

  if (!leave) {
    return res.status(404).json({ message: 'Leave application not found.' });
  }

  // Find mentor assignment
  const mentorRecord = get(
    'SELECT * FROM class_mentors WHERE branch = ? AND semester = ? AND section = ?',
    [leave.branch, leave.current_semester, leave.section]
  );

  if (!mentorRecord || (mentorRecord.primary_mentor_id !== facId && mentorRecord.secondary_mentor_id !== facId && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'You are not an assigned Class Mentor for this student.' });
  }

  let updateSql = '';
  const isPrimary = mentorRecord.primary_mentor_id === facId;

  if (isPrimary) {
    const nextOverall = decision === 'Rejected' ? 'Rejected' : (leave.mentor2_status === 'Approved' ? 'Approved' : 'Pending');
    run(
      `UPDATE leave_applications 
       SET mentor1_status = ?, mentor1_remark = ?, status = ?, reviewed_on = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [decision, remark ? remark.trim() : '', nextOverall, leaveId]
    );
  } else {
    const nextOverall = decision === 'Rejected' ? 'Rejected' : (leave.mentor1_status === 'Approved' ? 'Approved' : 'Pending');
    run(
      `UPDATE leave_applications 
       SET mentor2_status = ?, mentor2_remark = ?, status = ?, reviewed_on = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [decision, remark ? remark.trim() : '', nextOverall, leaveId]
    );
  }

  res.json({ message: `Leave application marked as ${decision}.` });
});

// ==========================================
// COMPATIBILITY ALIASES FOR FRONTEND PORTALS
// ==========================================

// GET /api/faculty/allocations
router.get('/allocations', (req, res) => {
  const facId = getFacultyId(req);
  const allocations = query(
    `SELECT a.*, s.name as subject_name, s.semester, s.branch, s.credits
     FROM faculty_subject_allocations a
     JOIN subjects s ON a.subject_code = s.code
     WHERE a.faculty_id = ?`,
    [facId]
  );
  res.json({ allocations });
});

// GET /api/faculty/mentor-batches
router.get('/mentor-batches', (req, res) => {
  const facId = getFacultyId(req);
  const batches = query(
    `SELECT cm.*, 
            CASE WHEN cm.primary_mentor_id = ? THEN f2.name ELSE f1.name END as partner_name,
            CASE WHEN cm.primary_mentor_id = ? THEN f2.gender ELSE f1.gender END as partner_gender,
            CASE WHEN cm.primary_mentor_id = ? THEN f2.designation ELSE f1.designation END as partner_designation
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     WHERE cm.primary_mentor_id = ? OR cm.secondary_mentor_id = ?`,
    [facId, facId, facId, facId, facId]
  );
  res.json({ batches });
});

// GET /api/faculty/leaves-to-review
router.get('/leaves-to-review', (req, res) => {
  const facId = getFacultyId(req);
  const mentorSections = query(
    'SELECT * FROM class_mentors WHERE primary_mentor_id = ? OR secondary_mentor_id = ?',
    [facId, facId]
  );

  if (mentorSections.length === 0) {
    return res.json({ leaves: [] });
  }

  const conditions = mentorSections
    .map(m => `(s.branch = '${m.branch}' AND s.current_semester = ${m.semester} AND s.section = '${m.section}')`)
    .join(' OR ');

  const leaves = query(
    `SELECT l.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number
     FROM leave_applications l
     JOIN students s ON l.student_roll_no = s.roll_number
     WHERE (${conditions}) AND l.status = 'Pending'
     ORDER BY l.applied_on DESC`
  );

  res.json({ leaves });
});

// GET /api/faculty/students-for-class
router.get('/students-for-class', (req, res) => {
  const { subjectCode, section } = req.query;
  const subj = get('SELECT * FROM subjects WHERE code = ?', [subjectCode]);
  const sem = subj ? subj.semester : 5;
  const branch = subj ? subj.branch : 'Computer Science & Engineering';

  const students = query(
    `SELECT roll_number, name, current_semester, section, mobile_number
     FROM students
     WHERE current_semester = ? AND (section = ? OR ? IS NULL)
     ORDER BY roll_number ASC`,
    [sem, section || null, section || null]
  );

  res.json({ students });
});

// GET /api/faculty/students-for-marks
router.get('/students-for-marks', (req, res) => {
  const { subjectCode, section, examType } = req.query;
  const subj = get('SELECT * FROM subjects WHERE code = ?', [subjectCode]);
  const sem = subj ? subj.semester : 5;

  const students = query(
    `SELECT s.roll_number, s.name, m.marks_obtained, m.max_marks
     FROM students s
     LEFT JOIN sessional_marks m ON (s.roll_number = m.student_roll_no AND m.subject_code = ? AND m.exam_type = ?)
     WHERE s.current_semester = ? AND (s.section = ? OR ? IS NULL)
     ORDER BY s.roll_number ASC`,
    [subjectCode, examType || 'ST1', sem, section || null, section || null]
  );

  res.json({ students });
});

// POST /api/faculty/attendance/mark
router.post('/attendance/mark', (req, res) => {
  const facId = getFacultyId(req);
  const { subjectCode, date, periodNumber, records } = req.body;

  if (!date || !periodNumber || !subjectCode || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Invalid attendance payload.' });
  }

  for (const item of records) {
    const { studentRollNo, status } = item;
    if (!studentRollNo || !status) continue;
    run(
      `INSERT INTO attendance (student_roll_no, date, period_number, subject_code, status, marked_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_roll_no, date, period_number)
       DO UPDATE SET status = excluded.status, subject_code = excluded.subject_code, marked_by = excluded.marked_by`,
      [studentRollNo, date, Number(periodNumber), subjectCode, status, facId]
    );
  }

  res.json({ message: 'Attendance recorded successfully!' });
});

// POST /api/faculty/marks/entry
router.post('/marks/entry', (req, res) => {
  const facId = getFacultyId(req);
  const { subjectCode, semester, examType, marks } = req.body;

  if (!subjectCode || !semester || !examType || !Array.isArray(marks)) {
    return res.status(400).json({ message: 'Invalid marks payload.' });
  }

  for (const item of marks) {
    const { studentRollNo, marksObtained, maxMarks } = item;
    if (!studentRollNo || marksObtained === undefined || marksObtained === null) continue;

    run(
      `INSERT INTO sessional_marks (student_roll_no, subject_code, semester, exam_type, marks_obtained, max_marks, entered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_roll_no, subject_code, semester, exam_type)
       DO UPDATE SET marks_obtained = excluded.marks_obtained, max_marks = excluded.max_marks, entered_by = excluded.entered_by, timestamp = CURRENT_TIMESTAMP`,
      [studentRollNo, subjectCode, Number(semester), examType, Number(marksObtained), Number(maxMarks), facId]
    );
  }

  res.json({ message: 'Marks saved successfully!' });
});

// POST /api/faculty/leaves/:id/review
router.post('/leaves/:id/review', (req, res) => {
  const facId = getFacultyId(req);
  const leaveId = req.params.id;
  const { decision, remark } = req.body;

  const leave = get('SELECT * FROM leave_applications WHERE id = ?', [leaveId]);
  if (!leave) return res.status(404).json({ message: 'Leave not found.' });

  const student = get('SELECT * FROM students WHERE roll_number = ?', [leave.student_roll_no]);
  const mentorRecord = get(
    'SELECT * FROM class_mentors WHERE branch = ? AND semester = ? AND section = ?',
    [student?.branch, student?.current_semester, student?.section]
  );

  const isPrimary = mentorRecord?.primary_mentor_id === facId;
  if (isPrimary) {
    const nextOverall = decision === 'Rejected' ? 'Rejected' : (leave.mentor2_status === 'Approved' ? 'Approved' : 'Pending');
    run(
      'UPDATE leave_applications SET mentor1_status = ?, mentor1_remark = ?, status = ?, reviewed_on = CURRENT_TIMESTAMP WHERE id = ?',
      [decision, remark || '', nextOverall, leaveId]
    );
  } else {
    const nextOverall = decision === 'Rejected' ? 'Rejected' : (leave.mentor1_status === 'Approved' ? 'Approved' : 'Pending');
    run(
      'UPDATE leave_applications SET mentor2_status = ?, mentor2_remark = ?, status = ?, reviewed_on = CURRENT_TIMESTAMP WHERE id = ?',
      [decision, remark || '', nextOverall, leaveId]
    );
  }

  res.json({ message: `Leave ${decision} successfully.` });
});

export default router;

