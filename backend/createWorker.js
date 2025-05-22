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

// Kategori listesi
const categories = [
  'Altyapı',
  'Üstyapı',
  'Çevre',
  'Ulaşım',
  'Güvenlik',
  'Temizlik',
  'Diğer'
];

// Sabit değerler
const city = 'İstanbul';
const district = 'Merkez';
const password = 'worker123'; // Tüm çalışanlar için aynı şifre

// Worker kullanıcıları oluştur
const createWorkers = async () => {
  try {
    let createdCount = 0;
    let existingCount = 0;
    
    // Her kategori için bir worker oluştur
    for (const category of categories) {
      // Standardize edilmiş email formatı
      const email = `worker.${category.toLowerCase().replace(/\s+/g, '').replace(/ı/g, 'i').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c')}@sehir.gov.tr`;
      
      // Çalışan adı formatı
      const name = `${category} Çalışanı`;
      
      // Telefon numarası formatı (örnek)
      const phone = `555-${Math.floor(1000 + Math.random() * 9000)}`; // Rastgele 4 haneli
      
      // Kullanıcı zaten var mı kontrol et
      const userExists = await User.findOne({ email: email });
      
      if (userExists) {
        console.log(`${email} adresi ile bir kullanıcı zaten mevcut!`.yellow);
        existingCount++;
        continue;
      }
      
      // Şifreyi hashle
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Worker nesnesi oluştur
      const workerData = {
        name: name,
        email: email,
        password: hashedPassword,
        phone: phone,
        city: city,
        district: district,
        department: category,
        role: 'worker',
        isActive: true,
        isVerified: true,
      };
      
      // Kullanıcıyı oluştur
      const createdUser = await User.create(workerData);
      
      console.log(`${category} için saha çalışanı başarıyla oluşturuldu:`.green);
      console.log({
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        department: createdUser.department
      });
      
      createdCount++;
    }
    
    console.log('\n=== ÖZET ==='.bold);
    console.log(`Toplam ${createdCount} yeni çalışan oluşturuldu.`.green.bold);
    console.log(`Toplam ${existingCount} çalışan zaten mevcuttu.`.yellow.bold);
    console.log('\nTüm çalışanlar için şifre:'.cyan.bold, password);
    
    process.exit(0);
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:'.red.bold, error);
    process.exit(1);
  }
};

// Fonksiyonu çalıştır
createWorkers(); 