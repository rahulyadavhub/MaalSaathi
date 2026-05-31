// ============================================================
// src/services/ai/openaiClient.js
// Drop-in replacement for geminiClient.js — uses OpenAI API
// Same interface: generate(), ping(), isConfigured()
// ============================================================

'use strict';

const OpenAI = require('openai');
const { env } = require('../../config/env');
const { createLogger } = require('../../utils/logger');
const log = createLogger('openai');

const client = env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
    : null;

if (!client) log.warn('OpenAI not configured — fallback replies only');

// ──────────────────────────────────────────────────────────
// Generate text with timeout protection
// Same signature as geminiClient.generate()
// ──────────────────────────────────────────────────────────
async function generate(prompt, opts = {}) {
    if (!client) throw new Error('OpenAI not configured');

    const {
        temperature = 0.7,
        maxTokens   = 400,
        json        = false,
        timeoutMs   = 5000,
    } = opts;

    const params = {
        model:       env.OPENAI_MODEL || 'gpt-4o-mini',
        messages:    [{ role: 'user', content: prompt }],
        temperature,
        max_tokens:  maxTokens,
    };

    // JSON mode — same as Gemini's responseMimeType: 'application/json'
    if (json) params.response_format = { type: 'json_object' };

    const apiCall = client.chat.completions.create(params);
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`OpenAI timeout ${timeoutMs}ms`)), timeoutMs)
    );

    const r = await Promise.race([apiCall, timeout]);
    return (r.choices[0]?.message?.content || '').trim();
}

// ──────────────────────────────────────────────────────────
// Health check — same as geminiClient.ping()
// ──────────────────────────────────────────────────────────
async function ping() {
    if (!client) return { ok: false, reason: 'No API key' };
    try {
        const txt = await generate('Say: OK', { maxTokens: 10, timeoutMs: 3000 });
        return { ok: true, model: env.OPENAI_MODEL || 'gpt-4o-mini', sample: txt };
    } catch (e) {
        return { ok: false, reason: e.message };
    }
}

module.exports = { generate, ping, isConfigured: () => Boolean(client) };
