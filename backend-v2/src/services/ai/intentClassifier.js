// ============================================================
// src/services/ai/intentClassifier.js
// 3-layer hybrid intent classification:
//   1. Fast regex (free, instant) — common deterministic intents
//   2. AI (OpenAI JSON) — for natural language understanding
//   3. Rule-based fallback — if AI fails/times out
//
// Returns: { intent, entities, confidence, source, reasoning? }
// ============================================================

'use strict';

const ai = require('./openaiClient');          // ← CHANGED: was geminiClient
const { buildIntentPrompt } = require('./prompts');
const { INTENT } = require('../../constants/intents');
const { createLogger } = require('../../utils/logger');
const log = createLogger('intentClf');

// ──────────────────────────────────────────────────────────
// Layer 1 — Fast regex patterns (no AI cost)
// ──────────────────────────────────────────────────────────
const FAST = {
    TRIP_COMPLETE: /\btrip\s*(complet\w*|done|end|khatam|finish|over|ho\s*gaya|hua)\b|\bpahunch\w*\s*(gaya|gaye|gayi)?\b|\bdeliver(ed)?\s*(ho|kar)\s*(diya|gaya)?\b|\bmaal\s*(de\s*diya|utar\s*diya|pohncha|diya)\b/i,
    SHOW_TRIPS:    /\bmera\s*(active\s*)?trip\b|\bmeri\s*trips?\b|\bactive\s*trips?\b|\btrip\s*(kya\s*hai|batao|list|status|dikhao|chal\s*raha)\b/i,
    PROFIT:        /\bkitna\s*(kamaya|mila|hua|bacha|aaya)\b|\b(hisaab|hisab|kamai|profit)\b|\bnet\s*kitna\b|\bp\s*&?\s*l\b/i,
    GREETING:      /^(hi+|hello+|hey+|namaste|namaskaar|ram\s*ram|salaam|good\s*(morning|afternoon|evening|night))\b/i,
    YES:           /^(haan|han|haa|ha|yes|y|ok|okay|sahi|bilkul|confirm|save|done|kar\s*do)$/i,
    NO:            /^(nahi|no|n|cancel|mat|na|galat|wrong|chod\s*do)$/i,
};

function fastPath(text) {
    const t = (text || '').trim();
    if (!t) return null;

    if (FAST.TRIP_COMPLETE.test(t)) {
        return { intent: INTENT.COMPLETE_TRIP, entities: {}, confidence: 0.95, source: 'regex' };
    }
    if (FAST.SHOW_TRIPS.test(t)) {
        return { intent: INTENT.SHOW_TRIPS, entities: {}, confidence: 0.95, source: 'regex' };
    }
    if (FAST.PROFIT.test(t)) {
        const period = /mahine|month/i.test(t)        ? 'this_month'
                     : /hafte|week|7\s*din/i.test(t)  ? 'this_week'
                     : 'today';
        return { intent: INTENT.QUERY_PROFIT, entities: { period }, confidence: 0.95, source: 'regex' };
    }
    if (FAST.GREETING.test(t)) {
        return { intent: INTENT.GREETING, entities: {}, confidence: 0.98, source: 'regex' };
    }
    if (FAST.YES.test(t)) {
        return { intent: INTENT.YES, entities: {}, confidence: 0.98, source: 'regex' };
    }
    if (FAST.NO.test(t)) {
        return { intent: INTENT.NO, entities: {}, confidence: 0.98, source: 'regex' };
    }
    return null;
}

// ──────────────────────────────────────────────────────────
// MAIN: classify(text, context) → { intent, entities, ... }
// ──────────────────────────────────────────────────────────
async function classify(text, context = {}) {
    if (!text || typeof text !== 'string') {
        return { intent: INTENT.UNKNOWN, entities: {}, confidence: 0, source: 'empty' };
    }

    // Layer 1: fast regex
    const fast = fastPath(text);
    if (fast) {
        log.debug(`fast-path: ${fast.intent}`);
        return fast;
    }

    // Layer 2: AI classification
    if (ai.isConfigured()) {
        try {
            const prompt = buildIntentPrompt({ message: text.trim(), ...context });
            const raw = await ai.generate(prompt, {
                temperature: 0.1,
                maxTokens:   400,
                json:        true,
                timeoutMs:   3000,
            });

            const parsed = parseJSON(raw);
            if (parsed) {
                const intent = normalizeIntent(parsed.intent);
                const entities = parsed.entities || {};
                const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;

                log.info(`AI → ${intent} (conf=${confidence.toFixed(2)}) | ${parsed.reasoning || ''}`);

                return { intent, entities, confidence, source: 'ai', reasoning: parsed.reasoning };
            }
            log.warn('AI returned unparseable JSON, falling back to rules');
        } catch (err) {
            log.warn(`AI classifier failed (${err.message?.substring(0, 60)}) — using rules`);
        }
    }

    // Layer 3: rule-based fallback
    return ruleBased(text);
}

// ──────────────────────────────────────────────────────────
// Layer 3 — Rule-based fallback
// ──────────────────────────────────────────────────────────
function ruleBased(text) {
    const { isExpenseText } = require('../parser/categoryDetector');
    const { isMultiExpense } = require('../parser/expenseParser');

    const ROUTE_HINT = /\bse\b|\bsey\b|\bto\b|\btak\b|→|->/i;
    const HAS_AMOUNT = /\d{3,}|\d+(?:\.\d+)?\s*(k|hazaar|hajar|lakh|lac|cr|crore|thousand)\b/i;

    if (ROUTE_HINT.test(text) && HAS_AMOUNT.test(text)) {
        return { intent: INTENT.LOG_TRIP, entities: {}, confidence: 0.7, source: 'rule' };
    }
    if (isMultiExpense(text)) {
        return { intent: INTENT.LOG_MULTI_EXPENSE, entities: {}, confidence: 0.7, source: 'rule' };
    }
    if (isExpenseText(text) && /\d/.test(text)) {
        return { intent: INTENT.LOG_EXPENSE, entities: {}, confidence: 0.7, source: 'rule' };
    }
    return { intent: INTENT.SMALL_TALK, entities: {}, confidence: 0.5, source: 'rule' };
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function parseJSON(text) {
    if (!text) return null;
    let cleaned = text.trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try { return JSON.parse(cleaned); }
    catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch { return null; }
        }
        return null;
    }
}

function normalizeIntent(value) {
    if (!value || typeof value !== 'string') return INTENT.UNKNOWN;
    const lower = value.toLowerCase().trim().replace(/[\s-]/g, '_');
    return Object.values(INTENT).includes(lower) ? lower : INTENT.UNKNOWN;
}

module.exports = { classify };
