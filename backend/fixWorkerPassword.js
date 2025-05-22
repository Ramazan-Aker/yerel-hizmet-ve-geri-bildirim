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

// Worker şifresini güncelle
async function updateWorkerPassword() {
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
    
    // Worker'ı bul
    const email = 'worker.altyapi@sehir.gov.tr';
    const password = 'worker123';
    
    console.log(`${email} kullanıcısı aranıyor...`);
    const worker = await User.findOne({ email });
    
    if (!worker) {
      console.error(`${email} ile kullanıcı bulunamadı!`);
      return;
    }
    
    console.log(`Kullanıcı bulundu: ${worker.name} (${worker.role})`);
    
    // Şifreyi güncelle
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Yeni hash oluşturuldu");
    
    // Şifreyi direkt güncelle
    worker.password = hashedPassword;
    await worker.save();
    
    console.log("Şifre başarıyla güncellendi!");
    
    // Test şifre kontrolü
    const isMatch = await bcrypt.compare(password, worker.password);
    console.log(`Şifre doğrulama testi: ${isMatch ? 'BAŞARILI' : 'BAŞARISIZ'}`);
    
    console.log(`Yeni şifre: ${password}`);
    
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
updateWorkerPassword()
  .then(() => {
    console.log("İşlem tamamlandı.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Kritik hata:", err);
    process.exit(1);
  }); 