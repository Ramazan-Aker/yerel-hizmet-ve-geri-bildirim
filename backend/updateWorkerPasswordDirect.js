require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const colors = require('colors');

// MongoDB bağlantısı - timeout değerini arttırıyorum
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 saniyeye çıkarıldı
  socketTimeoutMS: 45000, // 45 saniye
})
.then(() => console.log('MongoDB bağlantısı başarılı'.green.bold))
.catch(err => {
  console.error('MongoDB bağlantı hatası:'.red.bold, err);
  process.exit(1);
});

// Sabit değerler
const email = 'worker.altyapi@sehir.gov.tr';
const newPassword = 'worker123';

// Doğrudan veritabanını kullanarak şifreyi güncelle
const updatePasswordDirect = async () => {
  try {
    // Şifreyi hashle - ön tanımlı 10 gensalt ile
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Şifre hashlendi:', hashedPassword);
    
    // Doğrudan MongoDB koleksiyonundan güncelleme
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );
    
    if (result.matchedCount === 0) {
      console.log(`${email} ile kullanıcı bulunamadı!`.red);
      process.exit(1);
    }
    
    if (result.modifiedCount === 0) {
      console.log(`Şifre güncellenmedi - zaten aynı olabilir.`.yellow);
    } else {
      console.log(`Şifre başarıyla güncellendi!`.green.bold);
    }
    
    console.log('Yeni şifre:', newPassword);
    console.log('Hash:', hashedPassword);
    
    // Hash değerini doğrulamak için test
    const user = await mongoose.connection.db.collection('users').findOne({ email });
    if (user) {
      console.log('Veritabanındaki hash:', user.password);
      console.log('Hashler eşleşiyor mu:', user.password === hashedPassword);
      
      // Örnek şifre kontrolü
      const testMatch = await bcrypt.compare(newPassword, user.password);
      console.log('Şifre doğrulama testi:', testMatch ? 'BAŞARILI' : 'BAŞARISIZ');
    }
    
    // Veritabanı bağlantısını kapat
    mongoose.connection.close();
    console.log('İşlem tamamlandı!');
    
    process.exit(0);
  } catch (error) {
    console.error('Şifre güncelleme hatası:'.red.bold, error);
    process.exit(1);
  }
};

// Fonksiyonu çalıştır
updatePasswordDirect(); 