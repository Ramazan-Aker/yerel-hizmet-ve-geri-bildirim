const Issue = require('../models/Issue');
const path = require('path');
const fs = require('fs');

// Çalışana atanmış tüm sorunları getir
exports.getAssignedIssues = async (req, res) => {
  try {
    console.log('getAssignedIssues çağrıldı. Kullanıcı bilgileri:', {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      city: req.user.city
    });
    
    const issues = await Issue.find({ assignedWorker: req.user.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    console.log(`Kullanıcı ${req.user.id} için ${issues.length} atanmış sorun bulundu`);
    console.log('Bulunan sorunlar:', issues.map(issue => ({
      id: issue._id,
      title: issue.title,
      assignedWorker: issue.assignedWorker,
      status: issue.status
    })));

    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    console.error('Atanan sorunlar alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Atanan sorunlar alınırken bir hata oluştu'
    });
  }
};

// Çalışan istatistiklerini getir
exports.getWorkerStats = async (req, res) => {
  try {
    // Tüm atanan sorunlar
    const assignedIssues = await Issue.countDocuments({ assignedWorker: req.user.id });
    
    // Duruma göre sayıları hesapla
    const pendingIssues = await Issue.countDocuments({ 
      assignedWorker: req.user.id,
      status: 'pending'
    });
    
    const inProgressIssues = await Issue.countDocuments({
      assignedWorker: req.user.id,
      status: 'in_progress'
    });
    
    const resolvedIssues = await Issue.countDocuments({
      assignedWorker: req.user.id,
      status: 'resolved'
    });
    
    // Toplam yüklenen fotoğraf sayısı
    let totalPhotosUploaded = 0;
    const issues = await Issue.find({ assignedWorker: req.user.id });
    issues.forEach(issue => {
      if (issue.progressPhotos && issue.progressPhotos.length > 0) {
        totalPhotosUploaded += issue.progressPhotos.length;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        assignedIssues,
        pendingIssues,
        inProgressIssues,
        resolvedIssues,
        totalPhotosUploaded
      }
    });
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken bir hata oluştu'
    });
  }
};

// Son atanan sorunları getir
exports.getRecentAssignedIssues = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const issues = await Issue.find({ assignedWorker: req.user.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues
    });
  } catch (error) {
    console.error('Son atanan sorunlar alınırken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Son atanan sorunlar alınırken bir hata oluştu'
    });
  }
};

// Sorun detaylarını getir
exports.getWorkerIssueById = async (req, res) => {
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
    
    // Bu çalışana atanmış mı kontrolü
    if (issue.assignedWorker && issue.assignedWorker._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu soruna erişim izniniz yok'
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

// Sorun durumunu güncelle
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log('Worker status update request:', { status, userId: req.user.id });
    
    // Status doğrulama
    if (!status || !['in_progress', 'resolved'].includes(status)) {
      console.log('Invalid status value:', status);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum değeri. "in_progress" veya "resolved" olmalıdır'
      });
    }
    
    const issue = await Issue.findById(req.params.id);
    
    // Sorun yoksa
    if (!issue) {
      console.log('Issue not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Bu çalışana atanmış mı kontrolü
    if (!issue.assignedWorker || issue.assignedWorker.toString() !== req.user.id) {
      console.log('Worker not assigned to issue:', {
        issueId: req.params.id,
        assignedWorker: issue.assignedWorker,
        workerId: req.user.id
      });
      return res.status(403).json({
        success: false,
        message: 'Bu sorunu güncelleme izniniz yok'
      });
    }
    
    // Durumu güncelle
    issue.status = status;
    
    // Güncelleme kaydı ekle
    issue.updates.push({
      status,
      text: status === 'in_progress' 
        ? 'Sorun inceleniyor' 
        : 'Sorun çözüldü',
      date: Date.now(),
      updatedBy: req.user._id // 'user' yerine 'updatedBy' alanını kullan
    });
    
    console.log('Saving updated issue:', { 
      issueId: issue._id, 
      newStatus: status,
      updates: issue.updates.length
    });
    
    await issue.save();
    
    console.log('Issue status updated successfully');
    
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Durum güncellenirken bir hata oluştu'
    });
  }
};

// Çözüm fotoğraflarını yükle
exports.uploadProgressPhotos = async (req, res) => {
  try {
    // Dosya kontrolü
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen en az bir fotoğraf yükleyin'
      });
    }
    
    const issue = await Issue.findById(req.params.id);
    
    // Sorun yoksa
    if (!issue) {
      // Yüklenen dosyaları temizle
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Bu çalışana atanmış mı kontrolü
    if (!issue.assignedWorker || issue.assignedWorker.toString() !== req.user.id) {
      // Yüklenen dosyaları temizle
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      
      return res.status(403).json({
        success: false,
        message: 'Bu soruna fotoğraf ekleme izniniz yok'
      });
    }
    
    // Dosyaları URL'lere dönüştür ve ekle
    const photoUrls = req.files.map(file => {
      const fileUrl = `/uploads/progress/${file.filename}`;
      
      return {
        url: fileUrl,
        uploadedBy: req.user.id,
        uploadedAt: Date.now()
      };
    });
    
    // Fotoğrafları ekle
    if (!issue.progressPhotos) {
      issue.progressPhotos = [];
    }
    
    issue.progressPhotos.push(...photoUrls);
    
    // Durum göncelleme - İlk fotoğraf eklendiğinde durumu "in_progress" olarak ayarla
    if (issue.status === 'pending') {
      issue.status = 'in_progress';
      
      // Güncelleme kaydı ekle
      issue.updates.push({
        status: 'in_progress',
        text: 'Sorun inceleniyor. Çalışan fotoğraf yükledi.',
        date: Date.now(),
        updatedBy: req.user._id // 'user' yerine 'updatedBy' alanını kullan
      });
    }
    
    await issue.save();
    
    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Fotoğraflar yüklenirken hata:', error);
    
    // Hata durumunda dosyaları temizle
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Fotoğraflar yüklenirken bir hata oluştu'
    });
  }
};

// Yorum ekle
exports.addWorkerComment = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Yorum içeriği boş olamaz'
      });
    }
    
    const issue = await Issue.findById(req.params.id);
    
    // Sorun yoksa
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Bu çalışana atanmış mı kontrolü
    if (!issue.assignedWorker || issue.assignedWorker.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu soruna yorum ekleme izniniz yok'
      });
    }
    
    // Yorumu ekle
    issue.comments.push({
      content,
      user: req.user.id,
      createdAt: Date.now()
    });
    
    await issue.save();
    
    // Detaylı veriyi döndür
    const updatedIssue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate({
        path: 'comments.user',
        select: 'name profileImage role'
      });
    
    res.status(200).json({
      success: true,
      data: updatedIssue
    });
  } catch (error) {
    console.error('Yorum eklenirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Yorum eklenirken bir hata oluştu'
    });
  }
}; 