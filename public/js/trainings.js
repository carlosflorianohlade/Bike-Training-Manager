let currentUser = null;
let currentSort = 'training_date';
let currentOrder = 'desc';

function toInputDateValue(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function calculateAvgSpeed() {
    const distance = parseFloat(document.getElementById('tDistance').value);
    const duration = getDurationMinutes();
    const avgSpeedField = document.getElementById('tAvgSpeed');

    if (distance && duration && duration > 0) {
        const avgSpeed = (distance * 60) / duration;
        avgSpeedField.value = avgSpeed.toFixed(1);
    } else {
        avgSpeedField.value = '';
    }
}

function getDurationMinutes() {
    const h = parseInt(document.getElementById('tDurationHours').value) || 0;
    const m = parseInt(document.getElementById('tDurationMinutes').value) || 0;
    return h * 60 + m;
}

function setDurationFields(minutes) {
    const total = minutes || 0;
    document.getElementById('tDurationHours').value = Math.floor(total / 60);
    document.getElementById('tDurationMinutes').value = total % 60;
}

const ZONE_DEFS = [
    { code: 'z1', name: 'Recupero', lo: 0, hi: 0.82 },
    { code: 'z2', name: 'Aerobico', lo: 0.82, hi: 0.89 },
    { code: 'z3', name: 'Tempo', lo: 0.89, hi: 0.94 },
    { code: 'z4', name: 'Sotto-soglia', lo: 0.94, hi: 1.0 },
    { code: 'z5a', name: 'Sopra-soglia', lo: 1.0, hi: 1.03 },
    { code: 'z5b', name: 'Capacità aerobica', lo: 1.03, hi: 1.06 },
    { code: 'z5c', name: 'Capacità anaerobica', lo: 1.06, hi: 999 }
];

function computeZoneBounds(lthr) {
    if (!lthr) return null;
    return [
        0,
        Math.floor(lthr * 0.82),
        Math.floor(lthr * 0.89),
        Math.floor(lthr * 0.94),
        lthr,
        Math.floor(lthr * 1.03),
        Math.floor(lthr * 1.06),
        Infinity
    ];
}

function formatZoneRange(bounds, idx) {
    if (!bounds) return '';
    const lo = bounds[idx];
    const hi = bounds[idx + 1];
    if (idx === 0) return '0-' + hi + ' bpm';
    if (hi === Infinity) return '> ' + lo + ' bpm';
    return (lo + 1) + '-' + hi + ' bpm';
}

function buildZoneSection(lthr) {
    const container = document.getElementById('zoneSection');
    if (!lthr) {
        container.innerHTML = '<div class="zone-section"><div class="zone-header" style="cursor:default;color:#6C757D;"><i class="fa-solid fa-heart-pulse"></i> Zone cardiache <small style="font-weight:400;">— imposta LTHR nel profilo</small></div></div>';
        return;
    }
    const bounds = computeZoneBounds(lthr);
    let html = '<div class="zone-section"><div class="zone-header" onclick="toggleZoneSection()"><i class="fa-solid fa-heart-pulse"></i> Zone cardiache <span class="zone-toggle">&#9654;</span></div><div class="zone-body hidden">';
    ZONE_DEFS.forEach((def, idx) => {
        html += '<div class="zone-row" data-zone="' + def.code + '">' +
            '<span class="zone-badge">' + def.code + '</span>' +
            '<span class="zone-name">' + def.name + '</span>' +
            '<span class="zone-range">' + formatZoneRange(bounds, idx) + '</span>' +
            '<input type="number" class="zone-h" min="0" step="1" placeholder="h">' +
            '<span class="zone-unit">h</span>' +
            '<input type="number" class="zone-m" min="0" max="59" step="1" placeholder="m">' +
            '<span class="zone-unit">m</span>' +
            '<input type="number" class="zone-s" min="0" max="59" step="1" placeholder="s">' +
            '<span class="zone-unit">s</span>' +
            '</div>';
    });
    html += '</div></div>';
    container.innerHTML = html;
}

function toggleZoneSection() {
    const body = document.querySelector('.zone-body');
    const toggle = document.querySelector('.zone-toggle');
    if (!body) return;
    body.classList.toggle('hidden');
    toggle.textContent = body.classList.contains('hidden') ? '\u25B6' : '\u25BC';
}

function getZoneTimes() {
    const rows = document.querySelectorAll('.zone-row');
    if (!rows.length) return [];
    return Array.from(rows).map(row => {
        const h = parseInt(row.querySelector('.zone-h').value) || 0;
        const m = parseInt(row.querySelector('.zone-m').value) || 0;
        const s = parseInt(row.querySelector('.zone-s').value) || 0;
        return { zone_code: row.dataset.zone, seconds: h * 3600 + m * 60 + s };
    }).filter(z => z.seconds > 0);
}

function setZoneTimes(zoneTimes) {
    const rows = document.querySelectorAll('.zone-row');
    if (!rows.length) return;
    const map = {};
    (zoneTimes || []).forEach(z => { map[z.zone_code] = z.seconds; });
    rows.forEach(row => {
        const secs = map[row.dataset.zone] || 0;
        row.querySelector('.zone-h').value = Math.floor(secs / 3600) || '';
        row.querySelector('.zone-m').value = Math.floor((secs % 3600) / 60) || '';
        row.querySelector('.zone-s').value = secs % 60 || '';
    });
}

function resetZoneFields() {
    const rows = document.querySelectorAll('.zone-row');
    rows.forEach(row => {
        row.querySelector('.zone-h').value = '';
        row.querySelector('.zone-m').value = '';
        row.querySelector('.zone-s').value = '';
    });
}

function setFormDisabled(disabled) {
    const controls = document.getElementById('trainingForm').querySelectorAll('input, select, textarea');
    controls.forEach(el => { el.disabled = disabled; });
}

function setFormMode(editMode) {
    setFormDisabled(!editMode);
    document.getElementById('saveBtn').style.display = editMode ? '' : 'none';
    document.getElementById('cancelBtn').textContent = editMode ? 'Annulla' : 'Chiudi';
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
            return '<tr onclick="visualizeModal(' + t.id + ')">' +
                '<td>' + formatDate(t.training_date) + '</td>' +
                '<td>' + escapeHtml(t.title) + '</td>' +
                '<td>' + typeBadge(t.type) + '</td>' +
                '<td>' + (t.distance ? Number(t.distance).toFixed(1) : '-') + '</td>' +
                '<td>' + formatDuration(t.duration) + '</td>' +
                '<td>' + (t.elevation_gain || '-') + '</td>' +
                '<td>' + (t.avg_speed ? Number(t.avg_speed).toFixed(1) : '-') + '</td>' +
                '<td class="table-actions" onclick="event.stopPropagation()">' +
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
    setFormMode(true);
    document.getElementById('trainingForm').reset();
    document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('tType').value = currentUser.preferred_discipline || 'MTB';
    resetZoneFields();
    document.getElementById('trainingModal').classList.remove('hidden');
}

async function visualizeModal(id) {
    try {
        const res = await fetch('/api/trainings/' + id);
        const data = await res.json();
        if (!data.success) return;

        const t = data.training;
        document.getElementById('modalTitle').textContent = 'Visualizza allenamento';
        document.getElementById('tTitle').value = t.title;
        document.getElementById('tDate').value = toInputDateValue(t.training_date);
        document.getElementById('tType').value = t.type;
        document.getElementById('tDistance').value = t.distance;
        setDurationFields(t.duration);
        document.getElementById('tElevation').value = t.elevation_gain;
        document.getElementById('tAvgSpeed').value = t.avg_speed;
        document.getElementById('tAvgHr').value = t.avg_hr;
        document.getElementById('tMaxHr').value = t.max_hr;
        document.getElementById('tCadence').value = t.cadence;
        document.getElementById('tNotes').value = t.notes;
        setZoneTimes(t.zone_times);

        setFormMode(false);
        document.getElementById('trainingModal').classList.remove('hidden');
    } catch (err) {
        console.error('Error loading training:', err);
    }
}

async function openEditModal(id) {
    try {
        const res = await fetch('/api/trainings/' + id);
        const data = await res.json();
        if (!data.success) return;

        const t = data.training;
        document.getElementById('modalTitle').textContent = 'Modifica allenamento';
        setFormMode(true);
        document.getElementById('tDate').value = toInputDateValue(t.training_date);
        document.getElementById('editId').value = t.id;
        document.getElementById('tTitle').value = t.title;
        document.getElementById('tType').value = t.type;
        document.getElementById('tDistance').value = t.distance;
        setDurationFields(t.duration);
        document.getElementById('tElevation').value = t.elevation_gain;
        calculateAvgSpeed();
        document.getElementById('tAvgHr').value = t.avg_hr;
        document.getElementById('tMaxHr').value = t.max_hr;
        document.getElementById('tCadence').value = t.cadence;
        document.getElementById('tNotes').value = t.notes;
        setZoneTimes(t.zone_times);

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

    const profileRes = await fetch('/api/profile');
    const profileData = await profileRes.json();
    if (profileData.success) {
        buildZoneSection(profileData.user.lthr);
    }

    document.getElementById('tDistance').addEventListener('input', calculateAvgSpeed);
    document.getElementById('tDurationHours').addEventListener('input', calculateAvgSpeed);
    document.getElementById('tDurationMinutes').addEventListener('input', calculateAvgSpeed);

    document.getElementById('trainingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const training = {
            title: document.getElementById('tTitle').value,
            training_date: document.getElementById('tDate').value,
            type: document.getElementById('tType').value,
            distance: parseFloat(document.getElementById('tDistance').value) || null,
            duration: getDurationMinutes() || null,
            elevation_gain: parseInt(document.getElementById('tElevation').value) || null,
            avg_speed: parseFloat(document.getElementById('tAvgSpeed').value) || null,
            avg_hr: parseInt(document.getElementById('tAvgHr').value) || null,
            max_hr: parseInt(document.getElementById('tMaxHr').value) || null,
            cadence: parseInt(document.getElementById('tCadence').value) || null,
            notes: document.getElementById('tNotes').value || null,
            zone_times: getZoneTimes()
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
