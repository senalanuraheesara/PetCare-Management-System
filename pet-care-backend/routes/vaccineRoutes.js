const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createVaccine,
  getVaccines,
  updateVaccine,
  deleteVaccine,
  addVaccineRecord,
  getMyVaccineRecords,
  deleteVaccineRecord
} = require('../controllers/vaccineController');

// Admin: vaccine catalogue CRUD
router.route('/')
  .get(protect, getVaccines)
  .post(protect, admin, createVaccine);

router.route('/:id')
  .put(protect, admin, updateVaccine)
  .delete(protect, admin, deleteVaccine);

// User: personal pet vaccine records
router.route('/records')
  .get(protect, getMyVaccineRecords)
  .post(protect, addVaccineRecord);

router.delete('/records/:id', protect, deleteVaccineRecord);

module.exports = router;
