const mongoose = require('mongoose');

const boardingRoomSchema = new mongoose.Schema({
  name: { type: String, required: true },          
  image: { type: String },                         
  dailyRate: { type: Number, required: true },     
  amenities: { type: String, required: true },    
  capacity: { type: Number, default: 1 },          
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('BoardingRoom', boardingRoomSchema);
