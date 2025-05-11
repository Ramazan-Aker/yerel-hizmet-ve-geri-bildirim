require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

// Komut satırı argümanlarını al
const args = process.argv.slice(2);
const email = args[0];
const city = args[1] || 'İstanbul';
const district = args[2] || 'Merkez';
const department = args[3] || ''; // Departman opsiyonel

// Argüman kontrolü
if (!email) {
  console.error('Kullanım: node createWorker.js <email> [city] [district] [department]');
  console.error('Örnek: node createWorker.js worker@example.com İstanbul Kadıköy');
  process.exit(1);
}

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch(err => {
  console.error('MongoDB bağlantı hatası:', err);
  process.exit(1);
});

// Belediye çalışanı oluştur
const createWorker = async () => {
  try {
    // Kullanıcının var olup olmadığını kontrol et
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      // Kullanıcı varsa, rolünü güncelle
      existingUser.role = 'municipal_worker';
      existingUser.city = city;
      existingUser.district = district;
      
      // Departman belirtilmişse ekle
      if (department) {
        existingUser.department = department;
      }
      
      await existingUser.save();
      console.log(`Kullanıcı ${email} belediye çalışanı olarak güncellendi.`);
    } else {
      // Yeni belediye çalışanı oluştur
      const newWorker = new User({
        name: `${city} Sorun İnceleme Görevlisi`,
        email,
        password: 'worker123', // Varsayılan şifre
        city,
        district,
        department,
        role: 'municipal_worker',
        isActive: true,
        isVerified: true
      });
      
      await newWorker.save();
      console.log(`Yeni sorun inceleme görevlisi oluşturuldu: ${email}`);
      console.log('Varsayılan şifre: worker123');
    }
    
    // Mevcut belediye çalışanlarını listele
    const workers = await User.find({ role: 'municipal_worker' });
    console.log('\nMevcut Sorun İnceleme Görevlileri:');
    workers.forEach(worker => {
      console.log(`- ${worker.name} (${worker.email}) - ${worker.city || 'Şehir belirtilmemiş'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
};

createWorker(); 