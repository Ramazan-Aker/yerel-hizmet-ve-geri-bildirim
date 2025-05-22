const Issue = require('../models/Issue');
const User = require('../models/User');

// Belediye çalışanının şehrine göre sorunları getir
exports.getIssuesByCity = async (req, res) => {
  try {
    // Çalışanın şehrini al
    const workerCity = req.user.city;
    
    if (!workerCity) {
      return res.status(400).json({
        success: false,
        message: 'Profil bilgilerinizde şehir bilgisi bulunamadı. Lütfen profil bilgilerinizi güncelleyin.'
      });
    }

    console.log(`Belediye çalışanı (${req.user.name}) ${workerCity} şehri için sorunları görüntülüyor.`);
    
    // Filtreleri al
    const { status, category, severity } = req.query;
    
    // Sorgu oluştur
    const query = { 'location.city': workerCity };
    
    // Opsiyonel filtreler
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (severity) {
      query.severity = severity;
    }
    
    // Şehre göre sorunları getir
    const issues = await Issue.find(query)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    console.error('Şehre göre sorunlar alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Şehre göre sorunlar alınırken bir hata oluştu'
    });
  }
};

// Belediye çalışanı için sorun detayı getir
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate({
        path: 'comments.user',
        select: 'name profileImage role'
      });
    
    // Sorun yoksa
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Çalışanın şehrine ait bir sorun mu kontrol et
    if (issue.location.city !== req.user.city) {
      return res.status(403).json({
        success: false,
        message: 'Bu soruna erişim izniniz yok - şehir uyuşmazlığı'
      });
    }
    
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Sorun detayları alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Sorun detayları alınırken bir hata oluştu'
    });
  }
};

// Belediye çalışanının şehrine göre çalışanları getir
exports.getWorkers = async (req, res) => {
  try {
    // Çalışanın şehrini al
    const workerCity = req.user.city;
    
    if (!workerCity) {
      return res.status(400).json({
        success: false,
        message: 'Profil bilgilerinizde şehir bilgisi bulunamadı'
      });
    }
    
    // Aynı şehirdeki worker rolündeki kullanıcıları getir
    const workers = await User.find({
      role: 'worker',
      city: workerCity,
      isActive: true
    }).select('name department city');
    
    res.status(200).json({
      success: true,
      count: workers.length,
      workers: workers
    });
  } catch (error) {
    console.error('Çalışanlar alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Çalışanlar alınırken bir hata oluştu'
    });
  }
};

// Sorun durumunu güncelle
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Durum belirtilmedi'
      });
    }
    
    // Geçerli durum değerleri
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri'
      });
    }
    
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Çalışanın şehrine ait bir sorun mu kontrol et
    if (issue.location.city !== req.user.city) {
      return res.status(403).json({
        success: false,
        message: 'Bu soruna erişim izniniz yok - şehir uyuşmazlığı'
      });
    }
    
    // Durumu güncelle
    issue.status = status;
    
    // Güncelleme kaydı ekle
    issue.updates.push({
      status,
      text: `Durum "${status}" olarak güncellendi.`,
      date: Date.now(),
      updatedBy: req.user._id
    });
    
    await issue.save();
    
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Durum güncellenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Durum güncellenirken bir hata oluştu'
    });
  }
};

// Resmi yanıt ekle
exports.addOfficialResponse = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Yanıt metni belirtilmedi'
      });
    }
    
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Çalışanın şehrine ait bir sorun mu kontrol et
    if (issue.location.city !== req.user.city) {
      return res.status(403).json({
        success: false,
        message: 'Bu soruna erişim izniniz yok - şehir uyuşmazlığı'
      });
    }
    
    // Resmi yanıt ekle veya güncelle
    issue.officialResponse = {
      response,
      date: Date.now(),
      respondedBy: req.user._id
    };
    
    // Güncelleme kaydı ekle
    issue.updates.push({
      status: issue.status,
      text: 'Resmi yanıt eklendi.',
      date: Date.now(),
      updatedBy: req.user._id
    });
    
    await issue.save();
    
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Resmi yanıt eklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Resmi yanıt eklenirken bir hata oluştu'
    });
  }
}; 