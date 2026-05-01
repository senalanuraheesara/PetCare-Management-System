const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, admin, vetOrAdmin } = require('../middleware/authMiddleware');
const {
  createFeedingRecord, getMyFeedingRecords, updateFeedingRecord, deleteFeedingRecord,
  getAllFeedingRecordsAdmin, updateFeedingRecordAdmin
} = require('../controllers/dietController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

// User: feeding records
router.route('/records')
  .get(protect, getMyFeedingRecords)
  .post(protect, createFeedingRecord);

router.route('/records/:id')
  .put(protect, updateFeedingRecord)
  .delete(protect, deleteFeedingRecord);

// Admin/Vet record management
router.get('/records/admin/all', protect, admin, getAllFeedingRecordsAdmin);
router.put('/records/admin/:id', protect, vetOrAdmin, upload.single('dietChart'), updateFeedingRecordAdmin);

module.exports = router;