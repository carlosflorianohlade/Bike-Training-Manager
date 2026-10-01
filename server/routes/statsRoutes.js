const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                COUNT(*) AS total_trainings,
                COALESCE(SUM(distance), 0) AS total_distance,
                COALESCE(SUM(duration), 0) AS total_duration,
                COALESCE(SUM(elevation_gain), 0) AS total_elevation,
                COALESCE(ROUND(AVG(distance), 1), 0) AS avg_distance,
                COALESCE(MAX(distance), 0) AS max_distance,
                MAX(training_date) AS last_date
             FROM trainings WHERE user_id = ?`,
            [req.user.userId]
        );
        res.json({ success: true, stats: rows[0] });
    } catch (err) {
        console.error('GET /api/stats/summary -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.get('/stats/daily', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const [rows] = await db.execute(
            `SELECT DISTINCT DAY(training_date) AS day
            FROM trainings WHERE user_id = ?
                AND YEAR(training_date) = ?
                AND MONTH(training_date) = ?
            ORDER BY day ASC
            `,
            [req.user.userId, year, month]
        );
        res.json({ success: true, daily: rows });
    } catch (err) {
        console.error('GET /api/stats/daily -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.get('/stats/zones', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
        const [userRows] = await db.execute('SELECT zone_method FROM users WHERE id = ?', [req.user.userId]);
        const zone_method = (userRows[0] && userRows[0].zone_method) || 'lthr';
        const isFTP = zone_method === 'ftp';
        const table = isFTP ? 'training_power_zone_times' : 'training_hr_zone_times';
        const order = isFTP
            ? `FIELD(tz.zone_code, 'Z1','Z2','Z3','Z4','Z5','Z6','Z7')`
            : `FIELD(tz.zone_code, 'z1','z2','z3','z4','z5a','z5b','z5c')`;
        const [rows] = await db.execute(
            `SELECT
                tz.zone_code,
                COALESCE(SUM(tz.seconds), 0) AS total_seconds
             FROM ${table} tz
             JOIN trainings t ON tz.training_id = t.id
             WHERE t.user_id = ? AND YEAR(t.training_date) = ? AND MONTH(t.training_date) = ?
             GROUP BY tz.zone_code
             ORDER BY ${order}`,
            [req.user.userId, year, month]
        );
        res.json({ success: true, zones: rows, zone_method });
    } catch (err) {
        console.error('GET /api/stats/zones -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

module.exports = router;
