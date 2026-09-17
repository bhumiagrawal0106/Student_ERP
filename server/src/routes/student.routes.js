import express from 'express';
import { get, query, run } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Apply auth and student role check to all student routes
router.use(authenticateToken);
router.use(requireRole(['student', 'admin'])); // Admin can also inspect if needed

// Helper to get student roll number
const getStudentRoll = (req) => {
  if (req.student) return req.student.roll_number;
  if (req.query.roll_number && req.user.role === 'admin') return req.query.roll_number;
  const s = get('SELECT roll_number FROM students WHERE user_id = ?', [req.user.id]);
  return s ? s.roll_number : null;
};

// GET /api/student/dashboard
router.get('/dashboard', (req, res) => {
  const roll = getStudentRoll(req);
  if (!roll) return res.status(404).json({ message: 'Student profile not found.' });

  const student = get('SELECT * FROM students WHERE roll_number = ?', [roll]);

  // Attendance summary
  const totalRecords = get(
    `SELECT count(*) as total, sum(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present, sum(CASE WHEN status = 'Extra' THEN 1 ELSE 0 END) as extra, sum(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent FROM attendance WHERE student_roll_no = ?`,
    [roll]
  );

  // Check admin setting for extra attendance neutrality
  const extraSetting = get("SELECT value FROM system_settings WHERE key = 'extra_attendance_neutral'");
  const isExtraNeutral = !extraSetting || extraSetting.value === '1';

  let attendancePct = 0;
  if (totalRecords.total > 0) {
    if (isExtraNeutral) {
      const effectiveTotal = totalRecords.total - (totalRecords.extra || 0);
      attendancePct = effectiveTotal > 0 ? ((totalRecords.present / effectiveTotal) * 100).toFixed(1) : 100;
    } else {
      attendancePct = (((totalRecords.present + (totalRecords.extra || 0)) / totalRecords.total) * 100).toFixed(1);
    }
  }

  // Current semester marks summary
  const latestMarks = query(
    `SELECT m.*, s.name as subject_name, s.credits
     FROM sessional_marks m
     JOIN subjects s ON m.subject_code = s.code
     WHERE m.student_roll_no = ? AND m.semester = ?
     ORDER BY m.subject_code, m.exam_type`,
    [roll, student.current_semester]
  );

  // Recent notices targeted to all or student's branch/semester
  const notices = query(
    `SELECT * FROM notices 
     WHERE target_audience = 'all' OR target_audience = ? OR target_audience = ?
     ORDER BY posted_date DESC, id DESC LIMIT 5`,
    [student.branch, `Sem-${student.current_semester}`]
  );

  // Leave applications
  const leaves = query(
    'SELECT * FROM leave_applications WHERE student_roll_no = ? ORDER BY id DESC LIMIT 3',
    [roll]
  );

  // Maintenance complaints
  const complaints = query(
    'SELECT * FROM maintenance_complaints WHERE student_roll_no = ? ORDER BY id DESC LIMIT 3',
    [roll]
  );

  // Class Mentors
  const mentors = get(
    `SELECT cm.*, 
            f1.name as primary_mentor_name, f1.email as primary_mentor_email, f1.mobile as primary_mentor_mobile, f1.gender as primary_mentor_gender,
            f2.name as secondary_mentor_name, f2.email as secondary_mentor_email, f2.mobile as secondary_mentor_mobile, f2.gender as secondary_mentor_gender
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     WHERE cm.branch = ? AND cm.semester = ? AND cm.section = ?`,
    [student.branch, student.current_semester, student.section]
  );

  res.json({
    student,
    attendance: {
      total: totalRecords.total || 0,
      present: totalRecords.present || 0,
      extra: totalRecords.extra || 0,
      absent: totalRecords.absent || 0,
      percentage: Number(attendancePct),
      isExtraNeutral
    },
    latestMarks,
    notices,
    recentLeaves: leaves,
    recentComplaints: complaints,
    mentors: mentors || null
  });
});

// GET /api/student/profile
router.get('/profile', (req, res) => {
  const roll = getStudentRoll(req);
  const student = get('SELECT * FROM students WHERE roll_number = ?', [roll]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });

  // Fetch pending profile update requests
  const pendingRequests = query(
    'SELECT * FROM profile_update_requests WHERE student_roll_no = ? ORDER BY id DESC',
    [roll]
  );

  res.json({ profile: student, student, pendingRequests });
});

