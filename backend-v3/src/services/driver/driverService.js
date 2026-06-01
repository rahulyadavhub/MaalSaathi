// ============================================================
// src/services/driver/driverService.js
// Driver CRUD + salary + advance management
// ============================================================

'use strict';

const Driver  = require('../../models/Driver');
const Advance = require('../../models/Advance');
const Truck   = require('../../models/Truck');
const { createLogger } = require('../../utils/logger');
const log = createLogger('driverService');

// Add new driver
async function addDriver(userId, data) {
    const driver = await Driver.create({
        userId,
        name:          data.name,
        phone:         data.phone || '',
        licenseNumber: data.licenseNumber || '',
        licenseExpiry: data.licenseExpiry || null,
        monthlySalary: data.monthlySalary || 0,
        joiningDate:   data.joiningDate   || new Date(),
    });

    log.info(`Driver added: ${driver.name} | user: ${userId}`);
    return driver;
}

// Get all drivers
async function getUserDrivers(userId) {
    return await Driver.find({ userId, isActive: true })
        .populate('assignedTruckId', 'registrationNumber')
        .sort({ createdAt: -1 });
}

// Assign driver to truck
async function assignToTruck(userId, driverId, truckId) {
    const driver = await Driver.findOneAndUpdate(
        { _id: driverId, userId },
        { assignedTruckId: truckId },
        { new: true }
    );

    // Also update truck's currentDriverId
    await Truck.findOneAndUpdate(
        { _id: truckId, userId },
        { currentDriverId: driverId }
    );

    log.info(`Driver ${driverId} assigned to truck ${truckId}`);
    return driver;
}

// Give advance payment
async function giveAdvance(userId, driverId, amount, reason) {
    const advance = await Advance.create({
        userId,
        driverId,
        amount,
        reason: reason || 'Advance payment',
        status: 'pending',
    });

    // Update driver's advancePaid total
    await Driver.findByIdAndUpdate(driverId, {
        $inc: { advancePaid: amount },
    });

    log.info(`Advance ${amount} given to driver ${driverId}`);
    return advance;
}

// Get driver's pending advances
async function getPendingAdvances(driverId) {
    return await Advance.find({
        driverId,
        status: 'pending',
    }).sort({ paidDate: -1 });
}

// Calculate driver's net salary for a month
async function calculateSalary(driverId, monthYear) {
    const driver = await Driver.findById(driverId);
    if (!driver) throw new Error('Driver not found');

    const advances = await Advance.find({
        driverId,
        status: 'pending',
    });

    const totalAdvance = advances.reduce((s, a) => s + a.amount, 0);
    const netSalary    = driver.monthlySalary - totalAdvance;

    return {
        driver:        driver.name,
        monthlySalary: driver.monthlySalary,
        totalAdvance,
        netSalary,
        advances,
    };
}

// Update driver performance
async function updatePerformance(driverId, tripsAdd, kmAdd) {
    return await Driver.findByIdAndUpdate(
        driverId,
        {
            $inc: {
                'performance.totalTrips': tripsAdd,
                'performance.totalKm':    kmAdd,
            },
        },
        { new: true }
    );
}

module.exports = {
    addDriver,
    getUserDrivers,
    assignToTruck,
    giveAdvance,
    getPendingAdvances,
    calculateSalary,
    updatePerformance,
};
