const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const connectDB = require('./config/db');

// Express app oluştur
const app = express();

// MongoDB bağlantısı
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rotalar
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issue'));
app.use('/api/admin', require('./routes/admin'));
// app.use('/api/users', require('./routes/users'));

// Temel rota
app.get('/', (req, res) => {
  res.json({ message: 'Şehir Sorun Bildirimi ve Takip Sistemi API' });
});

// Port dinleme
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

// Hata yakalama
process.on('unhandledRejection', (err) => {
  console.log('İŞLENMEMİŞ HATA! 💥 Sunucu kapatılıyor...');
  console.log(err.name, err.message);
  process.exit(1);
}); 