// ============================================================
// src/services/pdf/reportGenerator.js
// Generate monthly P&L PDF report
// ============================================================

'use strict';

const { createDocument, saveToFile, addHeader, addFooter } = require('./pdfService');
const { createLogger } = require('../../utils/logger');
const log = createLogger('reportGen');

async function generateMonthlyReport(reportData) {
    try {
        const {
            user,
            month,
            year,
            trips    = [],
            expenses = [],
        } = reportData;

        const monthName = new Date(year, month).toLocaleString('en-IN', {
            month: 'long', year: 'numeric'
        });

        // Calculate totals
        const totalRevenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
        const completedTrips = trips.filter(t => t.status === 'completed').length;
        const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const netProfit    = totalRevenue - totalExpense;
        const margin       = totalRevenue > 0
            ? ((netProfit / totalRevenue) * 100).toFixed(1)
            : 0;

        // Group expenses by category
        const byCategory = {};
        for (const e of expenses) {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        }

        const doc = createDocument({
            title: `Monthly Report - ${monthName}`,
            subject: `MaalSaathi P&L ${monthName}`,
        });

        addHeader(doc, `Monthly P&L Report — ${monthName}`);

        // ── User Info ──
        doc.fontSize(10).fillColor('#666');
        doc.text(`Generated for: ${user.name}`, 50);
        doc.text(`Truck: ${user.truckNumber || 'N/A'}`);
        doc.text(`Period: ${monthName}`);
        doc.moveDown(2);

        // ── Summary ──
        doc.fontSize(14).fillColor('#000').text('Summary', 50);
        doc.moveDown(0.5);

        const profitColor = netProfit >= 0 ? '#16a34a' : '#dc2626';
        doc.fontSize(11).fillColor('#333');
        doc.text(`Total Trips: ${trips.length} (${completedTrips} completed)`);
        doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
        doc.text(`Total Expense: ₹${totalExpense.toLocaleString('en-IN')}`);
        doc.moveDown(0.5);

        doc.fontSize(13).fillColor(profitColor);
        doc.text(`Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);
        doc.text(`Profit Margin: ${margin}%`);
        doc.moveDown(2);

        // ── Expense Breakdown ──
        doc.fontSize(14).fillColor('#000').text('Expense Breakdown', 50);
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333');

        const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        for (const [cat, amt] of sortedCats) {
            const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
            doc.text(`• ${cat}: ₹${amt.toLocaleString('en-IN')} (${pct}%)`, 70);
        }
        doc.moveDown(2);

        // ── Trip List (top 10) ──
        if (trips.length) {
            doc.fontSize(14).fillColor('#000').text('Recent Trips', 50);
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#444');

            const recent = trips.slice(0, 10);
            for (const t of recent) {
                const status = t.status === 'completed' ? '✓' : '○';
                doc.text(
                    `${status} ${t.origin} → ${t.destination}` +
                    `   ₹${(t.freightAmount || 0).toLocaleString('en-IN')}`,
                    70
                );
            }
        }

        addFooter(doc);

        const filename = `report_${user.phone}_${month + 1}_${year}_${Date.now()}.pdf`;
        const filePath = await saveToFile(doc, filename);

        log.info(`Monthly report generated: ${user.phone} ${monthName}`);
        return { filePath, filename, summary: { totalRevenue, totalExpense, netProfit, margin } };

    } catch (err) {
        log.error(`generateMonthlyReport error: ${err.message}`);
        throw err;
    }
}

module.exports = { generateMonthlyReport };
