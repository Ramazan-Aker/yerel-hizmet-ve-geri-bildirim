const mongoose = require('mongoose');

const IssueSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Başlık gerekli'],
      trim: true,
      maxlength: [100, 'Başlık 100 karakterden fazla olamaz']
    },
    description: {
      type: String,
      required: [true, 'Açıklama gerekli'],
      trim: true,
      maxlength: [1000, 'Açıklama 1000 karakterden fazla olamaz']
    },
    category: {
      type: String,
      required: [true, 'Kategori gerekli'],
      enum: [
        'Altyapı',
        'Üstyapı',
        'Çevre',
        'Ulaşım',
        'Güvenlik',
        'Temizlik',
        'Diğer'
      ]
    },
    status: {
      type: String,
      enum: ['Yeni', 'İnceleniyor', 'Çözüldü', 'Reddedildi'],
      default: 'Yeni'
    },
    severity: {
      type: String,
      enum: ['Düşük', 'Orta', 'Yüksek', 'Kritik'],
      default: 'Orta'
    },
    location: {
      address: {
        type: String,
        required: [true, 'Adres gerekli']
      },
      district: {
        type: String,
        required: [true, 'İlçe gerekli']
      },
      city: {
        type: String,
        required: [true, 'Şehir gerekli']
      },
      coordinates: {
        type: [Number],
        required: [true, 'Koordinatlar gerekli'],
        index: '2dsphere'
      }
    },
    images: [
      {
        type: String // Resim URL'leri
      }
    ],
    upvotes: {
      type: Number,
      default: 0
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    officialResponse: {
      response: {
        type: String,
        default: null
      },
      date: {
        type: Date,
        default: null
      },
      respondent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Issue', IssueSchema); 