const express = require('express');
const router = express.Router();
const {
  addVet,
  getVets,
  setVetSchedule,
  getVetSchedules,
  getAllSchedules,
  updateVetSchedule,
  deleteVetSchedule
} = require('../controllers/vetController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, admin, addVet)
  .get(protect, getVets);

router.get('/schedules/all', protect, admin, getAllSchedules);

router.route('/:id/schedule')
  .post(protect, admin, setVetSchedule)
  .get(protect, getVetSchedules);

router.route('/:id/schedule/:scheduleId')
  .put(protect, admin, updateVetSchedule)
  .delete(protect, admin, deleteVetSchedule);

module.exports = router;
