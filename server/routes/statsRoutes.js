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
            `SELECT
                DAY(training_date) AS day,
                COALESCE(SUM(distance), 0) AS total_distance,
                COALESCE(SUM(duration), 0) AS total_duration,
                COALESCE(SUM(elevation_gain), 0) AS total_elevation
             FROM trainings WHERE user_id = ?
                AND YEAR(training_date) = ?
                AND MONTH(training_date) = ?
             GROUP BY DAY(training_date)
             ORDER BY day ASC`,
            [req.user.userId, year, month]
        );
        res.json({ success: true, daily: rows });
    } catch (err) {
        console.error('GET /api/stats/daily -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

module.exports = router;
