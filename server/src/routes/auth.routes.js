import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../database/db.js';
import { CONFIG } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const user = get('SELECT * FROM users WHERE username = ?', [username.trim()]);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials. User not found.' });
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN }
  );

  let profile = null;
  if (user.role === 'student') {
    profile = get('SELECT * FROM students WHERE user_id = ?', [user.id]);
  } else if (user.role === 'faculty' || user.role === 'hod') {
    profile = get('SELECT * FROM faculty WHERE user_id = ?', [user.id]);
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: Boolean(user.must_change_password),
    },
    profile
  });
});

// POST /api/auth/change-password (First-login or voluntary password update)
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  // If not first login, verify current password
  if (!user.must_change_password && currentPassword) {
    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Current password does not match.' });
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);

  run(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [newHash, req.user.id]
  );

  res.json({ message: 'Password changed successfully! You may now access all features.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  let profile = null;
  if (req.user.role === 'student') {
    profile = get('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
  } else if (req.user.role === 'faculty' || req.user.role === 'hod') {
    profile = get('SELECT * FROM faculty WHERE user_id = ?', [req.user.id]);
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      mustChangePassword: Boolean(req.user.must_change_password),
    },
    profile
  });
});

export default router;
