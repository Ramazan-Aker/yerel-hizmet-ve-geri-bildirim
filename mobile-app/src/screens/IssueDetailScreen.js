import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, TouchableWithoutFeedback, TextInput, KeyboardAvoidingView, Dimensions } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/tr';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

moment.locale('tr');

// Ekran genişliğini alalım
const { width } = Dimensions.get('window');

// Önbellek anahtarı oluşturan yardımcı fonksiyon
const getCacheKey = (issueId) => `issue_cache_${issueId}`;

const IssueDetailScreen = ({ route, navigation }) => {
  // Route parametrelerini al (yedek verilerle birlikte)
  const { issueId, issueTitle, issueStatus } = route.params;
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  
  // Fotoğraf görüntüleme state'leri
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Harita görüntüleme state'i
  const [mapModalVisible, setMapModalVisible] = useState(false);
  
  // Yorum state'leri
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [addingReply, setAddingReply] = useState(false);
  const [likingComment, setLikingComment] = useState(false);

  // Debug bilgisi
  useEffect(() => {
    console.log(`IssueDetailScreen: ${issueId} ID'li sorunu görüntülüyorum`);
    console.log('Oturum kullanıcısı:', user ? user.name : 'Giriş yapılmamış');
    console.log('Yedek başlık:', issueTitle);
    console.log('Yedek durum:', issueStatus);
  }, [issueId, user, issueTitle, issueStatus]);

  useEffect(() => {
    fetchIssueDetails();
  }, [issueId, retryAttempt]);

  // Önbellekten veri yükleme fonksiyonu
  const loadFromCache = async () => {
    try {
      const cacheKey = getCacheKey(issueId);
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const maxCacheAge = 5 * 60 * 1000; // 5 dakika
        
        // Önbellek geçerli mi kontrol et
        if (cacheAge < maxCacheAge) {
          console.log(`Önbellekten veri yükleniyor (${Math.round(cacheAge / 1000)} saniye önce kaydedilmiş)`);
          setIssue(data);
          setUsingCache(true);
          setUsingFallback(false);
          return true;
        } else {
          console.log('Önbellek süresi dolmuş, yeni veri alınacak');
        }
      }
      return false;
    } catch (error) {
      console.error('Önbellek okuma hatası:', error);
      return false;
    }
  };

  // Önbelleğe veri kaydetme fonksiyonu
  const saveToCache = async (data) => {
    try {
      const cacheKey = getCacheKey(issueId);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('Veri önbelleğe kaydedildi');
    } catch (error) {
      console.error('Önbellek yazma hatası:', error);
    }
  };

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError(null);
    
    // Önce önbellekten yüklemeyi dene
    const cachedDataLoaded = await loadFromCache();
    if (cachedDataLoaded) {
      setLoading(false);
      
      // Arka planda güncel veriyi de getir
      fetchFreshData();
      return;
    }
    
    try {
      console.log(`Sorun detaylarını getiriyorum, ID: ${issueId}`);
      
      // API'den sorun detaylarını al
      const response = await api.issues.getById(issueId);
      
      if (response.success && response.data) {
        // Veriyi kullanmadan önce kontrol et
        const issueData = response.data;
        
        // Resmi yanıtları düzenleyelim
        // Resmi yanıtları tutacak bir dizi oluşturalım
        let allResponses = [];
        
        // 1. officialResponse objesi varsa bunu işle
        if (issueData.officialResponse) {
          if (typeof issueData.officialResponse === 'object') {
            console.log('Tekil resmi yanıt (nesne):', JSON.stringify(issueData.officialResponse).substring(0, 100));
            
            // Standart formata dönüştür
            const standardResponse = {
              text: issueData.officialResponse.response || issueData.officialResponse.text || '',
              date: issueData.officialResponse.createdAt || issueData.officialResponse.date || new Date(),
              respondent: issueData.officialResponse.respondedBy?.name || 
                         issueData.officialResponse.respondent?.name || 
                         issueData.officialResponse.respondent || 'Yetkili'
            };
            
            // Sadece içeriği varsa ekle
            if (standardResponse.text) {
              allResponses.push(standardResponse);
            }
          } else if (typeof issueData.officialResponse === 'string' && issueData.officialResponse.trim()) {
            console.log('Tekil resmi yanıt (string):', issueData.officialResponse.substring(0, 50));
            
            // String yanıtı objeye dönüştür
            allResponses.push({
              text: issueData.officialResponse,
              date: issueData.updatedAt || issueData.createdAt || new Date(),
              respondent: 'Yetkili'
            });
          }
        }
        
        // 2. officialResponses dizisi varsa işle
        if (issueData.officialResponses && Array.isArray(issueData.officialResponses) && issueData.officialResponses.length > 0) {
          console.log(`${issueData.officialResponses.length} adet resmi yanıt mevcut`);
          
          // Her bir yanıtı standart formata dönüştürerek ekle
          issueData.officialResponses.forEach((response, index) => {
            if (response && (response.text || response.response)) {
              allResponses.push({
                text: response.text || response.response || '',
                date: response.date || response.createdAt || new Date(),
                respondent: response.respondent || 'Yetkili'
              });
            }
          });
        }
        
        // Yanıtları tarihe göre sırala (en yeni en üstte)
        allResponses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`Toplam ${allResponses.length} adet resmi yanıt düzenlendi`);
        
        // Veri tutarlılığı kontrolü
        // Eğer sorun çözülmüş/reddedilmiş ama hiç resmi yanıt yoksa, otomatik bir yanıt ekleyerek kullanıcı deneyimini artıralım
        if ((issueData.status === 'resolved' || issueData.status === 'rejected' || 
             issueData.status === 'solved' || issueData.status === 'çözüldü' || 
             issueData.status === 'reddedildi') && allResponses.length === 0) {
             
          console.log('Otomatik resmi yanıt ekleniyor (çözülmüş/reddedilmiş sorun için)');
          
          // Otomatik yanıt oluştur
          const autoResponse = {
            text: issueData.status === 'resolved' || issueData.status === 'solved' || issueData.status === 'çözüldü'
              ? 'Bu sorun yetkililer tarafından çözülmüştür.' 
              : 'Bu sorun yetkililer tarafından reddedilmiştir.',
            date: issueData.updatedAt || issueData.createdAt || new Date(),
            respondent: 'Sistem'
          };
          
          // Yanıtlar listesine ekle
          allResponses.push(autoResponse);
          
          console.log('Otomatik resmi yanıt eklendi');
        }
        
        // Hazırladığımız düzenli yanıtları issue nesnesine ekle
        issueData.officialResponses = allResponses;
        
        // API uyumluluğu için tekil officialResponse alanını da ayarla
        if (allResponses.length > 0) {
          const latestResponse = allResponses[0]; // En yeni yanıt
          issueData.officialResponse = {
            response: latestResponse.text,
            createdAt: latestResponse.date,
            respondedBy: { name: latestResponse.respondent }
          };
        }
        
        // Sorun nesnesini ayarla
        setIssue(issueData);
        setUsingFallback(false);
        setUsingCache(false);
        
        // Önbelleğe kaydet
        saveToCache(issueData);
      } else {
        console.error('API yanıtında veri bulunamadı veya başarısız', response);
        
        // Yedek veri kullan
        if (issueTitle) {
          console.log('Yedek veriler kullanılıyor');
          setIssue({
            _id: issueId,
            title: issueTitle,
            status: issueStatus,
            description: 'API verisi alınamadı. Daha sonra tekrar deneyiniz.',
            createdAt: new Date().toISOString()
          });
          setUsingFallback(true);
          setUsingCache(false);
        } else {
          setError(response.message || 'Sorun detayları alınamadı. Sunucudan geçersiz yanıt.');
        }
      }
    } catch (error) {
      console.error('Sorun detayları alınırken hata:', error);
      
      // Yedek veri kullan
      if (issueTitle) {
        console.log('Hata nedeniyle yedek veriler kullanılıyor');
        setIssue({
          _id: issueId,
          title: issueTitle,
          status: issueStatus,
          description: 'Bağlantı hatası nedeniyle veriler alınamadı. Daha sonra tekrar deneyiniz.',
          createdAt: new Date().toISOString()
        });
        setUsingFallback(true);
        setUsingCache(false);
      } else {
        setError(`Sorun detayları yüklenirken bir hata oluştu: ${error.message || error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Arka planda güncel veriyi getir (önbellek kullanıldığında)
  const fetchFreshData = async () => {
    try {
      console.log('Arka planda güncel veri alınıyor...');
      const response = await api.issues.getById(issueId);
      
      if (response.success && response.data) {
        // Veri işleme adımları (önbellekten yükleme ile aynı)
        const issueData = response.data;
        
        // Resmi yanıtları düzenle
        let allResponses = [];
        
        // officialResponse objesi varsa işle
        if (issueData.officialResponse) {
          // İşleme kodu (yukarıdaki ile aynı)
          if (typeof issueData.officialResponse === 'object') {
            const standardResponse = {
              text: issueData.officialResponse.response || issueData.officialResponse.text || '',
              date: issueData.officialResponse.createdAt || issueData.officialResponse.date || new Date(),
              respondent: issueData.officialResponse.respondedBy?.name || 
                         issueData.officialResponse.respondent?.name || 
                         issueData.officialResponse.respondent || 'Yetkili'
            };
            
            if (standardResponse.text) {
              allResponses.push(standardResponse);
            }
          } else if (typeof issueData.officialResponse === 'string' && issueData.officialResponse.trim()) {
            allResponses.push({
              text: issueData.officialResponse,
              date: issueData.updatedAt || issueData.createdAt || new Date(),
              respondent: 'Yetkili'
            });
          }
        }
        
        // officialResponses dizisi varsa işle
        if (issueData.officialResponses && Array.isArray(issueData.officialResponses) && issueData.officialResponses.length > 0) {
          issueData.officialResponses.forEach((response) => {
            if (response && (response.text || response.response)) {
              allResponses.push({
                text: response.text || response.response || '',
                date: response.date || response.createdAt || new Date(),
                respondent: response.respondent || 'Yetkili'
              });
            }
          });
        }
        
        // Yanıtları sırala
        allResponses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Otomatik yanıt ekle
        if ((issueData.status === 'resolved' || issueData.status === 'rejected' || 
             issueData.status === 'solved' || issueData.status === 'çözüldü' || 
             issueData.status === 'reddedildi') && allResponses.length === 0) {
          
          const autoResponse = {
            text: issueData.status === 'resolved' || issueData.status === 'solved' || issueData.status === 'çözüldü'
              ? 'Bu sorun yetkililer tarafından çözülmüştür.' 
              : 'Bu sorun yetkililer tarafından reddedilmiştir.',
            date: issueData.updatedAt || issueData.createdAt || new Date(),
            respondent: 'Sistem'
          };
          
          allResponses.push(autoResponse);
        }
        
        // Yanıtları issue nesnesine ekle
        issueData.officialResponses = allResponses;
        
        // API uyumluluğu için tekil officialResponse alanını da ayarla
        if (allResponses.length > 0) {
          const latestResponse = allResponses[0];
          issueData.officialResponse = {
            response: latestResponse.text,
            createdAt: latestResponse.date,
            respondedBy: { name: latestResponse.respondent }
          };
        }
        
        // Güncel veriyi state'e ve önbelleğe kaydet
        setIssue(issueData);
        setUsingCache(false);
        saveToCache(issueData);
        
        console.log('Güncel veri başarıyla alındı ve güncellendi');
      }
    } catch (error) {
      console.error('Arka planda güncel veri alınırken hata:', error);
      // Sessizce hata yönetimi - kullanıcıya bildirim gösterme
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!user || !user.isAdmin) {
      Alert.alert('Yetki Hatası', 'Bu işlem için yönetici yetkisi gerekiyor.');
      return;
    }
    
    setUpdatingStatus(true);
    
    try {
      console.log(`Sorun durumu güncelleniyor, ID: ${issueId}, Yeni Durum: ${newStatus}`);
      const response = await api.issues.updateStatus(issueId, newStatus);
      
      if (response.success) {
        // Güncelleme başarılı olursa, verileri yeniden yükle
        const updatedIssue = await api.issues.getById(issueId);
        if (updatedIssue.success) {
          setIssue(updatedIssue.data);
          Alert.alert('Başarılı', 'Sorun durumu güncellendi.');
        } else {
        setIssue({...issue, status: newStatus});
          Alert.alert('Başarılı', 'Sorun durumu güncellendi ancak güncel veriler alınamadı.');
        }
      } else {
        Alert.alert('Hata', response.message || 'Durum güncellenemedi.');
      }
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingStatus(false);
    }
  };
  
  // Yorum ekleme fonksiyonu
  const handleAddComment = async () => {
    if (!commentText.trim()) {
      return;
    }
    
    if (!user) {
      Alert.alert('Giriş Gerekiyor', 'Yorum yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    setAddingComment(true);
    
    try {
      const response = await api.issues.addComment(issueId, commentText);
      
      if (response.success) {
        // API'den dönen issue varsa direkt kullan
        if (response.issue) {
          setIssue(response.issue);
        } else {
          // Yoksa manuel olarak güncelle
          const refreshedIssue = await api.issues.getById(issueId);
          if (refreshedIssue.success) {
            setIssue(refreshedIssue.data);
          }
        }
        setCommentText('');
      } else {
        Alert.alert('Hata', response.message || 'Yorum eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      Alert.alert('Hata', 'Yorum eklenirken bir hata oluştu');
    } finally {
      setAddingComment(false);
    }
  };
  
  // Yanıt ekleme fonksiyonu
  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) {
      return;
    }
    
    if (!user) {
      Alert.alert('Giriş Gerekiyor', 'Yanıt yazabilmek için giriş yapmalısınız.');
      return;
    }
    
    setAddingReply(true);
    
    try {
      const response = await api.issues.addReply(issueId, commentId, replyText);
      
      if (response.success) {
        // Yorumlar güncel verilerle yenileniyor
        const refreshedIssue = await api.issues.getById(issueId);
        if (refreshedIssue.success) {
          setIssue(refreshedIssue.data);
        }
        setReplyText('');
        setReplyTo(null);
      } else {
        Alert.alert('Hata', response.message || 'Yanıt eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Yanıt ekleme hatası:', error);
      Alert.alert('Hata', 'Yanıt eklenirken bir hata oluştu');
    } finally {
      setAddingReply(false);
    }
  };
  
  // Beğeni ekleme/kaldırma fonksiyonu
  const handleLikeComment = async (commentId, isReply = false) => {
    if (!user) {
      Alert.alert('Giriş Gerekiyor', 'Beğeni yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    setLikingComment(true);
    
    try {
      const response = await api.issues.likeComment(issueId, commentId, isReply);
      
      if (response.success) {
        // Yorumlar güncel verilerle yenileniyor
        const refreshedIssue = await api.issues.getById(issueId);
        if (refreshedIssue.success) {
          setIssue(refreshedIssue.data);
        }
      } else {
        Alert.alert('Hata', response.message || 'Beğeni işleminde bir hata oluştu');
      }
    } catch (error) {
      console.error('Beğeni işlemi hatası:', error);
      Alert.alert('Hata', 'Beğeni işleminde bir hata oluştu');
    } finally {
      setLikingComment(false);
    }
  };

  const getCategoryLabel = (category) => {
    if (!category) return 'Belirtilmemiş';
    
    const categories = {
      'infrastructure': 'Altyapı',
      'environmental': 'Çevre',
      'transportation': 'Ulaşım',
      'safety': 'Güvenlik',
      'education': 'Eğitim',
      'health': 'Sağlık',
      'other': 'Diğer'
    };
    
    return categories[category] || category;
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Belirtilmemiş';
    
    const statuses = {
      'reported': 'Bildirildi',
      'pending': 'Yeni',
      'in_progress': 'İnceleniyor',
      'solved': 'Çözüldü',
      'resolved': 'Çözüldü',
      'rejected': 'Reddedildi',
    };
    
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    if (!status) return '#757575'; // Gri
    
    const colors = {
      'reported': '#FFC107',
      'pending': '#FFC107',
      'in_progress': '#2196F3',
      'solved': '#4CAF50',
      'resolved': '#4CAF50',
      'rejected': '#F44336',
    };
    
    return colors[status] || '#757575';
  };

  const handleRetry = () => {
    setRetryAttempt(prev => prev + 1);
  };

  // Resmi yanıt içeriğini bulan yardımcı fonksiyon
  const getOfficialResponseText = () => {
    if (!issue || !issue.officialResponse) return null;
    
    // Eğer doğrudan string ise
    if (typeof issue.officialResponse === 'string') {
      return issue.officialResponse;
    }
    
    // Nesne ise, içindeki olası tüm metin alanlarını kontrol edelim
    if (typeof issue.officialResponse === 'object') {
      // Olası tüm alanları kontrol et - içeriğin farklı anahtar adlarında olabilir
      const possibleFields = [
        'response', 'text', 'content', 'message', 
        'description', 'officialResponse', 'comment', 
        'reply', 'answer', 'solution'
      ];
      
      // İlk bulunan alan değerini döndür
      for (const field of possibleFields) {
        if (issue.officialResponse[field] && 
            typeof issue.officialResponse[field] === 'string' && 
            issue.officialResponse[field].trim() !== '') {
          console.log(`Resmi yanıt içeriği '${field}' alanında bulundu`);
          return issue.officialResponse[field];
        }
      }
      
      // Hiçbir değer bulunamadıysa
      console.log('Resmi yanıt nesnesinde içerik bulunamadı:', issue.officialResponse);
    }
    
    return 'Resmi yanıt içeriği bulunamadı.';
  };

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Sorun detayları yükleniyor...</Text>
      </View>
    );
  }

  // Resmi yanıt göstermek için ilgili veriler tamamen yüklendi mi kontrol et
  const isOfficialResponseReady = () => {
    if (!issue) return false;
    if (!issue.officialResponse) return false;
    
    if (typeof issue.officialResponse === 'string') {
      return issue.officialResponse.trim() !== '';
    }
    
    if (typeof issue.officialResponse === 'object') {
      // En az bir içerik var mı kontrol et
      const responseText = getOfficialResponseText();
      return responseText && responseText !== 'Resmi yanıt içeriği bulunamadı.';
    }
    
    return false;
  };

  // Hata durumu
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, {backgroundColor: '#757575', marginTop: 10}]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Veri bulunamadı durumu
  if (!issue) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sorun bulunamadı.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render edilecek bileşen
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}
    >
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Başlık ve Durum */}
        <View style={styles.header}>
          <Text style={styles.title}>{issue.title || 'İsimsiz Sorun'}</Text>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(issue.status)}]}>
            <Text style={styles.statusText}>{getStatusLabel(issue.status)}</Text>
          </View>
        </View>
        
        {/* Önbellek veya Yedek veri uyarısı */}
        {(usingFallback || usingCache) && (
          <View style={[styles.fallbackWarning, usingCache ? {backgroundColor: '#e8f4fd'} : {backgroundColor: '#fff3cd'}]}>
              <MaterialIcons name={usingCache ? "cached" : "warning"} size={24} color={usingCache ? "#0288d1" : "#856404"} />
              <Text style={[styles.fallbackText, usingCache ? {color: '#0288d1'} : {color: '#856404'}]}>
                {usingCache 
                  ? 'Önbellekten yüklenen veriler görüntüleniyor.' 
                  : 'Sunucudan güncel veriler alınamadı. Yedek veriler görüntüleniyor.'}
              </Text>
              <TouchableOpacity style={styles.retryButtonSmall} onPress={handleRetry}>
              <Text style={styles.retryButtonTextSmall}>Yenile</Text>
            </TouchableOpacity>
          </View>
        )}
        
          {/* Metadata */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataItem}>
              <MaterialIcons name="calendar-today" size={16} color="#666" />
              <Text style={styles.metadataText}>
                {moment(issue.createdAt).format('D MMMM YYYY')}
              </Text>
          </View>
          
          <View style={styles.metadataItem}>
              <MaterialIcons name="category" size={16} color="#666" />
              <Text style={styles.metadataText}>
                {getCategoryLabel(issue.category)}
              </Text>
          </View>
        </View>
        
        {/* Açıklama */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.description}>
              {issue.description || 'Açıklama bulunamadı.'}
            </Text>
        </View>
        
        {/* Konum */}
        {issue.location && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konum</Text>
          <View style={styles.locationContainer}>
                  {issue.location.city && (
            <View style={styles.locationItem}>
                      <MaterialIcons name="location-city" size={16} color="#666" />
                      <Text style={styles.locationText}>{issue.location.city}</Text>
            </View>
                  )}
            
                  {issue.location.district && (
            <View style={styles.locationItem}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
                      <Text style={styles.locationText}>{issue.location.district}</Text>
            </View>
                  )}
          </View>
                
                {issue.location.address && (
                  <Text style={styles.address}>{issue.location.address}</Text>
                )}
                
                {/* Harita Görünümü */}
                {issue.location.coordinates && issue.location.coordinates.length === 2 && (
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: issue.location.coordinates[1],
                        longitude: issue.location.coordinates[0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: issue.location.coordinates[1],
                          longitude: issue.location.coordinates[0],
                        }}
                        pinColor="#2196F3"
                      />
                    </MapView>
                    <TouchableOpacity 
                      style={styles.fullMapButton}
                      onPress={() => setMapModalVisible(true)}
                    >
                      <MaterialIcons name="fullscreen" size={20} color="#fff" />
                      <Text style={styles.fullMapButtonText}>Haritayı Büyüt</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {issue.location.directionInfo && (
                  <View style={styles.directionInfoContainer}>
                    <Text style={styles.directionInfoLabel}>Adres Tarifi:</Text>
                    <Text style={styles.directionInfoText}>{issue.location.directionInfo}</Text>
                  </View>
                )}
        </View>
        )}
        
        {/* Resmi Yanıt */}
        {issue && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resmi Yanıtlar</Text>
            
            {/* officialResponses dizisini kullanarak tüm resmi yanıtları göster */}
            {issue.officialResponses && issue.officialResponses.length > 0 ? (
              issue.officialResponses.map((response, index) => (
                <View 
                  key={`response-${index}`} 
                  style={[
                    styles.officialResponseContainer, 
                    { marginTop: index > 0 ? 12 : 0 }
                  ]}
                >
                  <View style={styles.officialResponseHeader}>
                    <View style={[styles.userAvatar, {backgroundColor: '#3b82f6'}]}>
                      <MaterialIcons name="verified-user" size={20} color="#fff" />
                    </View>
                    <View style={styles.officialResponseMeta}>
                      <Text style={styles.officialResponseAuthor}>
                        {response.respondent || 'Yetkili'}
                      </Text>
                      <Text style={styles.officialResponseTime}>
                        {response.date ? 
                          moment(response.date).format('D MMMM YYYY, HH:mm') : 
                          moment().format('D MMMM YYYY, HH:mm')}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.officialResponseText}>
                    {response.text || response.response || 'Resmi yanıt içeriği bulunamadı.'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.officialResponseContainer}>
                <Text style={styles.officialResponseText}>
                  Bu sorun için henüz bir resmi yanıt eklenmemiş.
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Çözüm Süreci */}
        {issue.status !== 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çözüm Süreci</Text>
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineItem, styles.timelineItemActive]}>
                <View style={[styles.timelineDot, styles.timelineDotActive]}>
                  <MaterialIcons name="flag" size={18} color="#fff" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Bildirim Yapıldı</Text>
                  <Text style={styles.timelineDate}>
                    {moment(issue.createdAt).format('D MMMM YYYY')}
                  </Text>
                  <Text style={styles.timelineDescription}>
                    Bildiriminiz başarıyla alındı ve sisteme kaydedildi.
                  </Text>
                </View>
              </View>
              
              <View style={[
                styles.timelineItem, 
                issue.status === 'in_progress' || issue.status === 'resolved' || issue.status === 'rejected' 
                  ? styles.timelineItemActive 
                  : styles.timelineItemPending
              ]}>
                <View style={[
                  styles.timelineDot, 
                  issue.status === 'in_progress' || issue.status === 'resolved' || issue.status === 'rejected'
                    ? styles.timelineDotActive 
                    : styles.timelineDotPending
                ]}>
                  <MaterialIcons name="search" size={18} color={
                    issue.status === 'in_progress' || issue.status === 'resolved' || issue.status === 'rejected'
                      ? "#fff" 
                      : "#bbb"
                  } />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineTitle,
                    issue.status === 'in_progress' || issue.status === 'resolved' || issue.status === 'rejected'
                      ? styles.timelineTitleActive 
                      : styles.timelineTitlePending
                  ]}>İncelemeye Alındı</Text>
                  {issue.statusHistory && Array.isArray(issue.statusHistory) && 
                   issue.statusHistory.find(h => h && h.status === 'in_progress') && (
                    <Text style={styles.timelineDate}>
                      {moment(issue.statusHistory.find(h => h && h.status === 'in_progress').date).format('D MMMM YYYY')}
                    </Text>
                  )}
                  <Text style={[
                    styles.timelineDescription,
                    issue.status === 'in_progress' || issue.status === 'resolved' || issue.status === 'rejected'
                      ? styles.timelineDescriptionActive 
                      : styles.timelineDescriptionPending
                  ]}>
                    Bildiriminiz yetkililer tarafından incelemeye alındı.
                  </Text>
                </View>
              </View>
              
              {issue.status !== 'rejected' && (
                <View style={[
                  styles.timelineItem, 
                  issue.status === 'resolved' 
                    ? styles.timelineItemActive 
                    : styles.timelineItemPending
                ]}>
                  <View style={[
                    styles.timelineDot, 
                    issue.status === 'resolved'
                      ? styles.timelineDotActive 
                      : styles.timelineDotPending
                  ]}>
                    <MaterialIcons name="check-circle" size={18} color={
                      issue.status === 'resolved' ? "#fff" : "#bbb"
                    } />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineTitle,
                      issue.status === 'resolved'
                        ? styles.timelineTitleActive 
                        : styles.timelineTitlePending
                    ]}>Çözüldü</Text>
                    {issue.statusHistory && Array.isArray(issue.statusHistory) && 
                     issue.statusHistory.find(h => h && h.status === 'resolved') && (
                      <Text style={styles.timelineDate}>
                        {moment(issue.statusHistory.find(h => h && h.status === 'resolved').date).format('D MMMM YYYY')}
                      </Text>
                    )}
                    <Text style={[
                      styles.timelineDescription,
                      issue.status === 'resolved'
                        ? styles.timelineDescriptionActive 
                        : styles.timelineDescriptionPending
                    ]}>
                      Bildiriminiz için gerekli çözüm sağlandı.
                    </Text>
                  </View>
                </View>
              )}
              
              {issue.status === 'rejected' && (
                <View style={[styles.timelineItem, styles.timelineItemActive]}>
                  <View style={[styles.timelineDot, styles.timelineDotRejected]}>
                    <MaterialIcons name="cancel" size={18} color="#fff" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Reddedildi</Text>
                    {issue.statusHistory && Array.isArray(issue.statusHistory) && 
                     issue.statusHistory.find(h => h && h.status === 'rejected') && (
                      <Text style={styles.timelineDate}>
                        {moment(issue.statusHistory.find(h => h && h.status === 'rejected').date).format('D MMMM YYYY')}
                      </Text>
                    )}
                    <Text style={styles.timelineDescription}>
                      Bildiriminiz yetkililer tarafından reddedildi. Ayrıntılı bilgi için resmi yanıtı kontrol edin.
                    </Text>
                  </View>
                </View>
              )}
            </View>
        </View>
        )}
        
        {/* Fotoğraflar */}
        {issue.images && issue.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {issue.images.map((image, index) => (
                    <TouchableOpacity 
                      key={`${issueId}-image-${index}`} 
                      style={styles.imageContainer}
                      onPress={() => {
                        setSelectedImage(image);
                        setModalVisible(true);
                      }}
                    >
                  <Image
                    source={{ uri: image }}
                    style={styles.image}
                    resizeMode="cover"
                    defaultSource={null}
                    onError={(e) => {
                      console.warn(`Image loading error for index ${index}, URL: ${image}`);
                      // API URL'si görüntülere öneklenmiş mi kontrol et
                      if (image && typeof image === 'string' && !image.startsWith('http')) {
                        // API URL'si ekle
                        const apiBaseUrl = api.getBaseUrl();
                        const fullImageUrl = `${apiBaseUrl}${image.startsWith('/') ? '' : '/'}${image}`;
                        console.log(`Trying with full URL: ${fullImageUrl}`);
                        // Resim kaynağını güncelle
                        e.nativeEvent.target.src = fullImageUrl;
                      }
                    }}
                  />
                    </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Çözüm Fotoğrafları */}
        {issue.progressPhotos && issue.progressPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çözüm Fotoğrafları</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              {issue.progressPhotos.map((photo, index) => {
                // URL'yi doğru şekilde oluştur
                let imageUrl = '';
                if (typeof photo === 'string') {
                  imageUrl = photo;
                } else if (photo.url) {
                  imageUrl = photo.url;
                } else {
                  return null; // Geçersiz fotoğraf verisi
                }
                
                // API URL'si ekle
                const apiBaseUrl = api.getBaseUrl();
                const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${apiBaseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
                
                return (
                  <TouchableOpacity 
                    key={`progress-${index}`} 
                    style={styles.imageContainer}
                    onPress={() => {
                      setSelectedImage(fullImageUrl);
                      setModalVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: fullImageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                      defaultSource={null}
                      onError={(e) => {
                        console.warn(`Çözüm fotoğrafı yükleme hatası (${index}), URL: ${fullImageUrl}`);
                      }}
                    />
                    {photo.uploadedAt && (
                      <View style={styles.photoDateContainer}>
                        <Text style={styles.photoDateText}>
                          {moment(photo.uploadedAt).format('D MMM YYYY')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
          
          {/* Yorumlar Bölümü */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Yorumlar {issue.comments && issue.comments.length > 0 ? `(${issue.comments.length})` : ''}
            </Text>
            
            {/* Yorum Formu */}
            {user ? (
              <View style={styles.commentForm}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Yorumunuzu buraya yazın..."
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.commentSubmitButton, 
                      (!commentText.trim() || addingComment) && styles.disabledButton
                    ]}
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || addingComment}
                  >
                    {addingComment ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.commentSubmitText}>Gönder</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Yorum yapmak için lütfen giriş yapın.</Text>
                <TouchableOpacity 
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Giriş Yap</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Yorumlar Listesi */}
            {issue.comments && issue.comments.length > 0 ? (
              <View style={styles.commentsList}>
                {issue.comments.map((comment) => (
                  <View key={comment._id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {comment.user && comment.user.name ? comment.user.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{comment.user ? comment.user.name : 'Bilinmeyen Kullanıcı'}</Text>
                          <Text style={styles.commentTime}>{moment(comment.createdAt).fromNow()}</Text>
                        </View>
                        <Text style={styles.commentText}>{comment.content}</Text>
                        
                        {/* Beğeni ve Yanıt Butonları */}
                        <View style={styles.commentActions}>
                          <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => handleLikeComment(comment._id)}
                            disabled={likingComment}
                          >
                            <Ionicons 
                              name={comment.likes && user && comment.likes.includes(user._id) ? "heart" : "heart-outline"} 
                              size={16} 
                              color={comment.likes && user && comment.likes.includes(user._id) ? "#e74c3c" : "#777"} 
                            />
                            <Text style={styles.actionText}>
                              {comment.likes && comment.likes.length > 0 ? 
                               `${comment.likes.length} Beğeni` : 'Beğen'}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                          >
                            <Ionicons name="return-down-forward-outline" size={16} color="#777" />
                            <Text style={styles.actionText}>Yanıtla</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {/* Yanıt Formu */}
                        {replyTo === comment._id && (
                          <View style={styles.replyForm}>
                            <TextInput
                              style={styles.replyInput}
                              value={replyText}
                              onChangeText={setReplyText}
                              placeholder={`${comment.user ? comment.user.name : 'Kullanıcı'}'ye yanıt yaz...`}
                              multiline
                              numberOfLines={2}
                              maxLength={500}
                            />
                            <View style={styles.replyButtonsContainer}>
                              <TouchableOpacity 
                                style={styles.cancelButton}
                                onPress={() => {
                                  setReplyTo(null);
                                  setReplyText('');
                                }}
                              >
                                <Text style={styles.cancelButtonText}>İptal</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={[
                                  styles.replyButton,
                                  (!replyText.trim() || addingReply) && styles.disabledButton
                                ]}
                                onPress={() => handleAddReply(comment._id)}
                                disabled={!replyText.trim() || addingReply}
                              >
                                {addingReply ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.replyButtonText}>Yanıtla</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                        
                        {/* Yanıtlar */}
                        {comment.replies && comment.replies.length > 0 && (
                          <View style={styles.repliesList}>
                            {comment.replies.map((reply) => (
                              <View key={reply._id} style={styles.replyItem}>
                                <View style={[styles.userAvatar, styles.smallAvatar]}>
                                  <Text style={[styles.userAvatarText, styles.smallAvatarText]}>
                                    {reply.user && reply.user.name ? reply.user.name.charAt(0).toUpperCase() : '?'}
                                  </Text>
                                </View>
                                <View style={styles.replyContent}>
                                  <View style={styles.commentMeta}>
                                    <Text style={styles.commentAuthor}>{reply.user ? reply.user.name : 'Bilinmeyen Kullanıcı'}</Text>
                                    <Text style={styles.commentTime}>{moment(reply.createdAt).fromNow()}</Text>
                                  </View>
                                  <Text style={styles.commentText}>{reply.content}</Text>
                                  
                                  {/* Yanıt Beğeni Butonu */}
                                  <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => handleLikeComment(reply._id, true)}
                                    disabled={likingComment}
                                  >
                                    <Ionicons 
                                      name={reply.likes && user && reply.likes.includes(user._id) ? "heart" : "heart-outline"} 
                                      size={14} 
                                      color={reply.likes && user && reply.likes.includes(user._id) ? "#e74c3c" : "#777"} 
                                    />
                                    <Text style={[styles.actionText, {fontSize: 12}]}>
                                      {reply.likes && reply.likes.length > 0 ? 
                                       `${reply.likes.length} Beğeni` : 'Beğen'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                <Text style={styles.emptyCommentsText}>Henüz yorum yapılmamış. İlk yorumu siz yapın!</Text>
              </View>
            )}
          </View>
        
        {/* Kullanıcı Bilgileri */}
        {issue.user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bildirim Yapan</Text>
            <View style={styles.userContainer}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {issue.user.name ? issue.user.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{issue.user.name || 'Bilinmeyen Kullanıcı'}</Text>
                <Text style={styles.userRole}>Vatandaş</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Yönetici İşlemleri */}
        {user && user.isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Yönetici İşlemleri</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('in_progress')},
                  issue.status === 'in_progress' && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('in_progress')}
                disabled={updatingStatus || issue.status === 'in_progress'}
              >
                <Text style={styles.statusButtonText}>İnceleniyor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('resolved')},
                  (issue.status === 'resolved' || issue.status === 'solved') && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('resolved')}
                disabled={updatingStatus || issue.status === 'resolved' || issue.status === 'solved'}
              >
                <Text style={styles.statusButtonText}>Çözüldü</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  {backgroundColor: getStatusColor('rejected')},
                  issue.status === 'rejected' && styles.activeStatusButton,
                  updatingStatus && styles.disabledButton
                ]} 
                onPress={() => handleStatusUpdate('rejected')}
                disabled={updatingStatus || issue.status === 'rejected'}
              >
                <Text style={styles.statusButtonText}>Reddedildi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
      
      {/* Fotoğraf Görüntüleme Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableWithoutFeedback>
              <View style={styles.modalImageContainer}>
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                )}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialIcons name="close" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Harita Tam Ekran Modalı */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.fullMapModalContainer}>
          <View style={styles.fullMapHeader}>
            <Text style={styles.fullMapTitle}>{issue.title}</Text>
            <TouchableOpacity 
              style={styles.fullMapCloseButton}
              onPress={() => setMapModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {issue.location && issue.location.coordinates && (
            <MapView
              style={styles.fullMap}
              initialRegion={{
                latitude: issue.location.coordinates[1],
                longitude: issue.location.coordinates[0],
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{
                  latitude: issue.location.coordinates[1],
                  longitude: issue.location.coordinates[0],
                }}
                title={issue.title}
                description={issue.location.address || ''}
                pinColor="#2196F3"
              />
            </MapView>
          )}
          
          <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
              <MaterialIcons name="location-on" size={24} color="#2196F3" />
              <Text style={styles.addressTitle}>Adres Bilgileri</Text>
            </View>
            
            <Text style={styles.addressText}>
              {issue.location && issue.location.address ? issue.location.address : 'Adres bilgisi bulunamadı'}
            </Text>
            
            {issue.location && issue.location.district && issue.location.city && (
              <Text style={styles.addressDetail}>
                {issue.location.district}, {issue.location.city}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  metadataContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metadataText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    marginBottom: 10,
  },
  photoInfo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  imageContainer: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#757575',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  adminSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 5,
  },
  activeStatusButton: {
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fallbackWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  fallbackText: {
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  retryButtonSmall: {
    backgroundColor: '#f39c12',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal stilleri
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    backgroundColor: 'transparent',
    width: '90%',
    height: '70%',
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 5,
  },
  commentForm: {
    flexDirection: 'row',
    marginBottom: 15,
    marginTop: 10,
  },
  commentInputContainer: {
    flex: 1,
    marginLeft: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentSubmitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  commentSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginPrompt: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginPromptText: {
    color: '#666',
    marginBottom: 8,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentsList: {
    marginTop: 15,
  },
  commentItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#333',
  },
  commentTime: {
    color: '#999',
    fontSize: 12,
  },
  commentText: {
    color: '#333',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  actionText: {
    color: '#777',
    marginLeft: 4,
    fontSize: 13,
  },
  replyForm: {
    marginTop: 10,
    marginLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 10,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    marginRight: 10,
    padding: 8,
  },
  cancelButtonText: {
    color: '#666',
  },
  replyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  replyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  repliesList: {
    marginTop: 10,
    marginLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: 10,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  replyContent: {
    flex: 1,
    marginLeft: 8,
  },
  smallAvatar: {
    width: 30,
    height: 30,
  },
  smallAvatarText: {
    fontSize: 14,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 10,
  },
  emptyCommentsText: {
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  directionInfoContainer: {
    marginTop: 10,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 5,
  },
  directionInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  directionInfoText: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    height: 200,
  },
  map: {
    width: '100%',
    height: 200,
  },
  fullMapButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullMapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  fullMapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullMapHeader: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  fullMapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  fullMapCloseButton: {
    padding: 5,
  },
  fullMap: {
    width: '100%',
    height: width * 1.2,
  },
  addressContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    lineHeight: 22,
  },
  addressDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  officialResponseContainer: {
    padding: 15,
    backgroundColor: '#f9f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    marginBottom: 10,
  },
  officialResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  officialResponseMeta: {
    flex: 1,
    marginLeft: 10,
  },
  officialResponseAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  officialResponseTime: {
    fontSize: 14,
    color: '#666',
  },
  officialResponseText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 5,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineItemActive: {
    opacity: 1,
  },
  timelineItemPending: {
    opacity: 0.6,
  },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    marginTop: 3,
  },
  timelineDotActive: {
    backgroundColor: '#2196F3',
  },
  timelineDotPending: {
    backgroundColor: '#bbb',
  },
  timelineDotRejected: {
    backgroundColor: '#F44336',
  },
  timelineContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timelineTitleActive: {
    color: '#2196F3',
  },
  timelineTitlePending: {
    color: '#666',
  },
  timelineDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineDescriptionActive: {
    color: '#333',
  },
  timelineDescriptionPending: {
    color: '#999',
  },
  officialResponseLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialResponseLoadingText: {
    color: '#666',
    marginLeft: 10,
  },
  modalErrorUrl: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
  },
  photoDateContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 5,
  },
  photoDateText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default IssueDetailScreen; 
