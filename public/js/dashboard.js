let currentUser = null;

function deadlineLabel(g) {
    if (g.month) return 'scad. ' + g.month + '/' + g.year;
    return 'scad. ' + g.year;
}

async function loadStats() {
    try {
        const res = await fetch('/api/stats/summary');
        const data = await res.json();
        if (!data.success) return;
        const s = data.stats;
        document.getElementById('totalDistance').textContent = Number(s.total_distance).toFixed(1);
        document.getElementById('totalDuration').textContent = formatDuration(Number(s.total_duration));
        document.getElementById('totalElevation').textContent = Number(s.total_elevation).toLocaleString();
        document.getElementById('totalTrainings').textContent = s.total_trainings;
        document.getElementById('avgDistance').textContent = Number(s.avg_distance).toFixed(1);
        document.getElementById('lastDate').textContent = s.last_date ? formatDate(s.last_date) : '---';
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadGoals() {
    try {
        const res = await fetch('/api/goals');
        const data = await res.json();
        const container = document.getElementById('goalsContainer');
        if (!data.success) {
            container.innerHTML = '<div class="empty-state"><p>Errore nel caricamento degli obiettivi.</p></div>';
            return;
        }
        if (!data.goals.length) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullseye empty-icon"></i><p>Nessun obiettivo impostato. Creane uno nuovo!</p></div>';
            return;
        }
        container.innerHTML = data.goals.map(g => {
            const typeLabels = { distance: 'Distanza', duration: 'Durata', elevation: 'Dislivello' };
            const unitLabels = { distance: 'km', duration: '', elevation: 'm' };
            const formatVal = g.type === 'duration'
                ? formatDuration(Number(g.current_progress)) + ' / ' + formatDuration(Number(g.target_value))
                : Number(g.current_progress).toLocaleString() + ' / ' + Number(g.target_value).toLocaleString() + ' ' + unitLabels[g.type];
            return '<div class="goal-item fade-in">' +
                '<div class="goal-header">' +
                '<span class="goal-type">' + typeLabels[g.type] + ' (' + deadlineLabel(g) + ')</span>' +
                '<span class="goal-value">' + formatVal + '</span>' +
                '<span class="goal-actions">' +
                '<button class="btn btn-sm btn-primary" onclick="openEditGoal(' + g.id + ')"><i class="fa-solid fa-pen"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteGoal(' + g.id + ')"><i class="fa-solid fa-trash"></i></button>' +
                '</span>' +
                '</div>' +
                '<div class="progress-bar"><div class="progress-fill" style="width:' + g.percentage + '%"></div></div>' +
                '<div class="progress-text">' + g.percentage + '% completato</div>' +
                '</div>';
        }).join('');
    } catch (err) {
        console.error('Error loading goals:', err);
        const container = document.getElementById('goalsContainer');
        if (container) container.innerHTML = '<div class="empty-state"><p>Errore di caricamento obiettivi.</p></div>';
    }
}

async function loadRecentTrainings() {
    try {
        const res = await fetch('/api/trainings?sort=training_date&order=desc');
        const data = await res.json();
        const container = document.getElementById('recentTrainings');
        if (!data.success) {
            container.innerHTML = '<div class="empty-state"><p>Errore nel caricamento.</p></div>';
            return;
        }
        if (!data.trainings.length) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-person-biking empty-icon"></i><p>Nessun allenamento registrato.</p></div>';
            return;
        }
        const recent = data.trainings.slice(0, 5);
        let html = '<table class="fade-in"><thead><tr><th>Data</th><th>Titolo</th><th>Tipo</th><th>Km</th><th>Durata</th><th>Dislivello</th></tr></thead><tbody>';
        html += recent.map(t => {
            return '<tr>' +
                '<td>' + formatDate(t.training_date) + '</td>' +
                '<td>' + escapeHtml(t.title) + '</td>' +
                '<td>' + typeBadge(t.type) + '</td>' +
                '<td>' + (t.distance ? Number(t.distance).toFixed(1) : '-') + '</td>' +
                '<td>' + (t.duration ? formatDuration(t.duration) : '-') + '</td>' +
                '<td>' + (t.elevation_gain || '-') + '</td>' +
                '</tr>';
        }).join('');
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading recent trainings:', err);
    }
}

