// ============================================================
// src/constants/documentTypes.js
// Truck document types — RC, Insurance, PUC, Permit, Fitness
// ============================================================

'use strict';

const DOCUMENT_TYPE = {
    RC:        'RC',
    INSURANCE: 'Insurance',
    PUC:       'PUC',
    PERMIT:    'Permit',
    FITNESS:   'Fitness',
    DL:        'DL',
};

const DOCUMENT_LABELS = {
    RC:        'RC (Registration Certificate)',
    INSURANCE: 'Insurance',
    PUC:       'PUC (Pollution Certificate)',
    PERMIT:    'National Permit',
    FITNESS:   'Fitness Certificate',
    DL:        'Driving License',
};

// Reminder days before expiry
const EXPIRY_REMINDER_DAYS = [30, 15, 7, 1];

// Validity in days (typical)
const DOCUMENT_VALIDITY = {
    RC:        5475,   // 15 years
    INSURANCE: 365,    // 1 year
    PUC:       180,    // 6 months
    PERMIT:    365,    // 1 year
    FITNESS:   730,    // 2 years
    DL:        1825,   // 5 years
};

module.exports = { DOCUMENT_TYPE, DOCUMENT_LABELS, EXPIRY_REMINDER_DAYS, DOCUMENT_VALIDITY };
