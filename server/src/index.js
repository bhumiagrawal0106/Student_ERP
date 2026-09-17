import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config/index.js';
import { seedDatabase } from './database/seed.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import hodRoutes from './routes/hod.routes.js';
import adminRoutes from './routes/admin.routes.js';
import commonRoutes from './routes/common.routes.js';

const app = express();

// Ensure uploads folder exists
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

// Auto seed on startup if database is fresh
try {
  seedDatabase();
} catch (err) {
  console.error('Error during automatic seed check:', err.message);
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (PDFs, images, etc.)
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/common', commonRoutes);

// Welcome and Status route for root / and /api
const getApiOverview = (req, res) => {
  if (req.accepts('html')) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>College Student ERP API Server</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
          body { background: #f4f7f4; color: #1e293b; padding: 40px 20px; display: flex; justify-content: center; }
          .card { background: white; max-width: 780px; width: 100%; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01); border: 1px solid #e2e8f0; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
          .badge { background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; }
          .badge-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; }
          h1 { font-size: 24px; font-weight: 800; color: #0f172a; }
          p { color: #64748b; font-size: 14px; margin-top: 4px; line-height: 1.5; }
          .app-btn { display: inline-block; margin-top: 20px; background: #166534; color: white; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 700; font-size: 14px; transition: 0.2s; box-shadow: 0 4px 12px rgba(22,101,52,0.25); }
          .app-btn:hover { background: #14532d; }
          .section-title { font-size: 15px; font-weight: 700; color: #334155; margin-top: 28px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
          th { font-weight: 700; color: #64748b; background: #f8fafc; font-size: 11px; text-transform: uppercase; }
          code { font-family: monospace; background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <h1>🎓 College Student ERP Backend API</h1>
              <p>REST API Engine & Relational Database Server</p>
            </div>
            <div class="badge"><span class="badge-dot"></span> Server Active (Port 5000)</div>
          </div>

          <p>
            The backend REST service is <strong>online and running</strong>. To use the student, faculty, HOD, and admin portals, launch the web application interface:
          </p>

          <a href="http://localhost:3000" class="app-btn" target="_blank">
            👉 Open Frontend Web Application (http://localhost:3000)
          </a>

          <div class="section-title">🔑 Demo Credentials</div>
          <table>
            <thead>
              <tr><th>Role</th><th>Username</th><th>Default Password</th><th>Access</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Student (Sem 5)</strong></td><td><code>210097010001</code></td><td><code>AMAN SINGH4321</code></td><td>Student Portal</td></tr>
              <tr><td><strong>Faculty Mentor 1</strong></td><td><code>FAC101</code></td><td><code>FAC101@123</code></td><td>Period Attendance & Marks</td></tr>
              <tr><td><strong>Faculty Mentor 2</strong></td><td><code>FAC102</code></td><td><code>FAC102@123</code></td><td>Mentor Leave Reviews</td></tr>
              <tr><td><strong>HOD CSE</strong></td><td><code>HOD_CSE</code></td><td><code>HOD_CSE@123</code></td><td>Confidential Faculty Feedback</td></tr>
              <tr><td><strong>Master Admin</strong></td><td><code>admin</code></td><td><code>Admin@ERP2026</code></td><td>Full System Master CRUD</td></tr>
              <tr><td><strong>Maintenance</strong></td><td><code>maint01</code></td><td><code>Maint@2026</code></td><td>Classroom Repair Desk</td></tr>
            </tbody>
          </table>

          <div class="section-title">➕ How to Add More Data (Students, Faculty, HODs, Mentors, Maintenance)</div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; font-size:13px; line-height:1.6;">
            <p><strong>Option 1: Using the Web App UI (Recommended)</strong></p>
            <ol style="margin-left: 20px; margin-top: 4px; margin-bottom: 12px;">
              <li>Log in as <code>admin</code> with password <code>Admin@ERP2026</code> at <a href="http://localhost:3000" target="_blank">http://localhost:3000</a>.</li>
              <li>Click <strong>"New Student"</strong> to register new students with auto-generated default passwords.</li>
              <li>Use the <strong>"Faculty & Mentors"</strong> tab to create faculty, assign HOD status, and pair Dual Mentors for any branch/section.</li>
              <li>Use the <strong>"Subjects Master"</strong> tab to add courses for Semesters 1 to 8.</li>
              <li>Students can submit classroom repair tickets from their <strong>"Maintenance Desk"</strong> tab.</li>
            </ol>

            <p><strong>Option 2: Using the REST API Endpoints</strong></p>
            <ul style="margin-left: 20px; margin-top: 4px;">
              <li><code>POST /api/admin/students</code> — Register new students with roll number, name, semester, etc.</li>
              <li><code>POST /api/admin/faculty</code> — Create faculty and assign HOD department.</li>
              <li><code>POST /api/admin/mentors</code> — Assign primary and secondary class mentors for any section.</li>
              <li><code>POST /api/admin/subjects</code> — Add new curriculum subjects for Semesters 1–8.</li>
              <li><code>POST /api/student/complaints</code> — Log new classroom maintenance requests.</li>
            </ul>
          </div>

          <div class="section-title">📡 Core API Endpoints</div>
          <table>
            <thead>
              <tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>GET</code></td><td><a href="/api/health"><code>/api/health</code></a></td><td>API Health Check</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/auth/login</code></td><td>JWT Authentication (All roles)</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/student/dashboard</code></td><td>Student Dashboard & Marks</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/faculty/dashboard</code></td><td>Faculty Subject Allocations</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/hod/feedback</code></td><td>Confidential Faculty Feedback</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/common/notices</code></td><td>College Notices & Circulars</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/common/pyqs</code></td><td>AKTU 5-Year Question Papers</td></tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);
  }

  res.json({
    status: 'online',
    system: 'College Student ERP System API Server',
    webAppUrl: 'http://localhost:3000',
    howToAddData: {
      webAppAdminUrl: 'http://localhost:3000 (Login as admin / Admin@ERP2026)',
      endpoints: {
        addStudent: 'POST /api/admin/students',
        addFaculty: 'POST /api/admin/faculty',
        addMentorPair: 'POST /api/admin/mentors',
        addSubject: 'POST /api/admin/subjects',
        addNotice: 'POST /api/admin/notices',
        addComplaint: 'POST /api/student/complaints'
      }
    },
    documentation: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/login',
      student: 'GET /api/student/dashboard',
      faculty: 'GET /api/faculty/dashboard',
      hod: 'GET /api/hod/feedback',
      admin: 'GET /api/admin/students',
      notices: 'GET /api/common/notices',
      pyqs: 'GET /api/common/pyqs'
    }
  });
};

const clientDistPath = path.resolve(__dirname, '../../client/dist');
const hasClientBuild = fs.existsSync(clientDistPath);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}

app.get('/api', getApiOverview);

// Health check handler
const handleHealth = (req, res) => {
  res.json({
    status: 'healthy',
    system: 'College Student ERP System API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: 'connected (SQLite relational engine)',
    endpoints: {
      webApp: hasClientBuild ? '/' : 'http://localhost:3000',
      apiDocs: '/api',
      auth: '/api/auth/login'
    }
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `API route ${req.method} ${req.originalUrl} not found.` });
});

if (!hasClientBuild) {
  app.get('/', getApiOverview);
} else {
  // SPA fallback for all frontend client routes (e.g. /login, /student, /admin)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(` College Student ERP Backend Server is running!  `);
  console.log(` Port:    http://localhost:${CONFIG.PORT}        `);
  console.log(` Network: http://127.0.0.1:${CONFIG.PORT}        `);
  console.log(` Uploads: ${CONFIG.UPLOADS_DIR}                  `);
  console.log(` DB:      ${CONFIG.DB_PATH}                      `);
  console.log(`=================================================`);
});
