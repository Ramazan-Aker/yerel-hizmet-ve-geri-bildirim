const express = require('express');
const router = express.Router();
const { protect, authorizeMunicipalWorker } = require('../middleware/authMiddleware');

// Controller fonksiyonlarını import et
const {
  getIssuesByCity,
  getIssueById,
  getWorkers,
  updateIssueStatus,
  addOfficialResponse
} = require('../controllers/municipal');

// Admin controller'dan assignWorker fonksiyonunu import et
const { assignWorker } = require('../controllers/adminController');

// Tüm route'lar municipal_worker rolü koruması altında
router.use(protect);
router.use(authorizeMunicipalWorker);

// Rotaları tanımla
router.get('/issues', getIssuesByCity);
router.get('/issues/:id', getIssueById);

// Çalışanlar
router.get('/workers', getWorkers);

// Sorun atama endpoint'i
router.put('/issues/:id/assign', assignWorker);

// Sorun durumu güncelleme
router.put('/issues/:id/status', updateIssueStatus);

// Resmi yanıt ekleme
router.post('/issues/:id/response', addOfficialResponse);

module.exports = router; 