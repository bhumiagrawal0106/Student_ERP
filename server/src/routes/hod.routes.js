import express from 'express';
import { get, query, run } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Strict authorization: ONLY HOD and Super Admin can access HOD routes
router.use(authenticateToken);
router.use(requireRole(['hod', 'admin']));

// GET /api/hod/dashboard
router.get('/dashboard', (req, res) => {
  let department = null;
  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    department = fac ? (fac.hod_department || fac.department) : null;
  } else if (req.query.department) {
    department = req.query.department;
  }

  // Department faculty
  const facultyList = query(
    `SELECT employee_id, name, gender, designation, email, mobile, is_hod
     FROM faculty
     WHERE (? IS NULL OR department = ?)
     ORDER BY is_hod DESC, name ASC`,
    [department, department]
  );

  // Department student count
  const studentCount = get(
    `SELECT count(*) as count FROM students 
     WHERE (? IS NULL OR branch = (CASE WHEN ? LIKE '%Computer%' THEN 'CSE' WHEN ? LIKE '%Electronics%' THEN 'ECE' ELSE 'CSE' END))`,
    [department, department, department]
  );

  // Confidential feedback stats for HOD
  const feedbackStats = get(
    `SELECT count(*) as total,
            sum(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as pending,
            sum(CASE WHEN status = 'Reviewed' THEN 1 ELSE 0 END) as reviewed,
            sum(CASE WHEN status = 'Action Taken' THEN 1 ELSE 0 END) as resolved
     FROM faculty_feedback
     WHERE (? IS NULL OR department = ?)`,
    [department, department]
  );

  res.json({
    department,
    facultyList,
    totalStudents: studentCount ? studentCount.count : 0,
    feedbackStats
  });
});

// GET /api/hod/faculty-feedback (CRITICAL CONFIDENTIAL ROUTE)
// Strictly enforced: only the HOD of that specific department can view this feedback!
router.get('/faculty-feedback', (req, res) => {
  let department = null;

  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    department = fac ? (fac.hod_department || fac.department) : null;
    if (!department) {
      return res.status(403).json({ message: 'No department assigned to this HOD account.' });
    }
  } else if (req.user.role === 'admin' && req.query.department) {
    department = req.query.department;
  }

  const sql = `
    SELECT fb.id, fb.student_roll_no, fb.department, fb.feedback_text, fb.rating,
           fb.submitted_on, fb.status, fb.hod_notes,
           s.name as student_name, s.branch, s.current_semester, s.section,
           f.name as faculty_name, f.employee_id as faculty_id, f.designation as faculty_designation
    FROM faculty_feedback fb
    JOIN students s ON fb.student_roll_no = s.roll_number
    JOIN faculty f ON fb.faculty_id = f.employee_id
    WHERE (? IS NULL OR fb.department = ?)
    ORDER BY fb.submitted_on DESC
  `;

  const feedbackList = query(sql, [department, department]);

  res.json({
    department,
    feedbackList
  });
});

// PATCH /api/hod/faculty-feedback/:id (Mark as Reviewed / Action Taken with HOD notes)
router.patch('/faculty-feedback/:id', (req, res) => {
  const feedbackId = req.params.id;
  const { status, hodNotes } = req.body;

  if (!status || !['Submitted', 'Reviewed', 'Action Taken'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (Submitted, Reviewed, Action Taken) is required.' });
  }

  // Security check: verify this feedback belongs to the HOD's department
  const existing = get('SELECT * FROM faculty_feedback WHERE id = ?', [feedbackId]);
  if (!existing) {
    return res.status(404).json({ message: 'Feedback entry not found.' });
  }

  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    const dept = fac ? (fac.hod_department || fac.department) : null;
    if (existing.department !== dept) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify feedback for another department.' });
    }
  }

  run(
    'UPDATE faculty_feedback SET status = ?, hod_notes = ? WHERE id = ?',
    [status, hodNotes ? hodNotes.trim() : existing.hod_notes, feedbackId]
  );

  res.json({ message: `Feedback status updated to '${status}'.` });
});

// ==========================================
// COMPATIBILITY ALIASES FOR HOD PORTAL
// ==========================================

// GET /api/hod/department-overview
router.get('/department-overview', (req, res) => {
  let department = null;
  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    department = fac ? (fac.hod_department || fac.department) : 'Computer Science & Engineering';
  } else if (req.query.department) {
    department = req.query.department;
  } else {
    department = 'Computer Science & Engineering';
  }

  const faculty = query(
    'SELECT employee_id, name, gender, designation, email, mobile, is_hod FROM faculty WHERE department = ? ORDER BY is_hod DESC, name ASC',
    [department]
  );

  const studentCount = get(
    `SELECT count(*) as count FROM students 
     WHERE (? IS NULL OR branch = (CASE WHEN ? LIKE '%Computer%' THEN 'CSE' WHEN ? LIKE '%Electronics%' THEN 'ECE' ELSE 'CSE' END))`,
    [department, department, department]
  );

  res.json({
    department,
    faculty,
    totalStudents: studentCount ? studentCount.count : 0,
  });
});

// GET /api/hod/feedback
router.get('/feedback', (req, res) => {
  let department = null;
  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    department = fac ? (fac.hod_department || fac.department) : null;
  } else if (req.query.department) {
    department = req.query.department;
  }

  const sql = `
    SELECT fb.*, 
           s.name as student_name, s.branch, s.current_semester, s.section,
           f.name as faculty_name, f.designation as faculty_designation
    FROM faculty_feedback fb
    JOIN students s ON fb.student_roll_no = s.roll_number
    JOIN faculty f ON fb.faculty_id = f.employee_id
    WHERE (? IS NULL OR fb.department = ?)
    ORDER BY fb.id DESC
  `;

  const feedback = query(sql, [department, department]);
  res.json({ feedback, department });
});

// PATCH /api/hod/feedback/:id/status
router.patch('/feedback/:id/status', (req, res) => {
  const feedbackId = req.params.id;
  const { status, notes } = req.body;

  run(
    'UPDATE faculty_feedback SET status = ?, hod_notes = ? WHERE id = ?',
    [status, notes || '', feedbackId]
  );

  res.json({ message: 'Feedback status updated.' });
});

// GET /api/hod/defaulters (Students below 75% attendance)
router.get('/defaulters', (req, res) => {
  let department = null;
  if (req.user.role === 'hod') {
    const fac = get('SELECT hod_department, department FROM faculty WHERE user_id = ?', [req.user.id]);
    department = fac ? (fac.hod_department || fac.department) : 'Computer Science & Engineering';
  }

  const branchCode = department?.includes('Computer') ? 'CSE' : 'ECE';

  // Find students in branch with < 75% attendance
  const students = query(
    'SELECT roll_number, name, current_semester, section, father_mobile FROM students WHERE branch = ?',
    [branchCode]
  );

  const defaulters = [];
  for (const st of students) {
    const att = get(
      `SELECT count(*) as total, sum(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present FROM attendance WHERE student_roll_no = ?`,
      [st.roll_number]
    );
    const total = att?.total || 0;
    const present = att?.present || 0;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    if (total > 0 && pct < 75) {
      defaulters.push({
        ...st,
        attendance_percentage: pct,
        totalClasses: total,
        attendedClasses: present
      });
    }
  }

  res.json({ defaulters });
});

export default router;

