const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use persistent disk on Render in production
const dbPath =
  process.env.NODE_ENV === 'production'
    ? '/data/data.sqlite'
    : path.join(__dirname, 'data.sqlite');

const db = new sqlite3.Database(dbPath);

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
      certificate_id TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      event_id TEXT PRIMARY KEY,
      file_path TEXT,
      name_x REAL,
      name_y REAL,
      font_size REAL,
      page_index INTEGER
    )
  `);
});

module.exports = db;
