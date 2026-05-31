// ============================================================
// src/services/whatsapp/receiver.js
// Extract structured payload from Meta WhatsApp webhook body
// ============================================================

'use strict';

function extractPayload(body) {
    try {
        const value = body?.entry?.[0]?.changes?.[0]?.value;
        if (!value || value?.statuses) return null; // skip delivery receipts

        const message = value.messages?.[0];
        const contact = value.contacts?.[0];
        if (!message) return null;

        const type = message.type;
        let text = '';

        if (type === 'text') {
            text = message.text?.body?.trim() || '';
        } else if (type === 'button') {
            text = message.button?.text?.trim() || '';
        } else if (type === 'interactive') {
            text = message.interactive?.button_reply?.title ||
                   message.interactive?.list_reply?.title || '';
        }

        return {
            phone:   message.from,
            text:    text || `[${type}]`,
            name:    contact?.profile?.name || 'Friend',
            msgId:   message.id,
            msgType: type,
        };
    } catch (e) {
        return null;
    }
}

module.exports = { extractPayload };
