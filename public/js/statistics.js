let currentUser = null;

function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + 'h ' + m + 'm';
}

async function loadSummary() {
    try {
        const res = await fetch('/api/stats/summary');
        const data = await res.json();
        if (!data.success) return;
        const s = data.stats;
        document.getElementById('statTotalDistance').textContent = Number(s.total_distance).toFixed(1);
        document.getElementById('statTotalDuration').textContent = formatDuration(Number(s.total_duration));
        document.getElementById('statTotalElevation').textContent = Number(s.total_elevation).toLocaleString();
        document.getElementById('statAvgDistance').textContent = Number(s.avg_distance).toFixed(1);
        document.getElementById('statMaxDistance').textContent = Number(s.max_distance).toFixed(1);
        document.getElementById('statCount').textContent = s.total_trainings;
    } catch (err) {
        console.error('Error loading summary:', err);
    }
}

async function loadCharts() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [dailyRes, zoneRes] = await Promise.all([
            fetch('/api/stats/daily?year=' + year + '&month=' + month),
            fetch('/api/stats/zones?year=' + year + '&month=' + month)
        ]);

        const dailyData = await dailyRes.json();
        const zoneData = await zoneRes.json();

        if (!dailyData.success) return;

        drawTrainingCalendar(dailyData.daily, year, month);

        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(function() {
            if (zoneData.success) drawZoneTable(zoneData.weeks, month, year);
            drawTypeChart();
        });
    } catch (err) {
        console.error('Error loading charts:', err);
    }
}

function drawTrainingCalendar(daily, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const trainingDays = {};
    daily.forEach(d => { trainingDays[d.day] = true; });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const monthName = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][month - 1];

    let html = '<div class="calendar-header">' + monthName + ' ' + year + '</div>';
    html += '<div class="calendar-grid">';
    dayNames.forEach(d => { html += '<div class="cal-day-header">' + d + '</div>'; });

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day cal-empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const trained = trainingDays[day];
        html += '<div class="cal-day' + (trained ? ' cal-trained' : '') + '">' + day + '</div>';
    }

    html += '</div>';
    document.getElementById('trainingCalendar').innerHTML = html;
}

function drawZoneTable(weeks, month, year) {
    const weekMap = {};
    const zoneCodes = ['z1', 'z2', 'z3', 'z4', 'z5a', 'z5b', 'z5c'];
    const zoneLabels = { z1: 'Z1 Recupero', z2: 'Z2 Aerobico', z3: 'Z3 Tempo', z4: 'Z4 Sotto-soglia', z5a: 'Z5a Sopra-soglia', z5b: 'Z5b Cap. aerobica', z5c: 'Z5c Cap. anaerobica' };
    const zoneColors = ['#95D5B2', '#52B788', '#2D6A4F', '#FFD166', '#F4A261', '#E76F51', '#D90429'];

    weeks.forEach(w => {
        if (!weekMap[w.week_num]) weekMap[w.week_num] = {};
        weekMap[w.week_num][w.zone_code] = Number(w.total_seconds);
    });

    const weekNums = Object.keys(weekMap).map(Number).sort((a, b) => a - b);
    if (!weekNums.length) {
        document.getElementById('zoneChart').innerHTML = '<div class="empty-state"><p>Nessun dato per le zone cardiache questo mese.</p></div>';
        return;
    }

    function fmt(secs) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        if (h === 0) return m + 'm';
        return h + 'h ' + m + 'm';
    }

    let html = '<table class="zone-table"><thead><tr><th>Zona</th>';
    weekNums.forEach(w => { html += '<th>Sett. ' + w + '</th>'; });
    html += '<th>Totale</th></tr></thead><tbody>';

    zoneCodes.forEach((code, idx) => {
        let total = 0;
        html += '<tr><td><span class="zone-dot" style="background:' + zoneColors[idx] + '"></span>' + zoneLabels[code] + '</td>';
        weekNums.forEach(w => {
            const secs = weekMap[w][code] || 0;
            total += secs;
            html += '<td>' + fmt(secs) + '</td>';
        });
        html += '<td><strong>' + fmt(total) + '</strong></td></tr>';
    });

    html += '</tbody></table>';
    document.getElementById('zoneChart').innerHTML = html;
}

async function drawTypeChart() {
    try {
        const res = await fetch('/api/trainings');
        const data = await res.json();
        if (!data.success || !data.trainings.length) return;

        const counts = {};
        data.trainings.forEach(t => {
            counts[t.type] = (counts[t.type] || 0) + 1;
        });

        const chartData = [['Tipo', 'Numero allenamenti']];
        const typeLabels = { MTB: 'MTB', strada: 'Strada', gravel: 'Gravel', indoor: 'Indoor' };
        Object.keys(counts).forEach(type => {
            chartData.push([typeLabels[type] || type, counts[type]]);
        });

        const dataTable = google.visualization.arrayToDataTable(chartData);
        const options = {
            chartArea: { width: '80%', height: '80%' },
            colors: ['#2D6A4F', '#40916C', '#95D5B2', '#E76F51'],
            animation: { startup: true, duration: 500, easing: 'out' },
            pieSliceText: 'label'
        };

        const chart = new google.visualization.PieChart(document.getElementById('typeChart'));
        chart.draw(dataTable, options);
    } catch (err) {
        console.error('Error drawing type chart:', err);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    currentUser = await checkAuth();
    if (!currentUser) return;

    await loadSummary();
    await loadCharts();
});