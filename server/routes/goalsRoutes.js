const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/goals', authenticateToken, async (req, res) => {
    try {
        const [goals] = await db.execute(
            'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.userId]
        );

        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            let startDate, endDate;
            if (goal.month) {
                startDate = goal.year + '-' + String(goal.month).padStart(2, '0') + '-01';
                const lastDay = new Date(goal.year, goal.month, 0).getDate();
                endDate = goal.year + '-' + String(goal.month).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
            } else {
                startDate = goal.year + '-01-01';
                endDate = goal.year + '-12-31';
            }

            const [progressRows] = await db.execute(
                `SELECT COALESCE(SUM(CASE
                    WHEN ? = 'distance' THEN distance
                    WHEN ? = 'duration' THEN duration
                    WHEN ? = 'elevation' THEN elevation_gain
                    ELSE 0 END), 0) AS progress
                 FROM trainings WHERE user_id = ?
                 AND training_date >= ? AND training_date <= ?`,
                [goal.type, goal.type, goal.type, req.user.userId, startDate, endDate]
            );

            return {
                ...goal,
                current_progress: Number(progressRows[0].progress),
                percentage: goal.target_value > 0
                    ? Math.min(100, Math.round((Number(progressRows[0].progress) / Number(goal.target_value)) * 100))
                    : 0
            };
        }));

        res.json({ success: true, goals: goalsWithProgress });
    } catch (err) {
        console.error('GET /api/goals -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.post('/goals', authenticateToken, async (req, res) => {
    try {
        const { type, target_value, year, month } = req.body;
        const period = month ? 'monthly' : 'yearly';
        const [result] = await db.execute(
            'INSERT INTO goals (user_id, type, target_value, period, year, month) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.userId, type, target_value, period, year, month || null]
        );
        res.json({ success: true, id: result.insertId, message: 'Obiettivo creato' });
    } catch (err) {
        console.error('POST /api/goals -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.put('/goals/:id', authenticateToken, async (req, res) => {
    try {
        const { target_value, type, year, month } = req.body;
        const period = month ? 'monthly' : 'yearly';
        const [result] = await db.execute(
            'UPDATE goals SET target_value = ?, type = ?, period = ?, year = ?, month = ? WHERE id = ? AND user_id = ?',
            [target_value, type, period, year, month || null, req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Obiettivo non trovato' });
        res.json({ success: true, message: 'Obiettivo aggiornato' });
    } catch (err) {
        console.error('PUT /api/goals/' + req.params.id + ' -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.delete('/goals/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM goals WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Obiettivo non trovato' });
        res.json({ success: true, message: 'Obiettivo eliminato' });
    } catch (err) {
        console.error('DELETE /api/goals/' + req.params.id + ' -', err.message);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

module.exports = router;
