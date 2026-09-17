import express from 'express';
import bcrypt from 'bcryptjs';
import { get, query, run } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Enforce admin-only access for all endpoints here
router.use(authenticateToken);
router.use(requireRole(['admin']));

// ==========================================
// 1. ADMIN DASHBOARD STATS
// ==========================================
router.get('/dashboard', (req, res) => {
  const studentsCount = get('SELECT count(*) as count FROM students');
  const facultyCount = get('SELECT count(*) as count FROM faculty');
  const subjectsCount = get('SELECT count(*) as count FROM subjects');
  const openComplaints = get('SELECT count(*) as count FROM maintenance_complaints WHERE status != "Resolved"');
  const pendingLeaves = get('SELECT count(*) as count FROM leave_applications WHERE status = "Pending"');
  const pendingProfileUpdates = get('SELECT count(*) as count FROM profile_update_requests WHERE status = "Pending"');
  const noticesCount = get('SELECT count(*) as count FROM notices');
  const pyqsCount = get('SELECT count(*) as count FROM question_papers');

  res.json({
    studentsCount: studentsCount ? studentsCount.count : 0,
    facultyCount: facultyCount ? facultyCount.count : 0,
    subjectsCount: subjectsCount ? subjectsCount.count : 0,
    openComplaints: openComplaints ? openComplaints.count : 0,
    pendingLeaves: pendingLeaves ? pendingLeaves.count : 0,
    pendingProfileUpdates: pendingProfileUpdates ? pendingProfileUpdates.count : 0,
    noticesCount: noticesCount ? noticesCount.count : 0,
    pyqsCount: pyqsCount ? pyqsCount.count : 0,
  });
});

