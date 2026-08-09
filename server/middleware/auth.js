const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bike_training_secret_key_2026';

function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Autenticazione richiesta' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }
}

function generateToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
    );
}

module.exports = { authenticateToken, generateToken, JWT_SECRET };
