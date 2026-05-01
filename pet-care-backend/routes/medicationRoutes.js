const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    createMedication, getMedications, getAllMedications, updateMedication, deleteMedication,
    createRecord, getMyRecords, updateRecord, deleteRecord
} = require('../controllers/medicationController');

// User: browse active medication catalogue
router.get('/catalogue', protect, getMedications);

// Admin: full catalogue management
router.get('/catalogue/all', protect, admin, getAllMedications);
router.post('/catalogue', protect, admin, createMedication);
router.put('/catalogue/:id', protect, admin, updateMedication);
router.delete('/catalogue/:id', protect, admin, deleteMedication);

// User: prescription records
router.route('/records')
    .get(protect, getMyRecords)
    .post(protect, createRecord);

router.route('/records/:id')
    .put(protect, updateRecord)
    .delete(protect, deleteRecord);

module.exports = router;