// ==========================================
// 2. STUDENTS MASTER CRUD
// ==========================================
router.get('/students', (req, res) => {
  const { branch, semester, section, search } = req.query;
  let sql = 'SELECT s.*, u.username, u.must_change_password FROM students s JOIN users u ON s.user_id = u.id WHERE 1=1';
  const params = [];

  if (branch) {
    sql += ' AND s.branch = ?';
    params.push(branch);
  }
  if (semester) {
    sql += ' AND s.current_semester = ?';
    params.push(Number(semester));
  }
  if (section) {
    sql += ' AND s.section = ?';
    params.push(section);
  }
  if (search) {
    sql += ' AND (s.name LIKE ? OR s.roll_number LIKE ? OR s.erp_id LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY s.roll_number ASC';
  const students = query(sql, params);
  res.json({ students });
});

router.post('/students', (req, res) => {
  const data = req.body;
  const {
    rollNumber, name, branch, section, currentSemester, mobileNumber,
    personalEmail, collegeEmail, dob, gender, aadhaarNumber,
    fatherName, fatherMobile, motherName, guardianName, guardianRelation, guardianContact,
    hostelType, hostelNameRoom, permanentAddress, correspondenceAddress
  } = data;

  if (!rollNumber || !name || !branch || !mobileNumber) {
    return res.status(400).json({ message: 'Roll Number, Name, Branch, and Mobile Number are required.' });
  }

  // Check duplicate roll number
  const existing = get('SELECT roll_number FROM students WHERE roll_number = ?', [rollNumber]);
  if (existing) {
    return res.status(400).json({ message: `Student with roll number ${rollNumber} already exists.` });
  }

  // Generate default password: NAME IN CAPS + last 4 digits of mobile number
  const last4 = mobileNumber.slice(-4);
  const defaultPassword = `${name.toUpperCase().trim()}${last4}`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  const erpId = data.erpId || `ERP${new Date().getFullYear().toString().slice(-2)}${branch}${rollNumber.slice(-3)}`;
  const regDate = data.registrationDate || new Date().toISOString().split('T')[0];

  // Insert into users
  const userResult = run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    [rollNumber, passwordHash, 'student', 1]
  );

  // Insert into students
  run(
    `INSERT INTO students (
      roll_number, user_id, name, erp_id, registration_date, status, course,
      branch, section, current_semester, mobile_number, personal_email, college_email,
      dob, gender, aadhaar_number, permanent_address, correspondence_address,
      father_name, father_mobile, mother_name, guardian_name, guardian_relation, guardian_contact,
      hostel_type, hostel_name_room
    ) VALUES (?, ?, ?, ?, ?, 'active', 'B.Tech', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rollNumber, Number(userResult.lastInsertRowid), name.trim(), erpId, regDate,
      branch, section || 'A', Number(currentSemester || 1), mobileNumber, personalEmail || '', collegeEmail || '',
      dob || '2004-01-01', gender || 'Male', aadhaarNumber || '', permanentAddress || '', correspondenceAddress || '',
      fatherName || '', fatherMobile || '', motherName || '', guardianName || '', guardianRelation || '', guardianContact || '',
      hostelType || 'Day Scholar', hostelNameRoom || 'Day Scholar'
    ]
  );

  res.status(201).json({
    message: 'Student registered successfully!',
    defaultPassword,
    rollNumber
  });
});

router.put('/students/:rollNumber', (req, res) => {
  const { rollNumber } = req.params;
  const d = req.body;

  const existing = get('SELECT * FROM students WHERE roll_number = ?', [rollNumber]);
  if (!existing) return res.status(404).json({ message: 'Student not found.' });

  run(
    `UPDATE students SET
      name = ?, branch = ?, section = ?, current_semester = ?, mobile_number = ?,
      personal_email = ?, college_email = ?, dob = ?, gender = ?, aadhaar_number = ?,
      permanent_address = ?, correspondence_address = ?, father_name = ?, father_mobile = ?,
      mother_name = ?, guardian_name = ?, guardian_relation = ?, guardian_contact = ?,
      hostel_type = ?, hostel_name_room = ?, status = ?
     WHERE roll_number = ?`,
    [
      d.name || existing.name,
      d.branch || existing.branch,
      d.section || existing.section,
      Number(d.current_semester || existing.current_semester),
      d.mobile_number || existing.mobile_number,
      d.personal_email || existing.personal_email,
      d.college_email || existing.college_email,
      d.dob || existing.dob,
      d.gender || existing.gender,
      d.aadhaar_number || existing.aadhaar_number,
      d.permanent_address || existing.permanent_address,
      d.correspondence_address || existing.correspondence_address,
      d.father_name || existing.father_name,
      d.father_mobile || existing.father_mobile,
      d.mother_name || existing.mother_name,
      d.guardian_name || existing.guardian_name,
      d.guardian_relation || existing.guardian_relation,
      d.guardian_contact || existing.guardian_contact,
      d.hostel_type || existing.hostel_type,
      d.hostel_name_room || existing.hostel_name_room,
      d.status || existing.status,
      rollNumber
    ]
  );

  res.json({ message: 'Student profile updated successfully.' });
});

router.post('/students/:rollNumber/reset-password', (req, res) => {
  const { rollNumber } = req.params;
  const student = get('SELECT * FROM students WHERE roll_number = ?', [rollNumber]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });

  // Reset to default rule: NAME IN CAPS + last 4 digits
  const last4 = student.mobile_number.slice(-4);
  const defaultPassword = `${student.name.toUpperCase().trim()}${last4}`;
  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(defaultPassword, salt);

  run(
    'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
    [newHash, student.user_id]
  );

  res.json({
    message: `Password reset to default (${defaultPassword}). User will be prompted to change on next login.`,
    defaultPassword
  });
});

router.delete('/students/:rollNumber', (req, res) => {
  const { rollNumber } = req.params;
  const student = get('SELECT * FROM students WHERE roll_number = ?', [rollNumber]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });

  run('DELETE FROM users WHERE id = ?', [student.user_id]); // Cascades to student, marks, attendance
  res.json({ message: 'Student and related records deleted successfully.' });
});

// ==========================================
// 3. FACULTY MASTER CRUD
// ==========================================
router.get('/faculty', (req, res) => {
  const faculty = query(
    `SELECT f.*, u.username, u.must_change_password
     FROM faculty f
     JOIN users u ON f.user_id = u.id
     ORDER BY f.department ASC, f.name ASC`
  );
  res.json({ faculty });
});

router.post('/faculty', (req, res) => {
  const { employeeId, name, gender, department, designation, email, mobile, isHod, hodDepartment } = req.body;

  if (!employeeId || !name || !department || !email || !mobile) {
    return res.status(400).json({ message: 'Employee ID, Name, Department, Email, and Mobile are required.' });
  }

  const existing = get('SELECT employee_id FROM faculty WHERE employee_id = ?', [employeeId]);
  if (existing) return res.status(400).json({ message: `Faculty with ID ${employeeId} already exists.` });

  const defaultPassword = `${employeeId}@123`;
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  const role = isHod ? 'hod' : 'faculty';
  const userResult = run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    [employeeId, passwordHash, role, 1]
  );

  run(
    `INSERT INTO faculty (employee_id, user_id, name, gender, department, designation, email, mobile, is_hod, hod_department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employeeId, Number(userResult.lastInsertRowid), name.trim(), gender || 'Male',
      department, designation || 'Assistant Professor', email, mobile, isHod ? 1 : 0, isHod ? (hodDepartment || department) : null
    ]
  );

  res.status(201).json({
    message: 'Faculty member created successfully!',
    defaultPassword,
    employeeId
  });
});

