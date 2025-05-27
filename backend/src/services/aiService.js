const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    // Gemini API key - environment variable'dan alınacak
    this.apiKey = process.env.GEMINI_API_KEY || 'your-gemini-api-key-here';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Şehir sorun bildirimi için özel sistem prompt'u
    this.systemPrompt = `
Sen bir şehir sorun bildirimi ve takip sistemi için yardımcı chatbot'usun. Adın "Şehir Asistanı".

Görevlerin:
1. Kullanıcılara sorun bildirimi sürecinde yardım etmek
2. Sistem hakkında bilgi vermek
3. Sorun kategorileri konusunda rehberlik etmek
4. Genel şehircilik ve belediye hizmetleri hakkında bilgi vermek

Sorun Kategorileri:
- Altyapı: Su, elektrik, doğalgaz, internet sorunları
- Üstyapı: Yol, kaldırım, köprü, aydınlatma sorunları
- Çevre: Çöp, temizlik, ağaç budama, park bakımı
- Ulaşım: Toplu taşıma, trafik, park yeri sorunları
- Güvenlik: Aydınlatma eksikliği, güvenlik kamerası ihtiyacı
- Temizlik: Çöp toplama, sokak temizliği
- Diğer: Yukarıdakilere girmeyen diğer sorunlar

Yanıt verirken:
- Türkçe konuş
- Yardımsever ve samimi ol
- Kısa ve net cevaplar ver
- Sorun bildirimi yapmaya teşvik et
- Gerekirse adım adım rehberlik et

Şehir sorun bildirimi sistemi dışındaki konularda "Bu konuda yardımcı olamam, sadece şehir sorunları hakkında bilgi verebilirim" de.
`;
  }

  // Chatbot ile sohbet
  async chat(message, conversationHistory = []) {
    try {
      console.log('AI Chat isteği geldi:', message);

      // Sohbet geçmişini hazırla
      let fullPrompt = this.systemPrompt + '\n\n';
      
      // Önceki sohbet geçmişini ekle
      if (conversationHistory.length > 0) {
        fullPrompt += 'Önceki sohbet:\n';
        conversationHistory.forEach(entry => {
          fullPrompt += `Kullanıcı: ${entry.user}\n`;
          fullPrompt += `Sen: ${entry.assistant}\n`;
        });
        fullPrompt += '\n';
      }
      
      fullPrompt += `Kullanıcı: ${message}\nSen:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      console.log('AI yanıt üretildi:', text.substring(0, 100) + '...');

      return {
        success: true,
        data: {
          message: text.trim(),
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('AI Chat hatası:', error);
      
      // Fallback yanıtlar
      const fallbackResponses = [
        "Üzgünüm, şu anda teknik bir sorun yaşıyorum. Lütfen daha sonra tekrar deneyin.",
        "Geçici bir bağlantı sorunu yaşıyorum. Yardım için lütfen belediye ile iletişime geçin.",
        "Şu anda hizmet veremiyorum. Sorunlarınızı sistemden bildirebilirsiniz."
      ];
      
      return {
        success: false,
        data: {
          message: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
          timestamp: new Date().toISOString(),
          isError: true
        },
        error: error.message
      };
    }
  }

  // Sorun kategorilendirme (bonus özellik)
  async categorizeIssue(description) {
    try {
      const prompt = `
Aşağıdaki sorun açıklamasını analiz et ve en uygun kategoriyi seç:

Kategoriler:
- Altyapı
- Üstyapı  
- Çevre
- Ulaşım
- Güvenlik
- Temizlik
- Diğer

Sorun açıklaması: "${description}"

Sadece kategori adını döndür, başka açıklama yapma.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const category = response.text().trim();

      return {
        success: true,
        data: { category }
      };

    } catch (error) {
      console.error('Kategori belirleme hatası:', error);
      return {
        success: false,
        data: { category: 'Diğer' }
      };
    }
  }

  // Sorun öncelik belirleme
  async prioritizeIssue(description, category) {
    try {
      const prompt = `
Bu sorunun aciliyet seviyesini 1-5 arasında belirle:
1: Çok düşük
2: Düşük  
3: Orta
4: Yüksek
5: Çok yüksek (acil)

Kategori: ${category}
Açıklama: "${description}"

Sadece sayı döndür (1-5).
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const priority = parseInt(response.text().trim()) || 3;

      return {
        success: true,
        data: { priority: Math.min(Math.max(priority, 1), 5) }
      };

    } catch (error) {
      console.error('Öncelik belirleme hatası:', error);
      return {
        success: false,
        data: { priority: 3 }
      };
    }
  }
}

module.exports = new AIService(); 