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

// Sabit değerler - bu değerleri değiştirebilirsiniz
const email = 'worker.altyapi@sehir.gov.tr'; // Güncellenecek worker email adresi
const newPassword = 'worker123'; // Yeni şifre

// Worker şifresini güncelle
const updateWorkerPassword = async () => {
  try {
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`${email} ile bir kullanıcı bulunamadı!`.red);
      process.exit(1);
    }
    
    console.log(`Kullanıcı bulundu: ${user.name} (${user.role})`.green);
    
    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Şifreyi güncelle
    user.password = hashedPassword;
    await user.save();
    
    console.log('Şifre başarıyla güncellendi!'.green.bold);
    console.log('Yeni şifre:', newPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Şifre güncelleme hatası:'.red.bold, error);
    process.exit(1);
  }
};

// Fonksiyonu çalıştır
updateWorkerPassword(); 