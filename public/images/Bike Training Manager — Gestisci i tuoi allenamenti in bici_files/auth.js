async function checkAuth() {
    try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Not authenticated');
        const data = await res.json();
        return data.user;
    } catch (err) {
        window.location.href = '/login.html';
        return null;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
}

function clearAlerts() {
    document.querySelectorAll('.alert').forEach(el => el.remove());
}

document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.getElementById('mainNav').classList.toggle('open');
        });
    }

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/index.html';
            } catch (err) {
                window.location.href = '/index.html';
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearAlerts();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    window.location.href = '/dashboard.html';
                } else {
                    showAlert('alertContainer', data.message, 'error');
                }
            } catch (err) {
                showAlert('alertContainer', 'Errore di connessione', 'error');
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearAlerts();
            const first_name = document.getElementById('first_name').value.trim();
            const last_name = document.getElementById('last_name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm_password').value;

            if (password !== confirm) {
                showAlert('alertContainer', 'Le password non corrispondono', 'error');
                return;
            }

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ first_name, last_name, email, password })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('alertContainer', 'Registrazione completata! Reindirizzamento...', 'success');
                    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
                } else {
                    showAlert('alertContainer', data.message, 'error');
                }
            } catch (err) {
                showAlert('alertContainer', 'Errore di connessione', 'error');
            }
        });
    }
});
