const Medication = require('../models/Medication');
const MedicationRecord = require('../models/MedicationRecord');
const Pet = require('../models/Pet');

// ─── ADMIN: Medication Catalogue ─────────────────────────────────────────────

const createMedication = async (req, res) => {
    try {
        const { name, standardDosage, description, warnings } = req.body;
        if (!name || !standardDosage || !description) {
            res.status(400); throw new Error('Name, standard dosage, and description are required');
        }
        const med = await Medication.create({ name, standardDosage, description, warnings });
        res.status(201).json(med);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const getMedications = async (req, res) => {
    try {
        const meds = await Medication.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json(meds);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const getAllMedications = async (req, res) => {
    try {
        const meds = await Medication.find().sort({ name: 1 });
        res.status(200).json(meds);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateMedication = async (req, res) => {
    try {
        const med = await Medication.findById(req.params.id);
        if (!med) { res.status(404); throw new Error('Medication not found'); }
        const { name, standardDosage, description, warnings, isActive } = req.body;
        med.name = name ?? med.name;
        med.standardDosage = standardDosage ?? med.standardDosage;
        med.description = description ?? med.description;
        med.warnings = warnings ?? med.warnings;
        if (isActive !== undefined) med.isActive = isActive;
        await med.save();
        res.status(200).json(med);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const deleteMedication = async (req, res) => {
    try {
        const med = await Medication.findById(req.params.id);
        if (!med) { res.status(404); throw new Error('Medication not found'); }
        await Medication.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Medication deleted' });
    } catch (e) { res.status(400).json({ message: e.message }); }
};

// ─── USER: Medication Records ─────────────────────────────────────────────────

const createRecord = async (req, res) => {
    try {
        const { petId, medicationId, dosage, frequency, startDate, endDate, notes } = req.body;
        if (!petId || !medicationId || !dosage || !frequency || !startDate) {
            res.status(400); throw new Error('Pet, medication, dosage, frequency, and start date are required');
        }
        const pet = await Pet.findById(petId);
        if (!pet || pet.owner.toString() !== req.user._id.toString()) {
            res.status(401); throw new Error('Not authorized or pet not found');
        }
        const record = await MedicationRecord.create({
            owner: req.user._id, pet: petId, medication: medicationId,
            dosage, frequency, startDate, endDate, notes
        });
        await record.populate('medication');
        await record.populate('pet', 'name species');
        res.status(201).json(record);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const getMyRecords = async (req, res) => {
    try {
        const filter = { owner: req.user._id };
        if (req.query.petId) filter.pet = req.query.petId;
        const records = await MedicationRecord.find(filter)
            .populate('medication')
            .populate('pet', 'name species')
            .sort({ startDate: -1 });
        res.status(200).json(records);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateRecord = async (req, res) => {
    try {
        const record = await MedicationRecord.findById(req.params.id);
        if (!record) { res.status(404); throw new Error('Record not found'); }
        if (record.owner.toString() !== req.user._id.toString()) {
            res.status(401); throw new Error('Not authorized');
        }
        const { dosage, frequency, endDate, notes, status } = req.body;
        if (dosage) record.dosage = dosage;
        if (frequency) record.frequency = frequency;
        if (endDate) record.endDate = endDate;
        if (notes !== undefined) record.notes = notes;
        if (status) record.status = status;
        await record.save();
        res.status(200).json(record);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const deleteRecord = async (req, res) => {
    try {
        const record = await MedicationRecord.findById(req.params.id);
        if (!record) { res.status(404); throw new Error('Record not found'); }
        if (record.owner.toString() !== req.user._id.toString()) {
            res.status(401); throw new Error('Not authorized');
        }
        await MedicationRecord.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Record deleted' });
    } catch (e) { res.status(400).json({ message: e.message }); }
};

module.exports = {
    createMedication, getMedications, getAllMedications, updateMedication, deleteMedication,
    createRecord, getMyRecords, updateRecord, deleteRecord
};
