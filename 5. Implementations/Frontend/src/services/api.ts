import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { UserRole } from '../navigation/types';

//const BASE_URL = 'https://triple-threat-plus-one.onrender.com/api';
const BASE_URL = 'http://localhost:5000/api';

// Helper function to store auth data
const storeAuthData = async (token: string, userData: any) => {
  try {
    // Store in AsyncStorage for mobile
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    // Store in localStorage for web
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
    
    // Clear localStorage for web
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased to 15 seconds for cloud deployment
});

// Add token to requests if it exists
api.interceptors.request.use(async (config) => {
  try {
    // Try AsyncStorage first
    let token = await AsyncStorage.getItem('token');
    
    // If no token in AsyncStorage and we're on web, try localStorage
    if (!token && Platform.OS === 'web') {
      token = localStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding token to request:', error);
    return config;
  }
});

// Add error handling
api.interceptors.response.use(
  response => response,
  async error => {
    if (!error.response || error.code === 'ECONNABORTED') {
      console.error('Network error or timeout:', error);
      throw new Error('Unable to connect to the server. Please check your connection.');
    }
    throw error;
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    try {
      console.log('Making login request to:', `${BASE_URL}/auth/login`);
      const response = await api.post('/auth/login', { username, password });
      console.log('Raw login response:', response);

      if (!response.data || !response.data.token) {
        throw new Error('Invalid response format from server');
      }

      // Ensure we have a proper user object
      const userData = response.data.user || response.data;
      if (!userData || !userData.role) {
        throw new Error('Invalid user data received');
      }

      // Store the token after successful login
      const token = response.data.token;
      await storeAuthData(token, userData);

      return {
        token,
        user: userData
      };
    } catch (error: any) {
      console.error('Login request failed:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      console.log('Fetching current user...');
      const response = await api.get('/auth/me');
      console.log('Current user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Add the device's time to the request headers
      const deviceTime = new Date().toISOString();
      const token = await AsyncStorage.getItem('token') || localStorage.getItem('token');
      
      console.log('Logging out user...');
      const response = await api.post('/auth/logout', {}, {
        headers: {
          'x-device-time': deviceTime,
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Clear all stored auth data
      await clearAuthData();
      console.log('Logout successful');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
};

interface CreateUserData {
  username: string;
  email: string;
  role: UserRole;
  userId: string;
}

interface UpdateUserData {
  username: string;
  email: string;
  role: UserRole;
  userId: string;
}

// User API
export const userAPI = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  createUser: async (userData: CreateUserData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  updateUser: async (id: string, userData: UpdateUserData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id: string) => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      const response = await api.delete(`/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        data: {
          requestingUserId: currentUser._id
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Delete user error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },
};

// Log API
export const logAPI = {
  getLoginLogs: async () => {
    const response = await api.get('/logs');
    return response.data;
  },
  getUserLoginHistory: async (userId: string) => {
    const response = await api.get(`/logs/user/${userId}`);
    return response.data;
  },
  getUserActivityLogs: async () => {
    const response = await api.get('/logs/activity');
    return response.data;
  },
  clearLogs: async () => {
    console.log('Sending clear logs request...');
    const token = localStorage.getItem('token');
    console.log('Token:', token);
    if (!token) {
      throw new Error('No authorization token found');
    }
    const response = await api.delete('/logs/clear', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Clear logs response:', response.data);
    return response.data;
  }
};

// Class API
export const classAPI = {
  getClasses: async () => {
    const response = await api.get('/classes');
    return response.data;
  },

  createClass: async (classData: any) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  updateClass: async (id: string, classData: any) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  deleteClass: async (id: string) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },
};

// Student API
export interface Student {
  _id: string;
  classId: string;
  studentId: string;
  surname: string;
  firstName: string;
  middleInitial?: string;
}

export const studentAPI = {
  getStudentsByClass: async (classId: string) => {
    const res = await api.get<Student[]>(`/students/${classId}`);
    return res.data;
  },
  addStudent: async (student: Omit<Student, '_id'>) => {
    const res = await api.post<Student>('/students', student);
    return res.data;
  },
  updateStudent: async (id: string, student: Partial<Student>) => {
    const res = await api.put<Student>(`/students/${id}`, student);
    return res.data;
  },
  deleteStudent: async (id: string) => {
    await api.delete(`/students/${id}`);
  },
};

export interface Attendance {
  _id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  recordedVia?: 'qr' | 'manual' | 'system';
  deviceInfo?: string;
  ipAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const attendanceAPI = {
  // Test connection to the server
  async testConnection(): Promise<boolean> {
    try {
      // Step 1: Try the Render deployed endpoint
      console.log('Testing connection to Render deployment...');
      try {
        const rootResponse = await axios.get('https://triple-threat-plus-one.onrender.com/');
        console.log('Render connection successful:', rootResponse.data);
        api.defaults.baseURL = BASE_URL;
        return true;
      } catch (renderError) {
        console.error('Render connection failed:', renderError);
      }
      
      // Step 2: Try local development fallback
      try {
        const localResponse = await axios.get('http://localhost:5000/');
        console.log('Local connection successful:', localResponse.data);
        api.defaults.baseURL = 'http://localhost:5000/api';
        return true;
      } catch (localError) {
        console.error('Local connection failed');
      }
      
      // Step 3: Try alternative local
      try {
        const altResponse = await axios.get('http://127.0.0.1:5000/');
        console.log('Alternative local connection successful:', altResponse.data);
        api.defaults.baseURL = 'http://127.0.0.1:5000/api';
        return true;
      } catch (altError) {
        console.error('Alternative local connection failed');
      }
      
      throw new Error('All connection attempts failed');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  },

  async submitAttendance(data: { 
    classId: string; 
    studentId: string;
    studentName?: string;
    timestamp?: string; 
    status?: 'present' | 'absent' | 'late';
    recordedVia?: 'qr' | 'manual' | 'system';
    deviceInfo?: string;
    ipAddress?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }): Promise<Attendance> {
    try {
      const deviceInfo = Platform.OS === 'web' 
        ? navigator.userAgent 
        : `${Platform.OS} ${Platform.Version}`;
      
      // Add device info to the request
      const requestData = {
        ...data,
        deviceInfo: data.deviceInfo || deviceInfo,
        timestamp: data.timestamp || new Date().toISOString(),
        recordedVia: data.recordedVia || 'qr'
      };
      
      // Get token explicitly for troubleshooting
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found when submitting attendance');
        throw new Error('Authentication token missing. Please log in again.');
      }
      
      console.log('Submitting attendance with token:', token.substring(0, 10) + '...');
      console.log('Request data:', JSON.stringify(requestData));
      console.log('Using API URL:', api.defaults.baseURL);
      
      try {
        // First try without the additional Authorization header (rely on the interceptor)
        const response = await api.post('/attendance', requestData);
        console.log('Attendance submission successful:', response.data);
        return response.data.attendance;
      } catch (initialError: any) {
        console.log('Initial request failed, trying with explicit Authorization header');
        
        // If that fails, try with explicit headers
        const response = await api.post('/attendance', requestData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Attendance submission successful with explicit header:', response.data);
        return response.data.attendance;
      }
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      
      // Network connection errors
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - server might be slow or unreachable');
        throw new Error('Connection timeout. Server is not responding.');
      }
      
      if (!error.response) {
        console.error('Network error - no response from server');
        throw new Error('Network error. Cannot connect to the attendance server.');
      }
      
      if (error.response) {
        console.error('Server response:', error.response.status, error.response.data);
        if (error.response.status === 401 || error.response.status === 403) {
          // Handle authentication errors
          AsyncStorage.removeItem('token'); // Clear invalid token
          throw new Error('Authentication failed. Please log in again.');
        } else if (error.response.status === 404) {
          throw new Error('Server endpoint not found. Ensure backend server is running at ' + api.defaults.baseURL);
        }
      }
      
      throw error;
    }
  },

  async getAttendanceByClass(classId: string, date?: string): Promise<{attendance: Attendance[], stats: any}> {
    try {
      const url = date 
        ? `/attendance/class/${classId}?date=${date}` 
        : `/attendance/class/${classId}`;
        
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Return empty response rather than throwing
      return { attendance: [], stats: { total: 0, present: 0, absent: 0, late: 0 } };
    }
  },

  async getAttendanceByStudent(studentId: string, classId?: string, startDate?: string, endDate?: string): Promise<{attendance: Attendance[], stats: any}> {
    try {
      let url = `/attendance/student/${studentId}`;
      const params = [];
      
      if (classId) params.push(`classId=${classId}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { 
        attendance: [], 
        stats: { total: 0, present: 0, absent: 0, late: 0, presentPercentage: 0 } 
      };
    }
  },

  async getStudentAttendanceStatus(classId: string, studentId: string, date?: string): Promise<{ status: 'present' | 'absent' | 'late' }> {
    try {
      let url = `/attendance/status/${classId}/${studentId}`;
      if (date) {
        url += `?date=${date}`;
      }
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance status:', error);
      return { status: 'absent' };
    }
  },
  
  async bulkUpdateAttendance(classId: string, records: Array<{studentId: string, status: 'present' | 'absent' | 'late'}>, date?: string): Promise<any> {
    try {
      const response = await api.post('/attendance/bulk', {
        classId,
        records,
        date
      });
      return response.data;
    } catch (error) {
      console.error('Error updating attendance in bulk:', error);
      throw error;
    }
  },

  getAllAttendance: async () => {
    try {
      const response = await api.get('/attendance/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all attendance:', error);
      throw error;
    }
  },
};

export const reportAPI = {
  async saveReport(reportData: {
    date: string;
    className: string;
    subjectCode: string;
    classId: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    students: Array<{
      studentId: string;
      studentName: string;
      status: 'present' | 'absent' | 'late';
    }>;
  }) {
    try {
      const response = await api.post('/reports', reportData);
      return response.data;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  },

  async getReportsByClass(classId: string, startDate?: string, endDate?: string) {
    try {
      let url = `/reports/class/${classId}`;
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching class reports:', error);
      throw error;
    }
  },

  async getAllReports(startDate?: string, endDate?: string) {
    try {
      let url = '/reports';
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching all reports:', error);
      throw error;
    }
  },

  async deleteReport(reportId: string) {
    try {
      const response = await api.delete(`/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }
};

export default api; 