// GET /api/student/mentors
router.get('/mentors', (req, res) => {
  const roll = getStudentRoll(req);
  const student = get('SELECT * FROM students WHERE roll_number = ?', [roll]);
  if (!student) return res.json({ mentors: [] });

  const cm = get(
    `SELECT cm.*, 
            f1.name as primary_mentor_name, f1.email as primary_mentor_email, f1.mobile as primary_mentor_mobile, f1.gender as primary_mentor_gender, f1.designation as primary_mentor_designation,
            f2.name as secondary_mentor_name, f2.email as secondary_mentor_email, f2.mobile as secondary_mentor_mobile, f2.gender as secondary_mentor_gender, f2.designation as secondary_mentor_designation
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     WHERE cm.branch = ? AND cm.semester = ? AND cm.section = ?`,
    [student.branch, student.current_semester, student.section]
  );

  const mentorsList = [];
  if (cm) {
    mentorsList.push({
      employee_id: cm.primary_mentor_id,
      name: cm.primary_mentor_name,
      email: cm.primary_mentor_email,
      mobile: cm.primary_mentor_mobile,
      gender: cm.primary_mentor_gender,
      designation: cm.primary_mentor_designation,
      isPrimary: true
    });
    mentorsList.push({
      employee_id: cm.secondary_mentor_id,
      name: cm.secondary_mentor_name,
      email: cm.secondary_mentor_email,
      mobile: cm.secondary_mentor_mobile,
      gender: cm.secondary_mentor_gender,
      designation: cm.secondary_mentor_designation,
      isPrimary: false
    });
  }

  res.json({ mentors: mentorsList, mentorDetails: cm });
});

// GET /api/student/attendance-summary
router.get('/attendance-summary', (req, res) => {
  const roll = getStudentRoll(req);
  const totalRecords = get(
    `SELECT count(*) as total, sum(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present, sum(CASE WHEN status = 'Extra' THEN 1 ELSE 0 END) as extra, sum(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent FROM attendance WHERE student_roll_no = ?`,
    [roll]
  );

  const extraSetting = get("SELECT value FROM system_settings WHERE key = 'extra_attendance_neutral'");
  const isExtraNeutral = !extraSetting || extraSetting.value === '1';

  let attendancePct = 0;
  if (totalRecords && totalRecords.total > 0) {
    if (isExtraNeutral) {
      const effectiveTotal = totalRecords.total - (totalRecords.extra || 0);
      attendancePct = effectiveTotal > 0 ? ((totalRecords.present / effectiveTotal) * 100).toFixed(1) : 100;
    } else {
      attendancePct = (((totalRecords.present + (totalRecords.extra || 0)) / totalRecords.total) * 100).toFixed(1);
    }
  }

  const subjectStats = query(
    `SELECT a.subject_code, s.name as subject_name,
            count(*) as total,
            sum(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
            sum(CASE WHEN a.status = 'Extra' THEN 1 ELSE 0 END) as extra,
            sum(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
     FROM attendance a
     JOIN subjects s ON a.subject_code = s.code
     WHERE a.student_roll_no = ?
     GROUP BY a.subject_code`,
    [roll]
  );

  const subjectBreakdown = subjectStats.map(stat => {
    let pct = 0;
    if (stat.total > 0) {
      if (isExtraNeutral) {
        const effective = stat.total - (stat.extra || 0);
        pct = effective > 0 ? Math.round((stat.present / effective) * 100) : 100;
      } else {
        pct = Math.round(((stat.present + (stat.extra || 0)) / stat.total) * 100);
      }
    }
    return {
      subject_code: stat.subject_code,
      subject_name: stat.subject_name,
      present: stat.present,
      total: stat.total,
      extra: stat.extra,
      percentage: pct
    };
  });

  res.json({
    overallPercentage: Number(attendancePct),
    totalConducted: totalRecords?.total || 0,
    presentCount: totalRecords?.present || 0,
    extraCount: totalRecords?.extra || 0,
    absentCount: totalRecords?.absent || 0,
    subjectBreakdown,
    isExtraNeutral
  });
});

// GET /api/student/attendance-logs
router.get('/attendance-logs', (req, res) => {
  const roll = getStudentRoll(req);
  const logs = query(
    `SELECT a.*, s.name as subject_name, f.name as faculty_name
     FROM attendance a
     JOIN subjects s ON a.subject_code = s.code
     LEFT JOIN faculty f ON a.marked_by = f.employee_id
     WHERE a.student_roll_no = ?
     ORDER BY a.date DESC, a.period_number ASC`,
    [roll]
  );
  res.json({ logs });
});

