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
  getReports,
  exportReportPDF,
  exportReportCSV
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Tüm rotalar için kimlik doğrulama gerekli
router.use(protect);

// Kullanıcı yönetimi
router.route('/users')
  .get(authorize(['admin']), getAllUsers);

router.route('/users/:id')
  .get(authorize(['admin']), getUser)
  .put(authorize(['admin']), updateUser)
  .delete(authorize(['admin']), deleteUser);

router.put('/users/:id/role', authorize(['admin']), changeUserRole);
router.put('/users/:id/status', authorize(['admin']), toggleUserStatus);

// Dashboard istatistikleri
router.get('/dashboard', authorize(['admin', 'municipal_worker']), getDashboardStats);

// Sorun yönetimi
router.get('/issues/:id', authorize(['admin', 'municipal_worker']), getIssueById);
router.put('/issues/:id/status', authorize(['admin', 'municipal_worker']), updateIssueStatus);
router.post('/issues/:id/response', authorize(['admin', 'municipal_worker']), addOfficialResponse);
router.put('/issues/:id/assign', authorize(['admin']), assignWorker);

// Belediye çalışanları listesi
router.get('/workers', authorize(['admin']), getWorkers);

// Raporlar - hem admin hem belediye çalışanları erişebilir
router.get('/reports', authorize(['admin', 'municipal_worker']), getReports);

// Rapor indirme endpointleri
router.get('/reports/export/pdf', authorize(['admin', 'municipal_worker']), exportReportPDF);
router.get('/reports/export/csv', authorize(['admin', 'municipal_worker']), exportReportCSV);

module.exports = router;
