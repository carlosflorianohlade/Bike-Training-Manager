const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/trainings', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM trainings WHERE user_id = ?';
        const params = [req.user.userId];

        if (req.query.type) {
            query += ' AND type = ?';
            params.push(req.query.type);
        }
        if (req.query.date_from) {
            query += ' AND training_date >= ?';
            params.push(req.query.date_from);
        }
        if (req.query.date_to) {
            query += ' AND training_date <= ?';
            params.push(req.query.date_to);
        }
        if (req.query.q) {
            query += ' AND (title LIKE ? OR notes LIKE ?)';
            const search = `%${req.query.q}%`;
            params.push(search, search);
        }

        const allowedSorts = ['training_date', 'title', 'distance', 'duration', 'avg_speed', 'elevation_gain'];
        const sort = allowedSorts.includes(req.query.sort) ? req.query.sort : 'training_date';
        const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sort} ${order}`;

        const [rows] = await db.execute(query, params);
        res.json({ success: true, trainings: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.post('/trainings', authenticateToken, async (req, res) => {
    try {
        const { title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes } = req.body;
        const [result] = await db.execute(
            `INSERT INTO trainings (user_id, title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, title, training_date, type, distance || null, duration || null, elevation_gain || null, avg_speed || null, avg_hr || null, max_hr || null, cadence || null, notes || null]
        );
        res.json({ success: true, id: result.insertId, message: 'Allenamento aggiunto' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.get('/trainings/:id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM trainings WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Allenamento non trovato' });
        res.json({ success: true, training: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.put('/trainings/:id', authenticateToken, async (req, res) => {
    try {
        const { title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes } = req.body;
        const [result] = await db.execute(
            `UPDATE trainings SET title = ?, training_date = ?, type = ?, distance = ?, duration = ?, elevation_gain = ?, avg_speed = ?, avg_hr = ?, max_hr = ?, cadence = ?, notes = ?
             WHERE id = ? AND user_id = ?`,
            [title, training_date, type, distance || null, duration || null, elevation_gain || null, avg_speed || null, avg_hr || null, max_hr || null, cadence || null, notes || null, req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Allenamento non trovato' });
        res.json({ success: true, message: 'Allenamento aggiornato' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.delete('/trainings/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            'DELETE FROM trainings WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Allenamento non trovato' });
        res.json({ success: true, message: 'Allenamento eliminato' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

module.exports = router;
