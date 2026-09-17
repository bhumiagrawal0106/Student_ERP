import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db, run, get, exec } from './db.js';
import { initializeSchema } from './schema.js';
import { CONFIG } from '../config/index.js';

export function seedDatabase() {
  console.log('Initializing database schema...');
  initializeSchema();

  // Create sample files in uploads directory
  const samplePdfPath = path.join(CONFIG.UPLOADS_DIR, 'sample_academic_calendar_2025_26.pdf');
  const sampleProofPath = path.join(CONFIG.UPLOADS_DIR, 'sample_medical_prescription.pdf');
  const sampleComplaintPhoto = path.join(CONFIG.UPLOADS_DIR, 'sample_ac_fault.jpg');
  const samplePyqPath = path.join(CONFIG.UPLOADS_DIR, 'sample_aktu_dbms_pyq_2024.pdf');

  if (!fs.existsSync(samplePdfPath)) {
    fs.writeFileSync(samplePdfPath, '%PDF-1.4 Mock College Academic Calendar 2025-2026 (Odd/Even Semesters)');
  }
  if (!fs.existsSync(sampleProofPath)) {
    fs.writeFileSync(sampleProofPath, '%PDF-1.4 Mock Medical Certificate / Prescription - Dr. S. K. Gupta Hospital');
  }
  if (!fs.existsSync(sampleComplaintPhoto)) {
    fs.writeFileSync(sampleComplaintPhoto, 'MOCK_IMAGE_DATA_ROOM_LT_304_AC_FAN_DAMAGE');
  }
  if (!fs.existsSync(samplePyqPath)) {
    fs.writeFileSync(samplePyqPath, '%PDF-1.4 AKTU University Previous Year Question Paper: KCS501 DBMS (2024-25)');
  }

  // Check if admin already exists
  const existingAdmin = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (existingAdmin) {
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('Seeding initial data...');

  const salt = bcrypt.genSaltSync(10);
  const hashPass = (plain) => bcrypt.hashSync(plain, salt);

  // 1. Create Admin
  const adminUser = run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    ['admin', hashPass('Admin@ERP2026'), 'admin', 0]
  );

  // 2. Create Maintenance Officer
  run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    ['maint01', hashPass('Maint@2026'), 'maintenance', 0]
  );

  // 3. Create HODs
  // HOD CSE
  const hodCseUser = run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    ['HOD_CSE', hashPass('HOD_CSE@123'), 'hod', 1]
  );
  run(
    `INSERT INTO faculty (employee_id, user_id, name, gender, department, designation, email, mobile, is_hod, hod_department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['HOD_CSE', Number(hodCseUser.lastInsertRowid), 'Dr. Rajesh Sharma', 'Male', 'Computer Science & Engineering', 'Professor & HOD', 'hod.cse@college.edu', '9876543210', 1, 'Computer Science & Engineering']
  );

  // HOD ECE
  const hodEceUser = run(
    'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
    ['HOD_ECE', hashPass('HOD_ECE@123'), 'hod', 1]
  );
  run(
    `INSERT INTO faculty (employee_id, user_id, name, gender, department, designation, email, mobile, is_hod, hod_department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['HOD_ECE', Number(hodEceUser.lastInsertRowid), 'Dr. Sunita Verma', 'Female', 'Electronics & Communication Engineering', 'Professor & HOD', 'hod.ece@college.edu', '9876543220', 1, 'Electronics & Communication Engineering']
  );

  // 4. Create Faculty Members (Demonstrating male & female combinations)
  const facultyData = [
    { id: 'FAC101', name: 'Prof. Vikram Malhotra', gender: 'Male', dept: 'Computer Science & Engineering', desig: 'Associate Professor', email: 'vikram.malhotra@college.edu', mobile: '9876500101' },
    { id: 'FAC102', name: 'Dr. Ananya Iyer', gender: 'Female', dept: 'Computer Science & Engineering', desig: 'Assistant Professor', email: 'ananya.iyer@college.edu', mobile: '9876500102' },
    { id: 'FAC103', name: 'Prof. Sandeep Bansal', gender: 'Male', dept: 'Computer Science & Engineering', desig: 'Assistant Professor', email: 'sandeep.bansal@college.edu', mobile: '9876500103' },
    { id: 'FAC104', name: 'Dr. Neha Gupta', gender: 'Female', dept: 'Computer Science & Engineering', desig: 'Associate Professor', email: 'neha.gupta@college.edu', mobile: '9876500104' },
    { id: 'FAC105', name: 'Prof. Amit Joshi', gender: 'Male', dept: 'Electronics & Communication Engineering', desig: 'Assistant Professor', email: 'amit.joshi@college.edu', mobile: '9876500105' },
    { id: 'FAC106', name: 'Dr. Priya Nair', gender: 'Female', dept: 'Electronics & Communication Engineering', desig: 'Assistant Professor', email: 'priya.nair@college.edu', mobile: '9876500106' },
  ];

  for (const fac of facultyData) {
    const facUser = run(
      'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
      [fac.id, hashPass(`${fac.id}@123`), 'faculty', 1]
    );
    run(
      `INSERT INTO faculty (employee_id, user_id, name, gender, department, designation, email, mobile, is_hod, hod_department)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [fac.id, Number(facUser.lastInsertRowid), fac.name, fac.gender, fac.dept, fac.desig, fac.email, fac.mobile]
    );
  }

  // 5. Create Class Mentors (Covering M+F, M+M, and F+F pairings)
  run(
    `INSERT INTO class_mentors (branch, semester, section, primary_mentor_id, secondary_mentor_id)
     VALUES (?, ?, ?, ?, ?)`,
    ['CSE', 5, 'A', 'FAC101', 'FAC102'] // M + F
  );
  run(
    `INSERT INTO class_mentors (branch, semester, section, primary_mentor_id, secondary_mentor_id)
     VALUES (?, ?, ?, ?, ?)`,
    ['CSE', 5, 'B', 'FAC101', 'FAC103'] // M + M
  );
  run(
    `INSERT INTO class_mentors (branch, semester, section, primary_mentor_id, secondary_mentor_id)
     VALUES (?, ?, ?, ?, ?)`,
    ['CSE', 6, 'A', 'FAC102', 'FAC104'] // F + F
  );
  run(
    `INSERT INTO class_mentors (branch, semester, section, primary_mentor_id, secondary_mentor_id)
     VALUES (?, ?, ?, ?, ?)`,
    ['CSE', 3, 'A', 'FAC104', 'FAC103'] // F + M
  );

  // 6. Create AKTU Curriculum Subjects (All 8 Semesters)
  const subjectsData = [
    // Sem 1
    { code: 'KAS101T', name: 'Engineering Physics', sem: 1, branch: 'CSE', credits: 4 },
    { code: 'KAS102T', name: 'Engineering Mathematics-I', sem: 1, branch: 'CSE', credits: 4 },
    { code: 'KEE101T', name: 'Basic Electrical Engineering', sem: 1, branch: 'CSE', credits: 3 },
    { code: 'KCS101T', name: 'Programming for Problem Solving', sem: 1, branch: 'CSE', credits: 3 },
    // Sem 2
    { code: 'KAS201T', name: 'Engineering Chemistry', sem: 2, branch: 'CSE', credits: 4 },
    { code: 'KAS202T', name: 'Engineering Mathematics-II', sem: 2, branch: 'CSE', credits: 4 },
    { code: 'KEC201T', name: 'Emerging Domain in Electronics', sem: 2, branch: 'CSE', credits: 3 },
    { code: 'KCS201T', name: 'Data Structures Fundamentals', sem: 2, branch: 'CSE', credits: 4 },
    // Sem 3
    { code: 'KCS301', name: 'Data Structures', sem: 3, branch: 'CSE', credits: 4 },
    { code: 'KCS302', name: 'Computer System Architecture', sem: 3, branch: 'CSE', credits: 3 },
    { code: 'KCS303', name: 'Discrete Structures & Logic', sem: 3, branch: 'CSE', credits: 4 },
    { code: 'KAS302', name: 'Maths-IV (PDE & Complex Analysis)', sem: 3, branch: 'CSE', credits: 4 },
    // Sem 4
    { code: 'KCS401', name: 'Operating Systems', sem: 4, branch: 'CSE', credits: 4 },
    { code: 'KCS402', name: 'Theory of Computation', sem: 4, branch: 'CSE', credits: 4 },
    { code: 'KCS403', name: 'Microprocessors & Interfaces', sem: 4, branch: 'CSE', credits: 3 },
    { code: 'KVE401', name: 'Universal Human Values', sem: 4, branch: 'CSE', credits: 3 },
    // Sem 5
    { code: 'KCS501', name: 'Database Management Systems', sem: 5, branch: 'CSE', credits: 4 },
    { code: 'KCS502', name: 'Compiler Design', sem: 5, branch: 'CSE', credits: 4 },
    { code: 'KCS503', name: 'Design and Analysis of Algorithms', sem: 5, branch: 'CSE', credits: 4 },
    { code: 'KCS051', name: 'Object Oriented System Design', sem: 5, branch: 'CSE', credits: 3 },
    // Sem 6
    { code: 'KCS601', name: 'Software Engineering', sem: 6, branch: 'CSE', credits: 4 },
    { code: 'KCS602', name: 'Web Technology', sem: 6, branch: 'CSE', credits: 4 },
    { code: 'KCS603', name: 'Computer Networks', sem: 6, branch: 'CSE', credits: 4 },
    { code: 'KIT061', name: 'Big Data Analytics', sem: 6, branch: 'CSE', credits: 3 },
    // Sem 7
    { code: 'KCS701', name: 'Artificial Intelligence & Machine Learning', sem: 7, branch: 'CSE', credits: 4 },
    { code: 'KCS702', name: 'Cloud Computing & Virtualization', sem: 7, branch: 'CSE', credits: 3 },
    { code: 'KHU701', name: 'Rural Development & Project Management', sem: 7, branch: 'CSE', credits: 3 },
    // Sem 8
    { code: 'KCS801', name: 'Major Project Dissertation & Viva', sem: 8, branch: 'CSE', credits: 10 },
    { code: 'KCS802', name: 'Cyber Security & IT Laws', sem: 8, branch: 'CSE', credits: 3 },
  ];

  for (const s of subjectsData) {
    run(
      'INSERT INTO subjects (code, name, semester, branch, credits) VALUES (?, ?, ?, ?, ?)',
      [s.code, s.name, s.sem, s.branch, s.credits]
    );
  }

  // 7. Allocate Faculty to Subjects & Sections
  run('INSERT INTO faculty_subject_allocations (faculty_id, subject_code, section) VALUES (?, ?, ?)', ['FAC101', 'KCS501', 'A']); // Vikram -> DBMS Sem 5A
  run('INSERT INTO faculty_subject_allocations (faculty_id, subject_code, section) VALUES (?, ?, ?)', ['FAC102', 'KCS502', 'A']); // Ananya -> Compiler Sem 5A
  run('INSERT INTO faculty_subject_allocations (faculty_id, subject_code, section) VALUES (?, ?, ?)', ['FAC103', 'KCS503', 'A']); // Sandeep -> DAA Sem 5A
  run('INSERT INTO faculty_subject_allocations (faculty_id, subject_code, section) VALUES (?, ?, ?)', ['FAC104', 'KCS051', 'A']); // Neha -> OOSD Sem 5A

  // 8. Create Students
  // Default password rule: STUDENT NAME IN CAPS + last 4 digits of registered mobile number
  // E.g. "Aman Singh", mobile ending 4321 -> password AMAN SINGH4321
  const studentsSeed = [
    {
      roll: '210097010001',
      name: 'Aman Singh',
      mobile: '9876544321', // ends 4321 -> AMAN SINGH4321
      email: 'aman.singh21@college.edu',
      personalEmail: 'aman.singh.tech@gmail.com',
      branch: 'CSE',
      section: 'A',
      sem: 5,
      erpId: 'ERP21CSE001',
      regDate: '2021-08-10',
      dob: '2003-04-14',
      gender: 'Male',
      aadhaar: '4589-1234-9876',
      father: 'Rajendra Singh',
      fatherMob: '9876511111',
      mother: 'Sarita Singh',
      hostelType: 'Hostel',
      hostelRoom: 'Shivalik Hostel, Room B-204',
      permAddr: 'Plot 42, Civil Lines, Prayagraj, UP - 211001',
      corrAddr: 'Shivalik Hostel Room B-204, College Campus',
      guardian: 'Manoj Singh (Uncle)',
      guardianRel: 'Paternal Uncle',
      guardianContact: '9876599999'
    },
    {
      roll: '210097010002',
      name: 'Pooja Sharma',
      mobile: '9876501234', // ends 1234 -> POOJA SHARMA1234
      email: 'pooja.sharma21@college.edu',
      personalEmail: 'pooja.sharma03@gmail.com',
      branch: 'CSE',
      section: 'A',
      sem: 5,
      erpId: 'ERP21CSE002',
      regDate: '2021-08-10',
      dob: '2003-09-22',
      gender: 'Female',
      aadhaar: '7890-5432-1122',
      father: 'Vipin Sharma',
      fatherMob: '9876522222',
      mother: 'Kavita Sharma',
      hostelType: 'Day Scholar',
      hostelRoom: 'Day Scholar',
      permAddr: 'H-12, Sector 62, Noida, UP - 201309',
      corrAddr: 'H-12, Sector 62, Noida, UP - 201309',
      guardian: '',
      guardianRel: '',
      guardianContact: ''
    },
    {
      roll: '210097010003',
      name: 'Rohan Verma',
      mobile: '9876505678', // ends 5678 -> ROHAN VERMA5678
      email: 'rohan.verma21@college.edu',
      personalEmail: 'rohan.verma.code@gmail.com',
      branch: 'CSE',
      section: 'B',
      sem: 5,
      erpId: 'ERP21CSE003',
      regDate: '2021-08-12',
      dob: '2002-11-05',
      gender: 'Male',
      aadhaar: '3456-7890-2345',
      father: 'Ashok Verma',
      fatherMob: '9876533333',
      mother: 'Sunita Verma',
      hostelType: 'Day Scholar',
      hostelRoom: 'Day Scholar',
      permAddr: 'Flat 102, Green Avenue, Ghaziabad, UP - 201014',
      corrAddr: 'Flat 102, Green Avenue, Ghaziabad, UP - 201014',
      guardian: '',
      guardianRel: '',
      guardianContact: ''
    },
    {
      roll: '200097010004',
      name: 'Sneha Patel',
      mobile: '9876509988', // ends 9988 -> SNEHA PATEL9988
      email: 'sneha.patel20@college.edu',
      personalEmail: 'sneha.patel.ai@gmail.com',
      branch: 'CSE',
      section: 'A',
      sem: 7,
      erpId: 'ERP20CSE004',
      regDate: '2020-08-15',
      dob: '2002-02-18',
      gender: 'Female',
      aadhaar: '9012-3456-7812',
      father: 'Bhupendra Patel',
      fatherMob: '9876544444',
      mother: 'Rekha Patel',
      hostelType: 'Hostel',
      hostelRoom: 'Mandakini Girls Hostel, Room 112',
      permAddr: 'B-4, Aliganj, Lucknow, UP - 226024',
      corrAddr: 'Mandakini Girls Hostel Room 112, College Campus',
      guardian: '',
      guardianRel: '',
      guardianContact: ''
    }
  ];

  for (const st of studentsSeed) {
    const defaultPassword = `${st.name.toUpperCase()}${st.mobile.slice(-4)}`;
    const studentUser = run(
      'INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, ?)',
      [st.roll, hashPass(defaultPassword), 'student', 1]
    );

    run(
      `INSERT INTO students (
        roll_number, user_id, name, photo, erp_id, registration_date, status, course,
        branch, section, current_semester, mobile_number, personal_email, college_email,
        dob, gender, aadhaar_number, category, religion, permanent_address,
        correspondence_address, father_name, father_mobile, mother_name,
        guardian_name, guardian_relation, guardian_contact, hostel_type, hostel_name_room
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', 'B.Tech', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'General', 'Hinduism', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        st.roll, Number(studentUser.lastInsertRowid), st.name, '', st.erpId, st.regDate,
        st.branch, st.section, st.sem, st.mobile, st.personalEmail, st.email,
        st.dob, st.gender, st.aadhaar, st.permAddr,
        st.corrAddr, st.father, st.fatherMob, st.mother,
        st.guardian, st.guardianRel, st.guardianContact, st.hostelType, st.hostelRoom
      ]
    );
  }

  // 9. Sessional Marks for Aman Singh & Pooja Sharma (Sem 1 to 5)
  // Past semesters (Sem 1-4) + Current Sem 5
  const pastSemMarks = [
    // Sem 3
    { roll: '210097010001', code: 'KCS301', sem: 3, st1: 27, st2: 28, put: 45, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS302', sem: 3, st1: 25, st2: 26, put: 42, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS303', sem: 3, st1: 28, st2: 29, put: 48, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KAS302', sem: 3, st1: 24, st2: 25, put: 40, maxSt: 30, maxPut: 50 },
    // Sem 4
    { roll: '210097010001', code: 'KCS401', sem: 4, st1: 26, st2: 27, put: 44, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS402', sem: 4, st1: 28, st2: 29, put: 47, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS403', sem: 4, st1: 25, st2: 24, put: 41, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KVE401', sem: 4, st1: 29, st2: 30, put: 48, maxSt: 30, maxPut: 50 },
    // Current Sem 5
    { roll: '210097010001', code: 'KCS501', sem: 5, st1: 27.5, st2: 28.0, put: 46.0, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS502', sem: 5, st1: 26.0, st2: 27.5, put: 44.5, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS503', sem: 5, st1: 29.0, st2: 28.5, put: 47.0, maxSt: 30, maxPut: 50 },
    { roll: '210097010001', code: 'KCS051', sem: 5, st1: 25.0, st2: 26.0, put: 43.0, maxSt: 30, maxPut: 50 },
    // Pooja Sem 5
    { roll: '210097010002', code: 'KCS501', sem: 5, st1: 28.5, st2: 29.0, put: 48.0, maxSt: 30, maxPut: 50 },
    { roll: '210097010002', code: 'KCS502', sem: 5, st1: 27.0, st2: 28.0, put: 46.0, maxSt: 30, maxPut: 50 },
    { roll: '210097010002', code: 'KCS503', sem: 5, st1: 29.5, st2: 29.0, put: 49.0, maxSt: 30, maxPut: 50 },
    { roll: '210097010002', code: 'KCS051', sem: 5, st1: 28.0, st2: 27.5, put: 45.0, maxSt: 30, maxPut: 50 },
  ];

  for (const m of pastSemMarks) {
    run(
      'INSERT INTO sessional_marks (student_roll_no, subject_code, semester, exam_type, marks_obtained, max_marks, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.roll, m.code, m.sem, 'ST1', m.st1, m.maxSt, 'FAC101']
    );
    run(
      'INSERT INTO sessional_marks (student_roll_no, subject_code, semester, exam_type, marks_obtained, max_marks, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.roll, m.code, m.sem, 'ST2', m.st2, m.maxSt, 'FAC101']
    );
    run(
      'INSERT INTO sessional_marks (student_roll_no, subject_code, semester, exam_type, marks_obtained, max_marks, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.roll, m.code, m.sem, 'PUT', m.put, m.maxPut, 'FAC101']
    );
  }

  // 10. Realistic 8-period Attendance for 5 recent working days
  const sampleDates = ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-16'];
  const sem5Subjects = ['KCS501', 'KCS502', 'KCS503', 'KCS051', 'KCS501', 'KCS502', 'KCS503', 'KCS051'];

  for (const date of sampleDates) {
    for (let p = 1; p <= 8; p++) {
      const subj = sem5Subjects[p - 1];
      // Aman: mostly Present, 1 absent on day 2, 1 Extra (sports/cultural event) on day 4
      let amanStatus = 'Present';
      if (date === '2026-03-11' && (p === 3 || p === 4)) amanStatus = 'Absent';
      if (date === '2026-03-13' && (p === 7 || p === 8)) amanStatus = 'Extra';

      run(
        'INSERT INTO attendance (student_roll_no, date, period_number, subject_code, status, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
        ['210097010001', date, p, subj, amanStatus, 'FAC101']
      );

      // Pooja: all Present
      run(
        'INSERT INTO attendance (student_roll_no, date, period_number, subject_code, status, marked_by) VALUES (?, ?, ?, ?, ?, ?)',
        ['210097010002', date, p, subj, 'Present', 'FAC101']
      );
    }
  }

  // 11. Notices
  run(
    `INSERT INTO notices (title, description, file_attachment, posted_by, posted_date, target_audience, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'Pre-University Test (PUT) Schedule - Even Semester 2026',
      'The Pre-University Test (PUT) for 3rd, 5th, and 7th semester students will commence from April 2nd, 2026. Detailed seating plan will be available on the ERP notice board.',
      'sample_academic_calendar_2025_26.pdf',
      'Academic Cell (Admin)',
      '2026-03-14',
      'all',
      'Exam'
    ]
  );
  run(
    `INSERT INTO notices (title, description, file_attachment, posted_by, posted_date, target_audience, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'Campus Recruitment Drive: Tata Consultancy Services (TCS Digital)',
      'TCS Digital recruitment drive registration is now live for final year and pre-final year students. Minimum 75% attendance criteria applies strictly.',
      '',
      'Training & Placement Cell',
      '2026-03-12',
      'CSE',
      'Placement'
    ]
  );
  run(
    `INSERT INTO notices (title, description, file_attachment, posted_by, posted_date, target_audience, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'Smart India Hackathon 2026 - Internal College Screening',
      'All branch teams must submit their problem statement abstract and GitHub prototype repository by March 25, 2026.',
      '',
      'R&D Innovation Club',
      '2026-03-08',
      'all',
      'Event'
    ]
  );

  // 12. Leave Applications
  run(
    `INSERT INTO leave_applications (
      student_roll_no, from_date, to_date, reason, medical_proof_file, applied_on,
      status, mentor1_status, mentor1_remark, mentor2_status, mentor2_remark, reviewed_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '210097010001',
      '2026-03-17',
      '2026-03-19',
      'Severe viral fever and eye infection. Advised bed rest by doctor.',
      'sample_medical_prescription.pdf',
      '2026-03-16 10:30:00',
      'Approved',
      'Approved',
      'Medical certificate verified. Granted 3 days leave.',
      'Approved',
      'Take care and catch up on missed assignments.',
      '2026-03-16 14:20:00'
    ]
  );

  // 13. Confidential Faculty Feedback (ONLY HOD CSE Can view!)
  run(
    `INSERT INTO faculty_feedback (student_roll_no, faculty_id, department, feedback_text, rating, submitted_on, status, hod_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '210097010001',
      'FAC101',
      'Computer Science & Engineering',
      'Prof. Vikram explains relational algebra very thoroughly, but could provide more practical SQL problem sets on LeetCode during tutorial periods.',
      4,
      '2026-03-10 11:15:00',
      'Reviewed',
      'Discussed in departmental academic audit. Suggested adding more online SQL practice.'
    ]
  );

  // 14. University Question Papers (AKTU PYQs)
  run(
    `INSERT INTO question_papers (title, subject_code, year, exam_type, branch, semester, file_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'AKTU End Semester Exam: Database Management Systems (KCS501)',
      'KCS501',
      2024,
      'PYQ',
      'CSE',
      5,
      'sample_aktu_dbms_pyq_2024.pdf',
      'admin'
    ]
  );
  run(
    `INSERT INTO question_papers (title, subject_code, year, exam_type, branch, semester, file_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'AKTU End Semester Exam: Design & Analysis of Algorithms (KCS503)',
      'KCS503',
      2024,
      'PYQ',
      'CSE',
      5,
      'sample_aktu_dbms_pyq_2024.pdf',
      'admin'
    ]
  );
  run(
    `INSERT INTO question_papers (title, subject_code, year, exam_type, branch, semester, file_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Model Question Paper Set-1: Compiler Design (KCS502)',
      'KCS502',
      2025,
      'Model Paper',
      'CSE',
      5,
      'sample_aktu_dbms_pyq_2024.pdf',
      'admin'
    ]
  );

  // 15. Maintenance Complaints
  run(
    `INSERT INTO maintenance_complaints (
      student_roll_no, location, category, description, photo_attachment, submitted_on,
      status, resolved_by, resolution_notes, resolved_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '210097010001',
      'Lecture Theatre LT-304 (3rd Floor Academic Block B)',
      'AC',
      'The split air conditioning unit on the south wall of LT-304 makes a loud rattling sound and stops cooling after 10 minutes, making afternoon lectures difficult to hear.',
      'sample_ac_fault.jpg',
      '2026-03-14 09:30:00',
      'In Progress',
      'maint01',
      'Technician visited and identified faulty blower fan bearing. Replacement parts ordered.',
      null
    ]
  );
  run(
    `INSERT INTO maintenance_complaints (
      student_roll_no, location, category, description, photo_attachment, submitted_on,
      status, resolved_by, resolution_notes, resolved_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '210097010002',
      'Computer Lab 4 (Ground Floor CS Wing)',
      'Chair',
      'Four rolling desk chairs in Row 2 have broken hydraulic lifters and cracked armrests which can cause injury.',
      '',
      '2026-03-11 15:45:00',
      'Resolved',
      'maint01',
      'Replaced with 4 new ergonomic lab chairs from campus inventory.',
      '2026-03-13 17:00:00'
    ]
  );

  // 16. Important Resources & Documents
  const resourcesData = [
    {
      title: 'Official Academic Calendar 2025-2026 (Even & Odd Semesters)',
      category: 'Academic Calendar',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: '',
      desc: 'Complete schedules for registration, sessional exams, technical fest, cultural week, and university exams.'
    },
    {
      title: 'AICTE Extension of Approval (EoA) Mandatory Disclosure',
      category: 'AICTE Approval',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: 'https://www.aicte-india.org',
      desc: 'Annual regulatory approval certificate and sanctioned intake capacity for B.Tech programs.'
    },
    {
      title: 'Institutional Development Plan (IDP) 2025-2030',
      category: 'College Development Plan',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: '',
      desc: 'Strategic roadmap for AI & Quantum Computing laboratories, green campus infrastructure, and faculty research grants.'
    },
    {
      title: 'Student Discipline, Anti-Ragging & Code of Conduct Regulations',
      category: 'Rules & Regulations',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: '',
      desc: 'University rules on anti-ragging, academic ethics, library usage, and campus decorum.'
    },
    {
      title: 'Campus Chronicle - Annual College Magazine (Vol 18)',
      category: 'College Magazine',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: '',
      desc: 'Highlights student research publications, creative writing, artistic submissions, and sports victories.'
    },
    {
      title: 'Undergraduate Research & Seed Funding Policy Circular',
      category: 'Student R&D Circular',
      file: 'sample_academic_calendar_2025_26.pdf',
      link: '',
      desc: 'Guidelines for availing up to INR 50,000 institution funding for patent filing and IEEE conference papers.'
    },
    {
      title: 'Emergency Contact Helplines & Key Administrative Numbers',
      category: 'Contact Helplines',
      file: '',
      link: '',
      desc: 'Admin Office: +91-120-2400100 | Chief Proctor: +91-9876500001 | Boys Hostel Warden: +91-9876500002 | Girls Hostel Warden: +91-9876500003 | Campus Ambulance & Health Centre: 108 / +91-9876500004 | Maintenance Desk: +91-9876500005'
    }
  ];

  for (const res of resourcesData) {
    run(
      `INSERT INTO important_resources (title, category, file_path, external_link, description, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [res.title, res.category, res.file, res.link, res.desc, 'admin']
    );
  }

  // 17. System Settings
  run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['extra_attendance_neutral', '1']);
  run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['college_name', 'Institute of Engineering & Technology']);

  console.log('Database seeded successfully!');
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  seedDatabase();
}
