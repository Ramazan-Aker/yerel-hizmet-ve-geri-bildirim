const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB URI'nin tanımlı olup olmadığını kontrol et
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    console.log(`MONGODB_URI'ye bağlanılıyor: ${process.env.MONGODB_URI.substring(0, 25)}...`);
    
    // Mongoose bağlantısını kur
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`MongoDB bağlantısı başarılı: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Bağlantı Hatası: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB; 