router.put('/faculty/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const d = req.body;

  const existing = get('SELECT * FROM faculty WHERE employee_id = ?', [employeeId]);
  if (!existing) return res.status(404).json({ message: 'Faculty member not found.' });

  const isHod = d.is_hod !== undefined ? Number(d.is_hod) : existing.is_hod;
  const role = isHod ? 'hod' : 'faculty';

  // Update user role if HOD status changed
  run('UPDATE users SET role = ? WHERE id = ?', [role, existing.user_id]);

  run(
    `UPDATE faculty SET
      name = ?, gender = ?, department = ?, designation = ?, email = ?, mobile = ?,
      is_hod = ?, hod_department = ?
     WHERE employee_id = ?`,
    [
      d.name || existing.name,
      d.gender || existing.gender,
      d.department || existing.department,
      d.designation || existing.designation,
      d.email || existing.email,
      d.mobile || existing.mobile,
      isHod,
      isHod ? (d.hod_department || d.department || existing.department) : null,
      employeeId
    ]
  );

  res.json({ message: 'Faculty details updated successfully.' });
});

router.post('/faculty/:employeeId/reset-password', (req, res) => {
  const { employeeId } = req.params;
  const faculty = get('SELECT * FROM faculty WHERE employee_id = ?', [employeeId]);
  if (!faculty) return res.status(404).json({ message: 'Faculty member not found.' });

  const defaultPassword = `${employeeId}@123`;
  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(defaultPassword, salt);

  run('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [newHash, faculty.user_id]);
  res.json({ message: `Password reset to ${defaultPassword}`, defaultPassword });
});

router.delete('/faculty/:employeeId', (req, res) => {
  const { employeeId } = req.params;
  const fac = get('SELECT * FROM faculty WHERE employee_id = ?', [employeeId]);
  if (!fac) return res.status(404).json({ message: 'Faculty not found.' });

  run('DELETE FROM users WHERE id = ?', [fac.user_id]);
  res.json({ message: 'Faculty member removed successfully.' });
});

// ==========================================
// 4. CLASS MENTORS PAIRING (M+M, F+F, M+F)
// ==========================================
router.get('/mentors', (req, res) => {
  const mentors = query(
    `SELECT cm.*, 
            f1.name as primary_name, f1.gender as primary_gender, f1.department as primary_dept,
            f2.name as secondary_name, f2.gender as secondary_gender, f2.department as secondary_dept
     FROM class_mentors cm
     JOIN faculty f1 ON cm.primary_mentor_id = f1.employee_id
     JOIN faculty f2 ON cm.secondary_mentor_id = f2.employee_id
     ORDER BY cm.branch, cm.semester, cm.section`
  );
  res.json({ mentors });
});

router.post('/mentors', (req, res) => {
  const { branch, semester, section, primaryMentorId, secondaryMentorId } = req.body;

  if (!branch || !semester || !section || !primaryMentorId || !secondaryMentorId) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  run(
    `INSERT INTO class_mentors (branch, semester, section, primary_mentor_id, secondary_mentor_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(branch, semester, section)
     DO UPDATE SET primary_mentor_id = excluded.primary_mentor_id, secondary_mentor_id = excluded.secondary_mentor_id`,
    [branch, Number(semester), section, primaryMentorId, secondaryMentorId]
  );

  res.json({ message: 'Class Mentors assigned successfully!' });
});

router.delete('/mentors/:id', (req, res) => {
  run('DELETE FROM class_mentors WHERE id = ?', [req.params.id]);
  res.json({ message: 'Mentor assignment deleted.' });
});

// ==========================================
// 5. SUBJECTS MASTER CRUD (Semesters 1 - 8)
// ==========================================
router.get('/subjects', (req, res) => {
  const { semester, branch } = req.query;
  let sql = 'SELECT * FROM subjects WHERE 1=1';
  const params = [];

  if (semester) {
    sql += ' AND semester = ?';
    params.push(Number(semester));
  }
  if (branch) {
    sql += ' AND branch = ?';
    params.push(branch);
  }

  sql += ' ORDER BY semester ASC, code ASC';
  const subjects = query(sql, params);
  res.json({ subjects });
});

router.post('/subjects', (req, res) => {
  const { code, name, semester, branch, credits } = req.body;
  if (!code || !name || !semester || !branch) {
    return res.status(400).json({ message: 'Subject code, name, semester, and branch are required.' });
  }

  run(
    'INSERT INTO subjects (code, name, semester, branch, credits) VALUES (?, ?, ?, ?, ?)',
    [code.trim().toUpperCase(), name.trim(), Number(semester), branch, credits ? Number(credits) : 4]
  );

  res.status(201).json({ message: 'Subject added to syllabus!' });
});

router.put('/subjects/:code', (req, res) => {
  const { code } = req.params;
  const { name, semester, branch, credits } = req.body;

  run(
    'UPDATE subjects SET name = ?, semester = ?, branch = ?, credits = ? WHERE code = ?',
    [name, Number(semester), branch, Number(credits || 4), code]
  );

  res.json({ message: 'Subject updated successfully.' });
});

router.delete('/subjects/:code', (req, res) => {
  run('DELETE FROM subjects WHERE code = ?', [req.params.code]);
  res.json({ message: 'Subject removed from curriculum.' });
});

// ==========================================
// 6. FACULTY SUBJECT ALLOCATIONS
// ==========================================
router.get('/allocations', (req, res) => {
  const allocations = query(
    `SELECT a.*, f.name as faculty_name, f.department, s.name as subject_name, s.semester, s.branch
     FROM faculty_subject_allocations a
     JOIN faculty f ON a.faculty_id = f.employee_id
     JOIN subjects s ON a.subject_code = s.code
     ORDER BY s.semester, a.section`
  );
  res.json({ allocations });
});

router.post('/allocations', (req, res) => {
  const { facultyId, subjectCode, section } = req.body;
  if (!facultyId || !subjectCode || !section) {
    return res.status(400).json({ message: 'Faculty, Subject Code, and Section are required.' });
  }

  run(
    `INSERT INTO faculty_subject_allocations (faculty_id, subject_code, section)
     VALUES (?, ?, ?)
     ON CONFLICT(faculty_id, subject_code, section) DO NOTHING`,
    [facultyId, subjectCode, section]
  );

  res.json({ message: 'Faculty allocated to subject section successfully.' });
});

router.delete('/allocations/:id', (req, res) => {
  run('DELETE FROM faculty_subject_allocations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Allocation removed.' });
});

