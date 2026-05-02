const mongoose = require('mongoose');

const feedingEntrySchema = new mongoose.Schema({
  time: { type: String, required: true },
  portion: { type: String, required: true },
  notes: { type: String }
});

const feedingRecordSchema = new mongoose.Schema({
  owner:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pet:              { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  categoryName:     { type: String, required: true },
  appointment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  schedule:         { type: [feedingEntrySchema], default: [] },
  dietChartUrl:     { type: String },
  startDate:        { type: Date, default: Date.now },
  isActive:         { type: Boolean, default: true },
  portionSize:      { type: String },
  feedingFrequency: { type: String },
  waterIntake:      { type: String },
  allergies:        { type: String },
  avoidFoods:       { type: String },
  specialNotes:     { type: String },
  vetInstructions:  { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FeedingRecord', feedingRecordSchema);