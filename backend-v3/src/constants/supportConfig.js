// ============================================================
// src/constants/supportConfig.js
// Customer support SLA, escalation rules, ticket config
// ============================================================

'use strict';

const TICKET_STATUS = {
    OPEN:        'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED:    'resolved',
    CLOSED:      'closed',
};

const TICKET_PRIORITY = {
    LOW:    'low',
    MEDIUM: 'medium',
    HIGH:   'high',
};

const TICKET_CATEGORY = {
    TRIP:      'trip',
    EXPENSE:   'expense',
    PAYMENT:   'payment',
    TECHNICAL: 'technical',
    OTHER:     'other',
};

// SLA response time per plan
const SUPPORT_SLA = {
    free:  { responseHours: null, channel: 'bot',      priority: 'low'    },
    pro:   { responseHours: 24,   channel: 'whatsapp', priority: 'medium' },
    fleet: { responseHours: 4,    channel: 'priority', priority: 'high'   },
};

// Scale plan
const SUPPORT_SCALE = {
    users_0_100:   'Nick handles manually',
    users_100_500: '1 part-time support hire',
    users_500_plus: 'Dedicated support number',
};

const SUPPORT_MESSAGES = {
    MENU: `Kya problem aa rahi hai? 🔧

1️⃣ Trip save nahi ho raha
2️⃣ Expense galat category mein gaya
3️⃣ P&L nahi dikh raha
4️⃣ Payment issue
5️⃣ Kuch aur

Number bhejo`,

    TICKET_CREATED: (id) => `✅ Ticket #${id} create ho gaya\nTeam jald contact karegi`,
    RESOLVED:       (id) => `✅ Ticket #${id} resolve ho gaya\nAur madad chahiye?`,
};

module.exports = {
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY,
    SUPPORT_SLA,
    SUPPORT_SCALE,
    SUPPORT_MESSAGES,
};
