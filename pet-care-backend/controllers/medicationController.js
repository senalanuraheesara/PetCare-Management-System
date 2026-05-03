const { persistMedia } = require('../utils/persistMedia');
const MedicationRecord = require('../models/MedicationRecord');
const Pet = require('../models/Pet');

const createRecord = async (req, res) => {
    try {
        const { petId, medicationName, dosage, frequency, startDate, endDate, notes } = req.body;
        if (!petId || !medicationName || !dosage || !frequency || !startDate) {
            res.status(400); throw new Error('Pet, medication name, dosage, frequency, and start date are required');
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

        const record = await MedicationRecord.create({
            owner: pet.owner, pet: petId, medicationName,
            dosage, frequency, startDate, endDate, notes
        });
        await record.populate('pet', 'name species');
        res.status(201).json(record);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const getMyRecords = async (req, res) => {
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

        const records = await MedicationRecord.find(filter)
            .populate('pet', 'name species')
            .sort({ createdAt: -1 });
        res.status(200).json(records);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateRecord = async (req, res) => {
    try {
        const record = await MedicationRecord.findById(req.params.id);
        if (!record) { res.status(404); throw new Error('Record not found'); }
        if (record.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(401); throw new Error('Not authorized');
        }
        const { dosage, frequency, endDate, notes, status, medicationName } = req.body;
        if (dosage) record.dosage = dosage;
        if (frequency) record.frequency = frequency;
        if (endDate) record.endDate = endDate;
        if (notes !== undefined) record.notes = notes;
        if (status) record.status = status;
        if (medicationName) record.medicationName = medicationName;
        await record.save();
        res.status(200).json(record);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const deleteRecord = async (req, res) => {
    try {
        const record = await MedicationRecord.findById(req.params.id);
        if (!record) { res.status(404); throw new Error('Record not found'); }
        if (record.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(401); throw new Error('Not authorized');
        }
        await MedicationRecord.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Record deleted' });
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const getAllRecordsAdmin = async (req, res) => {
    try {
        const records = await MedicationRecord.find({})
            .populate('pet', 'name species')
            .populate('owner', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(records);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

const updateRecordAdmin = async (req, res) => {
    try {
        const record = await MedicationRecord.findById(req.params.id);
        if (!record) { res.status(404); throw new Error('Record not found'); }
        
        const { dosage, frequency, endDate, notes, status, startDate, medicationName } = req.body;
        if (dosage) record.dosage = dosage;
        if (frequency) record.frequency = frequency;
        if (startDate) record.startDate = startDate;
        if (endDate) record.endDate = endDate;
        if (notes !== undefined) record.notes = notes;
        if (status) record.status = status;
        if (medicationName) record.medicationName = medicationName;

        if (req.file) {
            record.prescriptionFileUrl = await persistMedia(req.file, 'medication-prescriptions');
        }

        await record.save();
        res.status(200).json(record);
    } catch (e) { res.status(400).json({ message: e.message }); }
};

module.exports = {
    createRecord, getMyRecords, updateRecord, deleteRecord, getAllRecordsAdmin, updateRecordAdmin
};
