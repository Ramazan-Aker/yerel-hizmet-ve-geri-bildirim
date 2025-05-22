import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Kullanıcının admin olup olmadığını kontrol eden yardımcı fonksiyon
  const isAdmin = () => {
    return context.user && (context.user.role === 'admin' || context.user.role === 'municipal_worker');
  };

  return {
    ...context,
    isAdmin
  };
};

export default useAuth; 