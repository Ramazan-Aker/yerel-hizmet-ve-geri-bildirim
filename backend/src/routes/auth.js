const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  updatePassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
