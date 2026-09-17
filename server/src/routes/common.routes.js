import express from 'express';
import { get, query, run } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// 1. PUBLIC / SHARED NOTICES
// ==========================================
router.get('/notices', (req, res) => {
  const { audience, category } = req.query;
  let sql = 'SELECT * FROM notices WHERE 1=1';
  const params = [];

  if (audience && audience !== 'all') {
    sql += " AND (target_audience = 'all' OR target_audience = ?)";
    params.push(audience);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY posted_date DESC, id DESC';
  const notices = query(sql, params);
  res.json({ notices });
});

// ==========================================
// 2. UNIVERSITY QUESTION PAPERS (AKTU PYQs)
// ==========================================
router.get('/pyqs', (req, res) => {
  const { semester, branch, subject, year, examType } = req.query;
  let sql = `
    SELECT qp.*, s.name as subject_name 
    FROM question_papers qp
    JOIN subjects s ON qp.subject_code = s.code
    WHERE 1=1
  `;
  const params = [];

  if (semester) {
    sql += ' AND qp.semester = ?';
    params.push(Number(semester));
  }
  if (branch) {
    sql += ' AND qp.branch = ?';
    params.push(branch);
  }
  if (subject) {
    sql += ' AND (qp.subject_code = ? OR s.name LIKE ?)';
    params.push(subject, `%${subject}%`);
  }
  if (year) {
    sql += ' AND qp.year = ?';
    params.push(Number(year));
  }
  if (examType) {
    sql += ' AND qp.exam_type = ?';
    params.push(examType);
  }

  sql += ' ORDER BY qp.year DESC, qp.semester ASC';
  const papers = query(sql, params);
  res.json({ papers });
});

// ==========================================
// 3. IMPORTANT RESOURCES & DOWNLOADS
// ==========================================
router.get('/resources', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM important_resources WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY id ASC';
  const resources = query(sql, params);
  res.json({ resources });
});

// ==========================================
// 4. MAINTENANCE DEPARTMENT PORTAL / INBOX
// ==========================================
router.get('/maintenance/complaints', authenticateToken, requireRole(['maintenance', 'admin', 'hod', 'faculty']), (req, res) => {
  const { status, category } = req.query;
  let sql = `
    SELECT c.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number
    FROM maintenance_complaints c
    JOIN students s ON c.student_roll_no = s.roll_number
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }

  sql += " ORDER BY CASE WHEN c.status = 'Open' THEN 1 WHEN c.status = 'In Progress' THEN 2 ELSE 3 END, c.id DESC";
  const complaints = query(sql, params);
  res.json({ complaints });
});

router.patch('/maintenance/complaints/:id', authenticateToken, requireRole(['maintenance', 'admin']), (req, res) => {
  const { status, resolutionNotes } = req.body;
  if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid complaint status.' });
  }

  const resolver = req.user.username;

  run(
    `UPDATE maintenance_complaints 
     SET status = ?, resolution_notes = ?, resolved_by = ?,
         resolved_on = (CASE WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP ELSE NULL END)
     WHERE id = ?`,
    [status, resolutionNotes || '', resolver, status, req.params.id]
  );

  res.json({ message: `Complaint #${req.params.id} marked as '${status}'.` });
});

// GET /api/common/maintenance-desk (Alias for maintenance portal)
router.get('/maintenance-desk', (req, res) => {
  const { status, category } = req.query;
  let sql = `
    SELECT c.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number
    FROM maintenance_complaints c
    JOIN students s ON c.student_roll_no = s.roll_number
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }

  sql += " ORDER BY CASE WHEN c.status = 'Open' THEN 1 WHEN c.status = 'In Progress' THEN 2 ELSE 3 END, c.id DESC";
  const complaints = query(sql, params);
  res.json({ complaints });
});

// PATCH /api/common/maintenance-desk/:id
router.patch('/maintenance-desk/:id', (req, res) => {
  const { status, resolutionNotes } = req.body;
  if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid complaint status.' });
  }

  run(
    `UPDATE maintenance_complaints 
     SET status = ?, resolution_notes = ?,
         resolved_on = (CASE WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP ELSE NULL END)
     WHERE id = ?`,
    [status, resolutionNotes || '', status, req.params.id]
  );

  res.json({ message: `Complaint #${req.params.id} marked as '${status}'.` });
});

export default router;
