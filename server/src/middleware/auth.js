import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { get } from '../database/db.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    // Fetch latest user info
    const user = get('SELECT id, username, role, must_change_password FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    req.user = user;

    // If user is student, attach student details
    if (user.role === 'student') {
      const student = get('SELECT * FROM students WHERE user_id = ?', [user.id]);
      req.student = student;
    }

    // If user is faculty or hod, attach faculty details
    if (user.role === 'faculty' || user.role === 'hod') {
      const faculty = get('SELECT * FROM faculty WHERE user_id = ?', [user.id]);
      req.faculty = faculty;
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired session token.' });
  }
}

/**
 * Role-Based Access Control middleware
 * @param {string[]} allowedRoles 
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
}
