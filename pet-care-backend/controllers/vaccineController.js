const Vaccine = require('../models/Vaccine');
const PetVaccineRecord = require('../models/PetVaccineRecord');
const Pet = require('../models/Pet');

// ─── ADMIN: Vaccine Management ────────────────────────────────────────────────

// @desc    Create a vaccine
// @route   POST /api/vaccines
// @access  Private/Admin
const createVaccine = async (req, res) => {
  try {
    const { name, dosage, frequency, description } = req.body;
    if (!name || !dosage || !frequency) {
      res.status(400);
      throw new Error('Name, dosage, and frequency are required');
    }
    const vaccine = await Vaccine.create({ name, dosage, frequency, description });
    res.status(201).json(vaccine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all vaccines
// @route   GET /api/vaccines
// @access  Private
const getVaccines = async (req, res) => {
  try {
    const vaccines = await Vaccine.find().sort({ name: 1 });
    res.status(200).json(vaccines);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a vaccine
// @route   PUT /api/vaccines/:id
// @access  Private/Admin
const updateVaccine = async (req, res) => {
  try {
    const vaccine = await Vaccine.findById(req.params.id);
    if (!vaccine) {
      res.status(404);
      throw new Error('Vaccine not found');
    }
    const { name, dosage, frequency, description } = req.body;
    vaccine.name = name || vaccine.name;
    vaccine.dosage = dosage || vaccine.dosage;
    vaccine.frequency = frequency || vaccine.frequency;
    vaccine.description = description !== undefined ? description : vaccine.description;
    await vaccine.save();
    res.status(200).json(vaccine);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a vaccine
// @route   DELETE /api/vaccines/:id
// @access  Private/Admin
const deleteVaccine = async (req, res) => {
  try {
    const vaccine = await Vaccine.findById(req.params.id);
    if (!vaccine) {
      res.status(404);
      throw new Error('Vaccine not found');
    }
    await Vaccine.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Vaccine deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ─── USER: Pet Vaccine Records ────────────────────────────────────────────────

// @desc    Add a vaccine record for a pet
// @route   POST /api/vaccines/records
// @access  Private
const addVaccineRecord = async (req, res) => {
  try {
    const { petId, vaccineId, dateAdministered, notes } = req.body;
    if (!petId || !vaccineId || !dateAdministered) {
      res.status(400);
      throw new Error('Pet, vaccine, and date are required');
    }
    // Verify pet belongs to user
    const pet = await Pet.findById(petId);
    if (!pet || pet.owner.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized or pet not found');
    }
    const record = await PetVaccineRecord.create({
      pet: petId,
      owner: req.user._id,
      vaccine: vaccineId,
      dateAdministered,
      notes
    });
    await record.populate('vaccine');
    await record.populate('pet', 'name species');
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get vaccine records for the logged in user (optionally filtered by pet)
// @route   GET /api/vaccines/records?petId=xxx
// @access  Private
const getMyVaccineRecords = async (req, res) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.petId) filter.pet = req.query.petId;
    const records = await PetVaccineRecord.find(filter)
      .populate('vaccine')
      .populate('pet', 'name species')
      .sort({ dateAdministered: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a vaccine record
// @route   DELETE /api/vaccines/records/:id
// @access  Private
const deleteVaccineRecord = async (req, res) => {
  try {
    const record = await PetVaccineRecord.findById(req.params.id);
    if (!record) {
      res.status(404);
      throw new Error('Record not found');
    }
    if (record.owner.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    await PetVaccineRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Record deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createVaccine,
  getVaccines,
  updateVaccine,
  deleteVaccine,
  addVaccineRecord,
  getMyVaccineRecords,
  deleteVaccineRecord
};
