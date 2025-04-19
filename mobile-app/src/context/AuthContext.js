import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dummy user data for development
  const dummyUser = {
    id: '123',
    name: 'Ahmet Yılmaz',
    email: 'demo@example.com',
    role: 'user'
  };

  useEffect(() => {
    // Check if user is logged in from AsyncStorage
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (token) {
          // In a real app, you would validate the token with the server
          // For now, we'll just set the user data directly
          setUser(dummyUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError('Authentication check failed');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, you would send a request to the server
      // For now, we'll just simulate a successful login
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check credentials (this would be done on the server)
      if (email === 'demo@example.com' && password === 'password') {
        // Store token in AsyncStorage
        await AsyncStorage.setItem('token', 'dummy-jwt-token');
        
        // Set user data
        setUser(dummyUser);
        setIsAuthenticated(true);
        
        return true;
      } else {
        setError('Invalid email or password');
        return false;
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, you would send a request to the server
      // For now, we'll just simulate a successful registration
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Store token in AsyncStorage
      await AsyncStorage.setItem('token', 'dummy-jwt-token');
      
      // Set user data
      const newUser = {
        id: Math.random().toString(36).substring(2),
        name,
        email,
        role: 'user'
      };
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return true;
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update user data
  const updateUser = (updatedData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedData
    }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      error,
      login,
      register,
      logout,
      updateUser,
      setError
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 