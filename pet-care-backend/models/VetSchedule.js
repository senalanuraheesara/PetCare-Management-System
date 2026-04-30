const mongoose = require('mongoose');

const vetScheduleSchema = new mongoose.Schema({
  vet: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  startTime: { type: String, required: true }, // Format HH:mm
  endTime: { type: String, required: true }, // Format HH:mm
  maxAppointments: { type: Number, required: true },
  bookedAppointments: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('VetSchedule', vetScheduleSchema);
