// ============================================================
// src/middleware/auth.js
// JWT authentication for web dashboard
// ============================================================

'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { createLogger } = require('../utils/logger');
const log = createLogger('auth');

function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({ error: 'Access denied — no token' });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired — login again' });
        }
        log.warn(`Invalid token: ${err.message}`);
        return res.status(403).json({ error: 'Invalid token' });
    }
}

function generateToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY || '7d' });
}

module.exports = { verifyToken, generateToken };
