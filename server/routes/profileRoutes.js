const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, first_name, last_name, email, weight, height, lthr, ftp, zone_method, preferred_discipline, created_at FROM users WHERE id = ?',
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
        const { first_name, last_name, weight, height, lthr, ftp, zone_method, preferred_discipline } = req.body;
        
        // Validate required fields
        if (!first_name || !first_name.trim()) {
            return res.status(400).json({ success: false, message: 'Nome è obbligatorio' });
        }
        if (!last_name || !last_name.trim()) {
            return res.status(400).json({ success: false, message: 'Cognome è obbligatorio' });
        }
        
        const validatedZoneMethod = (zone_method === 'ftp' || zone_method === 'lthr') ? zone_method : 'lthr';
        const validatedFtp = (ftp !== undefined && ftp !== '' && ftp !== null) ? parseInt(ftp) : null;
        const validatedLthr = (lthr !== undefined && lthr !== '' && lthr !== null) ? parseInt(lthr) : null;
        const validatedWeight = (weight !== undefined && weight !== '' && weight !== null) ? parseFloat(weight) : null;
        const validatedHeight = (height !== undefined && height !== '' && height !== null) ? parseFloat(height) : null;
        const validatedFirstName = first_name.trim();
        const validatedLastName = last_name.trim();
        const validDisciplines = ['MTB', 'strada', 'gravel', 'indoor'];
        const validatedDiscipline = validDisciplines.includes(preferred_discipline) ? preferred_discipline : 'MTB';
        
        await db.execute(
            'UPDATE users SET first_name = ?, last_name = ?, weight = ?, height = ?, lthr = ?, ftp = ?, zone_method = ?, preferred_discipline = ? WHERE id = ?',
            [validatedFirstName, validatedLastName, validatedWeight, validatedHeight, validatedLthr, validatedFtp, validatedZoneMethod, validatedDiscipline, req.user.userId]
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
