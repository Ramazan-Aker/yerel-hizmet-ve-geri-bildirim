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
const path = require('path');

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
  optionsSuccessStatus: 204,
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Helmet güvenlik middleware'i - crossOriginResourcePolicy ayarını değiştir
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(morgan('dev'));

// Statik dosyaları servis et
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`Statik dosyalar için uploads dizini: ${uploadsPath}`);

// API üzerinden uploads klasörüne erişim için proxy
app.use('/api/uploads', express.static(uploadsPath));
console.log(`API üzerinden uploads dizini için proxy: /api/uploads -> ${uploadsPath}`);

// Backend klasörü üzerinden erişim için
app.use('/backend/uploads', express.static(uploadsPath));
console.log(`Backend üzerinden uploads dizini için proxy: /backend/uploads -> ${uploadsPath}`);

// Route files
const authRoutes = require('./routes/auth');
const issueRoutes = require('./routes/issue');
const adminRoutes = require('./routes/admin');
const workerRoutes = require('./routes/worker');
const municipalRoutes = require('./routes/municipal');
const aiRoutes = require('./routes/ai');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/municipal', municipalRoutes);
app.use('/api/ai', aiRoutes);

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