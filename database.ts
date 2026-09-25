import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Path to SQLite database file. Set DATABASE_PATH (e.g. a mounted disk like
// /data/echolytix.db on Render) so data persists across deploys/restarts.
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'echolytix.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  // Pragma warning catch
}

// Cryptographic Password Hashing Helpers (PBKDF2-HMAC-SHA512).
// The stored value is self-describing (`pbkdf2$iterations$salt$hash`) so the
// iteration count can be raised over time without breaking existing accounts.
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedValue: string): boolean {
  // Current self-describing format.
  if (storedValue.startsWith('pbkdf2$')) {
    const [, iterStr, salt, originalHash] = storedValue.split('$');
    const iterations = parseInt(iterStr, 10) || PBKDF2_ITERATIONS;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(originalHash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // Legacy `salt:hash` format (1000 iterations).
  if (storedValue.includes(':')) {
    const [salt, originalHash] = storedValue.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    return hash === originalHash;
  }
  // Legacy plain-text fallback.
  return password === storedValue;
}

// Initialize Database Tables
export function initDatabase() {
  // Patients Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      medical_id TEXT,
      caregiver_name TEXT,
      caregiver_phone TEXT,
      emergency_email TEXT,
      tts_speed REAL DEFAULT 1.0,
      blink_threshold REAL DEFAULT 0.18,
      commit_delay INTEGER DEFAULT 1800
    );
  `);

  // Recent Spoken Phrases Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recent_phrases (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      mode TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Quick Morse & Assistive Phrases Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quick_phrases (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      morse TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // TTS Phrase Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Category Phrases Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // User Settings & Calibration Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // SOS Emergency Alerts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      message TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      timestamp TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
    );
  `);

  // Sessions Table (For secure token-based authentication)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  // Password Recovery OTP Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);

  // Caregiver Feedback & Contact Support Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedDefaultData();
}

