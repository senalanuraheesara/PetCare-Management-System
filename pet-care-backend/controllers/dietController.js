const { persistMedia } = require('../utils/persistMedia');
const FeedingRecord = require('../models/FeedingRecord');
const Pet = require('../models/Pet');

const createFeedingRecord = async (req, res) => {
  try {
    const { petId, categoryName, schedule, startDate, specialNotes, vetInstructions,
            allergies, avoidFoods, portionSize, feedingFrequency, waterIntake } = req.body;
    if (!petId || !categoryName) {
      res.status(400); throw new Error('Pet and category name are required');
    }
    const pet = await Pet.findById(petId);
    if (!pet) {
      res.status(404); throw new Error('Pet not found');
    }

    const isOwner = pet.owner.toString() === req.user._id.toString();
    const isStaff = ['admin', 'vet'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      res.status(401); throw new Error('Not authorized to add records for this pet');
    }
    let parsedSchedule;
    try {
      parsedSchedule = typeof schedule === 'string' ? JSON.parse(schedule) : (schedule || []);
    } catch (e) {
      parsedSchedule = Array.isArray(schedule) ? schedule : [];
    }

    const record = await FeedingRecord.create({
      owner: pet.owner, pet: petId, categoryName,
      schedule: parsedSchedule, startDate: startDate || new Date(),
      specialNotes, vetInstructions, allergies, avoidFoods, portionSize, feedingFrequency, waterIntake
    });
    await record.populate('pet', 'name species');
    res.status(201).json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

const getMyFeedingRecords = async (req, res) => {
  try {
    const myPets = await Pet.find({ owner: req.user._id }).select('_id');
    const petIds = myPets.map(p => p._id);

    // BROAD FILTER: Show records linked to user's pets OR where user is the explicit owner
    const filter = {
      $or: [
        { pet: { $in: petIds } },
        { owner: req.user._id }
      ]
    };

    if (req.query.petId) {
      filter.pet = req.query.petId;
      delete filter.$or;
    }

    const records = await FeedingRecord.find(filter)
      .populate('pet', 'name species')
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateFeedingRecord = async (req, res) => {
  try {
    const record = await FeedingRecord.findById(req.params.id);
    if (!record) { res.status(404); throw new Error('Record not found'); }
    if (record.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401); throw new Error('Not authorized');
    }
    const { schedule, isActive, categoryName } = req.body;
    if (schedule) record.schedule = schedule;
    if (isActive !== undefined) record.isActive = isActive;
    if (categoryName) record.categoryName = categoryName;
    await record.save();
    res.status(200).json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

const deleteFeedingRecord = async (req, res) => {
  try {
    const record = await FeedingRecord.findById(req.params.id);
    if (!record) { res.status(404); throw new Error('Record not found'); }
    if (record.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(401); throw new Error('Not authorized');
    }
    await FeedingRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Record deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

const getAllFeedingRecordsAdmin = async (req, res) => {
  try {
    const records = await FeedingRecord.find({})
      .populate('pet', 'name species')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateFeedingRecordAdmin = async (req, res) => {
  try {
    const record = await FeedingRecord.findById(req.params.id);
    if (!record) { res.status(404); throw new Error('Record not found'); }

    const { schedule, isActive, startDate, categoryName, specialNotes, vetInstructions,
            allergies, avoidFoods, portionSize, feedingFrequency, waterIntake } = req.body;
    if (schedule) {
      try { record.schedule = typeof schedule === 'string' ? JSON.parse(schedule) : schedule; }
      catch (e) { record.schedule = schedule; }
    }
    if (isActive !== undefined) record.isActive = isActive;
    if (startDate) record.startDate = startDate;
    if (categoryName) record.categoryName = categoryName;
    if (specialNotes !== undefined) record.specialNotes = specialNotes;
    if (vetInstructions !== undefined) record.vetInstructions = vetInstructions;
    if (allergies !== undefined) record.allergies = allergies;
    if (avoidFoods !== undefined) record.avoidFoods = avoidFoods;
    if (portionSize !== undefined) record.portionSize = portionSize;
    if (feedingFrequency !== undefined) record.feedingFrequency = feedingFrequency;
    if (waterIntake !== undefined) record.waterIntake = waterIntake;

    if (req.file) {
      record.dietChartUrl = await persistMedia(req.file, 'diet-charts');
    }

    await record.save();
    res.status(200).json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

module.exports = {
  createFeedingRecord, getMyFeedingRecords, updateFeedingRecord, deleteFeedingRecord,
  getAllFeedingRecordsAdmin, updateFeedingRecordAdmin
};