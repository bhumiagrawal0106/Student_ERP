import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { CONFIG } from '../config/index.js';

// Ensure data and uploads directories exist
const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

export const db = new Database(CONFIG.DB_PATH);

// Configure SQLite for high performance and strict relational integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Executes a query that returns multiple rows.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {Array}
 */
export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
}

/**
 * Executes a query that returns a single row.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {Object|null}
 */
export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
  return result || null;
}

/**
 * Executes an INSERT, UPDATE, or DELETE statement.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {{ changes: number, lastInsertRowid: number|bigint }}
 */
export function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
}

/**
 * Executes raw SQL strings, e.g. schema creation.
 * @param {string} sql 
 */
export function exec(sql) {
  return db.exec(sql);
}

export default { db, query, get, run, exec };
