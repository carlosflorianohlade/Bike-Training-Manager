const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const trainingsRoutes = require('./routes/trainingsRoutes');
const statsRoutes = require('./routes/statsRoutes');
const goalsRoutes = require('./routes/goalsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', trainingsRoutes);
app.use('/api', statsRoutes);
app.use('/api', goalsRoutes);

// Pagina 404 per route sconosciute
app.use((req, res) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
        res.status(404).json({ success: false, message: 'Risorsa non trovata' });
    } else {
        res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
    }
});

app.use((err, req, res, next) => {
    console.error('ERRORE NON GESTITO:', err.message);
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
});

async function start() {
    try {
        const [rows] = await db.execute('SELECT 1 AS test');
        console.log('Connessione MySQL ok (' + rows[0].test + ')');
        app.listen(PORT, () => {
            console.log('Server running on http://localhost:' + PORT);
        });
    } catch (err) {
        console.error('ERRORE CONNESSIONE MYSQL:', err.message);
        console.error('Assicurati che MySQL sia in esecuzione e che le credenziali in db.js siano corrette.');
        process.exit(1);
    }
}

start();
