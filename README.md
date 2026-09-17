# 🎓 College Student ERP System

A modern, full-stack ERP web application designed for engineering colleges and universities. Built with **React 18 + Vite + Tailwind CSS**, **Node.js + Express**, and a **High-Performance SQLite Relational Database**.

---

## 🚀 Live Cloud Deployment Guide

Since your repository is already pushed to GitHub (`bhumiagrawal0106/Student_ERP`), you can deploy it live in 2 minutes for free:

### 🌟 Option 1: Deploy on Render (Recommended - 100% Free Full-Stack)

1. Go to **[Render.com](https://render.com)** and sign in with your GitHub account (`bhumiagrawal0106`).
2. Click **New +** > **Web Service**.
3. Select your GitHub repository: **`Student_ERP`**.
4. Configure the service settings:
   - **Name**: `student-erp`
   - **Environment**: `Node`
   - **Region**: Closest to you (e.g., *Singapore* or *Frankfurt*)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Click **Create Web Service**.
6. Render will automatically build the React frontend and launch the Express backend. Once deployed, you will get a live URL (e.g., `https://student-erp.onrender.com`)!

---

### 🚄 Option 2: Deploy on Railway

1. Go to **[Railway.app](https://railway.app)** and log in with GitHub.
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select **`Student_ERP`**.
4. Railway will automatically detect Node.js and run `npm run build` & `npm start`.
5. Under service **Settings** > **Networking**, click **Generate Domain** to get your public URL.

---

## 🔑 Demo User Accounts & Passwords

The system comes pre-seeded with sample data and test accounts for all roles:

| Role | Username / Roll No | Default Password | Primary Features |
| :--- | :--- | :--- | :--- |
| **Student** (Sem 5) | `210097010001` | `AMAN SINGH4321` | Attendance, Internal/AKTU Marks, Feedback, Maintenance Desk |
| **Faculty Mentor 1** | `FAC101` | `FAC101@123` | Period Attendance, Mid-Term Marks, Subject Management |
| **Faculty Mentor 2** | `FAC102` | `FAC102@123` | Dual Mentor Reviews, Student Grievances, Leave Approvals |
| **HOD (CSE)** | `HOD_CSE` | `HOD_CSE@123` | Department Overview, Confidential Faculty Feedback Analytics |
| **Master Admin** | `admin` | `Admin@ERP2026` | Full Master CRUD, Add Students/Faculty, Assign Mentors |
| **Maintenance Staff** | `maint01` | `Maint@2026` | Classroom Repair Desk, Ticket Resolution & Status |

---

## 🛠️ Local Development Setup

If you want to run the project locally on your machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bhumiagrawal0106/Student_ERP.git
   cd Student_ERP
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Start Development Servers**:
   - **Backend Server (Port 5000)**:
     ```bash
     npm run dev:server
     ```
   - **Frontend Web App (Port 3000)**:
     ```bash
     npm run dev:client
     ```

4. Open your browser at **`http://localhost:3000`**.

---

## 📂 Project Architecture

```text
STUDENT_ERP/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── api/            # Central Axios API client
│   │   ├── components/     # UI Components & Navigation
│   │   ├── context/        # Auth and Application State
│   │   └── pages/          # Student, Faculty, HOD, and Admin Dashboards
│   └── package.json
│
├── server/                 # Backend Node.js / Express Service
│   ├── data/               # SQLite Relational Database (erp.sqlite)
│   ├── src/
│   │   ├── config/         # System Configurations & Environment
│   │   ├── database/       # Schema definition & Auto-Seeder
│   │   ├── middleware/     # JWT Auth & Role-based Access Control
│   │   ├── routes/         # Auth, Student, Faculty, HOD, Admin Routes
│   │   └── index.js        # Main Express API & SPA File Server
│   └── package.json
│
├── render.yaml             # Render Cloud Deployment Blueprint
└── package.json            # Root Orchestration & Build Scripts
```

---

## 📄 License
This project is open source and available under the [ISC License](LICENSE).
