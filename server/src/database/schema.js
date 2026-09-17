import { exec } from './db.js';

export function initializeSchema() {
  const schemaSql = `
    -- Enable foreign key integrity
    PRAGMA foreign_keys = ON;

    -- Users table for authentication
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'hod', 'admin', 'maintenance')),
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Students table
    CREATE TABLE IF NOT EXISTS students (
      roll_number TEXT PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      photo TEXT,
      erp_id TEXT UNIQUE NOT NULL,
      registration_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated')),
      course TEXT NOT NULL DEFAULT 'B.Tech',
      branch TEXT NOT NULL,
      section TEXT NOT NULL,
      current_semester INTEGER NOT NULL CHECK(current_semester BETWEEN 1 AND 8),
      mobile_number TEXT NOT NULL,
      personal_email TEXT NOT NULL,
      college_email TEXT NOT NULL,
      dob DATE NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      aadhaar_number TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      religion TEXT NOT NULL DEFAULT 'Hinduism',
      permanent_address TEXT NOT NULL,
      correspondence_address TEXT NOT NULL,
      father_name TEXT NOT NULL,
      father_mobile TEXT NOT NULL,
      mother_name TEXT NOT NULL,
      guardian_name TEXT,
      guardian_relation TEXT,
      guardian_contact TEXT,
      hostel_type TEXT NOT NULL DEFAULT 'Day Scholar' CHECK(hostel_type IN ('Day Scholar', 'Hostel')),
      hostel_name_room TEXT
    );

    -- Faculty table
    CREATE TABLE IF NOT EXISTS faculty (
      employee_id TEXT PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      is_hod INTEGER NOT NULL DEFAULT 0,
      hod_department TEXT
    );

    -- Class Mentors (Dual mentors for every section+semester: M+M, F+F, or M+F)
    CREATE TABLE IF NOT EXISTS class_mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch TEXT NOT NULL,
      semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
      section TEXT NOT NULL,
      primary_mentor_id TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE RESTRICT,
      secondary_mentor_id TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE RESTRICT,
      UNIQUE(branch, semester, section)
    );

    -- Subjects Master across all 8 semesters and branches
    CREATE TABLE IF NOT EXISTS subjects (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
      branch TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 4
    );

    -- Faculty Subject Allocations
    CREATE TABLE IF NOT EXISTS faculty_subject_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE CASCADE,
      subject_code TEXT NOT NULL REFERENCES subjects(code) ON DELETE CASCADE,
      section TEXT NOT NULL,
      UNIQUE(faculty_id, subject_code, section)
    );

    -- Sessional Marks (ST1, ST2, PUT)
    CREATE TABLE IF NOT EXISTS sessional_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      subject_code TEXT NOT NULL REFERENCES subjects(code) ON DELETE CASCADE,
      semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
      exam_type TEXT NOT NULL CHECK(exam_type IN ('ST1', 'ST2', 'PUT')),
      marks_obtained REAL NOT NULL,
      max_marks REAL NOT NULL DEFAULT 30,
      entered_by TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE RESTRICT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_roll_no, subject_code, semester, exam_type)
    );

    -- 8-Period Daily Attendance
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      date DATE NOT NULL,
      period_number INTEGER NOT NULL CHECK(period_number BETWEEN 1 AND 8),
      subject_code TEXT NOT NULL REFERENCES subjects(code) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Extra')),
      marked_by TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE RESTRICT,
      UNIQUE(student_roll_no, date, period_number)
    );

    -- Notices & Circulars
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      file_attachment TEXT,
      posted_by TEXT NOT NULL,
      posted_date DATE DEFAULT (DATE('now')),
      target_audience TEXT NOT NULL DEFAULT 'all',
      category TEXT DEFAULT 'General' CHECK(category IN ('General', 'Academic', 'Exam', 'Placement', 'Event'))
    );

    -- Leave Applications
    CREATE TABLE IF NOT EXISTS leave_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      reason TEXT NOT NULL,
      medical_proof_file TEXT,
      applied_on DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
      mentor1_status TEXT DEFAULT 'Pending' CHECK(mentor1_status IN ('Pending', 'Approved', 'Rejected')),
      mentor1_remark TEXT,
      mentor2_status TEXT DEFAULT 'Pending' CHECK(mentor2_status IN ('Pending', 'Approved', 'Rejected')),
      mentor2_remark TEXT,
      reviewed_on DATETIME
    );

    -- Confidential Faculty Feedback (Visible ONLY to the HOD of that department)
    CREATE TABLE IF NOT EXISTS faculty_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      faculty_id TEXT NOT NULL REFERENCES faculty(employee_id) ON DELETE CASCADE,
      department TEXT NOT NULL,
      feedback_text TEXT NOT NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      submitted_on DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Reviewed', 'Action Taken')),
      hod_notes TEXT
    );

    -- AKTU & College University Question Papers (PYQ + Current Sets)
    CREATE TABLE IF NOT EXISTS question_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject_code TEXT NOT NULL REFERENCES subjects(code) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      exam_type TEXT NOT NULL CHECK(exam_type IN ('PYQ', 'Current Set', 'Model Paper')),
      branch TEXT NOT NULL,
      semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8),
      file_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Classroom / Maintenance Complaints
    CREATE TABLE IF NOT EXISTS maintenance_complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      location TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('AC', 'Fan', 'Chair', 'Furniture', 'Electrical', 'Projector', 'Sanitation', 'Other')),
      description TEXT NOT NULL,
      photo_attachment TEXT,
      submitted_on DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved')),
      resolved_by TEXT,
      resolution_notes TEXT,
      resolved_on DATETIME
    );

    -- Important Resources & Downloads
    CREATE TABLE IF NOT EXISTS important_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Academic Calendar', 'AICTE Approval', 'College Development Plan', 'Rules & Regulations', 'College Magazine', 'Student R&D Circular', 'Contact Helplines', 'General')),
      file_path TEXT,
      external_link TEXT,
      description TEXT,
      uploaded_by TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- In-App Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      target_role TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'alert', 'complaint', 'leave', 'notice')),
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Student Profile Update Requests
    CREATE TABLE IF NOT EXISTS profile_update_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_roll_no TEXT NOT NULL REFERENCES students(roll_number) ON DELETE CASCADE,
      requested_changes TEXT NOT NULL,
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
      admin_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Configuration Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;

  exec(schemaSql);
}
