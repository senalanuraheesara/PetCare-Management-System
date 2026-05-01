const mongoose = require('mongoose');

const medicationRecordSchema = new mongoose.Schema({
    owner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
    pet:        { type: mongoose.Schema.Types.ObjectId, ref: 'Pet',        required: true },
    medication: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
    dosage:     { type: String, required: true },      // pet-specific dosage e.g. "1 tablet"
    frequency:  { type: String, required: true },      // e.g. "Once a day", "Twice daily"
    startDate:  { type: Date, required: true },
    endDate:    { type: Date },                        // optional end date
    notes:      { type: String },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Discontinued'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('MedicationRecord', medicationRecordSchema);