// ==========================================
// 7. NOTICES CRUD
// ==========================================
router.get('/notices', (req, res) => {
  const notices = query('SELECT * FROM notices ORDER BY id DESC');
  res.json({ notices });
});

router.post('/notices', upload.single('attachment'), (req, res) => {
  const { title, description, targetAudience, category } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required.' });
  }

  const fileAttachment = req.file ? req.file.filename : '';

  run(
    `INSERT INTO notices (title, description, file_attachment, posted_by, target_audience, category)
     VALUES (?, ?, ?, 'Admin Office', ?, ?)`,
    [title.trim(), description.trim(), fileAttachment, targetAudience || 'all', category || 'General']
  );

  res.status(201).json({ message: 'Notice published successfully!' });
});

router.delete('/notices/:id', (req, res) => {
  run('DELETE FROM notices WHERE id = ?', [req.params.id]);
  res.json({ message: 'Notice deleted.' });
});

// ==========================================
// 8. UNIVERSITY QUESTION PAPERS (AKTU PYQs)
// ==========================================
router.get('/pyqs', (req, res) => {
  const papers = query(
    `SELECT qp.*, s.name as subject_name
     FROM question_papers qp
     JOIN subjects s ON qp.subject_code = s.code
     ORDER BY qp.year DESC, qp.semester ASC`
  );
  res.json({ papers });
});

