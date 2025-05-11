const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole,
  toggleUserStatus,
  getDashboardStats,
  getIssueById,
  updateIssueStatus,
  addOfficialResponse,
  assignWorker,
  getWorkers,
  getReports
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Tüm rotalar için kimlik doğrulama gerekli
router.use(protect);

// Dashboard istatistikleri - hem admin hem belediye çalışanları erişebilir
router.get('/dashboard', authorize(['admin', 'municipal_worker']), getDashboardStats);

// Kullanıcı yönetimi - sadece admin erişebilir
router.route('/users')
  .get(authorize(['admin']), getAllUsers);

router.route('/users/:id')
  .get(authorize(['admin']), getUser)
  .put(authorize(['admin']), updateUser)
  .delete(authorize(['admin']), deleteUser);

router.put('/users/:id/role', authorize(['admin']), changeUserRole);
router.put('/users/:id/status', authorize(['admin']), toggleUserStatus);

// Sorun yönetimi - hem admin hem belediye çalışanları erişebilir
router.get('/issues/:id', authorize(['admin', 'municipal_worker']), getIssueById);
router.put('/issues/:id/status', authorize(['admin', 'municipal_worker']), updateIssueStatus);
router.post('/issues/:id/response', authorize(['admin', 'municipal_worker']), addOfficialResponse);
router.put('/issues/:id/assign', authorize(['admin', 'municipal_worker']), assignWorker);

// Çalışan listesi - hem admin hem belediye çalışanları erişebilir
router.get('/workers', authorize(['admin', 'municipal_worker']), getWorkers);

// Raporlar - hem admin hem belediye çalışanları erişebilir
router.get('/reports', authorize(['admin', 'municipal_worker']), getReports);

module.exports = router;
