// ============================================================
// src/services/support/ticketNotifier.js
// Notify Nick on WhatsApp when new ticket created
// ============================================================

'use strict';

const { sendMessage } = require('../whatsapp/sender');
const { env }         = require('../../config/env');
const { createLogger } = require('../../utils/logger');
const log = createLogger('ticketNotifier');

const PRIORITY_EMOJI = {
    low:    '🟡',
    medium: '🟠',
    high:   '🔴',
};

// Notify admin (Nick) about new ticket
async function notifyAdmin(ticket) {
    try {
        const adminPhones = env.ADMIN_PHONE_LIST || [];
        if (!adminPhones.length) {
            log.warn('No admin phones configured');
            return;
        }

        const emoji = PRIORITY_EMOJI[ticket.priority] || '🟡';
        const plan  = ticket.plan?.toUpperCase() || 'FREE';

        const message =
            `${emoji} New Support Ticket ${ticket.ticketId}\n\n` +
            `👤 User: ${ticket.userName} (${ticket.plan?.toUpperCase()})\n` +
            `📱 Phone: +${ticket.phone}\n` +
            `📂 Category: ${ticket.category}\n` +
            `💬 Issue: ${ticket.issue}\n\n` +
            `SLA: ${plan === 'FLEET' ? '4 hours' : plan === 'PRO' ? '24 hours' : 'Bot only'}\n` +
            `Reply directly to user: wa.me/${ticket.phone}`;

        for (const adminPhone of adminPhones) {
            await sendMessage(adminPhone, message);
        }

        log.info(`Admin notified for ticket: ${ticket.ticketId}`);

    } catch (err) {
        log.error(`notifyAdmin error: ${err.message}`);
    }
}

// Notify user when ticket resolved
async function notifyUser(ticket) {
    try {
        const message =
            `✅ Ticket ${ticket.ticketId} resolve ho gaya!\n\n` +
            `Aur koi problem ho toh "help" likhke batao 🙏`;

        await sendMessage(ticket.phone, message);
        log.info(`User notified for resolved ticket: ${ticket.ticketId}`);

    } catch (err) {
        log.error(`notifyUser error: ${err.message}`);
    }
}

module.exports = { notifyAdmin, notifyUser };