// GET /api/student/faculty-list
router.get('/faculty-list', (req, res) => {
  const roll = getStudentRoll(req);
  const student = get('SELECT * FROM students WHERE roll_number = ?', [roll]);
  const dept = student ? student.branch : 'Computer Science & Engineering';
  const faculty = query(
    'SELECT employee_id, name, department, designation, gender FROM faculty WHERE department = ? ORDER BY name ASC',
    [dept]
  );
  res.json({ faculty });
});

// POST /api/student/request-profile-update
router.post('/request-profile-update', (req, res) => {
  const roll = getStudentRoll(req);
  const { requestedChanges } = req.body;

  if (!requestedChanges || requestedChanges.trim().length === 0) {
    return res.status(400).json({ message: 'Please specify the changes you are requesting.' });
  }

  run(
    'INSERT INTO profile_update_requests (student_roll_no, requested_changes, status) VALUES (?, ?, ?)',
    [roll, requestedChanges.trim(), 'Pending']
  );

  res.json({ message: 'Profile update request submitted to Admin for verification.' });
});

// GET /api/student/marks (all 8 semesters)
router.get('/marks', (req, res) => {
  const roll = getStudentRoll(req);
  const semester = req.query.semester ? Number(req.query.semester) : null;

  let sql = `
    SELECT m.*, s.name as subject_name, s.credits, s.branch, f.name as faculty_name
    FROM sessional_marks m
    JOIN subjects s ON m.subject_code = s.code
    LEFT JOIN faculty f ON m.entered_by = f.employee_id
    WHERE m.student_roll_no = ?
  `;
  const params = [roll];

  if (semester) {
    sql += ' AND m.semester = ?';
    params.push(semester);
  }

  sql += ' ORDER BY m.semester ASC, m.subject_code ASC, m.exam_type ASC';

  const marks = query(sql, params);

  // Group by semester and subject
  const semesterMap = {};
  for (let s = 1; s <= 8; s++) {
    semesterMap[s] = { semester: s, subjects: {} };
  }

  marks.forEach((row) => {
    const sem = row.semester;
    if (!semesterMap[sem]) {
      semesterMap[sem] = { semester: sem, subjects: {} };
    }
    if (!semesterMap[sem].subjects[row.subject_code]) {
      semesterMap[sem].subjects[row.subject_code] = {
        code: row.subject_code,
        name: row.subject_name,
        credits: row.credits,
        exams: {}
      };
    }
    semesterMap[sem].subjects[row.subject_code].exams[row.exam_type] = {
      obtained: row.marks_obtained,
      max: row.max_marks,
      timestamp: row.timestamp,
      faculty: row.faculty_name
    };
  });

  res.json({ marks, semesterSummary: semesterMap });
});

// GET /api/student/attendance
router.get('/attendance', (req, res) => {
  const roll = getStudentRoll(req);
  const month = req.query.month; // YYYY-MM
  const subject = req.query.subject;

  let sql = `
    SELECT a.*, s.name as subject_name, f.name as faculty_name
    FROM attendance a
    JOIN subjects s ON a.subject_code = s.code
    LEFT JOIN faculty f ON a.marked_by = f.employee_id
    WHERE a.student_roll_no = ?
  `;
  const params = [roll];

  if (month) {
    sql += ' AND a.date LIKE ?';
    params.push(`${month}%`);
  }
  if (subject) {
    sql += ' AND a.subject_code = ?';
    params.push(subject);
  }

  sql += ' ORDER BY a.date DESC, a.period_number ASC';

  const logs = query(sql, params);

  // Subject-wise percentage calculation
  const subjectStats = query(
    `SELECT a.subject_code, s.name as subject_name,
            count(*) as total,
            sum(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
            sum(CASE WHEN a.status = 'Extra' THEN 1 ELSE 0 END) as extra,
            sum(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent
     FROM attendance a
     JOIN subjects s ON a.subject_code = s.code
     WHERE a.student_roll_no = ?
     GROUP BY a.subject_code`,
    [roll]
  );

  const extraSetting = get("SELECT value FROM system_settings WHERE key = 'extra_attendance_neutral'");
  const isExtraNeutral = !extraSetting || extraSetting.value === '1';

  const processedSubjectStats = subjectStats.map(stat => {
    let pct = 0;
    if (stat.total > 0) {
      if (isExtraNeutral) {
        const effectiveTotal = stat.total - (stat.extra || 0);
        pct = effectiveTotal > 0 ? ((stat.present / effectiveTotal) * 100).toFixed(1) : 100;
      } else {
        pct = (((stat.present + (stat.extra || 0)) / stat.total) * 100).toFixed(1);
      }
    }
    return {
      ...stat,
      percentage: Number(pct)
    };
  });

  res.json({
    logs,
    subjectStats: processedSubjectStats,
    isExtraNeutral
  });
});

