const aiService = require('../services/aiService');

// Chatbot ile sohbet
const chat = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    // Mesaj kontrolü
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mesaj boş olamaz'
      });
    }

    // Mesaj uzunluk kontrolü
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj çok uzun (maksimum 1000 karakter)'
      });
    }

    console.log(`Kullanıcıdan AI chat mesajı: ${message.substring(0, 50)}...`);

    // AI servisi ile sohbet et
    const result = await aiService.chat(message, conversationHistory || []);

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: result.data.message,
          timestamp: result.data.timestamp,
          isBot: true
        }
      });
    } else {
      res.json({
        success: true, // Kullanıcıya hata mesajı göstermek için success: true
        data: {
          message: result.data.message,
          timestamp: result.data.timestamp,
          isBot: true,
          isError: true
        }
      });
    }

  } catch (error) {
    console.error('Chat endpoint hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Chatbot ile iletişim kurulurken bir hata oluştu'
    });
  }
};

// Sorun kategorisi önerisi
const suggestCategory = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Açıklama boş olamaz'
      });
    }

    console.log(`Kategori önerisi isteniyor: ${description.substring(0, 50)}...`);

    const result = await aiService.categorizeIssue(description);

    res.json({
      success: true,
      data: {
        suggestedCategory: result.data.category,
        confidence: result.success ? 'high' : 'low'
      }
    });

  } catch (error) {
    console.error('Kategori önerisi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori önerisi alınırken bir hata oluştu'
    });
  }
};

// Sorun öncelik belirleme
const suggestPriority = async (req, res) => {
  try {
    const { description, category } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Açıklama boş olamaz'
      });
    }

    console.log(`Öncelik önerisi isteniyor: ${description.substring(0, 50)}...`);

    const result = await aiService.prioritizeIssue(description, category || 'Diğer');

    res.json({
      success: true,
      data: {
        suggestedPriority: result.data.priority,
        confidence: result.success ? 'high' : 'low'
      }
    });

  } catch (error) {
    console.error('Öncelik önerisi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Öncelik önerisi alınırken bir hata oluştu'
    });
  }
};

// Sistem durumu
const getStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        chatbotStatus: 'active',
        model: 'gemini-1.5-flash',
        features: [
          'Chatbot desteği',
          'Kategori önerisi',
          'Öncelik belirleme'
        ],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI durum kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      message: 'AI sistem durumu kontrol edilemedi'
    });
  }
};

module.exports = {
  chat,
  suggestCategory,
  suggestPriority,
  getStatus
}; 