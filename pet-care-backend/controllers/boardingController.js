const { persistMedia } = require('../utils/persistMedia');
const BoardingRoom = require('../models/BoardingRoom');
const BoardingBooking = require('../models/BoardingBooking');
const Pet = require('../models/Pet');

/** Bookings that still reserve a spot (not cancelled / rejected / completed stay) */
const OCCUPYING_STATUSES = ['Pending', 'Confirmed', 'Checked In'];

function roomCapacity(room) {
  const c = Number(room?.capacity);
  return Number.isFinite(c) && c >= 1 ? c : 1;
}

// ─── ADMIN: Room Type Management ──────────────────────────────────────────────

const createRoom = async (req, res) => {
  try {
    const { name, dailyRate, amenities, capacity } = req.body;
    if (!name || !dailyRate || !amenities) {
      res.status(400); throw new Error('Name, daily rate, and amenities are required');
    }
    
    const image = await persistMedia(req.file, 'boarding-rooms');

    const room = await BoardingRoom.create({ name, dailyRate, amenities, capacity, image });
    res.status(201).json(room);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await BoardingRoom.find({ isActive: true }).sort({ name: 1 });
    const checkInQ = req.query.checkIn;
    const checkOutQ = req.query.checkOut;

    let rangeStart;
    let rangeEnd;
    let filterByAvailability = false;
    if (checkInQ && checkOutQ) {
      rangeStart = new Date(checkInQ);
      rangeEnd = new Date(checkOutQ);
      if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime()) && rangeEnd > rangeStart) {
        filterByAvailability = true;
      }
    }

    if (!filterByAvailability) {
      const payload = rooms.map((room) => {
        const o = room.toObject();
        o.availableSpots = roomCapacity(room);
        o.bookedSpots = 0;
        return o;
      });
      return res.status(200).json(payload);
    }

    const roomIds = rooms.map((r) => r._id);
    const overlapping = await BoardingBooking.find({
      room: { $in: roomIds },
      status: { $in: OCCUPYING_STATUSES },
      checkIn: { $lt: rangeEnd },
      checkOut: { $gt: rangeStart },
    }).select('room');

    const bookedByRoom = overlapping.reduce((acc, b) => {
      const k = b.room.toString();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    const enriched = rooms.map((room) => {
      const o = room.toObject();
      const cap = roomCapacity(room);
      const booked = bookedByRoom[room._id.toString()] || 0;
      o.bookedSpots = booked;
      o.availableSpots = Math.max(0, cap - booked);
      return o;
    });

    const adminIncludeFull =
      req.query.includeFull === 'true' && req.user && req.user.role === 'admin';
    const list = adminIncludeFull ? enriched : enriched.filter((r) => r.availableSpots > 0);
    res.status(200).json(list);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await BoardingRoom.find().sort({ name: 1 });
    res.status(200).json(rooms);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateRoom = async (req, res) => {
  try {
    const room = await BoardingRoom.findById(req.params.id);
    if (!room) { res.status(404); throw new Error('Room not found'); }
    
    const { name, dailyRate, amenities, capacity, isActive } = req.body;
    room.name      = name       ?? room.name;
    room.dailyRate = dailyRate  ?? room.dailyRate;
    room.amenities = amenities  ?? room.amenities;
    room.capacity  = capacity   ?? room.capacity;
    if (isActive !== undefined) room.isActive = isActive;

    if (req.file) {
      room.image = await persistMedia(req.file, 'boarding-rooms');
    }

    await room.save();
    res.status(200).json(room);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteRoom = async (req, res) => {
  try {
    const room = await BoardingRoom.findById(req.params.id);
    if (!room) { res.status(404); throw new Error('Room not found'); }
    await BoardingRoom.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Room deleted' });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// ─── USER: Boarding Bookings ───────────────────────────────────────────────────

const createBooking = async (req, res) => {
  try {
    const { petId, roomId, checkIn, checkOut, notes } = req.body;
    if (!petId || !roomId || !checkIn || !checkOut) {
      res.status(400); throw new Error('Pet, room, check-in, and check-out are required');
    }
    const pet = await Pet.findById(petId);
    if (!pet || pet.owner.toString() !== req.user._id.toString()) {
      res.status(401); throw new Error('Not authorized or pet not found');
    }
    const room = await BoardingRoom.findById(roomId);
    if (!room) { res.status(404); throw new Error('Room not found'); }
    if (!room.isActive) {
      res.status(400);
      throw new Error('This cage type is not available');
    }

    const reqIn = new Date(checkIn);
    const reqOut = new Date(checkOut);
    if (Number.isNaN(reqIn.getTime()) || Number.isNaN(reqOut.getTime()) || reqOut <= reqIn) {
      res.status(400);
      throw new Error('Invalid check-in or check-out dates');
    }

    const cap = roomCapacity(room);
    const overlapCount = await BoardingBooking.countDocuments({
      room: roomId,
      status: { $in: OCCUPYING_STATUSES },
      checkIn: { $lt: reqOut },
      checkOut: { $gt: reqIn },
    });
    if (overlapCount >= cap) {
      res.status(400);
      throw new Error('No spots left for this cage type on the selected dates');
    }

    const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    const totalCost = nights * room.dailyRate;

    const booking = await BoardingBooking.create({
      owner: req.user._id, pet: petId, room: roomId,
      checkIn, checkOut, notes, totalCost
    });
    await booking.populate('room');
    await booking.populate('pet', 'name species');
    res.status(201).json(booking);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await BoardingBooking.find({ owner: req.user._id })
      .populate('room')
      .populate('pet', 'name species')
      .sort({ checkIn: -1 });
    res.status(200).json(bookings);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await BoardingBooking.findById(req.params.id);
    if (!booking) { res.status(404); throw new Error('Booking not found'); }
    if (booking.owner.toString() !== req.user._id.toString()) {
      res.status(401); throw new Error('Not authorized');
    }
    if (booking.status === 'Checked In' || booking.status === 'Checked Out') {
      res.status(400); throw new Error('Cannot cancel an active or completed stay');
    }
    booking.status = 'Cancelled';
    await booking.save();
    res.status(200).json(booking);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await BoardingBooking.find({})
      .populate('room')
      .populate('pet', 'name species')
      .populate('owner', 'name email')
      .sort({ checkIn: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await BoardingBooking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    const allowedStatuses = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled', 'Rejected'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }
    booking.status = status;
    await booking.save();
    res.status(200).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createRoom, getRooms, getAllRooms, updateRoom, deleteRoom,
  createBooking, getMyBookings, cancelBooking, getAllBookings, updateBookingStatus
};
