const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT token oluşturma
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, city, district } = req.body;

    // Kullanıcı varmı diye kontrol et
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi zaten kullanılıyor'
      });
    }

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      email,
      password,
      city,
      district,
      role: 'user'
    });

    // Kullanıcıyı kaydet
    await user.save();

    // JWT token oluştur
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Kullanıcı bilgilerini döndür (şifre hariç)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      city: user.city,
      district: user.district,
      role: user.role,
      token: token
    };

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'Kayıt başarılı'
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında bir hata oluştu'
    });
  }
};

// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log gelen istekleri
    console.log('Login isteği alındı:', { email });

    // E-posta ve şifre kontrolü
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen e-posta ve şifre giriniz'
      });
    }

    // Kullanıcı varlığını kontrol et
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('Kullanıcı bulunamadı:', email);
      return res.status(401).json({
        success: false,
        message: 'E-posta adresi veya şifre hatalı'
      });
    }

    // Şifre doğruluğunu kontrol et
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log('Şifre eşleşmiyor:', email);
      return res.status(401).json({
        success: false,
        message: 'E-posta adresi veya şifre hatalı'
      });
    }

    // Kullanıcı aktifliğini kontrol et
    if (!user.isActive) {
      console.log('Hesap devre dışı:', email);
      return res.status(401).json({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış. Lütfen yönetici ile iletişime geçin.'
      });
    }

    // JWT token oluştur
    const token = generateToken(user._id);

    // Log başarılı girişi
    console.log('Kullanıcı girişi başarılı:', user._id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        district: user.district,
        token
      }
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Giriş yapmış kullanıcı bilgilerini getirme
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Şifre güncelleme
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen mevcut şifre ve yeni şifre giriniz'
      });
    }

    // Mevcut kullanıcıyı bul
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut şifre doğruluğunu kontrol et
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mevcut şifre hatalı'
      });
    }

    // Şifreyi güncelle
    user.password = newPassword;
    await user.save();

    // JWT token oluştur
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Kullanıcı profili güncelleme
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, city, district, address } = req.body;

    // Güncellenecek alanları kontrol et
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (city) updateFields.city = city;
    if (district) updateFields.district = district;
    if (address) updateFields.address = address;

    console.log('Updating user profile with fields:', updateFields);

    // Kullanıcıyı bul ve güncelle
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    console.log('Updated user:', user);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};
