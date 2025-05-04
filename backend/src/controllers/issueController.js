const Issue = require('../models/Issue');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Cloudinary konfigürasyonu
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true
});

// @desc    Yeni sorun bildirimi oluşturma
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res) => {
  const logger = req.logger || console;
  
  try {
    // Request body'sinin boyutunu kontrol et (debug için)
    const requestSize = JSON.stringify(req.body).length;
    logger.info(`Request size: ${Math.round(requestSize / 1024)} KB`);
    
    // 10MB'dan büyük istekleri reddet
    if (requestSize > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: 'İstek boyutu çok büyük. Lütfen daha küçük boyutlu fotoğraflar yükleyin.'
      });
    }
    
  logger.info('Creating new issue with data:', {
    ...req.body,
    images: req.body.images ? `${req.body.images.length} images` : 'no images'
  });

    const { title, description, category, severity, location, images } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, and location are required'
      });
    }

    // Validate location data
    if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates must be an array with longitude and latitude'
      });
    }

    // Add type to location if not provided
    const formattedLocation = {
      ...location,
      type: location.type || 'Point'
    };

    // Process images if provided
    let uploadedImageUrls = [];
    if (images && images.length > 0) {
      try {
        logger.info(`Processing ${images.length} images`);
        
        // Her bir görüntünün boyutunu kontrol et (debug için)
        images.forEach((img, index) => {
          if (img && typeof img === 'string') {
            const formatInfo = img.substring(0, 20); // Format bilgisini göster
            logger.info(`Image ${index + 1} format: ${formatInfo}..., size: ~${Math.round(img.length / 1024)} KB`);
          } else {
            logger.warn(`Image ${index + 1} is not a valid string`);
          }
        });
        
        // Maksimum 3 görüntü ile sınırla
        const limitedImages = images.slice(0, 3);
        logger.info(`Limited to ${limitedImages.length} images`);
        
        // Geçerli formatları filtrele
        const validImages = limitedImages.filter(img => 
          img && 
          typeof img === 'string' && 
          (img.startsWith('data:image/jpeg') || 
           img.startsWith('data:image/jpg') || 
           img.startsWith('data:image/png'))
        );
        
        if (validImages.length < limitedImages.length) {
          logger.warn(`Filtered out ${limitedImages.length - validImages.length} images with invalid format`);
        }
        
        // Cloudinary konfigürasyonu kontrol et
        const isCloudinaryConfigured = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
        
        if (isCloudinaryConfigured) {
          // Process each base64 image and upload to Cloudinary
          logger.info('Uploading images to Cloudinary...');
          
          const uploadPromises = validImages.map(async (imageData, index) => {
            try {
              // Görüntü formatını belirle
              let format = 'jpg'; // Varsayılan
              if (imageData.startsWith('data:image/png')) {
                format = 'png';
            }

            const result = await cloudinary.uploader.upload(imageData, {
              folder: 'issue_images',
                resource_type: 'image',
                format: format // Format bilgisini Cloudinary'ye aktar
            });
            
              logger.info(`Uploaded image ${index + 1} to Cloudinary: ${result.public_id}, format: ${format}`);
            return result.secure_url;
            } catch (uploadError) {
              logger.error(`Error uploading image ${index + 1} to Cloudinary:`, uploadError);
              return null;
            }
          });

          const uploadResults = await Promise.all(uploadPromises);
          uploadedImageUrls = uploadResults.filter(url => url !== null);
          logger.info(`Successfully uploaded ${uploadedImageUrls.length} images to Cloudinary`);
        } else {
          // Cloudinary olmadan base64 resimlerini kullan, ancak boyutu sınırla
          logger.info('Cloudinary konfigüre edilmemiş, resimler base64 olarak kaydedilecek');
          
          // Mevcut formatlarını koru
          uploadedImageUrls = validImages.map(img => {
            // Görüntü boyutu kontrolü yap
            if (img.length > 500 * 1024) { // 500KB'dan büyükse uyarı ver
              logger.warn('Büyük görüntü tespit edildi, performans sorunları yaşanabilir');
            }
            return img;
          });
          
            logger.info(`Base64 formatında ${uploadedImageUrls.length} resim işlendi`);
        }
      } catch (imgError) {
        logger.error('Error processing images:', imgError);
        // Görüntü işleme hatalarında boş bir dizi ile devam et
        uploadedImageUrls = [];
      }
    }

    // Create new issue with uploaded image URLs
    const issue = new Issue({
      title,
      description,
      category,
      severity: severity || 'Orta',
      status: 'pending', // İngilizce status değerini kullan (Yeni -> pending)
      location: formattedLocation,
      user: userId,
      images: uploadedImageUrls,
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await issue.save();
    logger.info(`Issue created successfully with ID: ${issue._id}`);

    // Populate reporter information for response
    const populatedIssue = await Issue.findById(issue._id).populate('user', 'name email');

    return res.status(201).json({
      success: true,
      data: populatedIssue
    });
  } catch (error) {
    logger.error('Error creating issue:', error);
    
    // Daha spesifik hata mesajları
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama hatası: ' + Object.values(error.errors).map(val => val.message).join(', ')
      });
    } else if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Aynı bilgilerle daha önce kayıt açılmış'
      });
    } else if (error.message && error.message.includes('payload too large')) {
      return res.status(413).json({
        success: false,
        message: 'Yüklenen fotoğraflar çok büyük. Lütfen daha küçük boyutlu veya daha az sayıda fotoğraf kullanın.'
      });
    }
    
    // Görüntülerle ilgili olabilecek diğer hatalar
    if (error.message && error.message.toLowerCase().includes('image')) {
      return res.status(400).json({
        success: false,
        message: 'Fotoğraf işlenirken hata oluştu. Desteklenen formatlar: JPG ve PNG. Lütfen farklı bir fotoğraf deneyin.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Sorun oluşturulurken bir hata meydana geldi. Lütfen daha sonra tekrar deneyin.'
    });
  }
};

