// ============================================================
// src/config/db.js
// MongoDB connection — uses mongoose.readyState as source of truth
// ============================================================

'use strict';

const mongoose = require('mongoose');
const { env } = require('./env');
const C = require('./constants');
const { createLogger } = require('../utils/logger');
const log = createLogger('mongo');

// ──────────────────────────────────────────────────────────
// Connection states (mongoose conventions)
//   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
// ──────────────────────────────────────────────────────────
async function connectDB() {
    // Already connected
    if (mongoose.connection.readyState === 1) {
        log.info('Already connected');
        return mongoose.connection;
    }
    // In-flight connect — wait for it
    if (mongoose.connection.readyState === 2) {
        log.info('Connection in progress, awaiting...');
        return new Promise(resolve => {
            mongoose.connection.once('connected', () => resolve(mongoose.connection));
        });
    }

    mongoose.set('strictQuery', true);

    for (let attempt = 1; attempt <= C.MONGO_MAX_RETRIES; attempt++) {
        try {
            log.info(`Connecting to MongoDB (attempt ${attempt}/${C.MONGO_MAX_RETRIES})...`);
            await mongoose.connect(env.MONGO_URI, {
                serverSelectionTimeoutMS: C.MONGO_CONNECT_TIMEOUT_MS,
                socketTimeoutMS:          C.MONGO_SOCKET_TIMEOUT_MS,
                family:                   4, // IPv4 (Render compatibility)
            });

            log.info(`✅ Connected — DB: ${mongoose.connection.name}, Host: ${mongoose.connection.host}`);
            attachListeners();
            return mongoose.connection;

        } catch (err) {
            log.error(`Connect attempt ${attempt} failed: ${err.message}`);
            if (attempt === C.MONGO_MAX_RETRIES) {
                log.error('🚨 Max retries reached');
                throw err;
            }
            await sleep(C.MONGO_RETRY_DELAY_MS);
        }
    }
}

function attachListeners() {
    const conn = mongoose.connection;
    conn.on('disconnected', () => log.warn('Disconnected'));
    conn.on('reconnected',  () => log.info('Reconnected'));
    conn.on('error',        err => log.error(`Connection error: ${err.message}`));
}

async function disconnectDB() {
    if (mongoose.connection.readyState === 0) return;
    try {
        await mongoose.connection.close();
        log.info('Disconnected gracefully');
    } catch (err) {
        log.error(`Disconnect error: ${err.message}`);
    }
}

function isDBHealthy() {
    return mongoose.connection.readyState === 1;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { connectDB, disconnectDB, isDBHealthy };
