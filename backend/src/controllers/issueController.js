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
  logger.info('Creating new issue with data:', {
    ...req.body,
    images: req.body.images ? `${req.body.images.length} images` : 'no images'
  });

  try {
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
        
        // Cloudinary konfigürasyonu kontrol et
        const isCloudinaryConfigured = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
        
        if (isCloudinaryConfigured) {
          // Process each base64 image and upload to Cloudinary
          const uploadPromises = images.map(async (imageData) => {
            if (!imageData.startsWith('data:image')) {
              logger.warn('Invalid image format, skipping');
              return null;
            }

            const result = await cloudinary.uploader.upload(imageData, {
              folder: 'issue_images',
              resource_type: 'image'
            });
            
            logger.info(`Uploaded image to Cloudinary: ${result.public_id}`);
            return result.secure_url;
          });

          const uploadResults = await Promise.all(uploadPromises);
          uploadedImageUrls = uploadResults.filter(url => url !== null);
          logger.info(`Successfully uploaded ${uploadedImageUrls.length} images`);
        } else {
          // Cloudinary olmadan, base64 resimlerini doğrudan kullan
          logger.info('Cloudinary konfigüre edilmemiş, resimler base64 olarak kaydedilecek');
          uploadedImageUrls = images.filter(img => img && img.startsWith('data:image'));
          
          // Base64 resimlerinin boyutunu kontrol et
          if (uploadedImageUrls.length > 0) {
            logger.info(`Base64 formatında ${uploadedImageUrls.length} resim işlendi`);
          }
        }
      } catch (imgError) {
        logger.error('Error uploading images to Cloudinary:', imgError);
        // Continue without images rather than failing the whole issue creation
      }
    }

    // Create new issue with uploaded image URLs
    const issue = new Issue({
      title,
      description,
      category,
      severity: severity || 'Orta',
      status: 'Yeni',
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
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the issue'
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
