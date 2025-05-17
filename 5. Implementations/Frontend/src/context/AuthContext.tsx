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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const userData = await authAPI.getCurrentUser();
            setUser(userData);
          } catch (err) {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('Error checking login status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Login user
  const login = async (username: string, password: string) => {
    try {
      setError(null);
      const data = await authAPI.login(username, password);
      await AsyncStorage.setItem('token', data.token);
      setUser(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call the backend logout endpoint
      await authAPI.logout();
      // Clear local auth state only after successful logout
      await AsyncStorage.removeItem('token');
      setUser(null);
    } catch (err: any) {
      console.error('Error during logout:', err);
      // If it's a network error or the server is down, still clear local state
      if (!err.response || err.response.status >= 500) {
        await AsyncStorage.removeItem('token');
        setUser(null);
      }
      throw err; // Propagate the error to the component
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 