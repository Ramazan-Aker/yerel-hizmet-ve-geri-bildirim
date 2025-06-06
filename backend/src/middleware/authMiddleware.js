﻿const jwt = require('jsonwebtoken');
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
  // Eğer Authorization header'ında yoksa, query params'tan kontrol et (rapor indirme için)
  else if (req.query && req.query.token) {
    token = req.query.token;
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

// Admin yetkisi kontrolü
exports.authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Sadece yöneticiler bu işlemi yapabilir'
    });
  }
  next();
};

// Belediye çalışanı yetkisi kontrolü
exports.authorizeMunicipalWorker = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'municipal_worker') {
    return res.status(403).json({
      success: false,
      message: 'Sadece belediye personeli bu işlemi yapabilir'
    });
  }
  next();
};

// Saha çalışanı yetkisi kontrolü
exports.authorizeWorker = (req, res, next) => {
  if (req.user.role !== 'worker' && req.user.role !== 'municipal_worker') {
    return res.status(403).json({
      success: false,
      message: 'Sadece saha çalışanları ve belediye personeli bu işlemi yapabilir'
    });
  }
  next();
};
