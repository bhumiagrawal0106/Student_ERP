import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index.js';

// Ensure data and uploads directories exist
const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

export const db = new DatabaseSync(CONFIG.DB_PATH);

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
  return stmt.all(...params);
}

/**
 * Executes a query that returns a single row.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {Object|null}
 */
export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
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
  return stmt.run(...params);
}

/**
 * Executes raw SQL strings, e.g. schema creation.
 * @param {string} sql 
 */
export function exec(sql) {
  return db.exec(sql);
}

export default { db, query, get, run, exec };
