const User = require('../models/User');
const Issue = require('../models/Issue');
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify');

// @desc    Tüm kullanıcıları getirme
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Kullanıcı detaylarını getirme
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

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

// @desc    Kullanıcı güncelleme
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    // Güvenlik için password alanını çıkar
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

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

// @desc    Kullanıcı silme
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Admin kendisini silemesin
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }

    await user.deleteOne();

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

// @desc    Bir kullanıcının rolünü değiştirme
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Rol belirtilmedi'
      });
    }

    const allowedRoles = ['user', 'municipal_worker', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

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

// @desc    Kullanıcı aktiflik durumunu değiştirme
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Admin kendisini deaktif edemez
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı deaktif edemezsiniz'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        isActive: user.isActive
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

// @desc    Dasboard istatistikleri
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Şehir bazlı filtreleme için
    let cityFilter = {};
    
    // Eğer kullanıcı super admin değilse ve bir şehir belirtilmişse, sadece o şehirdeki sorunları göster
    if (req.user.role !== 'admin' && req.user.city && req.user.city !== '') {
      console.log(`Şehir filtrelemesi yapılıyor: ${req.user.city}`);
      cityFilter = { 'location.city': req.user.city };
    }
    
    // Toplam kullanıcı sayısı
    const totalUsers = await User.countDocuments();
    
    // Kullanıcı tipleri
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Toplam sorun sayısı (şehir filtrelemesi ile)
    const totalIssues = await Issue.countDocuments(cityFilter);
    
    // Sorun durumları (şehir filtrelemesi ile)
    const issuesByStatus = await Issue.aggregate([
      { $match: cityFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Sorun kategorileri (şehir filtrelemesi ile)
    const issuesByCategory = await Issue.aggregate([
      { $match: cityFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Son eklenen 5 sorun (şehir filtrelemesi ile)
    const recentIssues = await Issue.find(cityFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name');
    
    // İlçelere göre sorunlar (şehir filtrelemesi ile)
    const issuesByDistrict = await Issue.aggregate([
      { $match: cityFilter },
      {
        $group: {
          _id: '$location.district',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: usersByRole
        },
        issues: {
          total: totalIssues,
          byStatus: issuesByStatus,
          byCategory: issuesByCategory,
          byDistrict: issuesByDistrict,
          recent: recentIssues
        }
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

// @desc    Sorun detaylarını getirme (admin için)
// @route   GET /api/admin/issues/:id
// @access  Private/Admin
exports.getIssueById = async (req, res) => {
  try {
    console.log(`Admin getIssueById çağrıldı, ID: ${req.params.id}`);
    console.log(`İstek yapan kullanıcı:`, req.user);
    
    // Önce sorunu bul
    const issue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate('comments.user', 'name profileImage')
      .populate('comments.replies.user', 'name profileImage')
      .populate('comments.likes', 'name')
      .populate('comments.replies.likes', 'name');

    console.log(`Sorgu sonucu:`, issue ? 'Sorun bulundu' : 'Sorun bulunamadı');
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }
    
    // Yönetici sadece kendi şehrindeki sorunları görebilir
    // Eğer yöneticinin şehri tanımlanmışsa ve sorunun şehriyle eşleşmiyorsa erişimi engelle
    if (req.user.role !== 'admin' && req.user.city && req.user.city !== '' && issue.location && issue.location.city !== req.user.city) {
      console.log(`Erişim engellendi: Yönetici (${req.user.city}) başka bir şehirdeki sorunu (${issue.location.city}) görüntüleyemez`);
      return res.status(403).json({
        success: false,
        message: 'Bu sorunu görüntüleme yetkiniz yok. Sadece kendi şehrinizdeki sorunları görüntüleyebilirsiniz.'
      });
    }
    
    // Super admin (role=admin) tüm sorunları görebilir
    console.log(`Erişim izni verildi: ${req.user.role === 'admin' ? 'Super admin tüm sorunları görebilir' : 'Yönetici kendi şehrindeki sorunu görüntülüyor'}`);

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('getIssueById hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Sorun durumunu güncelleme (admin için)
// @route   PUT /api/admin/issues/:id/status
// @access  Private/Admin
exports.updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Durum belirtilmedi'
      });
    }

    const allowedStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum'
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Durum güncellemesi
    issue.status = status;
    
    // Güncelleme kaydı ekle
    let statusText = '';
    switch(status) {
      case 'pending': statusText = 'Yeni'; break;
      case 'in_progress': statusText = 'İnceleniyor'; break;
      case 'resolved': statusText = 'Çözüldü'; break;
      case 'rejected': statusText = 'Reddedildi'; break;
    }
    
    issue.updates.push({
      status,
      text: `Sorun durumu "${statusText}" olarak güncellendi.`,
      date: Date.now(),
      updatedBy: req.user._id
    });

    await issue.save();
    
    // Güncel veriyi döndür
    const updatedIssue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate('comments.user', 'name profileImage')
      .populate('comments.replies.user', 'name profileImage')
      .populate('comments.likes', 'name')
      .populate('comments.replies.likes', 'name');

    res.status(200).json({
      success: true,
      data: updatedIssue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Resmi yanıt ekleme (admin için)
// @route   POST /api/admin/issues/:id/response
// @access  Private/Admin
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

    // Resmi yanıt ekle
    issue.officialResponses.push({
      text: response,
      respondent: req.user.name,
      date: Date.now()
    });

    // Güncelleme kaydı ekle
    issue.updates.push({
      status: issue.status,
      text: 'Resmi yanıt eklendi.',
      date: Date.now(),
      updatedBy: req.user._id
    });

    await issue.save();
    
    // Güncel veriyi döndür
    const updatedIssue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate('comments.user', 'name profileImage')
      .populate('comments.replies.user', 'name profileImage')
      .populate('comments.likes', 'name')
      .populate('comments.replies.likes', 'name');

    res.status(200).json({
      success: true,
      data: updatedIssue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Çalışan atama (admin için)
// @route   PUT /api/admin/issues/:id/assign
// @access  Private/Admin
exports.assignWorker = async (req, res) => {
  try {
    const { workerId } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Çalışan ID belirtilmedi'
      });
    }

    // Çalışanın varlığını kontrol et
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'municipal_worker') {
      return res.status(404).json({
        success: false,
        message: 'Geçerli bir belediye çalışanı bulunamadı'
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Sorun bulunamadı'
      });
    }

    // Çalışan ata
    issue.assignedWorker = workerId;
    
    // Durum inceleniyor olarak güncelle (eğer yeni durumundaysa)
    if (issue.status === 'pending') {
      issue.status = 'in_progress';
    }
    
    // Güncelleme kaydı ekle
    issue.updates.push({
      status: issue.status,
      text: `Sorun "${worker.name}" çalışanına atandı.`,
      date: Date.now(),
      updatedBy: req.user._id
    });

    await issue.save();
    
    // Güncel veriyi döndür
    const updatedIssue = await Issue.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedWorker', 'name department')
      .populate('comments.user', 'name profileImage')
      .populate('comments.replies.user', 'name profileImage')
      .populate('comments.likes', 'name')
      .populate('comments.replies.likes', 'name');

    res.status(200).json({
      success: true,
      data: updatedIssue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    Belediye çalışanlarını getir
// @route   GET /api/admin/workers
// @access  Private/Admin
exports.getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ 
      role: 'municipal_worker',
      isActive: true 
    }).select('name department');

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// @desc    İstatistiksel raporları getir
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReports = async (req, res) => {
  try {
    const { timeRange = 'last30days' } = req.query;
    
    // Zaman aralığı için filtre oluştur
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'last7days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last30days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last90days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'lastYear':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) 
          } 
        };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }
    
    // Şehir bazlı filtreleme için
    let cityFilter = {};
    
    // Eğer kullanıcı super admin değilse ve bir şehir belirtilmişse, sadece o şehirdeki sorunları göster
    if (req.user.role !== 'admin' && req.user.city && req.user.city !== '') {
      console.log(`Rapor için şehir filtrelemesi yapılıyor: ${req.user.city}`);
      cityFilter = { 'location.city': req.user.city };
    }
    
    // Tüm filtreleri birleştir
    const filter = { ...dateFilter, ...cityFilter };
    console.log('Rapor filtreleri:', filter);
    
    // Durum dağılımı
    const byStatus = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Kategori dağılımı
    const byCategory = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // İlçe dağılımı
    const byDistrict = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$location.district',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Şehir dağılımı
    const byCity = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Aylık dağılım
    const byMonth = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' }
                }
              }
            ]
          },
          name: {
            $let: {
              vars: {
                monthNames: [
                  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
                ]
              },
              in: {
                $concat: [
                  { $arrayElemAt: ['$$monthNames', { $subtract: ['$_id.month', 1] }] },
                  ' ',
                  { $toString: '$_id.year' }
                ]
              }
            }
          },
          count: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        byStatus,
        byCategory,
        byDistrict,
        byCity,
        byMonth
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

// Sonuca erişim kontrolü yardımcı fonksiyonu
const checkAccess = (req, res, issue) => {
  // Kullanıcı admin ise erişime izin ver
  if (req.user.role === 'admin') {
    return true;
  }
  
  // Kullanıcı belediye çalışanı ise ve şehri belirliyse
  if (req.user.role === 'municipal_worker' && req.user.city) {
    // Sorunun şehri ile kullanıcının şehri uyuşuyorsa erişime izin ver
    return issue.location.city.toLowerCase() === req.user.city.toLowerCase();
  }
  
  return false;
};

// @desc    PDF formatında rapor oluştur ve indir
// @route   GET /api/admin/reports/export/pdf
// @access  Private/Admin ve Municipal Worker
exports.exportReportPDF = async (req, res) => {
  try {
    const { timeRange = 'last30days', filterType = 'status' } = req.query;
    
    // Zaman filtresi oluştur
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'last7days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last30days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last90days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'lastYear':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) 
          } 
        };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }
    
    // Şehir filtreleme için
    let cityFilter = {};
    
    if (req.user.role !== 'admin' && req.user.city && req.user.city !== '') {
      cityFilter = { 'location.city': req.user.city };
    }
    
    // Filtreleri birleştir
    const filter = { ...dateFilter, ...cityFilter };
    
    // İstatistik verilerini al (seçilen filtre türüne göre)
    let aggregationResults;
    
    if (filterType === 'status') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
    } else if (filterType === 'category') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'district') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$location.district',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'city') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$location.city',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'monthly') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
    }
    
    // Toplam sorun sayısı
    const total = await Issue.countDocuments(filter);
    
    // PDF oluştur
    const doc = new PDFDocument();
    
    // Content-Type header'ını ayarla
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapor-${filterType}-${timeRange}.pdf`);
    
    // Stream PDF to the client
    doc.pipe(res);
    
    // PDF içeriğini oluştur
    doc.fontSize(25).text('Şehir Sorun Bildirimi Raporu', {
      align: 'center'
    });
    
    doc.moveDown();
    doc.fontSize(14).text(`Rapor Türü: ${filterType === 'status' ? 'Durum' : filterType === 'category' ? 'Kategori' : filterType === 'district' ? 'İlçe' : filterType === 'city' ? 'Şehir' : 'Aylık'} Dağılımı`, {
      align: 'left'
    });
    
    doc.fontSize(14).text(`Zaman Aralığı: ${timeRange === 'last7days' ? 'Son 7 Gün' : timeRange === 'last30days' ? 'Son 30 Gün' : timeRange === 'last90days' ? 'Son 90 Gün' : timeRange === 'lastYear' ? 'Son 1 Yıl' : 'Tüm Zamanlar'}`, {
      align: 'left'
    });
    
    doc.fontSize(14).text(`Toplam Sorun Sayısı: ${total}`, {
      align: 'left'
    });
    
    doc.moveDown();
    
    // Detaylı rapor 
    doc.fontSize(16).text('Detaylı İstatistikler', {
      align: 'center'
    });
    
    doc.moveDown();
    
    // Tablo başlıkları
    doc.fontSize(12).text(`${filterType === 'status' ? 'Durum' : filterType === 'category' ? 'Kategori' : filterType === 'district' ? 'İlçe' : filterType === 'city' ? 'Şehir' : 'Ay'}`, 50, doc.y, { width: 200 });
    doc.text('Sayı', 250, doc.y, { width: 100 });
    doc.text('Yüzde', 350, doc.y, { width: 100 });
    
    doc.moveDown();
    
    // Çizgi
    doc.moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
       
    doc.moveDown();
    
    // Tablo verileri
    if (aggregationResults && aggregationResults.length > 0) {
      
      if (filterType === 'monthly') {
        // Ay isimleri
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        aggregationResults.forEach(item => {
          const monthName = `${monthNames[item._id.month - 1]} ${item._id.year}`;
          const count = item.count;
          const percentage = ((count / total) * 100).toFixed(2);
          
          doc.fontSize(12).text(monthName, 50, doc.y, { width: 200 });
          doc.text(count.toString(), 250, doc.y, { width: 100 });
          doc.text(`%${percentage}`, 350, doc.y, { width: 100 });
          doc.moveDown();
        });
      } else {
        aggregationResults.forEach(item => {
          const name = item._id || 'Bilinmeyen';
          const count = item.count;
          const percentage = ((count / total) * 100).toFixed(2);
          
          doc.fontSize(12).text(name, 50, doc.y, { width: 200 });
          doc.text(count.toString(), 250, doc.y, { width: 100 });
          doc.text(`%${percentage}`, 350, doc.y, { width: 100 });
          doc.moveDown();
        });
      }
    } else {
      doc.text('Veri bulunamadı', { align: 'center' });
    }
    
    // Tarih ve bilgi
    doc.moveDown();
    doc.fontSize(10).text(`Rapor oluşturma tarihi: ${new Date().toLocaleDateString('tr-TR')}`, {
      align: 'center'
    });
    
    // PDF'i tamamla
    doc.end();
    
  } catch (error) {
    console.error('PDF rapor oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'PDF raporu oluşturulurken bir hata oluştu'
    });
  }
};

// @desc    CSV formatında rapor oluştur ve indir
// @route   GET /api/admin/reports/export/csv
// @access  Private/Admin ve Municipal Worker
exports.exportReportCSV = async (req, res) => {
  try {
    const { timeRange = 'last30days', filterType = 'status' } = req.query;
    
    // Zaman filtresi oluştur
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'last7days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last30days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'last90days':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'lastYear':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) 
          } 
        };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }
    
    // Şehir filtreleme için
    let cityFilter = {};
    
    if (req.user.role !== 'admin' && req.user.city && req.user.city !== '') {
      cityFilter = { 'location.city': req.user.city };
    }
    
    // Filtreleri birleştir
    const filter = { ...dateFilter, ...cityFilter };
    
    // İstatistik verilerini al (seçilen filtre türüne göre)
    let aggregationResults;
    
    if (filterType === 'status') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
    } else if (filterType === 'category') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'district') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$location.district',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'city') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$location.city',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);
    } else if (filterType === 'monthly') {
      aggregationResults = await Issue.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
    }
    
    // Toplam sorun sayısı
    const total = await Issue.countDocuments(filter);
    
    // CSV için veri hazırla
    let csvData = [];
    
    // CSV başlıkları
    let headers = [
      filterType === 'status' ? 'Durum' : 
      filterType === 'category' ? 'Kategori' : 
      filterType === 'district' ? 'İlçe' : 
      filterType === 'city' ? 'Şehir' : 'Ay',
      'Sayı',
      'Yüzde'
    ];
    
    csvData.push(headers);
    
    // Tablo verileri
    if (aggregationResults && aggregationResults.length > 0) {
      
      if (filterType === 'monthly') {
        // Ay isimleri
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        
        aggregationResults.forEach(item => {
          const monthName = `${monthNames[item._id.month - 1]} ${item._id.year}`;
          const count = item.count;
          const percentage = ((count / total) * 100).toFixed(2);
          
          csvData.push([monthName, count.toString(), `%${percentage}`]);
        });
      } else {
        aggregationResults.forEach(item => {
          const name = item._id || 'Bilinmeyen';
          const count = item.count;
          const percentage = ((count / total) * 100).toFixed(2);
          
          csvData.push([name, count.toString(), `%${percentage}`]);
        });
      }
    } else {
      csvData.push(['Veri bulunamadı', '0', '%0']);
    }
    
    // CSV'yi oluştur
    stringify(csvData, { header: false }, (err, output) => {
      if (err) {
        console.error('CSV oluşturma hatası:', err);
        return res.status(500).json({
          success: false,
          message: 'CSV dosyası oluşturulurken bir hata oluştu'
        });
      }
      
      // Content-Type header'ını ayarla
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=rapor-${filterType}-${timeRange}.csv`);
      
      // Send CSV
      res.send(output);
    });
    
  } catch (error) {
    console.error('CSV rapor oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'CSV raporu oluşturulurken bir hata oluştu'
    });
  }
};
