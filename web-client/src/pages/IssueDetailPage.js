import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../hooks/useAuth';
import { issueService } from '../services/api'; // API servisi import ediyoruz

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Placeholder resimler için daha güvenilir bir kaynak kullan
const placeholderImage = 'https://placehold.co/800x600/eee/999?text=Resim+Yok';

// Status Renk Kodları
const statusColors = {
  'Yeni': 'bg-blue-100 text-blue-800',
  'İnceleniyor': 'bg-yellow-100 text-yellow-800',
  'Çözüldü': 'bg-green-100 text-green-800',
  'Reddedildi': 'bg-red-100 text-red-800',
  'pending': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800'
};

// Severity Renk Kodları
const severityColors = {
  'Düşük': 'bg-gray-100 text-gray-800',
  'Orta': 'bg-yellow-100 text-yellow-800',
  'Yüksek': 'bg-orange-100 text-orange-800',
  'Kritik': 'bg-red-100 text-red-800'
};

const IssueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Sorun detaylarını getiriyorum, ID:', id);
        const response = await issueService.getIssueById(id);
        
        if (response && response.data) {
          console.log('Sorun detayları alındı:', response.data);
          setIssue(response.data);
        } else {
          console.error('API yanıtında veri bulunamadı', response);
          setError('Sorun detayları alınamadı. Sunucudan geçersiz yanıt.');
        }
      } catch (err) {
        console.error('Sorun detayları alınırken hata:', err);
        setError(`Sorun detayları yüklenirken bir hata oluştu: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
    fetchIssue();
    } else {
      setError('Geçersiz sorun ID');
      setLoading(false);
    }
  }, [id]);

  const handleUpvote = async () => {
    try {
      const response = await issueService.upvoteIssue(id);
      if (response && response.data) {
        // API'den güncel sorun bilgilerini alalım
        const updatedIssue = await issueService.getIssueById(id);
        setIssue(updatedIssue.data);
      }
    } catch (err) {
      console.error('Oy verme hatası:', err);
      alert('Oy verme işlemi başarısız oldu: ' + (err.message || err));
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    setSubmittingComment(true);
    
    try {
      await issueService.addComment(id, comment);
      
      // Yorum ekledikten sonra güncel verileri yeniden yükle
      const response = await issueService.getIssueById(id);
      setIssue(response.data);
      
      setComment('');
    } catch (err) {
      console.error('Yorum gönderme hatası:', err);
      alert('Yorum gönderilirken bir hata oluştu: ' + (err.message || err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (commentId) => {
    if (!replyText.trim()) return;
    
    setSubmittingReply(true);
    
    try {
      // API'ye cevap gönder - backend'de buna uygun endpoint oluşturulmalı
      await issueService.addReply(id, commentId, replyText);
      
      // Güncel verileri yeniden yükle
      const response = await issueService.getIssueById(id);
      setIssue(response.data);
      
      // Form durumunu sıfırla
      setReplyTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Cevap gönderme hatası:', err);
      alert('Cevap gönderilirken bir hata oluştu: ' + (err.message || err));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      // API'ye beğeni gönder - backend'de buna uygun endpoint oluşturulmalı
      await issueService.likeComment(id, commentId);
      
      // Güncel verileri yeniden yükle
      const response = await issueService.getIssueById(id);
      setIssue(response.data);
    } catch (err) {
      console.error('Beğeni hatası:', err);
      alert('Yorum beğenilirken bir hata oluştu: ' + (err.message || err));
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time (e.g., "2 gün önce")
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Az önce';
    } else if (diffMin < 60) {
      return `${diffMin} dakika önce`;
    } else if (diffHour < 24) {
      return `${diffHour} saat önce`;
    } else if (diffDay < 30) {
      return `${diffDay} gün önce`;
    } else {
      return formatDate(dateString);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Sorun detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error || 'Sorun bulunamadı.'}</p>
        </div>
        <div className="mt-4">
          <Link
            to="/issues"
            className="text-blue-600 hover:text-blue-800"
          >
            &larr; Tüm Sorunlara Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600">Ana Sayfa</Link>
        <span className="mx-2">/</span>
        <Link to="/issues" className="hover:text-blue-600">Sorunlar</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{issue.title}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol kolon - Sorun Bilgileri */}
        <div className="lg:col-span-2">
          {/* Başlık ve İşlemler */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-3xl font-bold mb-2 md:mb-0">{issue.title}</h1>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpvote}
                className="bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center hover:bg-gray-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{issue.upvotes || 0}</span>
              </button>
              
              <button
                onClick={() => navigate('/issues')}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition"
              >
                Geri
              </button>
            </div>
          </div>
          
          {/* Durum ve Tarih Bilgileri */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[issue.status] || 'bg-gray-100 text-gray-800'}`}>
              {issue.status === 'pending' ? 'Yeni' : 
               issue.status === 'in_progress' ? 'İnceleniyor' :
               issue.status === 'resolved' ? 'Çözüldü' :
               issue.status === 'rejected' ? 'Reddedildi' : issue.status}
            </span>
            
            {issue.severity && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${severityColors[issue.severity] || 'bg-gray-100 text-gray-800'}`}>
                {issue.severity}
              </span>
            )}
            
            <span className="text-gray-500 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(issue.createdAt)}
            </span>
            
            <span className="text-gray-500 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {issue.user?.name || 'Bilinmeyen Kullanıcı'}
            </span>
          </div>
          
          {/* Görsel Galerisi */}
          {issue.images && issue.images.length > 0 && (
            <div className="mb-8">
              <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <img
                  src={issue.images[activeImageIndex] || placeholderImage} 
                  alt={`Sorun görseli ${activeImageIndex + 1}`}
                  className="w-full h-96 object-contain"
                  onError={(e) => { e.target.src = placeholderImage; }}
                  />
                </div>
                
                {issue.images.length > 1 && (
                <div className="flex mt-2 gap-2 overflow-x-auto pb-2">
                    {issue.images.map((img, index) => (
                    <div 
                      key={`thumb-${index}`} 
                      className={`w-24 h-24 rounded-md overflow-hidden cursor-pointer transition ${activeImageIndex === index ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = placeholderImage; }}
                        />
                    </div>
                    ))}
                  </div>
                )}
            </div>
          )}
          
          {/* Sorun Açıklaması */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Açıklama</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-700 whitespace-pre-line">{issue.description}</p>
            </div>
          </div>
          
          {/* Konum Bilgileri */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Konum</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              {issue.location ? (
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-700">
                        {issue.location.city && issue.location.district
                          ? `${issue.location.city}, ${issue.location.district}` 
                          : 'Şehir/İlçe bilgisi yok'}
                      </span>
                    </div>
                    
                    {issue.location.address && (
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-gray-700">{issue.location.address}</span>
                      </div>
                    )}
                    
                    {issue.location.directionInfo && (
                      <div className="flex items-start mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <div>
                          <span className="font-medium text-gray-700">Adres Tarifi:</span>
                          <p className="text-gray-700 whitespace-pre-line mt-1">{issue.location.directionInfo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Harita - koordinatlar varsa göster */}
                  {issue.location.coordinates && issue.location.coordinates.length === 2 && (
                    <div className="w-full md:w-96 h-64 overflow-hidden rounded-lg border border-gray-200 mt-4 md:mt-0">
                      <MapContainer 
                        center={[issue.location.coordinates[1], issue.location.coordinates[0]]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[issue.location.coordinates[1], issue.location.coordinates[0]]} />
                      </MapContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">Konum bilgisi bulunamadı.</p>
              )}
            </div>
          </div>
          
          {/* Çözüm Süreci ve Güncellemeler */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Çözüm Süreci</h2>
            
            <div className="relative pl-6 border-l-2 border-gray-200">
              {/* Assuming updates are not provided in the dummyIssue */}
            </div>
          </div>
          
          {/* Geri Düğmesi */}
          <div className="mb-8">
            <Link
              to="/issues"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Tüm Sorunlara Dön
            </Link>
          </div>
        </div>
        
        {/* Sağ kolon - Harita ve Ek Bilgiler */}
        <div>
          {/* Yorumlar Bölümü - Moved from main column to sidebar */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <h2 className="text-lg font-semibold p-4 border-b">Yorumlar {issue.comments && issue.comments.length > 0 && `(${issue.comments.length})`}</h2>
            <div className="p-4">
              {/* Yorum Formu */}
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full"
                        onError={(e) => { 
                          e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random'; 
                        }}
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-500">{user?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Yorumunuzu buraya yazın..."
                      className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submittingComment || !user}
                    ></textarea>
                    
                    {!user && (
                      <p className="text-sm text-red-500 mt-1">
                        Yorum yapabilmek için <Link to="/login" className="font-bold underline">giriş yapmalısınız</Link>.
                      </p>
                    )}
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={submittingComment || !comment.trim() || !user}
                      >
                        {submittingComment ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Gönderiliyor...
                          </>
                        ) : 'Gönder'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Yorumlar Listesi */}
              {issue.comments && issue.comments.length > 0 ? (
                <div className="space-y-6">
                  {issue.comments.map((comment, index) => (
                    <div key={comment._id || index} className="comment-container">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {comment.user?.profileImage ? (
                            <img 
                              src={comment.user.profileImage} 
                              alt={comment.user.name}
                              className="w-10 h-10 rounded-full" 
                              onError={(e) => { 
                                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.user.name) + '&background=random'; 
                              }}
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-500">{comment.user?.name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="flex-grow bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-sm">{comment.user?.name || 'Anonim Kullanıcı'}</span>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line">{comment.content || comment.text}</p>
                          
                          {/* Beğeni ve Yanıt butonları */}
                          <div className="flex mt-2 text-xs text-gray-500 space-x-4">
                            <button 
                              onClick={() => handleLikeComment(comment._id)}
                              className={`flex items-center hover:text-blue-600 ${comment.likes?.includes(user?._id) ? 'text-blue-600 font-medium' : ''}`}
                              disabled={!user}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill={comment.likes?.includes(user?._id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              {comment.likes?.length || 0} Beğeni
                            </button>
                            
                            <button 
                              onClick={() => user && setReplyTo(replyTo === comment._id ? null : comment._id)}
                              className="flex items-center hover:text-blue-600"
                              disabled={!user}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              Yanıtla
                            </button>
                          </div>
                          
                          {/* Yanıt formu */}
                          {replyTo === comment._id && (
                            <div className="mt-3 pl-3 border-l-2 border-gray-200">
                              <div className="flex space-x-2 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  {user?.profileImage ? (
                                    <img 
                                      src={user.profileImage} 
                                      alt={user.name} 
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => { 
                                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random'; 
                                      }}
                                    />
                                  ) : (
                                    <span className="text-sm font-bold text-gray-500">{user?.name?.charAt(0) || '?'}</span>
                                  )}
                                </div>
                                <div className="flex-grow">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`${comment.user?.name || 'Kullanıcı'}'ye yanıt yazın...`}
                                    className="w-full border border-gray-300 rounded-lg p-2 h-16 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={submittingReply}
                                  ></textarea>
                                  
                                  <div className="flex justify-end mt-1 space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => setReplyTo(null)}
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      İptal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitReply(comment._id)}
                                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={submittingReply || !replyText.trim()}
                                    >
                                      {submittingReply ? 'Gönderiliyor...' : 'Yanıtla'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Yanıtlar (varsa) */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-gray-200 space-y-3">
                              {comment.replies.map((reply, replyIndex) => (
                                <div key={reply._id || `reply-${index}-${replyIndex}`} className="flex space-x-2">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    {reply.user?.profileImage ? (
                                      <img 
                                        src={reply.user.profileImage} 
                                        alt={reply.user.name}
                                        className="w-8 h-8 rounded-full" 
                                        onError={(e) => { 
                                          e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reply.user.name) + '&background=random'; 
                                        }}
                                      />
                                    ) : (
                                      <span className="text-sm font-bold text-gray-500">{reply.user?.name?.charAt(0) || '?'}</span>
                                    )}
                                  </div>
                                  <div className="flex-grow bg-gray-100 rounded-lg p-3">
                                    <div className="flex items-center mb-1">
                                      <span className="font-medium text-xs">{reply.user?.name || 'Anonim Kullanıcı'}</span>
                                      <span className="mx-2 text-gray-300">•</span>
                                      <span className="text-xs text-gray-500">{formatRelativeTime(reply.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-line">{reply.content || reply.text}</p>
                                    
                                    {/* Yanıt beğeni butonu */}
                                    <div className="flex mt-1 text-xs text-gray-500">
                                      <button 
                                        onClick={() => handleLikeComment(reply._id, true)}
                                        className={`flex items-center hover:text-blue-600 ${reply.likes?.includes(user?._id) ? 'text-blue-600 font-medium' : ''}`}
                                        disabled={!user}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill={reply.likes?.includes(user?._id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                        </svg>
                                        {reply.likes?.length || 0} Beğeni
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-gray-500">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bildirim Yapan */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <h2 className="text-lg font-semibold p-4 border-b">Bildirim Yapan</h2>
            <div className="p-4">
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-gray-600 font-bold text-lg mr-3">
                  {issue.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{issue.user.name}</p>
                  <p className="text-sm text-gray-500">Vatandaş</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sorumlu Kişi */}
          {/* Assuming assignedTo is not provided in the dummyIssue */}
          
          {/* Benzer Sorunlar (İleride eklenebilir) */}
          {/* <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <h2 className="text-lg font-semibold p-4 border-b">Benzer Sorunlar</h2>
            <div className="p-4">
              ...
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default IssueDetailPage; 