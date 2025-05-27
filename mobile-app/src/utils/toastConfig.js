import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';

// Custom toast konfigürasyonu
export const toastConfig = {
  // Başarılı işlemler için yeşil toast
  success: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#22c55e',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>✓</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ),

  // Hata mesajları için kırmızı toast
  error: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#ef4444',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>✕</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ),

  // Bilgi mesajları için mavi toast
  info: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>ℹ</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ),

  // Uyarı mesajları için turuncu toast
  warning: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#f59e0b',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>⚠</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ),

  // Hoş geldin mesajı için özel toast
  welcome: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>👋</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ),

  // Kayıt başarılı mesajı için özel toast
  register: ({ text1, text2, onPress, props }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        height: 80,
        width: '90%',
        backgroundColor: '#10b981',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 15
      }}>
        <Text style={{ fontSize: 20, color: '#fff' }}>🎉</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 4
        }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 18
          }}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
};

// Toast gösterme yardımcı fonksiyonları
export const showSuccessToast = (title, message, duration = 3000) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
};

export const showErrorToast = (title, message, duration = 4000) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
};

export const showInfoToast = (title, message, duration = 3000) => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
};

export const showWarningToast = (title, message, duration = 3000) => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
};

export const showWelcomeToast = (title, message, duration = 4000) => {
  Toast.show({
    type: 'welcome',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
};

export const showRegisterToast = (title, message, duration = 4000) => {
  Toast.show({
    type: 'register',
    text1: title,
    text2: message,
    visibilityTime: duration,
    topOffset: 60,
    onPress: () => Toast.hide()
  });
}; 