router.post('/pyqs', upload.single('paperFile'), (req, res) => {
  const { title, subjectCode, year, examType, branch, semester } = req.body;
  if (!title || !subjectCode || !year || !req.file) {
    return res.status(400).json({ message: 'Title, subject, year, and paper file (PDF) are required.' });
  }

  run(
    `INSERT INTO question_papers (title, subject_code, year, exam_type, branch, semester, file_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')`,
    [title.trim(), subjectCode, Number(year), examType || 'PYQ', branch || 'CSE', Number(semester || 1), req.file.filename]
  );

  res.status(201).json({ message: 'Question paper added to repository!' });
});

router.delete('/pyqs/:id', (req, res) => {
  run('DELETE FROM question_papers WHERE id = ?', [req.params.id]);
  res.json({ message: 'Question paper removed.' });
});

// ==========================================
// 9. IMPORTANT RESOURCES / LINKS CRUD
// ==========================================
router.get('/resources', (req, res) => {
  const resources = query('SELECT * FROM important_resources ORDER BY id ASC');
  res.json({ resources });
});

router.post('/resources', upload.single('resourceFile'), (req, res) => {
  const { title, category, externalLink, description } = req.body;
  if (!title || !category) {
    return res.status(400).json({ message: 'Title and category are required.' });
  }

  const filePath = req.file ? req.file.filename : '';

  run(
    `INSERT INTO important_resources (title, category, file_path, external_link, description, uploaded_by)
     VALUES (?, ?, ?, ?, ?, 'admin')`,
    [title.trim(), category, filePath, externalLink || '', description || '']
  );

  res.status(201).json({ message: 'Resource link/document created successfully!' });
});

router.delete('/resources/:id', (req, res) => {
  run('DELETE FROM important_resources WHERE id = ?', [req.params.id]);
  res.json({ message: 'Resource removed.' });
});

// ==========================================
// 10. MAINTENANCE COMPLAINTS OVERRIDE
// ==========================================
router.get('/complaints', (req, res) => {
  const complaints = query(
    `SELECT c.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number
     FROM maintenance_complaints c
     JOIN students s ON c.student_roll_no = s.roll_number
     ORDER BY c.id DESC`
  );
  res.json({ complaints });
});

router.patch('/complaints/:id', (req, res) => {
  const { status, resolutionNotes } = req.body;
  run(
    `UPDATE maintenance_complaints 
     SET status = ?, resolution_notes = ?, resolved_by = 'admin', resolved_on = (CASE WHEN ? = 'Resolved' THEN CURRENT_TIMESTAMP ELSE NULL END)
     WHERE id = ?`,
    [status, resolutionNotes || '', status, req.params.id]
  );
  res.json({ message: 'Complaint status updated.' });
});

// ==========================================
// 11. PROFILE UPDATE REQUESTS APPROVAL
// ==========================================
router.get('/profile-requests', (req, res) => {
  const requests = query(
    `SELECT r.*, s.name as student_name, s.branch, s.current_semester, s.section, s.mobile_number
     FROM profile_update_requests r
     JOIN students s ON r.student_roll_no = s.roll_number
     ORDER BY r.id DESC`
  );
  res.json({ requests });
});

router.patch('/profile-requests/:id', (req, res) => {
  const { status, adminRemarks } = req.body;
  run(
    'UPDATE profile_update_requests SET status = ?, admin_remarks = ? WHERE id = ?',
    [status, adminRemarks || '', req.params.id]
  );
  res.json({ message: `Request marked as ${status}.` });
});

// ==========================================
// 12. SYSTEM SETTINGS
// ==========================================
router.get('/settings', (req, res) => {
  const settings = query('SELECT * FROM system_settings');
  const settingsMap = {};
  settings.forEach(s => { settingsMap[s.key] = s.value; });
  res.json({ settings: settingsMap });
});

router.post('/settings', (req, res) => {
  const { extraAttendanceNeutral, collegeName } = req.body;
  if (extraAttendanceNeutral !== undefined) {
    run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['extra_attendance_neutral', String(extraAttendanceNeutral)]);
  }
  if (collegeName !== undefined) {
    run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['college_name', collegeName]);
  }
  res.json({ message: 'System settings saved.' });
});

export default router;