function openGoalModal() {
    document.getElementById('goalModalTitle').textContent = 'Nuovo obiettivo';
    document.getElementById('goalEditId').value = '';
    document.getElementById('goalForm').reset();
    document.getElementById('goalYear').value = new Date().getFullYear();
    document.getElementById('goalType').value = 'distance';
    toggleGoalDurationFields();
    document.getElementById('goalModal').classList.remove('hidden');
}

async function openEditGoal(id) {
    const res = await fetch('/api/goals');
    const data = await res.json();
    if (!data.success) return;
    const goal = data.goals.find(g => g.id === id);
    if (!goal) return;

    document.getElementById('goalModalTitle').textContent = 'Modifica obiettivo';
    document.getElementById('goalEditId').value = goal.id;
    document.getElementById('goalType').value = goal.type;
    document.getElementById('goalTarget').value = goal.target_value;
    document.getElementById('goalDurationHours').value = Math.floor(goal.target_value / 60);
    document.getElementById('goalDurationMinutes').value = goal.target_value % 60;
    document.getElementById('goalYear').value = goal.year;
    document.getElementById('goalMonth').value = goal.month || '';
    toggleGoalDurationFields();
    document.getElementById('goalModal').classList.remove('hidden');
}

async function deleteGoal(id) {
    if (!confirm('Eliminare questo obiettivo?')) return;
    try {
        const res = await fetch('/api/goals/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            await loadGoals();
        } else {
            alert(data.message || 'Errore durante l\'eliminazione');
        }
    } catch (err) {
        console.error('Error deleting goal:', err);
        alert('Errore di connessione');
    }
}

function closeGoalModal() {
    document.getElementById('goalModal').classList.add('hidden');
}

function toggleGoalDurationFields() {
    const isDuration = document.getElementById('goalType').value === 'duration';
    document.getElementById('goalDurationFields').classList.toggle('hidden', !isDuration);
    document.getElementById('goalNumericFields').classList.toggle('hidden', isDuration);

    document.getElementById('goalTarget').required = !isDuration;
    document.getElementById('goalDurationHours').required = isDuration;
    document.getElementById('goalDurationMinutes').required = isDuration;
}

document.addEventListener('DOMContentLoaded', async function() {
    currentUser = await checkAuth();
    if (!currentUser) return;
    document.getElementById('welcomeMsg').textContent = 'Benvenuto, ' + currentUser.first_name + '! Ecco il riepilogo della tua attività.';

    await Promise.all([loadStats(), loadGoals(), loadRecentTrainings()]);

    document.getElementById('goalForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const monthVal = document.getElementById('goalMonth').value;
        const editId = document.getElementById('goalEditId').value;
        const goalType = document.getElementById('goalType').value;

        const goal = {
            type: goalType,
            target_value: goalType === 'duration'
                ? (parseInt(document.getElementById('goalDurationHours').value) || 0) * 60 + (parseInt(document.getElementById('goalDurationMinutes').value) || 0)
                : parseFloat(document.getElementById('goalTarget').value),
            year: parseInt(document.getElementById('goalYear').value),
            month: monthVal ? parseInt(monthVal) : null
        };

        if (!goal.year || goal.year < 2020) {
            alert('Inserisci un anno valido.');
            return;
        }

        const url = editId ? '/api/goals/' + editId : '/api/goals';
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            });
            const data = await res.json();
            if (data.success) {
                closeGoalModal();
                await loadGoals();
            } else {
                alert(data.message || 'Errore durante il salvataggio');
            }
        } catch (err) {
            console.error('Error saving goal:', err);
            alert('Errore di connessione');
        }
    });

    document.getElementById('goalType').addEventListener('change', toggleGoalDurationFields);
});
