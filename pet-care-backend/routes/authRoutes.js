const express = require('express');
const router = express.Router();
const {
  sendOTP,
  registerUser,
  loginUser,
  loginWithOTP,
  googleLogin,
  getMe,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login-otp', loginWithOTP);
router.post('/google', googleLogin);
router.post('/pw-reset', resetPassword);
router.post('/reset-password', resetPassword); // Alias (same handler)
router.get('/me', protect, getMe);

module.exports = router;
