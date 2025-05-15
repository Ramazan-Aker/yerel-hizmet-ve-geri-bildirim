import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast, { BaseToast } from 'react-native-toast-message';

// Özel toast yapılandırması
export const toastConfig = {
  // Başarı mesajları
  success: ({ text1, text2, ...props }) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#00C851',
        backgroundColor: '#f0fff0',
        width: '90%',
        height: text2 ? 'auto' : 60,
        minHeight: 60,
        paddingVertical: 10,
        borderRadius: 8
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#006400'
      }}
      text2Style={{
        fontSize: 13,
        color: '#00C851'
      }}
      text1={text1}
      text2={text2}
      leadingIcon={
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#00C851" />
        </View>
      }
    />
  ),

  // Hata mesajları
  error: ({ text1, text2, ...props }) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#ff4444',
        backgroundColor: '#fff0f0',
        width: '90%',
        height: text2 ? 'auto' : 60,
        minHeight: 60,
        paddingVertical: 10,
        borderRadius: 8
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#8B0000'
      }}
      text2Style={{
        fontSize: 13,
        color: '#ff4444'
      }}
      text1={text1}
      text2={text2}
      leadingIcon={
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={24} color="#ff4444" />
        </View>
      }
    />
  ),

  // Bilgi mesajları
  info: ({ text1, text2, ...props }) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#33b5e5',
        backgroundColor: '#f0f8ff',
        width: '90%',
        height: text2 ? 'auto' : 60,
        minHeight: 60,
        paddingVertical: 10,
        borderRadius: 8
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#00008B'
      }}
      text2Style={{
        fontSize: 13,
        color: '#33b5e5'
      }}
      text1={text1}
      text2={text2}
      leadingIcon={
        <View style={styles.iconContainer}>
          <Ionicons name="information-circle" size={24} color="#33b5e5" />
        </View>
      }
    />
  ),

  // Uyarı mesajları
  warning: ({ text1, text2, ...props }) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#ffbb33',
        backgroundColor: '#fffcf0',
        width: '90%',
        height: text2 ? 'auto' : 60,
        minHeight: 60,
        paddingVertical: 10,
        borderRadius: 8
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: 'bold',
        color: '#8B4513'
      }}
      text2Style={{
        fontSize: 13,
        color: '#ffbb33'
      }}
      text1={text1}
      text2={text2}
      leadingIcon={
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={24} color="#ffbb33" />
        </View>
      }
    />
  )
};

const styles = StyleSheet.create({
  iconContainer: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

// Export a function to register the toast config
export const registerToastConfig = () => {
  Toast.setConfig(toastConfig);
};

export default toastConfig; 