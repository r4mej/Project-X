import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { UserRole } from '../navigation/types';

// Allow both HTTP and HTTPS options with fallbacks
// Try different connection options
const API_URLS = [
  'http://localhost:5000/api',    // Standard localhost
  'http://127.0.0.1:5000/api',    // IP address version
  'https://localhost:5000/api',   // HTTPS version (if enabled)
];

// Create axios instance
const api = axios.create({
  baseURL: API_URLS[0], // Start with the first option
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add a function to try different URLs if the primary fails
const tryAlternativeUrls = async (config: any, originalError: any) => {
  // Don't retry if it was an auth error
  if (originalError.response && (originalError.response.status === 401 || originalError.response.status === 403)) {
    return Promise.reject(originalError);
  }
  
  // Try alternative URLs if it's a connection error
  for (let i = 1; i < API_URLS.length; i++) {
    try {
      console.log(`Trying alternative API URL: ${API_URLS[i]}`);
      const newConfig = { ...config, baseURL: API_URLS[i] };
      return await axios(newConfig);
    } catch (error) {
      console.log(`Alternative URL ${API_URLS[i]} failed too`);
    }
  }
  
  // If all alternatives fail, reject with the original error
  return Promise.reject(originalError);
};

// Add error handling and retry mechanism
api.interceptors.response.use(
  response => response,
  async error => {
    // Network error or timeout
    if (!error.response || error.code === 'ECONNABORTED') {
      console.log('Connection error, trying alternative URLs');
      return tryAlternativeUrls(error.config, error);
    }
    return Promise.reject(error);
  }
);

// Add token to requests if it exists
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding token to request:', error);
    return config;
  }
});

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    // Store the token after successful login
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    try {
      // Add the device's time to the request headers
      const deviceTime = new Date().toISOString();
      const token = await AsyncStorage.getItem('token');
      const response = await api.post('/auth/logout', {}, {
        headers: {
          'x-device-time': deviceTime,
          'Authorization': `Bearer ${token}`
        }
      });
      // Clear the token after successful logout
      await AsyncStorage.removeItem('token');
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
      // Step 1: Try the root endpoint first (simplest)
      console.log('Testing connection to server root...');
      try {
        const rootResponse = await axios.get('http://localhost:5000/');
        console.log('Root connection successful:', rootResponse.data);
        api.defaults.baseURL = 'http://localhost:5000/api';
        return true;
      } catch (rootError) {
        console.error('Root connection failed');
      }
      
      // Step 2: Try alternative root
      try {
        const rootResponse = await axios.get('http://127.0.0.1:5000/');
        console.log('Alternative root connection successful:', rootResponse.data);
        api.defaults.baseURL = 'http://127.0.0.1:5000/api';
        return true;
      } catch (altRootError) {
        console.error('Alternative root connection failed');
      }
      
      // Step 3: Try the general API test endpoint
      try {
        console.log('Testing connection to general API endpoint...');
        const apiResponse = await axios.get('http://localhost:5000/api/test');
        console.log('API test connection successful:', apiResponse.data);
        api.defaults.baseURL = 'http://localhost:5000/api';
        return true;
      } catch (apiError) {
        console.error('API test connection failed');
      }
      
      // Step 4: As a last resort, try the attendance test
      console.log('Testing connection to attendance API...');
      const response = await axios.get(`${API_URLS[0]}/attendance/test`);
      console.log('Connection test successful:', response.data);
      return true;
    } catch (error: any) {
      console.error('Connection test failed for primary URL');
      
      // Try alternative URLs
      for (let i = 1; i < API_URLS.length; i++) {
        try {
          console.log(`Testing connection to alternative URL: ${API_URLS[i]}/test`);
          const response = await axios.get(`${API_URLS[i]}/test`);
          console.log(`Connection successful with ${API_URLS[i]}:`, response.data);
          
          // Update the default baseURL to the working one
          api.defaults.baseURL = API_URLS[i];
          console.log('Updated API baseURL to:', API_URLS[i]);
          
          return true;
        } catch (altError) {
          console.error(`Alternative URL ${API_URLS[i]} also failed`);
        }
      }
      
      console.error('All connection attempts failed');
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
      const response = await axios.get(`${API_URLS[0]}/attendance/all`);
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