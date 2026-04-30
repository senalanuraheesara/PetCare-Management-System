const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment
} = require('../controllers/appointmentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, bookAppointment)
  .get(protect, admin, getAllAppointments);

router.get('/my', protect, getMyAppointments);

router.route('/:id/status')
  .put(protect, admin, updateAppointmentStatus);

router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/reschedule', protect, rescheduleAppointment);

module.exports = router;
