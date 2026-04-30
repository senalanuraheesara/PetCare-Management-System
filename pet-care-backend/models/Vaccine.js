const mongoose = require('mongoose');

const vaccineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true }, // "how many times a month"
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Vaccine', vaccineSchema);
