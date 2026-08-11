function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + 'h ' + m + 'm';
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
}

function typeBadge(type) {
    const icons = {
        'MTB': '<i class="fa-solid fa-mountain"></i> MTB',
        'strada': '<i class="fa-solid fa-road"></i> Strada',
        'gravel': '<i class="fa-solid fa-road-barrier"></i> Gravel',
        'indoor': '<i class="fa-solid fa-house"></i> Indoor'
    };
    return '<span class="type-badge type-' + type + '">' + (icons[type] || type) + '</span>';
}