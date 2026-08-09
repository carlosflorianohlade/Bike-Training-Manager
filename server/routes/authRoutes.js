const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Tutti i campi sono obbligatori' });
        }
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email già registrata' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
            [first_name, last_name, email, password_hash]
        );
        res.json({ success: true, message: 'Registrazione completata' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email e password richieste' });
        }
        const [rows] = await db.execute('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenziali non valide' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Credenziali non valide' });
        }
        const token = generateToken(user);
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'Strict',
            maxAge: 3600000
        });
        res.json({ success: true, message: 'Login riuscito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout effettuato' });
});

module.exports = router;
