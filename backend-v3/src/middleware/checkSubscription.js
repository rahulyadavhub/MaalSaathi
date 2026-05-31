// ============================================================
// src/middleware/checkSubscription.js
// Feature access gate — free / pro / fleet
// ============================================================

'use strict';

const { PLAN } = require('../constants/subscriptionPlans');
const { createLogger } = require('../utils/logger');
const log = createLogger('checkSubscription');

// Feature → minimum plan required
const FEATURE_PLAN = {
    // FREE
    TRIP_LOG:         PLAN.FREE,
    EXPENSE_TRACK:    PLAN.FREE,
    PL_TODAY:         PLAN.FREE,
    TRIP_COMPLETE:    PLAN.FREE,
    SMALL_TALK:       PLAN.FREE,
    SUPPORT_BOT:      PLAN.FREE,
    DASHBOARD_BASIC:  PLAN.FREE,

    // PRO
    PL_WEEKLY:        PLAN.PRO,
    PL_MONTHLY:       PLAN.PRO,
    PL_CUSTOM:        PLAN.PRO,
    PDF_INVOICE:      PLAN.PRO,
    PDF_REPORT:       PLAN.PRO,
    GST_CALC:         PLAN.PRO,
    DOC_REMINDERS:    PLAN.PRO,
    DAILY_REMINDER:   PLAN.PRO,
    WEEKLY_SUMMARY:   PLAN.PRO,
    MONTHLY_REPORT:   PLAN.PRO,
    PARTY_LEDGER:     PLAN.PRO,
    ADVANCE_TRACKER:  PLAN.PRO,
    VOICE_INPUT:      PLAN.PRO,
    FUEL_TRACKER:     PLAN.PRO,
    TOLL_CALC:        PLAN.PRO,
    WEATHER_ALERTS:   PLAN.PRO,
    SUPPORT_WHATSAPP: PLAN.PRO,
    DASHBOARD_PRO:    PLAN.PRO,

    // FLEET
    MULTI_TRUCK:      PLAN.FLEET,
    FLEET_VIEW:       PLAN.FLEET,
    DRIVER_MGMT:      PLAN.FLEET,
    DRIVER_SALARY:    PLAN.FLEET,
    DRIVER_PERF:      PLAN.FLEET,
    FASTAG:           PLAN.FLEET,
    ROUTE_OPTIMIZE:   PLAN.FLEET,
    SUPPORT_PRIORITY: PLAN.FLEET,
    DASHBOARD_FLEET:  PLAN.FLEET,
};

const PLAN_LEVEL = {
    [PLAN.FREE]:  0,
    [PLAN.PRO]:   1,
    [PLAN.FLEET]: 2,
};

// Check if user has access to a feature
function hasAccess(userPlan, feature) {
    const required = FEATURE_PLAN[feature];
    if (!required) return true; // unknown feature → allow
    return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[required];
}

// Upgrade message per plan
function upgradeMessage(requiredPlan) {
    if (requiredPlan === PLAN.PRO) {
        return `🔒 Ye feature Pro plan mein hai\n\n✅ Unlimited trips\n✅ PDF reports\n✅ GST invoice\n✅ Document reminders\n\n"upgrade" likhke ₹299/month mein upgrade karo`;
    }
    return `🔒 Ye feature Fleet plan mein hai\n\n✅ Multiple trucks\n✅ Driver management\n✅ Fleet analytics\n\n"upgrade" likhke ₹999/month mein upgrade karo`;
}

module.exports = { hasAccess, upgradeMessage, FEATURE_PLAN };
