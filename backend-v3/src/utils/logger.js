// ============================================================
// src/utils/logger.js
// Production-grade structured logger
//
// Features:
// - Log levels (debug, info, warn, error)
// - Timestamps with timezone
// - Emoji prefixes for visual scanning
// - Context tagging (e.g. [webhook], [parser])
// - Respects LOG_LEVEL from .env
// - Safe stringify (handles circular refs)
// ============================================================

'use strict';

const { env } = require('../config/env');

// Log level hierarchy
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LEVELS[env.LOG_LEVEL] ?? LEVELS.info;

const EMOJI = {
    debug: '🔍',
    info:  'ℹ️ ',
    warn:  '⚠️ ',
    error: '❌',
};

// ──────────────────────────────────────────────────────────
// Format current time in IST
// ──────────────────────────────────────────────────────────
function timestamp() {
    return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12:   false,
        year:     'numeric',
        month:    '2-digit',
        day:      '2-digit',
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
    });
}

// ──────────────────────────────────────────────────────────
// Safe stringify (no circular ref crashes)
// ──────────────────────────────────────────────────────────
function safeStringify(obj) {
    if (obj === null || obj === undefined) return String(obj);
    if (typeof obj !== 'object') return String(obj);

    const seen = new WeakSet();
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            if (value instanceof Error) {
                return { message: value.message, stack: value.stack };
            }
            return value;
        }, 2);
    } catch (e) {
        return String(obj);
    }
}

// ──────────────────────────────────────────────────────────
// Core logger
// ──────────────────────────────────────────────────────────
function log(level, tag, message, meta) {
    if (LEVELS[level] < CURRENT_LEVEL) return;

    const ts     = timestamp();
    const emoji  = EMOJI[level];
    const tagStr = tag ? `[${tag}]` : '';
    const out    = `${emoji} ${ts} ${tagStr} ${message}`;

    if (level === 'error') {
        console.error(out);
        if (meta) console.error(safeStringify(meta));
    } else if (level === 'warn') {
        console.warn(out);
        if (meta) console.warn(safeStringify(meta));
    } else {
        console.log(out);
        if (meta) console.log(safeStringify(meta));
    }
}

// ──────────────────────────────────────────────────────────
// Factory — creates a tagged logger
// Usage: const log = createLogger('webhook');
//        log.info('Message received');
// ──────────────────────────────────────────────────────────
function createLogger(tag) {
    return {
        debug: (msg, meta) => log('debug', tag, msg, meta),
        info:  (msg, meta) => log('info',  tag, msg, meta),
        warn:  (msg, meta) => log('warn',  tag, msg, meta),
        error: (msg, meta) => log('error', tag, msg, meta),
    };
}

// ──────────────────────────────────────────────────────────
// Default untagged logger
// ──────────────────────────────────────────────────────────
const logger = createLogger(null);

module.exports = {
    createLogger,
    logger,
    // Direct exports for convenience
    debug: logger.debug,
    info:  logger.info,
    warn:  logger.warn,
    error: logger.error,
};
