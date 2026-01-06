const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use DB_PATH environment variable if provided, otherwise default to local file
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

// Ensure directory exists (important if DB_PATH is set to a subdirectory)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('CRITICAL: Failed to open database!', err.message);
    process.exit(1);
  }
  console.log('Successfully connected to the database.');
});

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS attendees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      name TEXT,
      email TEXT,
      regid TEXT,
      present INTEGER,
      certificate_id TEXT,
      claimed INTEGER DEFAULT 0
    )
  `, (err) => {
    if (err) console.error('Error creating attendees table:', err.message);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      event_id TEXT PRIMARY KEY,
      file_path TEXT,
      name_x REAL,
      name_y REAL,
      font_size REAL,
      page_index INTEGER
    )
  `, (err) => {
    if (err) console.error('Error creating templates table:', err.message);
  });
});

module.exports = db;
