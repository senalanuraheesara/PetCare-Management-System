const mongoose = require('mongoose');

const medicationRecordSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, default: 'Active' }, // Active, Completed
  prescriptionFileUrl: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MedicationRecord', medicationRecordSchema);
