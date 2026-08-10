let currentUser = null;

function showProfileAlert(message, type) {
    const container = document.getElementById('profileAlert');
    container.innerHTML = '<div class="alert alert-' + type + '">' + escapeHtml(message) + '</div>';
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

document.addEventListener('DOMContentLoaded', async function() {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('pFirstName').value = currentUser.first_name;
    document.getElementById('pLastName').value = currentUser.last_name;
    document.getElementById('pEmail').value = currentUser.email;
    document.getElementById('pWeight').value = currentUser.weight || '';
    document.getElementById('pHeight').value = currentUser.height || '';
    document.getElementById('pLthr').value = currentUser.lthr || '';
    document.getElementById('pDiscipline').value = currentUser.preferred_discipline || 'MTB';

    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            first_name: document.getElementById('pFirstName').value,
            last_name: document.getElementById('pLastName').value,
            weight: parseFloat(document.getElementById('pWeight').value) || null,
            height: parseFloat(document.getElementById('pHeight').value) || null,
            lthr: parseInt(document.getElementById('pLthr').value) || null,
            preferred_discipline: document.getElementById('pDiscipline').value
        };

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                showProfileAlert('Profilo aggiornato con successo!', 'success');
            } else {
                showProfileAlert(result.message || 'Errore durante il salvataggio', 'error');
            }
        } catch (err) {
            showProfileAlert('Errore di connessione', 'error');
        }
    });

    document.getElementById('passwordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const old_password = document.getElementById('oldPassword').value;
        const new_password = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;

        if (new_password !== confirm) {
            showProfileAlert('Le nuove password non corrispondono', 'error');
            return;
        }

        try {
            const res = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password, new_password })
            });
            const result = await res.json();
            if (result.success) {
                showProfileAlert('Password cambiata con successo!', 'success');
                document.getElementById('passwordForm').reset();
            } else {
                showProfileAlert(result.message || 'Errore durante il cambio password', 'error');
            }
        } catch (err) {
            showProfileAlert('Errore di connessione', 'error');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async function() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/index.html';
        } catch (err) {
            console.error('Logout error:', err);
        }
    });
});
