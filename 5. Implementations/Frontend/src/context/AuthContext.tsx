import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('[AuthProvider] Initializing...'); // Debug log
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      console.log('[AuthProvider] Checking login status...'); // Debug log
      try {
        const token = await AsyncStorage.getItem('token');
        console.log('[AuthProvider] Token found:', !!token); // Debug log
        if (token) {
          try {
            const userData = await authAPI.getCurrentUser();
            console.log('[AuthProvider] User data retrieved:', userData); // Debug log
            setUser(userData);
          } catch (err) {
            console.error('[AuthProvider] Error getting current user:', err); // Debug log
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Error checking login status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Login user
  const login = async (username: string, password: string) => {
    try {
      console.log('[AuthProvider] Attempting login...'); // Debug log
      setError(null);
      const data = await authAPI.login(username, password);
      console.log('[AuthProvider] Login successful:', data); // Debug log
      await AsyncStorage.setItem('token', data.token);
      setUser(data);
    } catch (err: any) {
      console.error('[AuthProvider] Login error:', err); // Debug log
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      console.log('[AuthProvider] Attempting logout...'); // Debug log
      await authAPI.logout();
      await AsyncStorage.removeItem('token');
      setUser(null);
      console.log('[AuthProvider] Logout successful'); // Debug log
    } catch (err: any) {
      console.error('[AuthProvider] Logout error:', err);
      if (!err.response || err.response.status >= 500) {
        await AsyncStorage.removeItem('token');
        setUser(null);
      }
      throw err;
    }
  };

  const contextValue = {
    user,
    loading,
    error,
    login,
    logout
  };

  console.log('[AuthProvider] Rendering with context:', { 
    hasUser: !!user, 
    loading, 
    hasError: !!error 
  }); // Debug log

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('[useAuth] Hook called outside AuthProvider!'); // Debug log
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 