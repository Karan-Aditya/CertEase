const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render/proxies to handle secure cookies correctly
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// DB Migration: Add claimed column if it doesn't exist
db.run("ALTER TABLE attendees ADD COLUMN claimed INTEGER DEFAULT 0", (err) => {
    if (err) {
        if (err.message.includes("duplicate column name")) {
            // Column already exists, ignore
        } else {
            console.error("Migration Error:", err.message);
        }
    } else {
        console.log("Migration: Added 'claimed' column to attendees table.");
    }
});

// Ensure directories exist
const DATA_DIR = process.env.DATA_DIR || __dirname;
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Session configuration
app.use(session({
    store: new SQLiteStore({
        dir: DATA_DIR,
        db: 'sessions.sqlite'
    }),
    secret: process.env.SESSION_SECRET || 'certify-secret-key',
    resave: true, // Force session to be saved back to the store
    saveUninitialized: false, 
    proxy: true, // Required for secure cookies behind a proxy
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    } 
}));

try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
        console.log(`Created templates directory at: ${TEMPLATES_DIR}`);
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log(`Created uploads directory at: ${UPLOADS_DIR}`);
    }
} catch (err) {
    console.error('Error creating data directories:', err.message);
}

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = file.fieldname === 'template' ? TEMPLATES_DIR : UPLOADS_DIR;
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Admin Auth Middleware
const isAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        console.log(`Unauthorized access attempt - sessionID: ${req.sessionID}, isAdmin: ${req.session ? req.session.isAdmin : 'no session'}`);
        res.status(401).json({ error: 'Session expired or unauthorized. Please log in again.' });
    }
};

// --- ROUTES ---

// Admin Login
app.get('/api/check-auth', (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER || 'Aditya';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'AdityaK@18';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin Logout
app.post('/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Preview Template Placement
app.post('/admin/preview-template', isAdmin, (req, res) => {
    upload.single('template')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: 'Upload Error: ' + err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { name_x, name_y, font_size, page_index } = req.body;
        
        // Basic validation
        if (!name_x || !name_y || !font_size) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Missing required coordinates or font size' });
        }

        const testName = "test name";

        try {
            const existingPdfBytes = fs.readFileSync(req.file.path);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const pages = pdfDoc.getPages();
            const pIndex = parseInt(page_index) || 0;

            if (pIndex < 0 || pIndex >= pages.length) {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: `Invalid page index. Total pages: ${pages.length}` });
            }

            const page = pages[pIndex];
            const { width } = page.getSize();

            let xPos = parseFloat(name_x);
            if (xPos === -1) {
                const textWidth = font.widthOfTextAtSize(testName, parseInt(font_size));
                xPos = (width - textWidth) / 2;
            }

            page.drawText(testName, {
                x: xPos,
                y: parseFloat(name_y),
                size: parseInt(font_size),
                font: font,
                color: rgb(0, 0, 0),
            });

            const pdfBytes = await pdfDoc.save();
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Delete temp file

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=preview.pdf');
            res.send(Buffer.from(pdfBytes));
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.error('Preview error:', error);
            res.status(500).json({ error: 'PDF Processing Error: ' + error.message });
        }
    });
});

// Upload Template
app.post('/admin/upload-template', isAdmin, (req, res) => {
    upload.single('template')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Multer Error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Upload Error: ' + err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { event_id, name_x, name_y, font_size, page_index } = req.body;
        const file_path = req.file.path;

        db.run(`INSERT OR REPLACE INTO templates (event_id, file_path, name_x, name_y, font_size, page_index) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
                [event_id, file_path, name_x, name_y, font_size, page_index], 
                (err) => {
            if (err) return res.status(500).json({ error: 'DB Error: ' + err.message });
            res.json({ success: true, message: 'Template uploaded successfully' });
        });
    });
});

// Upload Attendance
app.post('/admin/upload-attendance', isAdmin, upload.single('attendance'), (req, res) => {
    const { event_id } = req.body;
    const results = [];
    
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('error', (err) => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: err.message });
        })
        .on('end', () => {
            const stmt = db.prepare(`INSERT OR IGNORE INTO attendees (event_id, name, email, regid, present, certificate_id) 
                                   VALUES (?, ?, ?, ?, ?, ?)`);
            results.forEach(row => {
                const certId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                stmt.run(event_id, row.name, row.email, row.regid, row.present === '1' ? 1 : 0, certId);
            });
            stmt.finalize();
            fs.unlinkSync(req.file.path); // Delete CSV after processing
            res.json({ success: true, count: results.length });
        });
});

// View Data
app.get('/admin/data', isAdmin, (req, res) => {
    const { event_id } = req.query;
    let query = `SELECT * FROM attendees`;
    let params = [];
    if (event_id) {
        query += ` WHERE event_id = ?`;
        params.push(event_id);
    }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Attendee
app.put('/admin/attendee/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, regid, present } = req.body;
    db.run(`UPDATE attendees SET name = ?, email = ?, regid = ?, present = ? WHERE id = ?`,
        [name, email, regid, present ? 1 : 0, id],
        (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Registration ID already exists for this event' });
                }
                return res.status(500).json({ error: 'DB Error: ' + err.message });
            }
            res.json({ success: true, message: 'Attendee updated successfully' });
        });
});

// Delete Attendee
app.delete('/admin/attendee/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM attendees WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ error: 'DB Error: ' + err.message });
        res.json({ success: true, message: 'Attendee deleted successfully' });
    });
});

// Bulk Delete Attendees
app.post('/admin/attendees/bulk-delete', isAdmin, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM attendees WHERE id IN (${placeholders})`, ids, (err) => {
        if (err) return res.status(500).json({ error: 'DB Error: ' + err.message });
        res.json({ success: true, message: `${ids.length} records deleted` });
    });
});

