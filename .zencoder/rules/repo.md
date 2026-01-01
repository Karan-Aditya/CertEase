---
description: Repository Information Overview
alwaysApply: true
---

# CertEase Information

## Summary
CertEase is a Node.js-based web application designed for automated certificate generation and distribution. It allows administrators to upload PDF templates and attendee lists (CSV), while participants can verify their attendance and download personalized certificates.

## Structure
- **public/**: Static frontend assets including HTML, CSS, and client-side JavaScript.
- **templates/**: Directory for storing uploaded PDF certificate templates.
- **uploads/**: Temporary storage for uploaded CSV attendee lists.
- **server.js**: Main Express application server and API route definitions.
- **db.js**: SQLite database configuration and schema initialization.
- **data.sqlite**: Persistent SQLite database file.

## Language & Runtime
**Language**: JavaScript (Node.js)  
**Version**: Node.js (Standard)  
**Build System**: N/A  
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `express`: Web framework for handling routing and middleware.
- `pdf-lib`: For PDF loading, modification, and drawing personalized text.
- `sqlite3`: Database engine for storing event and attendee records.
- `csv-parser`: For parsing uploaded CSV files into JSON data.
- `multer`: Middleware for handling multipart/form-data (file uploads).
- `express-session`: For managing administrator sessions.
- `body-parser`: For parsing incoming request bodies.

## Build & Installation
```bash
# Install dependencies
npm install

# Start the server
node server.js
```

## Main Files & Resources
- **server.js**: The entry point of the application, running on port 3000 by default.
- **db.js**: Defines `templates` and `attendees` tables in SQLite.
- **public/index.html**: User-facing page for certificate verification and download.
- **public/admin.html**: Administrator dashboard for event management.
- **sample_attendance.csv**: Example format for attendee data uploads.

## Testing
**Framework**: None configured (Placeholder exists in `package.json`)  
**Run Command**:
```bash
npm test
```
