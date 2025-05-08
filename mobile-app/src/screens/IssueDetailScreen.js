import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, TouchableWithoutFeedback, TextInput, KeyboardAvoidingView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/tr';

moment.locale('tr');

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
  
  // Fotoğraf görüntüleme state'leri
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
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

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Sorun detaylarını getiriyorum, ID: ${issueId}`);
      
      // API'den sorun detaylarını al
      const response = await api.issues.getById(issueId);
      
      console.log('API yanıtı:', JSON.stringify(response).substring(0, 200));
      
      if (response.success && response.data) {
        // Veriyi kullanmadan önce kontrol et
        const issueData = response.data;
        
        // Eksik veri kontrolü
        if (!issueData.title) {
          console.warn('API yanıtında title alanı eksik');
        }
        
        console.log('Sorun başlığı:', issueData.title);
        console.log('Sorun durumu:', issueData.status);
        
        // Sorun nesnesini ayarla
        setIssue(issueData);
        setUsingFallback(false);
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
      } else {
        setError(`Sorun detayları yüklenirken bir hata oluştu: ${error.message || error}`);
      }
    } finally {
      setLoading(false);
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
        // Yorumlar güncel verilerle yenileniyor
        const refreshedIssue = await api.issues.getById(issueId);
        if (refreshedIssue.success) {
          setIssue(refreshedIssue.data);
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

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Sorun detayları yükleniyor...</Text>
      </View>
    );
  }

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
          
          {/* Yedek veri uyarısı */}
          {usingFallback && (
            <View style={styles.fallbackWarning}>
              <MaterialIcons name="warning" size={24} color="#856404" />
              <Text style={styles.fallbackText}>
                Sunucudan güncel veriler alınamadı. Yedek veriler görüntüleniyor.
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
                
                {issue.location.directionInfo && (
                  <View style={styles.directionInfoContainer}>
                    <Text style={styles.directionInfoLabel}>Adres Tarifi:</Text>
                    <Text style={styles.directionInfoText}>{issue.location.directionInfo}</Text>
                  </View>
                )}
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
                      onError={(e) => {
                        console.warn(`Image loading error for index ${index}`);
                      }}
                    />
                    </TouchableOpacity>
                ))}
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
    marginTop: 5,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
});

export default IssueDetailScreen; 