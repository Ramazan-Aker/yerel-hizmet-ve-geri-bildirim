const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  updatePassword,
  updateProfile 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/profile', protect, updateProfile);

// Kullanıcı rolünü kontrol et
router.get('/check-role', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Rol kontrol hatası:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
