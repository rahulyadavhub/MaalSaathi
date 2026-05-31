// ============================================================
// src/services/ai/geminiClient.js
// Singleton Gemini client + health check + timeout protection
// ============================================================

'use strict';

const { GoogleGenAI } = require('@google/genai');
const { env } = require('../../config/env');
const { createLogger } = require('../../utils/logger');
const log = createLogger('gemini');

const ai = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;
if (!ai) log.warn('Gemini not configured — fallback replies only');

// ──────────────────────────────────────────────────────────
// Generate text with timeout protection
// ──────────────────────────────────────────────────────────
async function generate(prompt, opts = {}) {
    if (!ai) throw new Error('Gemini not configured');

    const {
        temperature = 0.7,
        maxTokens   = 400,
        json        = false,
        timeoutMs   = 5000,
    } = opts;

    const config = { temperature, maxOutputTokens: maxTokens };
    if (json) config.responseMimeType = 'application/json';

    const apiCall = ai.models.generateContent({
        model:    env.GEMINI_MODEL,
        contents: prompt,
        config,
    });

    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini timeout ${timeoutMs}ms`)), timeoutMs)
    );

    const r = await Promise.race([apiCall, timeout]);
    return (r.text || '').trim();
}

async function ping() {
    if (!ai) return { ok: false, reason: 'No API key' };
    try {
        const txt = await generate('Say: OK', { maxTokens: 10, timeoutMs: 3000 });
        return { ok: true, model: env.GEMINI_MODEL, sample: txt };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

module.exports = { generate, ping, isConfigured: () => Boolean(ai) };
