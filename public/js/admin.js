const Toast = {
    show(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : '❌'}</span>
            <p>${message}</p>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Theme Logic
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'light') {
        body.classList.add('light-theme');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const theme = body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
    });

    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    // Sidebar Navigation
    const navItems = document.querySelectorAll('.sidebar-nav li[data-section]');
    const sections = {
        uploadTemplate: document.getElementById('uploadTemplateSection'),
        uploadAttendance: document.getElementById('uploadAttendanceSection'),
        viewData: document.getElementById('viewDataSection')
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/admin/stats');
            if (res.ok) {
                const data = await res.json();
                document.getElementById('statTotalEvents').textContent = data.totalEvents;
                document.getElementById('statTotalAttendees').textContent = data.totalAttendees;
                document.getElementById('statTotalEligible').textContent = data.totalEligible;
                document.getElementById('statTotalClaimed').textContent = data.totalClaimed;
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            const events = await res.json();
            const selects = [
                document.getElementById('attendanceEventSelect'),
                document.getElementById('filterEventSelect')
            ];

            selects.forEach(select => {
                if (!select) return;
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select an Event</option>';
                events.forEach(ev => {
                    const opt = document.createElement('option');
                    opt.value = ev.event_id;
                    opt.textContent = ev.event_id;
                    select.appendChild(opt);
                });
                select.value = currentValue;
            });
        } catch (err) {
            console.error('Failed to fetch events', err);
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-section');
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            Object.values(sections).forEach(s => s.classList.add('hidden'));
            sections[target].classList.remove('hidden');

            fetchStats();
            if (target === 'viewData' || target === 'uploadAttendance') fetchEvents();
            if (target === 'viewData') loadAttendanceData(document.getElementById('filterEventSelect').value);
        });
    });

    // Login logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            const res = await fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                localStorage.setItem('isAdmin', 'true');
                Toast.show('Welcome back, Admin!');
                fetchStats();
            } else {
                Toast.show('Invalid credentials', 'error');
            }
        } catch (err) {
            Toast.show('Server error', 'error');
        } finally {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/admin/logout', { method: 'POST' });
        localStorage.removeItem('isAdmin');
        location.reload();
    });

    // Template Upload
    const templateForm = document.getElementById('templateForm');
    const previewPlacementBtn = document.getElementById('previewPlacementBtn');
    const templatePreviewContainer = document.getElementById('templatePreviewContainer');
    const templatePreviewFrame = document.getElementById('templatePreviewFrame');

    previewPlacementBtn.addEventListener('click', async () => {
        const formData = new FormData(templateForm);
        const fileInput = templateForm.querySelector('input[type="file"]');
        
        if (!fileInput.files || !fileInput.files[0]) {
            return Toast.show('Please select a PDF file first', 'error');
        }

        try {
            previewPlacementBtn.disabled = true;
            const res = await fetch('/admin/preview-template', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                templatePreviewFrame.src = url;
                templatePreviewContainer.classList.remove('hidden');
                Toast.show('Preview updated');
            } else {
                let errorMsg = 'Preview failed';
                try {
                    const data = await res.json();
                    errorMsg = data.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error: ${res.status} ${res.statusText}`;
                }
                Toast.show(errorMsg, 'error');
            }
        } catch (err) {
            console.error('Preview error:', err);
            Toast.show('Connection error or invalid response', 'error');
        } finally {
            previewPlacementBtn.disabled = false;
        }
    });

    templateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const btn = e.target.querySelector('button[type="submit"]');
        
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const res = await fetch('/admin/upload-template', {
                method: 'POST',
                body: formData
            });

            if (res.status === 401) {
                localStorage.removeItem('isAdmin');
                location.reload();
                return;
            }

            const data = await res.json();
            if (res.ok) {
                Toast.show('Template uploaded successfully!');
                e.target.reset();
                fetchEvents();
            } else {
                Toast.show(data.error || 'Upload failed', 'error');
            }
        } catch (err) {
            Toast.show('Connection error', 'error');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    });

    // Attendance Upload
    document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const btn = e.target.querySelector('button[type="submit"]');

        btn.classList.add('loading');
        btn.disabled = true;

        try {
            const res = await fetch('/admin/upload-attendance', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                Toast.show(`Successfully imported ${data.count} records`);
                e.target.reset();
            } else {
                Toast.show(data.error || 'Import failed', 'error');
            }
        } catch (err) {
            Toast.show('Connection error', 'error');
        } finally {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    });

    // View Data
    const filterSelect = document.getElementById('filterEventSelect');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const bulkActions = document.getElementById('bulkActions');
    const selectAllCheckbox = document.getElementById('selectAll');
    const deleteAllSelectedBtn = document.getElementById('deleteAllSelectedBtn');

    const loadAttendanceData = async (event_id = '') => {
        try {
            const res = await fetch(`/admin/data${event_id ? '?event_id=' + encodeURIComponent(event_id) : ''}`);
            const data = await res.json();
            const tbody = document.querySelector('#attendanceTable tbody');
            tbody.innerHTML = '';
            
            if (event_id) {
                deleteEventBtn.style.display = 'block';
                bulkActions.style.display = data.length > 0 ? 'block' : 'none';
            } else {
                deleteEventBtn.style.display = 'none';
                bulkActions.style.display = 'none';
            }

            selectAllCheckbox.checked = false;

            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.dataset.id = row.id;
                tr.innerHTML = `
                    <td><input type="checkbox" class="row-checkbox" value="${row.id}"></td>
                    <td contenteditable="false">${row.name}</td>
                    <td contenteditable="false"><span style="color: var(--primary); font-size: 0.7rem; display: block;">${row.event_id}</span>${row.email}</td>
                    <td contenteditable="false">${row.regid}</td>
                    <td>
                        <input type="checkbox" ${row.present ? 'checked' : ''} disabled>
                    </td>
                    <td><code>${row.certificate_id}</code></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit-btn" title="Edit">✏️</button>
                            <button class="btn-icon save-btn hidden" style="background: var(--success);" title="Save">💾</button>
                            <button class="btn-icon delete-btn" style="background: var(--error);" title="Delete">🗑️</button>
                        </div>
                    </td>
                `;

                const editBtn = tr.querySelector('.edit-btn');
                const saveBtn = tr.querySelector('.save-btn');
                const deleteBtn = tr.querySelector('.delete-btn');
                const checkbox = tr.querySelector('input[type="checkbox"]:not(.row-checkbox)');
                const cells = tr.querySelectorAll('td[contenteditable]');

                editBtn.addEventListener('click', () => {
                    cells.forEach(cell => cell.contentEditable = "true");
                    checkbox.disabled = false;
                    editBtn.classList.add('hidden');
                    saveBtn.classList.remove('hidden');
                    tr.classList.add('editing');
                });

                saveBtn.addEventListener('click', async () => {
                    const updatedData = {
                        name: cells[0].innerText.trim(),
                        email: cells[1].innerText.trim(),
                        regid: cells[2].innerText.trim(),
                        present: checkbox.checked
                    };

                    try {
                        const response = await fetch(`/admin/attendee/${row.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedData)
                        });

                        if (response.ok) {
                            Toast.show('Record updated');
                            cells.forEach(cell => cell.contentEditable = "false");
                            checkbox.disabled = true;
                            editBtn.classList.remove('hidden');
                            saveBtn.classList.add('hidden');
                            tr.classList.remove('editing');
                        } else {
                            Toast.show('Update failed', 'error');
                        }
                    } catch (err) {
                        Toast.show('Network error', 'error');
                    }
                });

                deleteBtn.addEventListener('click', async () => {
                    if (!confirm('Are you sure you want to delete this record?')) return;

                    try {
                        const response = await fetch(`/admin/attendee/${row.id}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            Toast.show('Record deleted');
                            tr.remove();
                        } else {
                            Toast.show('Delete failed', 'error');
                        }
                    } catch (err) {
                        Toast.show('Network error', 'error');
                    }
                });

                tbody.appendChild(tr);
            });
        } catch (err) {
            Toast.show('Failed to load data', 'error');
        }
    };

    // Select All Logic
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    // Bulk Delete Logic
    deleteAllSelectedBtn.addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.row-checkbox:checked'))
                            .map(cb => cb.value);
        
        if (selected.length === 0) return Toast.show('No records selected', 'error');
        if (!confirm(`Are you sure you want to delete ${selected.length} records?`)) return;

        try {
            const res = await fetch('/admin/attendees/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selected })
            });

            if (res.ok) {
                Toast.show('Selected records deleted');
                loadAttendanceData(filterSelect.value);
            } else {
                Toast.show('Bulk delete failed', 'error');
            }
        } catch (err) {
            Toast.show('Network error', 'error');
        }
    });

    // Delete Event Logic
    deleteEventBtn.addEventListener('click', async () => {
        const event_id = filterSelect.value;
        if (!event_id) return;
        if (!confirm(`WARNING: This will delete ALL data and the template for event "${event_id}". Proceed?`)) return;

        try {
            const res = await fetch(`/admin/event/${event_id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                Toast.show('Event deleted successfully');
                fetchEvents();
                loadAttendanceData();
            } else {
                Toast.show('Failed to delete event', 'error');
            }
        } catch (err) {
            Toast.show('Network error', 'error');
        }
    });

    filterSelect.addEventListener('change', (e) => {
        loadAttendanceData(e.target.value);
    });

    // Persistence Check
    const checkAuth = async () => {
        try {
            const res = await fetch('/api/check-auth');
            const data = await res.json();
            if (data.isAdmin) {
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                localStorage.setItem('isAdmin', 'true');
                fetchStats();
            } else {
                localStorage.removeItem('isAdmin');
                loginSection.classList.remove('hidden');
                dashboardSection.classList.add('hidden');
            }
        } catch (err) {
            console.error('Auth check failed', err);
        }
    };

    checkAuth();
});