// Delete Event
app.delete('/admin/event/:event_id', isAdmin, (req, res) => {
    const { event_id } = req.params;
    db.serialize(() => {
        db.run(`DELETE FROM attendees WHERE event_id = ?`, [event_id]);
        db.run(`DELETE FROM templates WHERE event_id = ?`, [event_id], (err) => {
            if (err) return res.status(500).json({ error: 'DB Error: ' + err.message });
            res.json({ success: true, message: 'Event and all related data deleted' });
        });
    });
});

// Get Events
app.get('/api/events', (req, res) => {
    db.all(`SELECT event_id FROM templates`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin Stats
app.get('/admin/stats', isAdmin, (req, res) => {
    const stats = {};
    db.serialize(() => {
        db.get(`SELECT COUNT(*) as count FROM templates`, (err, row) => {
            stats.totalEvents = row.count;
        });
        db.get(`SELECT COUNT(*) as count FROM attendees`, (err, row) => {
            stats.totalAttendees = row.count;
        });
        db.get(`SELECT COUNT(*) as count FROM attendees WHERE present = 1`, (err, row) => {
            stats.totalEligible = row.count;
        });
        db.get(`SELECT COUNT(*) as count FROM attendees WHERE claimed = 1`, (err, row) => {
            stats.totalClaimed = row.count;
            res.json(stats);
        });
    });
});

// Verify User and Download
app.post('/api/verify', (req, res) => {
    const { identifier, event_id } = req.body; // identifier is email or regid
    db.get(`SELECT * FROM attendees WHERE event_id = ? AND (email = ? OR regid = ?) AND present = 1`, 
            [event_id, identifier, identifier], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found or not present' });
        res.json({ success: true, user });
    });
});

app.get('/api/download', async (req, res) => {
    const { identifier, event_id } = req.query;

    db.get(`SELECT a.*, t.file_path, t.name_x, t.name_y, t.font_size, t.page_index 
            FROM attendees a 
            JOIN templates t ON a.event_id = t.event_id 
            WHERE a.event_id = ? AND (a.email = ? OR a.regid = ?) AND a.present = 1`, 
            [event_id, identifier, identifier], async (err, data) => {
        if (err || !data) return res.status(404).send('Certificate not found');

        try {
            const existingPdfBytes = fs.readFileSync(data.file_path);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const pages = pdfDoc.getPages();
            const firstPage = pages[data.page_index || 0];
            const { width, height } = firstPage.getSize();

            let xPos = parseFloat(data.name_x);
            if (xPos === -1) {
                const textWidth = font.widthOfTextAtSize(data.name, parseInt(data.font_size));
                xPos = (width - textWidth) / 2;
            }

            firstPage.drawText(data.name, {
                x: xPos,
                y: parseFloat(data.name_y),
                size: parseInt(data.font_size),
                font: font,
                color: rgb(0, 0, 0),
            });

            const pdfBytes = await pdfDoc.save();
            res.setHeader('Content-Type', 'application/pdf');
            const fileName = `certificate_${data.regid}.pdf`;
            if (req.query.preview === 'true') {
                res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
            } else {
                res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
                // Mark as claimed if not a preview
                db.run(`UPDATE attendees SET claimed = 1 WHERE id = ?`, [data.id]);
            }
            res.send(Buffer.from(pdfBytes));
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating PDF');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
