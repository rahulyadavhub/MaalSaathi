// ============================================================
// src/services/whatsapp/sender.js
// Send messages via Meta WhatsApp Cloud API
// + Automatic DB audit (Message.logOutgoing)
// + Conversation history update (conv.addBotMessage)
//
// Usage:
//   await sendMessage(phone, text);
//     → Sirf bhejega, koi log nahi (system/unknown messages)
//
//   await sendMessage(phone, text, { user, conv, intent: 'log_expense' });
//     → Bhejega + DB mein log karega + conv history mein add karega
// ============================================================

'use strict';

const https = require('https');
const { env } = require('../../config/env');
const { createLogger } = require('../../utils/logger');
const Message = require('../../models/Message');
const convManager = require('../conversation/conversationManager');
const log = createLogger('whatsapp');

const MAX_LEN = 4000;
const HOST    = 'graph.facebook.com';
const BASE    = `/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// ──────────────────────────────────────────────────────────
// Send text message + optional logging
//
// options: {
//   user      — User doc (for logOutgoing audit)
//   conv      — Conversation doc (for multi-turn history)
//   intent    — 'log_trip' | 'log_expense' | 'small_talk' etc.
//   action    — 'created' | 'cancelled' | 'completed' etc.
//   tripId    — ObjectId of related trip
//   expenseId — ObjectId of related expense
//   retries   — default 3
// }
// ──────────────────────────────────────────────────────────
async function sendMessage(to, text, options = {}) {
    if (!to || !text) return { sent: false };

    // Backwards compat: third arg as plain number = retries (old API)
    if (typeof options === 'number') options = { retries: options };

    const { user, conv, intent, action, tripId, expenseId, retries = 3 } = options;
    const chunks = chunkText(text, MAX_LEN);
    let allSent = true;
    let lastError = null;

    for (const chunk of chunks) {
        let sent = false;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await post({
                    messaging_product: 'whatsapp',
                    recipient_type:    'individual',
                    to,
                    type: 'text',
                    text: { preview_url: false, body: chunk },
                });
                log.info(`Sent → ${to.slice(-4)} (${chunk.length} chars)`);
                sent = true;
                break;
            } catch (err) {
                lastError = err;
                if (err.status === 401) {
                    log.error('🔴 WHATSAPP TOKEN EXPIRED');
                    allSent = false;
                    break;
                }
                if (err.status === 429 || (err.status >= 500 && err.status < 600)) {
                    const wait = attempt * 2000;
                    log.warn(`Retry ${attempt}/${retries} in ${wait}ms (status ${err.status})`);
                    await sleep(wait);
                } else {
                    log.error(`WhatsApp API [${err.status}]: ${err.message?.substring(0, 200)}`);
                    allSent = false;
                    break;
                }
            }
        }
        if (!sent) {
            allSent = false;
            log.error(`Failed after ${retries} attempts: ${to.slice(-4)}`);
            break;
        }
        if (chunks.length > 1) await sleep(300);
    }

    // ── Audit log (fire-and-forget — kabhi reply ko block na kare)
    Message.logOutgoing({
        userId:       user?._id || null,
        phone:        to,
        text,
        intent:       intent || null,
        action:       action || null,
        tripId:       tripId || null,
        expenseId:    expenseId || null,
        success:      allSent,
        errorMessage: allSent ? null : (lastError?.message?.slice(0, 200) || 'unknown'),
    }).catch(err => log.warn(`logOutgoing failed: ${err.message}`));

    // ── Conversation history (multi-turn AI context ke liye)
    if (allSent && conv) {
        convManager.addBotMessage(conv, text)
            .catch(err => log.warn(`addBotMessage failed: ${err.message}`));
    }

    return { sent: allSent };
}

// ──────────────────────────────────────────────────────────
// Raw HTTPS POST to WhatsApp API
// ──────────────────────────────────────────────────────────
function post(body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req  = https.request({
            hostname: HOST,
            path:     BASE,
            method:   'POST',
            headers: {
                'Authorization':  `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
            timeout: 10000,
        }, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(raw || '{}'));
                } else {
                    const err = new Error(raw);
                    err.status = res.statusCode;
                    reject(err);
                }
            });
        });
        req.on('error',  reject);
        req.on('timeout', () => { req.destroy(); const e = new Error('Timeout'); e.status = 408; reject(e); });
        req.write(data);
        req.end();
    });
}

// ──────────────────────────────────────────────────────────
// Split long text at newlines (WhatsApp 4096 char limit)
// ──────────────────────────────────────────────────────────
function chunkText(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let current = '';
    for (const line of text.split('\n')) {
        if ((current + '\n' + line).length > maxLen) {
            if (current) chunks.push(current.trim());
            current = line;
        } else {
            current = current ? current + '\n' + line : line;
        }
    }
    if (current) chunks.push(current.trim());
    return chunks.filter(Boolean);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { sendMessage };
