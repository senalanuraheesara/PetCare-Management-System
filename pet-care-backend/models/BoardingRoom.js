const mongoose = require('mongoose');

const boardingRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },          // e.g. "Suite", "Standard Kennel"
  dailyRate: { type: Number, required: true },     // price per day
  amenities: { type: String, required: true },     // description: "includes 2 walks, AC room..."
  capacity: { type: Number, default: 1 },          // how many pets can stay
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('BoardingRoom', boardingRoomSchema);
