const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Kimlik doğrulama middleware'i
exports.protect = async (req, res, next) => {
  let token;

  // Token kontrolü - Authorization header'ında Bearer token olarak
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Bearer token'dan token kısmını al
    token = req.headers.authorization.split(' ')[1];
  }

  // Token yoksa
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bu kaynağa erişmek için yetkiniz yok'
    });
  }

  try {
    // Token doğruluğunu kontrol et
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcıyı bul
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Kullanıcı aktif değilse erişimi engelle
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış'
      });
    }

    // İstek nesnesine kullanıcı bilgilerini ekle
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      success: false,
      message: 'Bu kaynağa erişmek için yetkiniz yok'
    });
  }
};

// Rol bazlı erişim kontrolü
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} rolündeki kullanıcılar bu işlemi yapamaz`
      });
    }
    next();
  };
};
