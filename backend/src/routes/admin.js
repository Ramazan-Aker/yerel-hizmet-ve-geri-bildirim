const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole,
  toggleUserStatus,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Tüm rotalar admin yetkisi gerektirir
router.use(protect);
router.use(authorize(['admin']));

// Dashboard istatistikleri
router.get('/dashboard', getDashboardStats);

// Kullanıcı yönetimi
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/status', toggleUserStatus);

module.exports = router;
