require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const colors = require('colors');

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB bağlantısı başarılı'.green.bold))
.catch(err => {
  console.error('MongoDB bağlantı hatası:'.red.bold, err);
  process.exit(1);
});

// Sabit değerler
const newPassword = 'worker123'; // Tüm worker'lar için aynı şifre

// Tüm worker şifrelerini güncelle
const updateAllWorkerPasswords = async () => {
  try {
    // Worker rolüne sahip tüm kullanıcıları bul
    const workers = await User.find({ role: 'worker' });
    
    if (workers.length === 0) {
      console.log('Hiç worker rolünde kullanıcı bulunamadı!'.yellow);
      process.exit(0);
    }
    
    console.log(`Toplam ${workers.length} worker rolünde kullanıcı bulundu`.cyan);
    
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Her bir worker için şifre güncelleme
    let updatedCount = 0;
    for (const worker of workers) {
      worker.password = hashedPassword;
      await worker.save();
      console.log(`${worker.name} (${worker.email}) - şifre güncellendi`.green);
      updatedCount++;
    }
    
    console.log('\n=== ÖZET ==='.bold);
    console.log(`Toplam ${updatedCount} çalışanın şifresi güncellendi.`.green.bold);
    console.log('\nTüm çalışanlar için yeni şifre:'.cyan.bold, newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Şifre güncelleme hatası:'.red.bold, error);
    process.exit(1);
  }
};

// Fonksiyonu çalıştır
updateAllWorkerPasswords(); 