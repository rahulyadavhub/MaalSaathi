// ============================================================
// src/constants/expenseCategories.js
// All expense categories Indian truck owners track
// ============================================================

'use strict';

const CATEGORY = Object.freeze({
    DIESEL:         'diesel',
    TOLL:           'toll',
    TYRE:           'tyre',
    REPAIR:         'repair',
    FOOD:           'food',
    DRIVER_SALARY:  'driver_salary',
    FINE:           'fine',
    PARKING:        'parking',
    LOADING:        'loading',
    UNLOADING:      'unloading',
    GREASING:       'greasing',
    WEIGHBRIDGE:    'weighbridge',
    INSURANCE:      'insurance',
    EMI:            'emi',
    COMMISSION:     'commission',
    WASHING:        'washing',
    PERMIT:         'permit',
    BATTERY:        'battery',
    MAINTENANCE:    'maintenance',
    OTHER:          'other',
});

// Display emoji for each category (used in WhatsApp replies)
const CATEGORY_EMOJI = Object.freeze({
    [CATEGORY.DIESEL]:         '⛽',
    [CATEGORY.TOLL]:           '🛣️',
    [CATEGORY.TYRE]:           '🛞',
    [CATEGORY.REPAIR]:         '🔧',
    [CATEGORY.FOOD]:           '🍽️',
    [CATEGORY.DRIVER_SALARY]:  '👤',
    [CATEGORY.FINE]:           '🚓',
    [CATEGORY.PARKING]:        '🅿️',
    [CATEGORY.LOADING]:        '📦',
    [CATEGORY.UNLOADING]:      '📦',
    [CATEGORY.GREASING]:       '🛢️',
    [CATEGORY.WEIGHBRIDGE]:    '⚖️',
    [CATEGORY.INSURANCE]:      '📋',
    [CATEGORY.EMI]:            '🏦',
    [CATEGORY.COMMISSION]:     '💼',
    [CATEGORY.WASHING]:        '🚿',
    [CATEGORY.PERMIT]:         '📄',
    [CATEGORY.BATTERY]:        '🔋',
    [CATEGORY.MAINTENANCE]:    '🔩',
    [CATEGORY.OTHER]:          '💸',
});

// Display label in Hinglish (for PDF reports, summaries)
const CATEGORY_LABEL = Object.freeze({
    [CATEGORY.DIESEL]:         'Diesel',
    [CATEGORY.TOLL]:           'Toll',
    [CATEGORY.TYRE]:           'Tyre',
    [CATEGORY.REPAIR]:         'Repair',
    [CATEGORY.FOOD]:           'Khana',
    [CATEGORY.DRIVER_SALARY]:  'Driver Salary',
    [CATEGORY.FINE]:           'Fine',
    [CATEGORY.PARKING]:        'Parking',
    [CATEGORY.LOADING]:        'Loading',
    [CATEGORY.UNLOADING]:      'Unloading',
    [CATEGORY.GREASING]:       'Greasing / Oil',
    [CATEGORY.WEIGHBRIDGE]:    'Weighbridge',
    [CATEGORY.INSURANCE]:      'Insurance',
    [CATEGORY.EMI]:            'EMI',
    [CATEGORY.COMMISSION]:     'Commission',
    [CATEGORY.WASHING]:        'Washing',
    [CATEGORY.PERMIT]:         'Permit / RC',
    [CATEGORY.BATTERY]:        'Battery',
    [CATEGORY.MAINTENANCE]:    'Maintenance',
    [CATEGORY.OTHER]:          'Other',
});

const ALL_CATEGORIES = Object.values(CATEGORY);

function getEmoji(category) {
    return CATEGORY_EMOJI[category] || CATEGORY_EMOJI[CATEGORY.OTHER];
}

function getLabel(category) {
    return CATEGORY_LABEL[category] || CATEGORY_LABEL[CATEGORY.OTHER];
}

module.exports = {
    CATEGORY,
    CATEGORY_EMOJI,
    CATEGORY_LABEL,
    ALL_CATEGORIES,
    getEmoji,
    getLabel,
};
