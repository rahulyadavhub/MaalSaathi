// ============================================================
// src/services/truck/truckService.js
// Multiple truck CRUD + active truck switching
// ============================================================

'use strict';

const Truck = require('../../models/Truck');
const User  = require('../../models/User');
const { createLogger } = require('../../utils/logger');
const log = createLogger('truckService');

// Add new truck
async function addTruck(userId, data) {
    const truck = await Truck.create({
        userId,
        registrationNumber: data.registrationNumber,
        model:        data.model || '',
        year:         data.year || null,
        capacity_tons: data.capacity_tons || null,
        fuelType:     data.fuelType || 'diesel',
    });

    // Set as active if first truck
    const count = await Truck.countDocuments({ userId, isActive: true });
    if (count === 1) {
        await User.findByIdAndUpdate(userId, { activeTruckId: truck._id });
    }

    log.info(`Truck added: ${truck.registrationNumber} | user: ${userId}`);
    return truck;
}

// Get all user trucks
async function getUserTrucks(userId) {
    return await Truck.find({ userId, isActive: true })
        .populate('currentDriverId', 'name phone')
        .sort({ createdAt: -1 });
}

// Switch active truck
async function switchActiveTruck(userId, truckId) {
    const truck = await Truck.findOne({ _id: truckId, userId, isActive: true });
    if (!truck) throw new Error('Truck not found');

    await User.findByIdAndUpdate(userId, { activeTruckId: truckId });
    log.info(`Active truck switched: ${truck.registrationNumber} | user: ${userId}`);
    return truck;
}

// Get active truck
async function getActiveTruck(userId) {
    const user = await User.findById(userId).select('activeTruckId');
    if (!user?.activeTruckId) return null;
    return await Truck.findById(user.activeTruckId)
        .populate('currentDriverId', 'name phone');
}

// Update truck documents expiry
async function updateDocExpiry(truckId, docType, expiryDate) {
    return await Truck.findByIdAndUpdate(
        truckId,
        { [`documents.${docType}Expiry`]: expiryDate },
        { new: true }
    );
}

// Deactivate truck
async function deactivateTruck(userId, truckId) {
    return await Truck.findOneAndUpdate(
        { _id: truckId, userId },
        { isActive: false },
        { new: true }
    );
}

module.exports = {
    addTruck,
    getUserTrucks,
    switchActiveTruck,
    getActiveTruck,
    updateDocExpiry,
    deactivateTruck,
};
