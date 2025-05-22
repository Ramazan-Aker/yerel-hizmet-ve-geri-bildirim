const express = require('express');
const router = express.Router();
const { protect, authorizeWorker } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Dosya yükleme için multer konfigürasyonu
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../../uploads/progress');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Controller fonksiyonlarını import et
const {
  getAssignedIssues,
  getWorkerStats,
  getRecentAssignedIssues,
  getWorkerIssueById,
  updateIssueStatus,
  uploadProgressPhotos,
  addWorkerComment
} = require('../controllers/worker');

// Tüm route'lar worker rolü koruması altında
router.use(protect);
router.use(authorizeWorker);

// Rotaları tanımla
router.get('/issues', getAssignedIssues);
router.get('/stats', getWorkerStats);
router.get('/issues/recent', getRecentAssignedIssues);
router.get('/issues/:id', getWorkerIssueById);
router.put('/issues/:id/status', updateIssueStatus);
router.post('/issues/:id/photos', upload.array('photos', 5), uploadProgressPhotos);
router.post('/issues/:id/comments', addWorkerComment);

module.exports = router; 