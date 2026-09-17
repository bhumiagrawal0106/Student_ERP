import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { CONFIG } from '../config/index.js';

// Ensure data and uploads directories exist
const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

// Initialize SQL.js engine (pure WebAssembly, zero C++ compilation dependencies)
const SQL = await initSqlJs();

let dbInstance;
if (fs.existsSync(CONFIG.DB_PATH)) {
  try {
    const fileBuffer = fs.readFileSync(CONFIG.DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } catch (err) {
    console.warn('Could not read existing SQLite file, creating new database instance:', err.message);
    dbInstance = new SQL.Database();
  }
} else {
  dbInstance = new SQL.Database();
}

// Configure SQLite pragmas
try {
  dbInstance.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  // Pragma ignore if not supported
}

/**
 * Persists the in-memory SQLite database to disk.
 */
export function saveDb() {
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(CONFIG.DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving database to file:', err.message);
  }
}

/**
 * Executes a query that returns multiple rows.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {Array}
 */
export function query(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
  if (normalizedParams.length > 0) {
    stmt.bind(normalizedParams);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Executes a query that returns a single row.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {Object|null}
 */
export function get(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
  if (normalizedParams.length > 0) {
    stmt.bind(normalizedParams);
  }
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/**
 * Executes an INSERT, UPDATE, or DELETE statement.
 * @param {string} sql 
 * @param {Array|Object} params 
 * @returns {{ changes: number, lastInsertRowid: number|bigint }}
 */
export function run(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  const normalizedParams = Array.isArray(params) ? params : (params ? [params] : []);
  if (normalizedParams.length > 0) {
    stmt.bind(normalizedParams);
  }
  stmt.step();
  stmt.free();

  const lastIdRes = dbInstance.exec('SELECT last_insert_rowid() AS id;');
  const lastInsertRowid = lastIdRes[0]?.values[0]?.[0] ?? 0;
  const changesRes = dbInstance.exec('SELECT changes() AS changes;');
  const changes = changesRes[0]?.values[0]?.[0] ?? 0;

  saveDb();
  return { changes, lastInsertRowid };
}

/**
 * Executes raw SQL strings, e.g. schema creation.
 * @param {string} sql 
 */
export function exec(sql) {
  const res = dbInstance.exec(sql);
  saveDb();
  return res;
}

export const db = dbInstance;
export default { db: dbInstance, query, get, run, exec, saveDb };
