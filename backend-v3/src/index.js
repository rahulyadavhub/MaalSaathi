'use strict';

const express = require('express');
const { env, printConfig } = require('./config/env');
const { connectDB, isDBHealthy } = require('./config/db');
const { handleIncoming } = require('./controllers/webhookController');
const { ping: pingGemini } = require('./services/ai/geminiClient');
const { setupGlobalHandlers, expressErrorHandler } = require('./middleware/errorHandler');
const { verifyWebhookSignature } = require('./middleware/verifyWebhook');
const { createLogger } = require('./utils/logger');
const log = createLogger('server');

setupGlobalHandlers();
printConfig(env);

const app = express();

app.use(express.json({
    limit: '1mb',
    verify: (req, res, buf) => { req.rawBody = buf; },
}));

connectDB().catch(err => log.error('DB connect failed: ' + err.message));

app.get('/', (req, res) => {
    res.json({
        status:  'MaalSaathi v2 running',
        version: '2.0.0',
        time:    new Date().toISOString(),
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status:  'ok',
        service: 'MaalSaathi',
        version: '2.0.0',
        uptime:  Math.floor(process.uptime()) + 's',
        db:      isDBHealthy() ? 'up' : 'down',
    });
});

app.get('/webhook', (req, res) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
        log.info('Webhook verified by Meta');
        return res.status(200).send(challenge);
    }
    log.warn('Webhook verify failed');
    res.sendStatus(403);
});

app.post('/webhook', verifyWebhookSignature, handleIncoming);

app.use(expressErrorHandler);

const server = app.listen(env.PORT, () => {
    log.info('MaalSaathi v2 running on port ' + env.PORT);
    pingGemini().then(r => {
        if (r.ok) log.info('Gemini ready: ' + r.model);
        else log.warn('Gemini ping failed: ' + r.reason);
    });
});

['SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, () => {
        log.info('Received ' + sig + ', closing server...');
        server.close(() => {
            log.info('Server closed');
            process.exit(0);
        });
    });
});

module.exports = { app };
