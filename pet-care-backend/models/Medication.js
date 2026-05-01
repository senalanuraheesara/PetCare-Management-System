const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    name: { type: String, required: true },            // e.g. "Amoxicillin"
    standardDosage: { type: String, required: true },  // e.g. "5mg per kg body weight"
    description: { type: String, required: true },     // general info about the medication
    warnings: { type: String },                        // side effects / warnings
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Medication', medicationSchema);
