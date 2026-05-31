'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');
const { createLogger } = require('../utils/logger');
const log = createLogger('webhookSig');

function verifyWebhookSignature(req, res, next) {
    if (!env.META_APP_SECRET) {
        if (env.IS_PRODUCTION) {
            log.error('META_APP_SECRET missing in production - rejecting');
            return res.sendStatus(401);
        }
        log.warn('META_APP_SECRET not set - signature SKIPPED (dev only)');
        return next();
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        log.warn('Missing X-Hub-Signature-256 header');
        return res.sendStatus(401);
    }

    if (!req.rawBody) {
        log.error('rawBody not captured - express.json verify hook misconfigured');
        return res.sendStatus(500);
    }

    const expected = 'sha256=' + crypto
        .createHmac('sha256', env.META_APP_SECRET)
        .update(req.rawBody)
        .digest('hex');

    try {
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            log.warn('Invalid webhook signature (got: ' + signature.substring(0, 24) + '...)');
            return res.sendStatus(401);
        }
    } catch (err) {
        log.error('Signature verify error: ' + err.message);
        return res.sendStatus(401);
    }

    next();
}

module.exports = { verifyWebhookSignature };