// Seed initial data if tables are empty
function seedDefaultData() {
  // Seed default patient
  const patientCountRow = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number | bigint };
  const patientCount = Number(patientCountRow?.count || 0);
  if (patientCount === 0) {
    const insertPatient = db.prepare(`
      INSERT INTO patients (
        email, password, name, age, medical_id, 
        caregiver_name, caregiver_phone, emergency_email, 
        tts_speed, blink_threshold, commit_delay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPatient.run(
      'Sachingupta@gmail.com',
      hashPassword('123456789'),
      'Sachin Gupta',
      20,
      'XYZ',
      'Saksham',
      '+91 639318xxxx',
      'Sachingupta@gmail.com',
      1.0,
      0.18,
      1800
    );
  }

  // Seed Recent Phrases
  const phraseCountRow = db.prepare('SELECT COUNT(*) as count FROM recent_phrases').get() as { count: number | bigint };
  const phraseCount = Number(phraseCountRow?.count || 0);
  if (phraseCount === 0) {
    const insertRecent = db.prepare(
      'INSERT INTO recent_phrases (id, text, mode, timestamp) VALUES (?, ?, ?, ?)'
    );
    insertRecent.run('1', '"I need some water please"', 'Blink', '2 mins ago');
    insertRecent.run('2', '"Hello, how are you today?"', 'Sign', '1 hr ago');
    insertRecent.run('3', '"Please turn on the light"', 'Morse', '3 hrs ago');
    insertRecent.run('4', '"Thank you for your assistance"', 'TTS', '5 hrs ago');
  }

  // Seed Quick Morse Phrases
  const quickCountRow = db.prepare('SELECT COUNT(*) as count FROM quick_phrases').get() as { count: number | bigint };
  const quickCount = Number(quickCountRow?.count || 0);
  if (quickCount === 0) {
    const insertQuick = db.prepare(
      'INSERT INTO quick_phrases (id, label, morse, category) VALUES (?, ?, ?, ?)'
    );
    const initialQuick = [
      { id: 'm1', label: 'Yes', morse: '— · — —   ·   · · ·', category: 'General' },
      { id: 'm2', label: 'No', morse: '— ·   — — —', category: 'General' },
      { id: 'm3', label: 'Help', morse: '· · · ·   ·   · — · ·   · — — ·', category: 'Urgent' },
      { id: 'm4', label: 'Water', morse: '· — —   · —   —   ·   · — ·', category: 'Urgent' },
      { id: 'm5', label: 'Thank You', morse: '—   · · · ·   · —   — ·   — · —   /   — · — —   — — —   · · —', category: 'Social' },
      { id: 'm6', label: 'Emergency', morse: '·   — —   ·   · — ·   — — ·   ·   — ·   — · — ·   — · — —', category: 'Urgent' },
    ];
    for (const q of initialQuick) {
      insertQuick.run(q.id, q.label, q.morse, q.category);
    }
  }

  // Seed Categories & Category Phrases
  const catCountRow = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number | bigint };
  const catCount = Number(catCountRow?.count || 0);
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const insertCatPhrase = db.prepare('INSERT INTO category_phrases (category_id, text) VALUES (?, ?)');

    const defaultCategories = [
      {
        category: 'Urgent Needs',
        phrases: [
          'I need my medicine immediately.',
          'I am feeling pain, please help.',
          'Please call my nurse or family.',
          'I need water or a drink.'
        ]
      },
      {
        category: 'Daily Comfort',
        phrases: [
          'Please adjust my pillow position.',
          'Can you turn up the air conditioner?',
          'Please dim the room lighting.',
          'I would like to rest now.'
        ]
      },
      {
        category: 'Social Conversations',
        phrases: [
          'Hello, it is great to see you today!',
          'Thank you so much for helping me.',
          'How are you doing today?',
          'Yes, that sounds good to me.'
        ]
      }
    ];

    for (const cat of defaultCategories) {
      const info = insertCat.run(cat.category);
      const catId = Number(info.lastInsertRowid);
      for (const phrase of cat.phrases) {
        insertCatPhrase.run(catId, phrase);
      }
    }
  }

  // Seed Default Settings
  const settingsCountRow = db.prepare('SELECT COUNT(*) as count FROM user_settings').get() as { count: number | bigint };
  const settingsCount = Number(settingsCountRow?.count || 0);
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?)');
    insertSetting.run('ear_threshold', '0.22');
    insertSetting.run('tts_rate', '1.0');
    insertSetting.run('tts_pitch', '1.0');
    insertSetting.run('theme', 'dark');
    insertSetting.run('ai_expanded_phrases', 'enabled');
  }
}

// Data Access Layer (CRUD Helper Functions)

// Patients Auth & Profiles
export function getPatientByEmail(email: string) {
  const stmt = db.prepare('SELECT * FROM patients WHERE email = ?');
  return stmt.get(email);
}

export function updatePatientProfile(
  id: number,
  name: string,
  age: number,
  medicalId: string,
  caregiverName: string,
  caregiverPhone: string,
  emergencyEmail: string,
  ttsSpeed: number,
  blinkThreshold: number,
  commitDelay: number
) {
  const stmt = db.prepare(`
    UPDATE patients 
    SET name = ?, age = ?, medical_id = ?, caregiver_name = ?, 
        caregiver_phone = ?, emergency_email = ?, tts_speed = ?, 
        blink_threshold = ?, commit_delay = ?
    WHERE id = ?
  `);
  stmt.run(name, age, medicalId, caregiverName, caregiverPhone, emergencyEmail, ttsSpeed, blinkThreshold, commitDelay, id);
  
  // Return the updated row
  const getStmt = db.prepare('SELECT * FROM patients WHERE id = ?');
  return getStmt.get(id);
}

// Recent Phrases
export function getRecentPhrases(limit = 20) {
  const stmt = db.prepare('SELECT id, text, mode, timestamp FROM recent_phrases ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit);
}

export function addRecentPhrase(text: string, mode: string) {
  const id = Date.now().toString();
  const timestamp = 'Just now';
  const stmt = db.prepare('INSERT INTO recent_phrases (id, text, mode, timestamp) VALUES (?, ?, ?, ?)');
  stmt.run(id, text, mode, timestamp);
  return { id, text, mode, timestamp };
}

export function deleteRecentPhrase(id: string) {
  const stmt = db.prepare('DELETE FROM recent_phrases WHERE id = ?');
  return stmt.run(id);
}

export function clearRecentPhrases() {
  const stmt = db.prepare('DELETE FROM recent_phrases');
  return stmt.run();
}

// Quick Phrases
export function getQuickPhrases() {
  const stmt = db.prepare('SELECT id, label, morse, category FROM quick_phrases ORDER BY created_at ASC');
  return stmt.all();
}

export function addQuickPhrase(label: string, morse: string, category = 'Custom') {
  const id = 'q_' + Date.now();
  const stmt = db.prepare('INSERT INTO quick_phrases (id, label, morse, category) VALUES (?, ?, ?, ?)');
  stmt.run(id, label, morse, category);
  return { id, label, morse, category };
}

export function deleteQuickPhrase(id: string) {
  const dbStmt = db.prepare('DELETE FROM quick_phrases WHERE id = ?');
  return dbStmt.run(id);
}

// Categories & Phrases
export function getCategoriesWithPhrases() {
  const categories = db.prepare('SELECT id, name as category FROM categories ORDER BY id ASC').all() as any[];
  const getPhrases = db.prepare('SELECT text FROM category_phrases WHERE category_id = ?');

  return categories.map(cat => ({
    id: Number(cat.id),
    category: String(cat.category),
    phrases: (getPhrases.all(cat.id) as any[]).map(p => String(p.text))
  }));
}

export function addCategory(name: string) {
  const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const info = stmt.run(name);
  return { id: Number(info.lastInsertRowid), category: name, phrases: [] };
}

export function addPhraseToCategory(categoryId: number, phrase: string) {
  const stmt = db.prepare('INSERT INTO category_phrases (category_id, text) VALUES (?, ?)');
  stmt.run(categoryId, phrase);
  return { categoryId, phrase };
}

// Settings
export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM user_settings').all() as any[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[String(row.key)] = String(row.value);
  }
  return settings;
}

export function updateSetting(key: string, value: string) {
  const stmt = db.prepare('INSERT INTO user_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  stmt.run(key, value);
  return { key, value };
}

// SOS Emergencies Logging
export function createSosAlert(patientId: number | null, message: string, latitude: number, longitude: number) {
  const insert = db.prepare(`
    INSERT INTO sos_alerts (patient_id, message, latitude, longitude, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  const timestamp = new Date().toISOString();
  insert.run(patientId, message, latitude, longitude, timestamp);
  return { success: true, timestamp };
}

export function getRecentSosAlerts(limit = 10) {
  const query = db.prepare(`
    SELECT s.*, p.name as patient_name, p.caregiver_name, p.caregiver_phone, p.emergency_email
    FROM sos_alerts s
    LEFT JOIN patients p ON s.patient_id = p.id
    ORDER BY s.timestamp DESC
    LIMIT ?
  `);
  return query.all(limit);
}

// User Registration
export function createPatient(
  email: string,
  passwordHash: string,
  name: string,
  age?: number,
  medicalId?: string,
  caregiverName?: string,
  caregiverPhone?: string,
  emergencyEmail?: string
) {
  const stmt = db.prepare(`
    INSERT INTO patients (
      email, password, name, age, medical_id, 
      caregiver_name, caregiver_phone, emergency_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    email,
    passwordHash,
    name,
    age || null,
    medicalId || null,
    caregiverName || null,
    caregiverPhone || null,
    emergencyEmail || null
  );
  
  // Return the newly created patient record (excluding password field)
  const getStmt = db.prepare('SELECT id, email, name, age, medical_id, caregiver_name, caregiver_phone, emergency_email, tts_speed, blink_threshold, commit_delay FROM patients WHERE id = ?');
  return getStmt.get(Number(info.lastInsertRowid));
}

// Session Helpers
export function createSession(patientId: number, token: string, expiresAt: string) {
  const stmt = db.prepare(`
    INSERT INTO sessions (token, patient_id, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(token, patientId, expiresAt);
  return { token, patientId, expiresAt };
}

export function getSession(token: string) {
  const stmt = db.prepare(`
    SELECT s.token, s.expires_at, p.id, p.email, p.name, p.age, p.medical_id, 
           p.caregiver_name, p.caregiver_phone, p.emergency_email, 
           p.tts_speed, p.blink_threshold, p.commit_delay
    FROM sessions s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.token = ?
  `);
  return stmt.get(token);
}

export function deleteSession(token: string) {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
  return stmt.run(token);
}

// Password Reset Helpers
export function createPasswordReset(email: string, token: string, expiresAt: string) {
  const stmt = db.prepare(`
    INSERT INTO password_resets (email, token, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at
  `);
  stmt.run(email, token, expiresAt);
  return { email, token, expiresAt };
}

export function getPasswordReset(email: string) {
  const stmt = db.prepare('SELECT * FROM password_resets WHERE email = ?');
  return stmt.get(email);
}

export function deletePasswordReset(email: string) {
  const stmt = db.prepare('DELETE FROM password_resets WHERE email = ?');
  return stmt.run(email);
}

export function updatePatientPassword(id: number, passwordHash: string) {
  const stmt = db.prepare('UPDATE patients SET password = ? WHERE id = ?');
  return stmt.run(passwordHash, id);
}

// Support Request Helpers
export function createSupportRequest(name: string, email: string, message: string) {
  const stmt = db.prepare(`
    INSERT INTO support_requests (name, email, message, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const timestamp = new Date().toISOString();
  stmt.run(name, email, message, timestamp);
  return { name, email, message, created_at: timestamp };
}

export function getSupportRequests(limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM support_requests 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
}

export default db;
