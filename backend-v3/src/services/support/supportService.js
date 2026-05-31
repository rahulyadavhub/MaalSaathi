// ============================================================
// src/services/support/supportService.js
// Support ticket create, update, close
// ============================================================

'use strict';

const SupportTicket = require('../../models/SupportTicket');
const { TICKET_STATUS, TICKET_PRIORITY, SUPPORT_SLA } = require('../../constants/supportConfig');
const { createLogger } = require('../../utils/logger');
const log = createLogger('supportService');

// Create new ticket
async function createTicket({ userId, phone, userName, issue, category, plan }) {
    try {
        const priority = SUPPORT_SLA[plan]?.priority || 'low';

        const ticket = await SupportTicket.create({
            userId,
            phone,
            userName: userName || 'User',
            issue,
            category: category || 'other',
            status:   TICKET_STATUS.OPEN,
            priority,
            plan:     plan || 'free',
            messages: [{ from: 'user', text: issue }],
        });

        log.info(`Ticket created: ${ticket.ticketId} | ${phone} | ${plan}`);
        return ticket;

    } catch (err) {
        log.error(`createTicket error: ${err.message}`);
        throw err;
    }
}

// Add message to ticket
async function addMessage(ticketId, from, text) {
    return await SupportTicket.findOneAndUpdate(
        { ticketId },
        {
            $push: { messages: { from, text, timestamp: new Date() } },
            status: TICKET_STATUS.IN_PROGRESS,
        },
        { new: true }
    );
}

// Resolve ticket
async function resolveTicket(ticketId) {
    return await SupportTicket.findOneAndUpdate(
        { ticketId },
        { status: TICKET_STATUS.RESOLVED, resolvedAt: new Date() },
        { new: true }
    );
}

// Get open tickets (for admin)
async function getOpenTickets() {
    return await SupportTicket.find({ status: TICKET_STATUS.OPEN })
        .sort({ priority: -1, createdAt: 1 })
        .limit(20);
}

// Get user tickets
async function getUserTickets(userId) {
    return await SupportTicket.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);
}

module.exports = { createTicket, addMessage, resolveTicket, getOpenTickets, getUserTickets };
