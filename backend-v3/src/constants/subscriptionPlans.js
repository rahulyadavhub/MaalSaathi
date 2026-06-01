// ============================================================
// src/constants/subscriptionPlans.js
// FREE, PRO, FLEET plan definitions
// ============================================================

'use strict';

const PLAN = {
    FREE:  'free',
    PRO:   'pro',
    FLEET: 'fleet',
};

const PLAN_CONFIG = {
    free: {
        name:        'Free',
        price:       0,
        tripsLimit:  10,           // per month
        trucksLimit: 1,
        label:       'Free Plan',
    },
    pro: {
        name:        'Pro',
        price:       29900,        // ₹299 in paise
        tripsLimit:  Infinity,
        trucksLimit: 1,
        label:       'Pro Plan — ₹299/month',
    },
    fleet: {
        name:        'Fleet',
        price:       99900,        // ₹999 in paise
        tripsLimit:  Infinity,
        trucksLimit: Infinity,
        label:       'Fleet Plan — ₹999/month',
    },
};

const PLAN_DURATION_DAYS = 30;

// Support SLA per plan
const SUPPORT_SLA = {
    free:  { responseHours: null,  channel: 'bot'       },
    pro:   { responseHours: 24,    channel: 'whatsapp'  },
    fleet: { responseHours: 4,     channel: 'priority'  },
};

module.exports = { PLAN, PLAN_CONFIG, PLAN_DURATION_DAYS, SUPPORT_SLA };
