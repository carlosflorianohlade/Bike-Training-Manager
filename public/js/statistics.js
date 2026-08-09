let currentUser = null;

function formatDuration(minutes) {
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
        const daysInMonth = new Date(year, month, 0).getDate();

        const res = await fetch('/api/stats/daily?year=' + year + '&month=' + month);
        const data = await res.json();
        if (!data.success) return;

        const dailyMap = {};
        data.daily.forEach(d => { dailyMap[d.day] = d; });

        google.charts.load('current', { packages: ['corechart'] });
        google.charts.setOnLoadCallback(function() {
            drawDistanceChart(dailyMap, daysInMonth, month, year);
            drawDurationChart(dailyMap, daysInMonth, month, year);
            drawElevationChart(dailyMap, daysInMonth, month, year);
            drawTypeChart();
        });
    } catch (err) {
        console.error('Error loading charts:', err);
    }
}

function drawDistanceChart(dailyMap, daysInMonth, month, year) {
    const monthName = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][month - 1];
    const chartData = [['Giorno', 'Km']];

    for (let day = 1; day <= daysInMonth; day++) {
        const d = dailyMap[day];
        chartData.push(['' + day, d ? Number(d.total_distance) : 0]);
    }

    const dataTable = google.visualization.arrayToDataTable(chartData);
    const options = {
        title: monthName + ' ' + year,
        titleTextStyle: { fontSize: 14, bold: true, color: '#2D6A4F' },
        chartArea: { width: '85%', height: '70%' },
        colors: ['#40916C'],
        legend: { position: 'none' },
        vAxis: { title: 'Km', minValue: 0, titleTextStyle: { fontSize: 11, color: '#6C757D' } },
        hAxis: { title: 'Giorno', textStyle: { fontSize: 9 } },
        animation: { startup: true, duration: 500, easing: 'out' }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('distanceChart'));
    chart.draw(dataTable, options);
}

function drawDurationChart(dailyMap, daysInMonth, month, year) {
    const monthName = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][month - 1];
    const chartData = [['Giorno', 'Ore']];

    for (let day = 1; day <= daysInMonth; day++) {
        const d = dailyMap[day];
        chartData.push(['' + day, d ? Number(d.total_duration) / 60 : 0]);
    }

    const dataTable = google.visualization.arrayToDataTable(chartData);
    const options = {
        title: monthName + ' ' + year,
        titleTextStyle: { fontSize: 14, bold: true, color: '#2D6A4F' },
        chartArea: { width: '85%', height: '70%' },
        colors: ['#E76F51'],
        legend: { position: 'none' },
        vAxis: { title: 'Ore', minValue: 0, titleTextStyle: { fontSize: 11, color: '#6C757D' } },
        hAxis: { title: 'Giorno', textStyle: { fontSize: 9 } },
        animation: { startup: true, duration: 500, easing: 'out' }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('durationChart'));
    chart.draw(dataTable, options);
}

function drawElevationChart(dailyMap, daysInMonth, month, year) {
    const monthName = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][month - 1];
    const chartData = [['Giorno', 'Dislivello']];

    for (let day = 1; day <= daysInMonth; day++) {
        const d = dailyMap[day];
        chartData.push(['' + day, d ? Number(d.total_elevation) : 0]);
    }

    const dataTable = google.visualization.arrayToDataTable(chartData);
    const options = {
        title: monthName + ' ' + year,
        titleTextStyle: { fontSize: 14, bold: true, color: '#2D6A4F' },
        chartArea: { width: '85%', height: '70%' },
        colors: ['#95D5B2'],
        legend: { position: 'none' },
        vAxis: { title: 'Metri', minValue: 0, titleTextStyle: { fontSize: 11, color: '#6C757D' } },
        hAxis: { title: 'Giorno', textStyle: { fontSize: 9 } },
        animation: { startup: true, duration: 500, easing: 'out' }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('elevationChart'));
    chart.draw(dataTable, options);
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
