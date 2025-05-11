const mongoose = require('mongoose');
const User = require('./src/models/User');

// MongoDB bağlantısı - URI'yi doğrudan belirtiyoruz
const MONGODB_URI = 'mongodb://localhost:27017/yerel-hizmet-db';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

// Yönetici kullanıcı bilgileri
const adminUser = {
  name: 'Yönetici',
  email: 'ramo@gmail.com',
  password: 'admin123',
  phone: '5551234567',
  city: 'Niğde',
  district: 'Merkez',
  role: 'admin',
  isActive: true,
  isVerified: true
};

// Yönetici kullanıcı oluşturma fonksiyonu
const createAdmin = async () => {
  try {
    // E-posta adresine göre kullanıcı kontrolü
    const existingUser = await User.findOne({ email: adminUser.email });
    
    if (existingUser) {
      console.log('Bu e-posta adresine sahip bir kullanıcı zaten var.');
      
      // Mevcut kullanıcının rolünü admin olarak güncelle
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('Mevcut kullanıcının rolü admin olarak güncellendi.');
    } else {
      // Yeni admin kullanıcı oluştur
      const newAdmin = await User.create(adminUser);
      console.log('Yönetici kullanıcı başarıyla oluşturuldu:', newAdmin.email);
    }
    
    // İşlem tamamlandıktan sonra bağlantıyı kapat
    mongoose.connection.close();
  } catch (error) {
    console.error('Yönetici kullanıcı oluşturulurken hata:', error);
    mongoose.connection.close();
  }
};

// Fonksiyonu çalıştır
createAdmin(); 