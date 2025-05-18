import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  userId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get stored auth data
const getStoredAuthData = async () => {
  try {
    let token, userStr;

    // If on web, try localStorage first
    if (Platform.OS === 'web') {
      token = localStorage.getItem('token');
      userStr = localStorage.getItem('user');
    }

    // If not found in localStorage or not on web, try AsyncStorage
    if (!token || !userStr) {
      token = await AsyncStorage.getItem('token');
      userStr = await AsyncStorage.getItem('user');
    }

    // Only parse and return if both token and userStr exist
    if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
      try {
        const parsedUser = JSON.parse(userStr);
        if (parsedUser && typeof parsedUser === 'object') {
          return { token, user: parsedUser };
        }
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        // If there's an error parsing, clear the invalid data
        await clearAuthData();
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting stored auth data:', error);
    return null;
  }
};

// Helper function to store auth data
const storeAuthData = async (token: string, userData: any) => {
  try {
    // Store in AsyncStorage
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    // If on web, also store in localStorage
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  } catch (error) {
    console.error('Error storing auth data:', error);
  }
};

// Helper function to clear auth data
const clearAuthData = async () => {
  try {
    // Clear AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');

    // If on web, also clear localStorage
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const authData = await getStoredAuthData();
        if (authData) {
          // Verify token with backend
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
          // Update stored user data if it's different
          if (JSON.stringify(userData) !== JSON.stringify(authData.user)) {
            await storeAuthData(authData.token, userData);
          }
        }
      } catch (err) {
        console.error('Error during auth check:', err);
        // Clear stored data if verification fails
        await clearAuthData();
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
      setLoading(true);
      console.log('Attempting login for user:', username);
      
      const data = await authAPI.login(username, password);
      console.log('Login response:', data);
      
      if (!data || !data.token || !data.user) {
        throw new Error('Invalid response from server');
      }

      // Store auth data in both AsyncStorage and localStorage for web
      console.log('Storing auth data...');
      if (Platform.OS === 'web') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      // Update state
      console.log('Setting user state...');
      setUser(data.user);
      setLoading(false);
      console.log('Login successful');
    } catch (err: any) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
      throw err;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      await clearAuthData();
      setUser(null);
    } catch (err: any) {
      console.error('Error during logout:', err);
      // If it's a network error or server error, still clear local state
      if (!err.response || err.response.status >= 500) {
        await clearAuthData();
        setUser(null);
      }
      throw err;
    } finally {
      setLoading(false);
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