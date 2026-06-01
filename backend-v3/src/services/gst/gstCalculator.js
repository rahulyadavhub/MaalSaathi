// ============================================================
// src/services/gst/gstCalculator.js
// GST calculator for Goods Transport Agency (GTA)
// 5% (no ITC) or 12% (with ITC)
// ============================================================

'use strict';

const GST_RATES = {
    FIVE_PERCENT:   0.05,   // 5% — no Input Tax Credit
    TWELVE_PERCENT: 0.12,   // 12% — with Input Tax Credit
};

// Calculate GST on freight amount
function calculate(freightAmount, rate = 0.05) {
    if (![0.05, 0.12].includes(rate)) {
        throw new Error('Invalid GST rate. Use 0.05 or 0.12');
    }

    const gstAmount = Math.round(freightAmount * rate);
    const totalWithGST = freightAmount + gstAmount;
    const cgst = Math.round(gstAmount / 2);
    const sgst = gstAmount - cgst;

    return {
        freight:    freightAmount,
        gstRate:    rate * 100 + '%',
        gstAmount,
        cgst,                              // Central GST (half)
        sgst,                              // State GST (half)
        igst:       gstAmount,             // Inter-state full
        total:      totalWithGST,
    };
}

// Reverse — get freight before GST from total
function reverseCalculate(totalWithGST, rate = 0.05) {
    const freight   = Math.round(totalWithGST / (1 + rate));
    const gstAmount = totalWithGST - freight;
    return { freight, gstAmount, totalWithGST, gstRate: rate * 100 + '%' };
}

// Format GST breakup message for WhatsApp
function formatGSTMessage(calc) {
    return (
        `💰 GST Calculation\n\n` +
        `Freight: ₹${calc.freight.toLocaleString('en-IN')}\n` +
        `GST Rate: ${calc.gstRate}\n` +
        `─────────────────\n` +
        `CGST: ₹${calc.cgst.toLocaleString('en-IN')}\n` +
        `SGST: ₹${calc.sgst.toLocaleString('en-IN')}\n` +
        `(IGST inter-state: ₹${calc.igst.toLocaleString('en-IN')})\n` +
        `─────────────────\n` +
        `Total: ₹${calc.total.toLocaleString('en-IN')}\n\n` +
        `Note: ${calc.gstRate === '5%' ? 'No ITC available' : 'ITC claim kar sakte ho'}`
    );
}

module.exports = { calculate, reverseCalculate, formatGSTMessage, GST_RATES };
