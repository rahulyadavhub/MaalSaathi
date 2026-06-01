// ============================================================
// src/services/document/documentService.js
// Document CRUD — RC, Insurance, PUC, Permit, Fitness
// ============================================================

'use strict';

const Document = require('../../models/Document');
const { DOCUMENT_TYPE, DOCUMENT_LABELS } = require('../../constants/documentTypes');
const { createLogger } = require('../../utils/logger');
const log = createLogger('documentService');

// Add or update document
async function addDocument(userId, truckId, type, expiryDate, issueDate = null, notes = '') {
    if (!Object.values(DOCUMENT_TYPE).includes(type)) {
        throw new Error(`Invalid document type: ${type}`);
    }

    // Check if document already exists — update if yes
    const existing = await Document.findOne({ userId, truckId, type });

    if (existing) {
        existing.expiryDate = expiryDate;
        if (issueDate) existing.issueDate = issueDate;
        if (notes)     existing.notes     = notes;
        // Reset reminder flags
        existing.reminderSent = {
            days30: false,
            days15: false,
            days7:  false,
            expired: false,
        };
        await existing.save();
        log.info(`Document updated: ${type} | user: ${userId}`);
        return existing;
    }

    const doc = await Document.create({
        userId,
        truckId,
        type,
        expiryDate,
        issueDate,
        notes,
    });

    log.info(`Document added: ${type} | user: ${userId}`);
    return doc;
}

// Get all docs for a user
async function getUserDocuments(userId, truckId = null) {
    const query = { userId };
    if (truckId) query.truckId = truckId;
    return await Document.find(query)
        .populate('truckId', 'registrationNumber')
        .sort({ expiryDate: 1 });
}

// Get expiring docs (within X days)
async function getExpiringDocs(userId, days = 30) {
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + days);

    return await Document.find({
        userId,
        expiryDate: { $gte: now, $lte: future },
    }).sort({ expiryDate: 1 });
}

// Format docs list for WhatsApp
function formatDocsMessage(docs) {
    if (!docs.length) return '📄 Koi document save nahi hai\n\n"RC add karo" likhke shuru karo';

    let msg = '📄 Documents Status\n\n';
    const now = new Date();

    for (const doc of docs) {
        const label   = DOCUMENT_LABELS[doc.type] || doc.type;
        const daysLeft = Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24));
        const emoji   = daysLeft < 0 ? '🔴' : daysLeft <= 30 ? '🟠' : '✅';
        const status  = daysLeft < 0 ? 'EXPIRED' : `${daysLeft} din baaki`;

        msg += `${emoji} ${label}\n   ${status} (${doc.expiryDate.toLocaleDateString('en-IN')})\n\n`;
    }

    return msg.trim();
}

module.exports = { addDocument, getUserDocuments, getExpiringDocs, formatDocsMessage };
