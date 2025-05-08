const mongoose = require('mongoose');

// Cevap (Reply) şeması
const ReplySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Cevap içeriği gerekli'],
      trim: true,
      maxlength: [500, 'Cevap 500 karakterden fazla olamaz']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  }
);

// Yorum (Comment) şeması
const CommentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Yorum içeriği gerekli'],
      trim: true,
      maxlength: [500, 'Yorum 500 karakterden fazla olamaz']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    replies: [ReplySchema]
  }
);

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
      enum: ['Yeni', 'İnceleniyor', 'Çözüldü', 'Reddedildi', 'pending', 'in_progress', 'resolved', 'rejected'],
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
      },
      directionInfo: {
        type: String,
        default: ''
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
    comments: [CommentSchema],
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