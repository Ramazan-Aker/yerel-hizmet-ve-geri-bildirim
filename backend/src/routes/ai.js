const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// Chatbot ile sohbet - Tüm kullanıcılar erişebilir
router.post('/chat', aiController.chat);

// Kategori önerisi - Sadece giriş yapmış kullanıcılar
router.post('/suggest-category', authMiddleware.protect, aiController.suggestCategory);

// Öncelik önerisi - Sadece admin/worker kullanıcılar
router.post('/suggest-priority', authMiddleware.protect, aiController.suggestPriority);

// AI sistem durumu - Herkes erişebilir (public endpoint)
router.get('/status', aiController.getStatus);

module.exports = router; 