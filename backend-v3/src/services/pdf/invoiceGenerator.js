// ============================================================
// src/services/pdf/invoiceGenerator.js
// Generate GST invoice PDF for completed trips
// ============================================================

'use strict';

const { createDocument, saveToFile, addHeader, addFooter } = require('./pdfService');
const { calculate } = require('../gst/gstCalculator');
const { createLogger } = require('../../utils/logger');
const log = createLogger('invoiceGen');

async function generateInvoice(invoiceData) {
    try {
        const {
            invoiceNumber,
            invoiceDate,
            user,
            party,
            trip,
            gstRate = 0.05,
        } = invoiceData;

        const gst = calculate(trip.freightAmount, gstRate);
        const doc = createDocument({ title: 'GST Invoice', subject: invoiceNumber });

        // ── Header ──
        addHeader(doc, 'GST Invoice');

        // ── Invoice Info ──
        doc.fontSize(10).fillColor('#333');
        doc.text(`Invoice No: ${invoiceNumber}`, 50, doc.y);
        doc.text(`Date: ${new Date(invoiceDate).toLocaleDateString('en-IN')}`, 350, doc.y - 12);
        doc.moveDown(1.5);

        // ── From (Transporter) ──
        doc.fontSize(12).fillColor('#000').text('From (Transporter):', 50);
        doc.fontSize(10).fillColor('#444');
        doc.text(user.name || 'MaalSaathi User');
        doc.text(`Phone: ${user.phone}`);
        doc.text(`Truck: ${user.truckNumber || 'N/A'}`);
        doc.moveDown(1);

        // ── To (Party) ──
        doc.fontSize(12).fillColor('#000').text('To (Party):', 50);
        doc.fontSize(10).fillColor('#444');
        doc.text(party.partyName);
        if (party.phone) doc.text(`Phone: ${party.phone}`);
        if (party.city)  doc.text(`City: ${party.city}`);
        doc.moveDown(2);

        // ── Trip Details ──
        doc.fontSize(12).fillColor('#000').text('Trip Details:', 50);
        doc.fontSize(10).fillColor('#444');
        doc.text(`Route: ${trip.origin} → ${trip.destination}`);
        if (trip.cargoType)     doc.text(`Cargo: ${trip.cargoType}`);
        if (trip.cargoWeight)   doc.text(`Weight: ${trip.cargoWeight} tons`);
        doc.moveDown(2);

        // ── GST Breakup Table ──
        doc.fontSize(12).fillColor('#000').text('GST Calculation:', 50);
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#333');
        doc.text('Description', 50, tableTop);
        doc.text('Amount (₹)', 400, tableTop, { align: 'right', width: 145 });
        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#ccc');

        let y = tableTop + 25;
        doc.text('Freight Charge',                  50, y);
        doc.text(gst.freight.toLocaleString('en-IN'), 400, y, { align: 'right', width: 145 });
        y += 20;
        doc.text(`CGST @ ${gstRate * 50}%`,           50, y);
        doc.text(gst.cgst.toLocaleString('en-IN'),    400, y, { align: 'right', width: 145 });
        y += 20;
        doc.text(`SGST @ ${gstRate * 50}%`,           50, y);
        doc.text(gst.sgst.toLocaleString('en-IN'),    400, y, { align: 'right', width: 145 });
        y += 20;
        doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke('#333');
        y += 15;
        doc.fontSize(12).fillColor('#000');
        doc.text('Total Amount',                     50, y);
        doc.text(`₹${gst.total.toLocaleString('en-IN')}`, 400, y, { align: 'right', width: 145 });

        // ── Footer ──
        doc.fontSize(8).fillColor('#999');
        doc.text(
            `\nNote: GST under GTA — ${gstRate === 0.05 ? 'No Input Tax Credit available' : 'ITC available'}`,
            50, doc.page.height - 100
        );
        addFooter(doc);

        const filename = `invoice_${invoiceNumber}_${Date.now()}.pdf`;
        const filePath = await saveToFile(doc, filename);

        log.info(`Invoice generated: ${invoiceNumber}`);
        return { filePath, filename, invoiceNumber, total: gst.total };

    } catch (err) {
        log.error(`generateInvoice error: ${err.message}`);
        throw err;
    }
}

module.exports = { generateInvoice };
