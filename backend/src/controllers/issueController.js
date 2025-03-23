const Issue = require('../models/Issue');
const User = require('../models/User');

// @desc    Yeni sorun bildirimi oluşturma
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      severity,
      location,
      images
    } = req.body;

    // Yeni sorun oluştur
    const issue = await Issue.create({
      title,
      description,
      category,
      severity,
      location,
      images,
      user: req.user.id
    });

    res.status(201).json({
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

// @desc    Tüm sorunları getirme (filtreleme ve sayfalama ile)
// @route   GET /api/issues
// @access  Public
exports.getIssues = async (req, res) => {
  try {
    // Sayfalama ve filtreleme
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
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
    
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    // Toplam sayı hesaplama
    const total = await Issue.countDocuments(filter);
    
    // Sorgu
    const issues = await Issue.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

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
    const issues = await Issue.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: issues.length,
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
