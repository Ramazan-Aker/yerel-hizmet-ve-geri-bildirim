require('dotenv').config({ path: __dirname + '/../.env' });

console.log('Environment variables loaded:');
console.log(`PORT: ${process.env.PORT}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'undefined'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '*****' : 'undefined'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Express app oluştur
const app = express();

// MongoDB bağlantısı
connectDB();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS yapılandırması
app.use(cors({
  origin: function(origin, callback) {
    // Tüm origins'e izin ver (güvenlik için dikkat edin)
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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
console.log(`PORT environment variable: ${process.env.PORT}`);
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});

// Hata yakalama
process.on('unhandledRejection', (err) => {
  console.log('İŞLENMEMİŞ HATA! 💥 Sunucu kapatılıyor...');
  console.log(err.name, err.message);
  process.exit(1);
}); 