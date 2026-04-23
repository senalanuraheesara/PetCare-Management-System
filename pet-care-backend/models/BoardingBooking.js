const mongoose = require('mongoose');

const boardingBookingSchema = new mongoose.Schema({
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  pet:      { type: mongoose.Schema.Types.ObjectId, ref: 'Pet',          required: true },
  room:     { type: mongoose.Schema.Types.ObjectId, ref: 'BoardingRoom', required: true },
  checkIn:  { type: Date, required: true },
  checkOut: { type: Date, required: true },
  notes:    { type: String },
  totalCost:{ type: Number },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'Rejected'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('BoardingBooking', boardingBookingSchema);
