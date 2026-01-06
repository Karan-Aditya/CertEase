# CertEase 🎓

CertEase is a powerful, lightweight Node.js-based web application designed for automated certificate generation and distribution. It allows administrators to upload PDF templates and attendee lists, while participants can easily verify their details and download personalized certificates.

## 🚀 Features

-   **Automated PDF Generation**: Personalized certificates generated on-the-fly using `pdf-lib`.
-   **Admin Dashboard**: Manage events, upload templates, and import attendee data via CSV.
-   **Live Analytics**: Real-time tracking of total events, attendees, and certificates claimed.
-   **Certificate Preview**: In-page modal preview to verify text positioning and font size before saving.
-   **Theme Support**: Seamless switching between Dark and Light modes.
-   **Responsive Design**: Fully functional on desktop and mobile devices.
-   **Data Management**: CRUD operations for attendee records and bulk delete functionality.

## 🛠️ Tech Stack

-   **Backend**: Node.js, Express.js
-   **Database**: SQLite3 (Persistent storage)
-   **PDF Manipulation**: pdf-lib
-   **File Handling**: Multer (Uploads), csv-parser (Attendee lists)
-   **Frontend**: Vanilla JavaScript, CSS3 (Glassmorphism UI), HTML5

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd CertEase
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the server**:
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3000` by default.

## 📖 Usage

### Admin Access
-   Go to `/admin.html`.

### Uploading a Template
1.  Navigate to **Upload Template**.
2.  Provide an **Event ID** and upload a **PDF Certificate**.
3.  Set the **X/Y Coordinates** for the name (use `-1` for horizontal centering).
4.  Click **Preview** to verify the positioning in the popup window.
5.  Click **Upload Template** to save.

### Importing Attendees
1.  Navigate to **Upload Attendance**.
2.  Select the **Event ID**.
3.  Upload a **CSV file** with the columns: `name,email,regid,present`.
    -   `present` should be `1` for eligible participants.

### Downloading Certificates
-   Participants can visit the home page (`index.html`).
-   Select their event and enter their **Email** or **Registration ID**.
-   If verified, the personalized certificate will download automatically.

## 📂 Project Structure

-   `public/`: Static assets (HTML, CSS, Client-side JS).
-   `templates/`: Stored PDF certificate templates.
-   `uploads/`: Temporary storage for processed CSV files.
-   `server.js`: Main Express server and API logic.
-   `db.js`: Database schema and initialization.

## 📄 License

This project is licensed under the ISC License.

---
Created by **Aditya Karanjekar**
