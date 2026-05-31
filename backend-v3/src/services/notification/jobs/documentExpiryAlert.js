// ============================================================
// src/services/notification/jobs/documentExpiryAlert.js
// Every day 10 AM IST — alert users about expiring docs
// RC, Insurance, PUC, Permit, Fitness
// ============================================================

'use strict';

const Document     = require('../../../models/Document');
const User         = require('../../../models/User');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { EXPIRY_REMINDER_DAYS, DOCUMENT_LABELS } = require('../../../constants/documentTypes');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('docExpiry');

async function documentExpiryAlert() {
    log.info('Running document expiry alert job...');

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let sent = 0;

        for (const days of EXPIRY_REMINDER_DAYS) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + days);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            // Find docs expiring in exactly 'days' days
            const docs = await Document.find({
                expiryDate: { $gte: targetDate, $lt: nextDay },
            }).populate('userId', 'phone name subscription');

            for (const doc of docs) {
                const user = doc.userId;
                if (!user) continue;

                // Only PRO + FLEET users get doc reminders
                if (!['pro', 'fleet'].includes(user.subscription?.plan)) continue;
                if (!user.subscription?.isActive) continue;

                // Check if reminder already sent for this interval
                const field = days === 1 ? 'days7' :
                              days === 7 ? 'days7' :
                              days === 15 ? 'days15' : 'days30';

                if (doc.reminderSent?.[field]) continue;

                const docLabel = DOCUMENT_LABELS[doc.type] || doc.type;
                const emoji    = days <= 7 ? '🔴' : days <= 15 ? '🟠' : '🟡';

                const message =
                    `${emoji} Document Expiry Alert!\n\n` +
                    `📄 ${docLabel}\n` +
                    `⏳ ${days === 1 ? 'Kal' : `${days} din mein`} expire ho raha hai\n` +
                    `📅 Expiry: ${doc.expiryDate.toLocaleDateString('en-IN')}\n\n` +
                    `Jaldi renew karo ${user.name || 'Bhai'}! ⚡`;

                await sendMessage(user.phone, message);

                // Mark reminder sent
                await Document.findByIdAndUpdate(doc._id, {
                    [`reminderSent.${field}`]: true,
                });

                await Notification.create({
                    userId:    user._id,
                    phone:     user.phone,
                    type:      'doc_expiry',
                    message,
                    status:    'sent',
                    reference: String(doc._id),
                });

                sent++;
            }
        }

        log.info(`Document expiry alerts sent: ${sent}`);

    } catch (err) {
        log.error(`documentExpiryAlert error: ${err.message}`);
    }
}

module.exports = { documentExpiryAlert };
