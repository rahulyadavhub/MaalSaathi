// ============================================================
// src/services/document/expiryChecker.js
// Calculate days remaining for document expiry
// ============================================================

'use strict';

// Days between today and target date (positive = future, negative = expired)
function daysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(expiryDate);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// Status badge: 'valid' | 'expiring' | 'critical' | 'expired'
function getStatus(expiryDate) {
    const days = daysUntilExpiry(expiryDate);
    if (days === null) return 'unknown';
    if (days < 0)      return 'expired';
    if (days <= 7)     return 'critical';
    if (days <= 30)    return 'expiring';
    return 'valid';
}

// Emoji based on status
function getEmoji(status) {
    const map = {
        valid:    '✅',
        expiring: '🟡',
        critical: '🔴',
        expired:  '❌',
        unknown:  '⚪',
    };
    return map[status] || '⚪';
}

// Human-readable status text
function getStatusText(expiryDate) {
    const days = daysUntilExpiry(expiryDate);
    if (days === null) return 'No expiry set';
    if (days < 0)      return `Expired ${Math.abs(days)} din pehle`;
    if (days === 0)    return 'Aaj expire ho raha hai!';
    if (days === 1)    return 'Kal expire ho raha hai!';
    return `${days} din baaki`;
}

module.exports = { daysUntilExpiry, getStatus, getEmoji, getStatusText };
