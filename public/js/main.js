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

document.addEventListener('DOMContentLoaded', async () => {
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

    const eventSelect = document.getElementById('eventSelect');
    const claimForm = document.getElementById('claimForm');
    const submitBtn = document.getElementById('submitBtn');
    const resultActions = document.getElementById('resultActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewBtn = document.getElementById('previewBtn');
    const resetBtn = document.getElementById('resetBtn');

    let currentData = null;

    // Fetch available events
    try {
        const res = await fetch('/api/events');
        const events = await res.json();
        events.forEach(event => {
            const opt = document.createElement('option');
            opt.value = event.event_id;
            opt.textContent = event.event_id;
            eventSelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Error fetching events:', err);
    }

    claimForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const event_id = eventSelect.value;
        const identifier = document.getElementById('identifier').value.trim();

        if (!event_id || !identifier) return;

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id, identifier })
            });

            const data = await res.json();

            if (res.ok) {
                Toast.show('Verification successful!');
                currentData = { event_id, identifier };
                claimForm.classList.add('hidden');
                resultActions.classList.remove('hidden');
            } else {
                Toast.show(data.error || 'User not found', 'error');
            }
        } catch (err) {
            Toast.show('Connection error', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!currentData) return;
        window.location.href = `/api/download?event_id=${encodeURIComponent(currentData.event_id)}&identifier=${encodeURIComponent(currentData.identifier)}`;
    });

    previewBtn.addEventListener('click', () => {
        if (!currentData) return;
        window.open(`/api/download?event_id=${encodeURIComponent(currentData.event_id)}&identifier=${encodeURIComponent(currentData.identifier)}&preview=true`, '_blank');
    });

    resetBtn.addEventListener('click', () => {
        currentData = null;
        claimForm.classList.remove('hidden');
        resultActions.classList.add('hidden');
        claimForm.reset();
    });
});
