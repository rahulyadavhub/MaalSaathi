'use strict';

const { createLogger } = require('../utils/logger');
const log = createLogger('errorHandler');

function expressErrorHandler(err, req, res, next) {
    log.error(`Express error: ${err.message}`, { stack: err.stack });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal server error' });
}

function setupGlobalHandlers() {
    // Uncaught synchronous errors → process is in unknown state, exit cleanly
    process.on('uncaughtException', err => {
        log.error(`💥 Uncaught: ${err.message}`, { stack: err.stack });
        // Give logs time to flush, then exit so node --watch / Render restarts cleanly
        setTimeout(() => process.exit(1), 500);
    });

    // Unhandled rejections — log but don't exit (usually recoverable)
    process.on('unhandledRejection', reason => {
        log.error(`💥 Unhandled rejection: ${reason?.message || reason}`);
    });

    // Graceful shutdown signals
    ['SIGTERM', 'SIGINT'].forEach(sig => {
        process.on(sig, () => {
            log.info(`Received ${sig}, shutting down gracefully...`);
            setTimeout(() => process.exit(0), 1000);
        });
    });
}

module.exports = { expressErrorHandler, setupGlobalHandlers };