// GET /api/student/leaves
router.get('/leaves', (req, res) => {
  const roll = getStudentRoll(req);
  const student = get('SELECT * FROM students WHERE roll_number = ?', [roll]);

  const leaves = query(
    'SELECT * FROM leave_applications WHERE student_roll_no = ? ORDER BY id DESC',
    [roll]
  );

  // Get mentors for context
  const mentors = get(
    `SELECT cm.*, 
            f1.name as primary_mentor_name, f2.name as secondary_mentor_name
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     WHERE cm.branch = ? AND cm.semester = ? AND cm.section = ?`,
    [student.branch, student.current_semester, student.section]
  );

  res.json({ leaves, mentors });
});

// POST /api/student/leaves (Apply for leave with medical proof upload)
router.post('/leaves', upload.single('medicalProof'), (req, res) => {
  const roll = getStudentRoll(req);
  const { fromDate, toDate, reason } = req.body;

  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ message: 'From Date, To Date, and Reason are required.' });
  }

  const medicalProofFile = req.file ? req.file.filename : null;

  run(
    `INSERT INTO leave_applications (
      student_roll_no, from_date, to_date, reason, medical_proof_file, status,
      mentor1_status, mentor2_status
    ) VALUES (?, ?, ?, ?, ?, 'Pending', 'Pending', 'Pending')`,
    [roll, fromDate, toDate, reason.trim(), medicalProofFile]
  );

  res.status(201).json({
    message: 'Leave application submitted successfully. It has been routed to both your Class Mentors for approval.'
  });
});

// POST /api/student/feedback (Confidential feedback for faculty)
// Stored internally with student roll number for accountability, but STRICTLY hidden from faculty!
router.post('/feedback', (req, res) => {
  const roll = getStudentRoll(req);
  const { facultyId, feedbackText, rating } = req.body;

  if (!facultyId || !feedbackText) {
    return res.status(400).json({ message: 'Faculty and feedback text are required.' });
  }

  const faculty = get('SELECT * FROM faculty WHERE employee_id = ?', [facultyId]);
  if (!faculty) {
    return res.status(404).json({ message: 'Selected faculty member not found.' });
  }

  run(
    `INSERT INTO faculty_feedback (student_roll_no, faculty_id, department, feedback_text, rating, status)
     VALUES (?, ?, ?, ?, ?, 'Submitted')`,
    [roll, facultyId, faculty.department, feedbackText.trim(), rating ? Number(rating) : 5]
  );

  res.status(201).json({
    message: 'Feedback submitted confidentially. Note: This feedback is visible exclusively to the Head of Department (HOD) for administrative quality review.'
  });
});

// GET /api/student/complaints
router.get('/complaints', (req, res) => {
  const roll = getStudentRoll(req);
  const complaints = query(
    'SELECT * FROM maintenance_complaints WHERE student_roll_no = ? ORDER BY id DESC',
    [roll]
  );
  res.json({ complaints });
});

// POST /api/student/complaints (Submit maintenance complaint)
// Description 300-400 words max enforced in API as well
router.post('/complaints', upload.single('photo'), (req, res) => {
  const roll = getStudentRoll(req);
  const { location, category, description } = req.body;

  if (!location || !category || !description) {
    return res.status(400).json({ message: 'Location, category, and description are required.' });
  }

  // Enforce 400 words limit
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 400) {
    return res.status(400).json({
      message: `Complaint description exceeds maximum limit of 400 words (current: ${wordCount} words).`
    });
  }

  const photoAttachment = req.file ? req.file.filename : null;

  run(
    `INSERT INTO maintenance_complaints (
      student_roll_no, location, category, description, photo_attachment, status
    ) VALUES (?, ?, ?, ?, ?, 'Open')`,
    [roll, location.trim(), category, description.trim(), photoAttachment]
  );

  res.status(201).json({
    message: 'Maintenance complaint registered. Notifications dispatched to Class Mentors, HOD, and Maintenance Desk.'
  });
});

export default router;
