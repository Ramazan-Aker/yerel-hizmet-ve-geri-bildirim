require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// MongoDB URI'yi doğrudan .env'den al
const MONGODB_URI = process.env.MONGODB_URI;
console.log("MongoDB URI:", MONGODB_URI ? "Mevcut (gizli)" : "Bulunamadı");

// Kullanıcı şeması oluştur - model ile aynı
const userSchema = new mongoose.Schema({
  name: String,
  email: { 
    type: String, 
    unique: true 
  },
  password: String,
  phone: String,
  city: String,
  district: String,
  department: String,
  role: { 
    type: String, 
    enum: ['user', 'municipal_worker', 'admin', 'worker'],
    default: 'user' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Şifre karşılaştırma metodu
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Modeli oluştur
const User = mongoose.model('User', userSchema);

// Tüm worker şifrelerini güncelle
async function updateAllWorkerPasswords() {
  try {
    console.log("MongoDB bağlantısı kuruluyor...");
    
    // MongoDB bağlantısı - uzun timeout
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 90000
    });
    
    console.log("MongoDB bağlantısı başarılı!");
    
    // Tüm worker'ları bul
    console.log("Worker rolündeki kullanıcılar aranıyor...");
    const workers = await User.find({ role: 'worker' });
    
    if (!workers || workers.length === 0) {
      console.error("Hiç worker kullanıcısı bulunamadı!");
      return;
    }
    
    console.log(`Toplam ${workers.length} worker kullanıcısı bulundu.`);
    
    // Standart şifre
    const password = 'worker123';
    
    // Şifre hash'ini oluştur
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Yeni hash oluşturuldu");
    
    // Tüm worker şifrelerini güncelle
    let successCount = 0;
    let failCount = 0;
    
    for (const worker of workers) {
      try {
        // Şifreyi direkt güncelle
        worker.password = hashedPassword;
        await worker.save();
        
        // Test şifre kontrolü
        const isMatch = await bcrypt.compare(password, worker.password);
        
        if (isMatch) {
          console.log(`✅ ${worker.name} (${worker.email}) - şifre başarıyla güncellendi`);
          successCount++;
        } else {
          console.log(`❌ ${worker.name} (${worker.email}) - şifre doğrulaması başarısız!`);
          failCount++;
        }
      } catch (err) {
        console.error(`❌ ${worker.name} (${worker.email}) - şifre güncellenemedi:`, err.message);
        failCount++;
      }
    }
    
    console.log("\n=== ÖZET ===");
    console.log(`Toplam ${workers.length} worker kullanıcısı bulundu.`);
    console.log(`✅ ${successCount} kullanıcı için şifre başarıyla güncellendi.`);
    console.log(`❌ ${failCount} kullanıcı için şifre güncellenemedi.`);
    console.log("\nYeni şifre: " + password);
    
  } catch (error) {
    console.error("Hata:", error);
  } finally {
    // Bağlantıyı kapat
    if (mongoose.connection.readyState === 1) {
      console.log("Veritabanı bağlantısı kapatılıyor...");
      await mongoose.connection.close();
      console.log("Veritabanı bağlantısı kapatıldı.");
    }
  }
}

// Fonksiyonu çalıştır
console.log("Script başlatılıyor...");
updateAllWorkerPasswords()
  .then(() => {
    console.log("İşlem tamamlandı.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Kritik hata:", err);
    process.exit(1);
  }); 