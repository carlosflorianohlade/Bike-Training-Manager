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
        const { title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes, zone_times, hr_zone_times, power_zone_times } = req.body;
        let zone_method = req.body.zone_method;
        if (zone_method !== 'ftp' && zone_method !== 'lthr') {
            const [userRows] = await db.execute('SELECT zone_method FROM users WHERE id = ?', [req.user.userId]);
            zone_method = (userRows[0] && userRows[0].zone_method) || 'lthr';
        }

        if (!title || !training_date || !type)
            return res.status(400).json({ success: false, message: 'Titolo, data e tipo sono obbligatori'});
        if (!['MTB', 'strada', 'gravel', 'indoor'].includes(type))
            return res.status(400).json({ success: false, message: 'Tipo non valido'});

        const [result] = await db.execute(
            `INSERT INTO trainings (user_id, title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, title, training_date, type, distance || null, duration || null, elevation_gain || null, avg_speed || null, avg_hr || null, max_hr || null, cadence || null, notes || null]
        );
        const trainingId = result.insertId;
        const hrTimes = hr_zone_times || (zone_method === 'lthr' ? zone_times : null);
        const powerTimes = power_zone_times || (zone_method === 'ftp' ? zone_times : null);
        if (hrTimes && hrTimes.length > 0) {
            const values = hrTimes.map(z => [trainingId, z.zone_code, z.seconds || 0]);
            await db.query(
                'INSERT INTO training_hr_zone_times (training_id, zone_code, seconds) VALUES ?',
                [values]
            );
        }
        if (powerTimes && powerTimes.length > 0) {
            const values = powerTimes.map(z => [trainingId, z.zone_code, z.seconds || 0]);
            await db.query(
                'INSERT INTO training_power_zone_times (training_id, zone_code, seconds) VALUES ?',
                [values]
            );
        }
        res.json({ success: true, id: trainingId, message: 'Allenamento aggiunto' });
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
        const [hrZoneRows] = await db.execute(
            'SELECT zone_code, seconds FROM training_hr_zone_times WHERE training_id = ?',
            [req.params.id]
        );
        const [powerZoneRows] = await db.execute(
            'SELECT zone_code, seconds FROM training_power_zone_times WHERE training_id = ?',
            [req.params.id]
        );
        const training = rows[0];
        training.hr_zone_times = hrZoneRows;
        training.power_zone_times = powerZoneRows;
        const [userRows] = await db.execute('SELECT zone_method FROM users WHERE id = ?', [req.user.userId]);
        const zone_method = (userRows[0] && userRows[0].zone_method) || 'lthr';
        training.zone_times = zone_method === 'ftp' ? powerZoneRows : hrZoneRows;
        res.json({ success: true, training });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.put('/trainings/:id', authenticateToken, async (req, res) => {
    try {
        const { title, training_date, type, distance, duration, elevation_gain, avg_speed, avg_hr, max_hr, cadence, notes, zone_times, hr_zone_times, power_zone_times } = req.body;
        let zone_method = req.body.zone_method;
        if (zone_method !== 'ftp' && zone_method !== 'lthr') {
            const [userRows] = await db.execute('SELECT zone_method FROM users WHERE id = ?', [req.user.userId]);
            zone_method = (userRows[0] && userRows[0].zone_method) || 'lthr';
        }

        if (!title || !training_date || !type)
            return res.status(400).json({ success: false, message: 'Titolo, data e tipo sono obbligatori'});
        if (!['MTB', 'strada', 'gravel', 'indoor'].includes(type))
            return res.status(400).json({ success: false, message: 'Tipo non valido'});

        const [result] = await db.execute(
            `UPDATE trainings SET title = ?, training_date = ?, type = ?, distance = ?, duration = ?, elevation_gain = ?, avg_speed = ?, avg_hr = ?, max_hr = ?, cadence = ?, notes = ? WHERE id = ? AND user_id = ?`,
            [title, training_date, type, distance || null, duration || null, elevation_gain || null, avg_speed || null, avg_hr || null, max_hr || null, cadence || null, notes || null, req.params.id, req.user.userId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Allenamento non trovato' });
        if (hr_zone_times !== undefined || (zone_method === 'lthr' && zone_times !== undefined)) {
            const hrTimes = hr_zone_times !== undefined ? hr_zone_times : zone_times;
            await db.execute('DELETE FROM training_hr_zone_times WHERE training_id = ?', [req.params.id]);
            if (hrTimes && hrTimes.length > 0) {
                const values = hrTimes.map(z => [req.params.id, z.zone_code, z.seconds || 0]);
                await db.query(
                    'INSERT INTO training_hr_zone_times (training_id, zone_code, seconds) VALUES ?',
                    [values]
                );
            }
        }
        if (power_zone_times !== undefined || (zone_method === 'ftp' && zone_times !== undefined)) {
            const powerTimes = power_zone_times !== undefined ? power_zone_times : zone_times;
            await db.execute('DELETE FROM training_power_zone_times WHERE training_id = ?', [req.params.id]);
            if (powerTimes && powerTimes.length > 0) {
                const values = powerTimes.map(z => [req.params.id, z.zone_code, z.seconds || 0]);
                await db.query(
                    'INSERT INTO training_power_zone_times (training_id, zone_code, seconds) VALUES ?',
                    [values]
                );
            }
        }
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
