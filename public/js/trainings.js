let currentUser = null;
let currentSort = 'training_date';
let currentOrder = 'desc';

function formatDuration(minutes) {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + 'h ' + m + 'm';
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

function calculateAvgSpeed() {
    const distance = parseFloat(document.getElementById('tDistance').value);
    const duration = parseInt(document.getElementById('tDuration').value);
    const avgSpeedField = document.getElementById('tAvgSpeed');

    if (distance && duration && duration > 0) {
        const avgSpeed = (distance * 60) / duration;
        avgSpeedField.value = avgSpeed.toFixed(1);
    } else {
        avgSpeedField.value = '';
    }
}

function typeBadge(type) {
    const icons = {
        'MTB': '<i class="fa-solid fa-mountain"></i> MTB',
        'strada': '<i class="fa-solid fa-road"></i> Strada',
        'gravel': '<i class="fa-solid fa-road-barrier"></i> Gravel',
        'indoor': '<i class="fa-solid fa-house-signal"></i> Indoor'
    };
    return '<span class="type-badge type-' + type + '">' + (icons[type] || type) + '</span>';
}

async function loadTrainings() {
    const params = new URLSearchParams();
    params.set('sort', currentSort);
    params.set('order', currentOrder);

    const q = document.getElementById('searchText').value.trim();
    if (q) params.set('q', q);
    const type = document.getElementById('filterType').value;
    if (type) params.set('type', type);
    const dateFrom = document.getElementById('filterDateFrom').value;
    if (dateFrom) params.set('date_from', dateFrom);
    const dateTo = document.getElementById('filterDateTo').value;
    if (dateTo) params.set('date_to', dateTo);

    try {
        const res = await fetch('/api/trainings?' + params.toString());
        const data = await res.json();
        const container = document.getElementById('trainingsContainer');

        if (!data.success || !data.trainings.length) {
            container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-person-biking empty-icon"></i><p>Nessun allenamento trovato.</p></div>';
            return;
        }

        let html = '<table class="fade-in"><thead><tr>' +
            '<th onclick="sortBy(\'training_date\')">Data <span class="sort-icon">' + getSortIcon('training_date') + '</span></th>' +
            '<th onclick="sortBy(\'title\')">Titolo <span class="sort-icon">' + getSortIcon('title') + '</span></th>' +
            '<th>Tipo</th>' +
            '<th onclick="sortBy(\'distance\')">Km <span class="sort-icon">' + getSortIcon('distance') + '</span></th>' +
            '<th onclick="sortBy(\'duration\')">Durata <span class="sort-icon">' + getSortIcon('duration') + '</span></th>' +
            '<th>Dislivello</th>' +
            '<th onclick="sortBy(\'avg_speed\')">Vel. media <span class="sort-icon">' + getSortIcon('avg_speed') + '</span></th>' +
            '<th>Azioni</th>' +
            '</tr></thead><tbody>';

        html += data.trainings.map(t => {
            return '<tr>' +
                '<td>' + formatDate(t.training_date) + '</td>' +
                '<td>' + escapeHtml(t.title) + '</td>' +
                '<td>' + typeBadge(t.type) + '</td>' +
                '<td>' + (t.distance ? Number(t.distance).toFixed(1) : '-') + '</td>' +
                '<td>' + formatDuration(t.duration) + '</td>' +
                '<td>' + (t.elevation_gain || '-') + '</td>' +
                '<td>' + (t.avg_speed ? Number(t.avg_speed).toFixed(1) : '-') + '</td>' +
                '<td class="table-actions">' +
                '<button class="btn btn-primary btn-sm" onclick="openEditModal(' + t.id + ')"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="btn btn-danger btn-sm" onclick="deleteTraining(' + t.id + ')"><i class="fa-solid fa-trash"></i></button>' +
                '</td></tr>';
        }).join('');
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Error loading trainings:', err);
    }
}

function getSortIcon(field) {
    if (field !== currentSort) return '\u21C5';
    return currentOrder === 'asc' ? '\u2191' : '\u2193';
}

function sortBy(field) {
    if (field === currentSort) {
        currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = field;
        currentOrder = 'desc';
    }
    loadTrainings();
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Nuovo allenamento';
    document.getElementById('editId').value = '';
    document.getElementById('trainingForm').reset();
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('trainingModal').classList.remove('hidden');
}

async function openEditModal(id) {
    try {
        const res = await fetch('/api/trainings/' + id);
        const data = await res.json();
        if (!data.success) return;

        const t = data.training;
        document.getElementById('modalTitle').textContent = 'Modifica allenamento';
        document.getElementById('editId').value = t.id;
        document.getElementById('tTitle').value = t.title;
        document.getElementById('tDate').value = t.training_date;
        document.getElementById('tType').value = t.type;
        document.getElementById('tDistance').value = t.distance;
        document.getElementById('tDuration').value = t.duration;
        document.getElementById('tElevation').value = t.elevation_gain;
        calculateAvgSpeed();
        document.getElementById('tAvgHr').value = t.avg_hr;
        document.getElementById('tMaxHr').value = t.max_hr;
        document.getElementById('tCadence').value = t.cadence;
        document.getElementById('tNotes').value = t.notes;

        document.getElementById('trainingModal').classList.remove('hidden');
    } catch (err) {
        console.error('Error loading training:', err);
    }
}

function closeModal() {
    document.getElementById('trainingModal').classList.add('hidden');
}

async function deleteTraining(id) {
    if (!confirm('Eliminare questo allenamento?')) return;
    try {
        const res = await fetch('/api/trainings/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadTrainings();
        }
    } catch (err) {
        console.error('Error deleting training:', err);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    currentUser = await checkAuth();
    if (!currentUser) return;

    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    await loadTrainings();

    document.getElementById('tDistance').addEventListener('input', calculateAvgSpeed);
    document.getElementById('tDuration').addEventListener('input', calculateAvgSpeed);

    document.getElementById('trainingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const training = {
            title: document.getElementById('tTitle').value,
            training_date: document.getElementById('tDate').value,
            type: document.getElementById('tType').value,
            distance: parseFloat(document.getElementById('tDistance').value) || null,
            duration: parseInt(document.getElementById('tDuration').value) || null,
            elevation_gain: parseInt(document.getElementById('tElevation').value) || null,
            avg_speed: parseFloat(document.getElementById('tAvgSpeed').value) || null,
            avg_hr: parseInt(document.getElementById('tAvgHr').value) || null,
            max_hr: parseInt(document.getElementById('tMaxHr').value) || null,
            cadence: parseInt(document.getElementById('tCadence').value) || null,
            notes: document.getElementById('tNotes').value || null
        };

        const editId = document.getElementById('editId').value;
        const url = editId ? '/api/trainings/' + editId : '/api/trainings';
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(training)
            });
            const data = await res.json();
            if (data.success) {
                closeModal();
                await loadTrainings();
            }
        } catch (err) {
            console.error('Error saving training:', err);
        }
    });
});
