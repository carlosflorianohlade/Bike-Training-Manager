const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, first_name, last_name, email, weight, height, lthr, preferred_discipline, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Utente non trovato' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, weight, height, lthr, preferred_discipline } = req.body;
        await db.execute(
            'UPDATE users SET first_name = ?, last_name = ?, weight = ?, height = ?, lthr = ?, preferred_discipline = ? WHERE id = ?',
            [first_name, last_name, weight || null, height || null, lthr || null, preferred_discipline || 'MTB', req.user.userId]
        );
        res.json({ success: true, message: 'Profilo aggiornato' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.put('/profile/password', authenticateToken, async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Utente non trovato' });
        const match = await bcrypt.compare(old_password, rows[0].password_hash);
        if (!match) return res.status(400).json({ success: false, message: 'Password attuale errata' });
        const password_hash = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.userId]);
        res.json({ success: true, message: 'Password aggiornata' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

module.exports = router;