// @desc    Tüm sorunları getirme (filtreleme ve sayfalama ile)
// @route   GET /api/issues
// @access  Public
exports.getIssues = async (req, res) => {
  try {
    // Sayfalama ve filtreleme
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100; // Limit artırıldı
    const startIndex = (page - 1) * limit;

    // Filtreleme parametreleri
    const filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.district) {
      filter['location.district'] = req.query.district;
    }
    
    // Şehir filtresi kaldırıldı - tüm şehirler gösterilecek
    
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    console.log('Uygulanan filtreler:', filter);

    // Toplam sayı hesaplama
    const total = await Issue.countDocuments(filter);
    
    // Sorgu
    const issues = await Issue.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    console.log(`${issues.length} sorun bulundu.`);

    // Sayfalama bilgisi
    const pagination = {
      current: page,
      total: Math.ceil(total / limit),
      count: issues.length
    };

    res.status(200).json({
      success: true,
      pagination,
      data: issues
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Tek bir sorunu getirme
// @route   GET /api/issues/:id
// @access  Public
exports.getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('user', 'name')
      .populate('assignedTo', 'name role')
      .populate('officialResponse.respondent', 'name role');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Sorun güncelleme
// @route   PUT /api/issues/:id
// @access  Private
exports.updateIssue = async (req, res) => {
  try {
    let issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Yetki kontrolü - sadece oluşturan kullanıcı veya yönetici/memur
    if (
      issue.user.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'municipal_worker'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    // Kullanıcılar sadece belirli alanları güncelleyebilir
    const allowedUpdates = {};
    
    if (req.user.role === 'user') {
      // Normal kullanıcılar sadece başlık, açıklama ve görselleri güncelleyebilir
      if (req.body.title) allowedUpdates.title = req.body.title;
      if (req.body.description) allowedUpdates.description = req.body.description;
      if (req.body.images) allowedUpdates.images = req.body.images;
    } else {
      // Yöneticiler ve memurlar her şeyi güncelleyebilir
      Object.keys(req.body).forEach(key => {
        if (key !== 'user') { // kullanıcı sahibi değiştirilemez
          allowedUpdates[key] = req.body[key];
        }
      });
    }

    // Güncelleme
    issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Sorunu silme
// @route   DELETE /api/issues/:id
// @access  Private
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Yetki kontrolü - sadece oluşturan kullanıcı veya yönetici
    if (issue.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    await issue.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Belediye çalışanının sorun durumunu güncelleme
// @route   PUT /api/issues/:id/status
// @access  Private/Municipal
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, officialResponse } = req.body;

    let issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Yetki kontrolü - sadece yönetici/memur
    if (req.user.role !== 'admin' && req.user.role !== 'municipal_worker') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz yok'
      });
    }

    // Statusü güncelle
    issue.status = status;
    
    // Resmi cevap ekle
    if (officialResponse) {
      issue.officialResponse = {
        response: officialResponse,
        date: Date.now(),
        respondent: req.user.id
      };
    }

    // Çözümleyen kişi
    if (status === 'Çözüldü' && !issue.assignedTo) {
      issue.assignedTo = req.user.id;
    }

    await issue.save();

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Sorun için oy verme
// @route   PUT /api/issues/:id/upvote
// @access  Private
exports.upvoteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Upvote sayısını artır
    issue.upvotes = issue.upvotes + 1;
    await issue.save();

    res.status(200).json({
      success: true,
      data: { upvotes: issue.upvotes }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Kullanıcının kendi sorunlarını getirme
// @route   GET /api/issues/myissues
// @access  Private
exports.getMyIssues = async (req, res) => {
  try {
    console.log('Kullanıcı kendi sorunlarını görüntülüyor, ID:', req.user.id);
    
    const issues = await Issue.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    console.log(`Kullanıcı için ${issues.length} sorun bulundu`);
    
    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    console.error('Kullanıcı sorunları alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};
