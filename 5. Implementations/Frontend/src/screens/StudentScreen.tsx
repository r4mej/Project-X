import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClassScheduleCalendar from '../components/ClassScheduleCalendar';
import MyClasses from '../components/student/MyClasses';
import QRScanScreen from '../components/student/QRScanner';
import RecordsScreen from '../components/student/StudentRecord';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { StudentBottomTabParamList, StudentDrawerParamList } from '../navigation/types';
import { Attendance, attendanceAPI, classAPI, instructorDeviceAPI, studentAPI, userAPI } from '../services/api';

// Student theme colors
const STUDENT_COLORS = {
  primary: '#dc2626',          // Main red
  secondary: '#ef4444',        // Lighter red 
  tertiary: '#b91c1c',         // Darker red
  background: '#fef2f2',       // Very light red background
  cardBackground: '#ffffff',   // White for cards
  highlight: '#f87171',        // Highlight red
  text: {
    primary: '#991b1b',        // Dark red for main text
    secondary: '#64748b',      // Gray for secondary text
    light: '#ffffff'           // White text
  },
  border: '#fecaca',           // Light red border
  success: '#4ade80',          // Success green
  error: '#f87171'             // Error red
};

type NavigationProp = CompositeNavigationProp<
  DrawerNavigationProp<StudentDrawerParamList>,
  BottomTabNavigationProp<StudentBottomTabParamList>
>;
const Tab = createBottomTabNavigator<StudentBottomTabParamList>();

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 3;
const INDICATOR_WIDTH = 24;
const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size?: number;
}

const TabIcon = ({ name, focused, size = 24 }: TabIconProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 10,
    }).start();
  }, [focused]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap}
          size={size}
          color={focused ? STUDENT_COLORS.text.light : 'rgba(255, 255, 255, 0.6)'}
        />
      </Animated.View>
    </View>
  );
};

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  presentPercentage: number;
}

interface ClassSchedule {
  _id: string;
  className: string;
  subjectCode: string;
  room: string;
  instructor: string;
  schedules: Array<{
    days: string[];
    startTime: string;
    endTime: string;
    startPeriod: string;
    endPeriod: string;
  }>;
}

const StudentDashboard: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    presentPercentage: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [todayStatus, setTodayStatus] = useState<'present' | 'absent' | 'late' | 'not recorded'>('not recorded');
  const [todayClasses, setTodayClasses] = useState<ClassSchedule[]>([]);
  const [recentSubject, setRecentSubject] = useState<{
    subjectCode: string;
    className: string;
    timestamp: string;
  } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [instructorList, setInstructorList] = useState<{userId: string, username: string}[]>([]);
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<{userId: string, username: string} | null>(null);
  const [instructorLocation, setInstructorLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      console.log('Fetching attendance data due to user or refresh change');
      fetchAttendanceData();
      fetchTodaySchedule();
    }
    fetchClasses();
  }, [user, refreshKey]);
  
  // Add a dedicated effect for handling just refreshKey changes
  // This ensures attendance is refreshed even when user is already loaded
  useEffect(() => {
    if (user?.userId && refreshKey > 0) {
      console.log('Refreshing attendance data due to refreshKey change:', refreshKey);
      // Small delay to ensure backend has processed any new attendance data
      setTimeout(() => {
        fetchAttendanceData();
      }, 500);
    }
  }, [refreshKey]);

  // Add a new useEffect to fetch instructors and use refreshKey
  useEffect(() => {
    if (user?.userId) {
      fetchInstructors();
    }
  }, [user, refreshKey]);

  const fetchInstructors = async () => {
    try {
      let instructorList: {userId: string, username: string}[] = [];
      
      try {
        // First try to get all users who are instructors
        const instructorUsers = await userAPI.getUsers();
        
        // Filter users with instructor role
        instructorList = instructorUsers
          .filter((user: any) => user.role === 'instructor')
          .map((instructor: any) => ({
            userId: instructor.userId,
            username: instructor.username
          }));
        
        // If we have instructors, use them
        if (instructorList.length > 0) {
          setInstructorList(instructorList);
          return; // Exit early if we found instructors this way
        }
      } catch (userApiError) {
        // Silently fail if user doesn't have permission to get all users
        console.log('Falling back to class-based instructor fetching');
      }
      
      // Fallback to getting instructors from classes
      const classesData = await classAPI.getClasses();
      
      // Debug: Log the first class to see its structure
      if (classesData && classesData.length > 0) {
        console.log('Class data structure sample:', classesData[0]);
      } else {
        console.log('No classes found');
      }
      
      // Extract unique instructors from classes (with more comprehensive field checking)
      const instructors = new Map();
      
      // First try classes assigned to the student
      const enrolledClasses = await Promise.all(
        classesData.map(async (classItem: any) => {
          try {
            const students = await studentAPI.getStudentsByClass(classItem._id);
            const isEnrolled = students.some(student => student.studentId === user!.userId);
            return isEnrolled ? classItem : null;
          } catch (error) {
            console.log(`Error checking enrollment for class ${classItem._id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null values and process enrolled classes first
      const validEnrolledClasses = enrolledClasses.filter(c => c !== null);
      
      // Process enrolled classes first (higher priority)
      validEnrolledClasses.forEach((classItem: any) => {
        // Check for direct instructor fields
        if (classItem.instructorId && classItem.instructorName) {
          instructors.set(classItem.instructorId, {
            userId: classItem.instructorId,
            username: classItem.instructorName
          });
        } 
        // Check for instructor field
        else if (classItem.instructor) {
          // If instructor is a string, use it as the name
          if (typeof classItem.instructor === 'string') {
            // Generate a userId from the name if needed
            const instructorId = `instructor_${classItem.instructor.replace(/\s+/g, '_').toLowerCase()}`;
            instructors.set(instructorId, {
              userId: instructorId,
              username: classItem.instructor
            });
          }
          // If instructor is an object, extract id and name
          else if (typeof classItem.instructor === 'object' && classItem.instructor !== null) {
            const id = classItem.instructor._id || classItem.instructor.userId || classItem.instructor.id;
            const name = classItem.instructor.name || classItem.instructor.username;
            
            if (id && name) {
              instructors.set(id, {
                userId: id,
                username: name
              });
            }
          }
        }
      });
      
      // If we didn't find any instructors from enrolled classes, process all classes
      if (instructors.size === 0) {
        classesData.forEach((classItem: any) => {
          // Check for direct instructor fields
          if (classItem.instructorId && classItem.instructorName) {
            instructors.set(classItem.instructorId, {
              userId: classItem.instructorId,
              username: classItem.instructorName
            });
          } 
          // Check for instructor field
          else if (classItem.instructor) {
            // If instructor is a string, use it as the name
            if (typeof classItem.instructor === 'string') {
              // Generate a userId from the name if needed
              const instructorId = `instructor_${classItem.instructor.replace(/\s+/g, '_').toLowerCase()}`;
              instructors.set(instructorId, {
                userId: instructorId,
                username: classItem.instructor
              });
            }
            // If instructor is an object, extract id and name
            else if (typeof classItem.instructor === 'object' && classItem.instructor !== null) {
              const id = classItem.instructor._id || classItem.instructor.userId || classItem.instructor.id;
              const name = classItem.instructor.name || classItem.instructor.username;
              
              if (id && name) {
                instructors.set(id, {
                  userId: id,
                  username: name
                });
              }
            }
          }
        });
      }
      
      // Convert Map to array
      const extractedInstructors = Array.from(instructors.values());
      if (extractedInstructors.length > 0) {
        setInstructorList(extractedInstructors);
      } else {
        console.warn('No instructors found in users or classes');
        
        // Last resort: Create a default list of active instructors
        const defaultInstructors = [
          { userId: 'default_instructor_1', username: 'Prof. Smith' },
          { userId: 'default_instructor_2', username: 'Prof. Johnson' }
        ];
        setInstructorList(defaultInstructors);
        console.log('Using default instructor list as fallback');
      }
    } catch (error) {
      console.error('Error fetching instructors:', error);
      // Don't show alert to user for this background operation
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const todayDate = new Date();
      const today = todayDate.toISOString().split('T')[0];
      console.log('Today\'s date:', today);
      
      // Get attendance for the current semester (last 4 months or beginning of the year if it's early in the year)
      const startDate = new Date();
      const currentMonth = startDate.getMonth(); // 0-based (0 = January)
      
      // If we're in the first 4 months of the year, start from January 1st
      // Otherwise, go back 4 months
      if (currentMonth < 4) { // January to April
        startDate.setMonth(0); // January
        startDate.setDate(1);  // 1st day
      } else {
        startDate.setMonth(startDate.getMonth() - 4);
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      console.log('Using date range for attendance:', startDateStr, 'to', today);
      
      // Fetch attendance data for the student
      const { attendance, stats } = await attendanceAPI.getAttendanceByStudent(
        user!.userId,
        undefined,
        startDateStr,
        today
      );

      console.log('Fetched attendance data:', { attendance, stats });

      // Calculate attendance statistics - handle different possible API response formats
      let totalAttendance = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      
      if (stats) {
        // Handle different possible API response formats
        if (typeof stats.total === 'number') {
          totalAttendance = stats.total;
        } else if (stats.present !== undefined || stats.absent !== undefined || stats.late !== undefined) {
          // If no total is provided but individual counts are, calculate total
          presentCount = stats.present || 0;
          absentCount = stats.absent || 0;
          lateCount = stats.late || 0;
          totalAttendance = presentCount + absentCount + lateCount;
        }
        
        // If we have counts but no totalAttendance yet, calculate it
        if (totalAttendance === 0 && (presentCount > 0 || absentCount > 0 || lateCount > 0)) {
          totalAttendance = presentCount + absentCount + lateCount;
        }
        
        // Make sure we have the individual counts
        if (stats.present !== undefined) presentCount = stats.present;
        if (stats.absent !== undefined) absentCount = stats.absent;
        if (stats.late !== undefined) lateCount = stats.late;
      }
      
      console.log('Calculated attendance stats:', { totalAttendance, presentCount, absentCount, lateCount });
      
      const presentPercentage = totalAttendance > 0 
        ? Math.round((presentCount / totalAttendance) * 100) 
        : 0;

      setAttendanceStats({
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        presentPercentage
      });

      // Get recent attendance records
      const sortedAttendance = attendance.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentAttendance(sortedAttendance.slice(0, 5));

      // Check for today's attendance records
      const todayAttendance = attendance.find(record => {
        const recordDate = record.timestamp.split('T')[0];
        console.log(`Comparing record date ${recordDate} to today ${today}`);
        return recordDate === today;
      });
      
      if (todayAttendance) {
        console.log('Today\'s attendance found:', todayAttendance);
        
        // Make status lowercase to ensure consistency
        const normalizedStatus = todayAttendance.status.toLowerCase();
        setTodayStatus(normalizedStatus === 'present' ? 'present' :
                      normalizedStatus === 'late' ? 'late' :
                      normalizedStatus === 'absent' ? 'absent' : 'not recorded');
        
        // Handle both object and string classId formats
        if (todayAttendance.classId) {
          if (typeof todayAttendance.classId === 'object') {
            console.log('ClassId is an object:', todayAttendance.classId);
            const classInfo = todayAttendance.classId as unknown as { subjectCode: string; className: string };
            setRecentSubject({
              subjectCode: classInfo.subjectCode,
              className: classInfo.className,
              timestamp: todayAttendance.timestamp
            });
          } else if (typeof todayAttendance.classId === 'string') {
            // If we only have the classId as a string, try to fetch class information
            console.log('ClassId is a string, fetching class details:', todayAttendance.classId);
            try {
              const classData = await classAPI.getClassById(todayAttendance.classId);
              if (classData) {
                setRecentSubject({
                  subjectCode: classData.subjectCode,
                  className: classData.className,
                  timestamp: todayAttendance.timestamp
                });
              }
            } catch (error) {
              console.error('Error fetching class details:', error);
            }
          }
        }
      } else {
        console.log('No attendance record found for today');
        setTodayStatus('not recorded');
        setRecentSubject(null);
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySchedule = async () => {
    try {
      const allClasses = await classAPI.getClasses();
      const today = new Date();
      const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      
      // Helper function to convert day name to abbreviation
      const getDayAbbreviation = (day: string): string => {
        switch (day.toUpperCase()) {
          case 'MONDAY': return 'M';
          case 'TUESDAY': return 'T';
          case 'WEDNESDAY': return 'W';
          case 'THURSDAY': return 'TH';
          case 'FRIDAY': return 'F';
          case 'SATURDAY': return 'S';
          default: return '';
        }
      };

      // Get enrolled classes
      const enrolledClasses = await Promise.all(
        allClasses.map(async (classItem: ClassSchedule) => {
          const students = await studentAPI.getStudentsByClass(classItem._id);
          const isEnrolled = students.some(student => student.studentId === user!.userId);
          return isEnrolled ? classItem : null;
        })
      );

      // Filter out null values and classes without schedules
      const validClasses = enrolledClasses
        .filter((classItem): classItem is ClassSchedule => 
          classItem !== null && 
          classItem.schedules && 
          classItem.schedules.length > 0
        );

      // Filter classes for today
      const todaySchedule = validClasses.filter((classItem: ClassSchedule) => 
        classItem.schedules.some((schedule: ClassSchedule['schedules'][0]) => 
          schedule.days.includes(getDayAbbreviation(currentDay))
        )
      );

      // Sort by start time
      todaySchedule.sort((a: ClassSchedule, b: ClassSchedule) => {
        const aTime = a.schedules[0]?.startTime || '';
        const bTime = b.schedules[0]?.startTime || '';
        const aIsPM = a.schedules[0]?.startPeriod === 'PM';
        const bIsPM = b.schedules[0]?.startPeriod === 'PM';
        
        const aHour = parseInt(aTime.split(':')[0]);
        const bHour = parseInt(bTime.split(':')[0]);
        
        const a24Hour = aIsPM && aHour !== 12 ? aHour + 12 : aHour;
        const b24Hour = bIsPM && bHour !== 12 ? bHour + 12 : bHour;
        
        return a24Hour - b24Hour;
      });

      setTodayClasses(todaySchedule);
    } catch (error) {
      console.error('Error fetching today\'s schedule:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classAPI.getClasses();
      setClasses(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: 'scan' | 'schedule' | 'track') => {
    if (action === 'scan') {
      setShowQRScanner(true);
    } else if (action === 'schedule') {
      setShowScheduleModal(true);
    } else if (action === 'track') {
      setShowInstructorModal(true);
    }
  };

  const isOngoing = (schedule: ClassSchedule['schedules'][0]) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    const convertTo24Hour = (time: string, period: string) => {
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const currentMinutes = convertTo24Hour(
      currentTime.split(' ')[0],
      currentTime.split(' ')[1]
    );
    const startMinutes = convertTo24Hour(schedule.startTime, schedule.startPeriod);
    const endMinutes = convertTo24Hour(schedule.endTime, schedule.endPeriod);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const getStatusColor = (status: string) => {
    // Normalize status to lowercase for case-insensitive comparison
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'present':
        return STUDENT_COLORS.primary; // Use red theme for present
      case 'late':
        return '#FF9800';
      case 'absent':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Track instructor location
  const trackInstructor = async (instructor: {userId: string, username: string}) => {
    try {
      setSelectedInstructor(instructor);
      setIsLoadingLocation(true);
      
      // If using a default instructor (has default_ prefix), show appropriate message
      if (instructor.userId.startsWith('default_')) {
        setShowInstructorModal(false);
        Alert.alert(
          'Demo Mode', 
          `This is a demonstration feature. In a production environment, you would see ${instructor.username}'s real-time location.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      const location = await instructorDeviceAPI.getInstructorLocation(instructor.userId);
      
      if (!location) {
        throw new Error('No location data available');
      }
      
      setInstructorLocation(location);
      
      // Open maps app with the location
      if (location && location.latitude && location.longitude) {
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const latLng = `${location.latitude},${location.longitude}`;
        const label = `${instructor.username}'s Location`;
        const url = Platform.select({
          ios: `${scheme}?q=${label}&ll=${latLng}`,
          android: `${scheme}0,0?q=${latLng}(${label})`
        });
        
        if (url) {
          const supported = await Linking.canOpenURL(url);
          
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Maps App', 'Could not open maps application. Please make sure you have a maps app installed.');
          }
        }
      } else {
        throw new Error('Invalid location data');
      }
    } catch (error: any) {
      console.error('Error tracking instructor:', error);
      
      // Close the modal first for better UX
      setShowInstructorModal(false);
      
      // Show more specific and helpful error messages
      if (error.response?.status === 404) {
        Alert.alert('Location Unavailable', `${instructor.username} has no registered devices for tracking.`);
      } else if (error.response?.data?.message) {
        Alert.alert('Location Error', error.response.data.message);
      } else if (error.message) {
        Alert.alert('Location Error', error.message);
      } else {
        Alert.alert('Error', 'Could not retrieve instructor location. Please try again later.');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              triggerRefresh();
              Alert.alert("Refreshed", "Click OK...");
            }}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
        {user?.userId && (
          <View style={styles.studentIdContainer}>
            <Text style={styles.studentIdLabel}>Student ID:</Text>
            <Text style={styles.studentIdValue}>{user.userId}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Quick Actions Card */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: STUDENT_COLORS.primary }]}>Quick Actions</Text>
            <Text style={[styles.subTitle, { color: STUDENT_COLORS.text.secondary }]}>Access frequently used features</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#fecaca', borderColor: STUDENT_COLORS.primary }]}
                onPress={() => handleQuickAction('scan')}
              >
                <Ionicons name="qr-code" size={22} color={STUDENT_COLORS.primary} />
                <Text style={[styles.actionText, { color: STUDENT_COLORS.primary }]}>Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#fecaca', borderColor: STUDENT_COLORS.primary }]}
                onPress={() => handleQuickAction('schedule')}
              >
                <Ionicons name="calendar" size={22} color={STUDENT_COLORS.primary} />
                <Text style={[styles.actionText, { color: STUDENT_COLORS.primary }]}>Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#fecaca', borderColor: STUDENT_COLORS.primary }]}
                onPress={() => handleQuickAction('track')}
                disabled={instructorList.length === 0}
              >
                <Ionicons name="location" size={22} color={instructorList.length === 0 ? '#ccc' : STUDENT_COLORS.primary} />
                <Text style={[styles.actionText, { color: instructorList.length === 0 ? '#ccc' : STUDENT_COLORS.primary }]}>
                  Track
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance Overview */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: STUDENT_COLORS.primary }]}>Attendance Overview</Text>
            <Text style={[styles.subTitle, { color: STUDENT_COLORS.text.secondary }]}>Your semester attendance status</Text>
            <View style={[styles.attendanceCircle, { borderColor: STUDENT_COLORS.primary }]}>
              <Text style={[styles.attendancePercentage, { color: STUDENT_COLORS.primary }]}>
                {attendanceStats.presentPercentage}%
              </Text>
              <Text style={[styles.attendanceLabel, { color: STUDENT_COLORS.text.secondary }]}>Attendance</Text>
            </View>
            
            <View style={styles.semesterStats}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: STUDENT_COLORS.text.secondary }]}>Total Classes:</Text>
                <Text style={[styles.statValue, { color: STUDENT_COLORS.text.primary }]}>{attendanceStats.total}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: STUDENT_COLORS.text.secondary }]}>Present:</Text>
                <Text style={[styles.statValue, { color: STUDENT_COLORS.success }]}>{attendanceStats.present}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: STUDENT_COLORS.text.secondary }]}>Absent:</Text>
                <Text style={[styles.statValue, { color: STUDENT_COLORS.error }]}>{attendanceStats.absent}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: STUDENT_COLORS.text.secondary }]}>Late:</Text>
                <Text style={[styles.statValue, { color: STUDENT_COLORS.tertiary }]}>{attendanceStats.late}</Text>
              </View>
            </View>
          </View>

          {/* Today's Status Card */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: STUDENT_COLORS.primary }]}>Today's Status</Text>
            <Text style={[styles.subTitle, { color: STUDENT_COLORS.text.secondary }]}>Your attendance for today</Text>
            <View style={styles.todayStatusContainer}>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: getStatusColor(todayStatus),
                  transform: [{ scale: 1.1 }],
                  marginBottom: 12
                }
              ]}>
                <Text style={styles.statusText}>{todayStatus === 'not recorded' ? 'Not Recorded' : todayStatus}</Text>
              </View>
              <Text style={[styles.statusInfo, { 
                color: STUDENT_COLORS.text.secondary,
                fontWeight: '500'
              }]}>
                {todayStatus === 'not recorded' 
                  ? 'No attendance has been recorded for today'
                  : 'Your attendance has been recorded for today'
                }
              </Text>
            </View>
          </View>

          {/* Today's Classes */}
          <View style={styles.card}>
            <View style={styles.scheduleTitleRow}>
              <Text style={[styles.cardTitle, { color: STUDENT_COLORS.primary }]}>Today's Classes</Text>
              <View style={[styles.currentDayBadge, { backgroundColor: STUDENT_COLORS.primary }]}>
                <Text style={styles.currentDayText}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
              </View>
            </View>
            <Text style={[styles.subTitle, { color: STUDENT_COLORS.text.secondary }]}>Your scheduled classes for today</Text>
            
            {todayClasses.length > 0 ? (
              <View style={styles.todayClassesList}>
                {todayClasses.map((classItem, index) => {
                  const ongoingSchedule = classItem.schedules.find(schedule => isOngoing(schedule));
                  const isCurrentlyOngoing = !!ongoingSchedule;
                  
                  return (
                    <View 
                      key={classItem._id} 
                      style={[
                        styles.classCard, 
                        { 
                          backgroundColor: isCurrentlyOngoing ? '#fee2e2' : STUDENT_COLORS.cardBackground,
                          borderLeftColor: isCurrentlyOngoing ? STUDENT_COLORS.primary : STUDENT_COLORS.border
                        }
                      ]}
                    >
                      <Text style={[styles.subjectCode, { color: STUDENT_COLORS.primary }]}>
                        {classItem.subjectCode}
                      </Text>
                      <Text style={[styles.todayClassName, { color: STUDENT_COLORS.text.primary }]}>{classItem.className}</Text>
                      
                      {classItem.schedules.map((schedule, idx) => (
                        <Text key={idx} style={[styles.todayClassTime, { color: STUDENT_COLORS.text.secondary }]}>
                          {schedule.startTime}{schedule.startPeriod} - {schedule.endTime}{schedule.endPeriod}
                        </Text>
                      ))}
                      
                      <View style={styles.todayClassDetails}>
                        <View style={styles.todayDetailItem}>
                          <Ionicons name="location-outline" size={16} color={STUDENT_COLORS.text.secondary} />
                          <Text style={[styles.todayDetailText, { color: STUDENT_COLORS.text.secondary }]}>{classItem.room}</Text>
                        </View>
                        <View style={styles.todayDetailItem}>
                          <Ionicons name="person-outline" size={16} color={STUDENT_COLORS.text.secondary} />
                          <Text style={[styles.todayDetailText, { color: STUDENT_COLORS.text.secondary }]}>{classItem.instructor}</Text>
                        </View>
                      </View>
                      
                      {isCurrentlyOngoing && (
                        <View style={[styles.statusBadge, { backgroundColor: STUDENT_COLORS.primary }]}>
                          <Text style={styles.statusText}>Ongoing</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noClassesContainer}>
                <Ionicons name="calendar-outline" size={48} color={STUDENT_COLORS.text.secondary} />
                <Text style={[styles.noClassesText, { color: STUDENT_COLORS.text.secondary }]}>No classes scheduled for today</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Schedule Calendar Modal */}
      <ClassScheduleCalendar
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        classes={classes}
      />

      {/* QR Scanner Modal */}
      <QRScanScreen
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />

      {/* Instructor Selection Modal */}
      <Modal
        visible={showInstructorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInstructorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Instructor</Text>
              <TouchableOpacity onPress={() => setShowInstructorModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {isLoadingLocation ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#dc2626" />
                <Text style={styles.loadingText}>Getting instructor location...</Text>
              </View>
            ) : instructorList.length === 0 ? (
              <Text style={styles.noInstructorsText}>No instructors available</Text>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Select an instructor to view their current location
                </Text>
                {instructorLocation && (
                  <View style={styles.lastTrackingInfo}>
                    <Text style={styles.lastTrackingText}>
                      Last tracked: {selectedInstructor?.username} - {
                        new Date(instructorLocation.timestamp).toLocaleTimeString()
                      }
                    </Text>
                  </View>
                )}
                {instructorList.map((instructor) => (
                  <TouchableOpacity
                    key={instructor.userId}
                    style={styles.instructorItem}
                    onPress={() => {
                      trackInstructor(instructor);
                    }}
                  >
                    <View style={styles.instructorInfo}>
                      <Ionicons name="person" size={24} color="#dc2626" />
                      <Text style={styles.instructorName}>{instructor.username}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const AttendanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <Text>Attendance Screen Coming Soon</Text>
      </View>
    </View>
  );
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <Text>Profile Screen Coming Soon</Text>
      </View>
    </View>
  );
};

const StudentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('StudentDashboard');
  const { user, login } = useAuth();

  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      // Try AsyncStorage first
      let storedUser = await AsyncStorage.getItem('user');
      let token = await AsyncStorage.getItem('token');
      
      // If we're on web and don't have credentials in AsyncStorage, try localStorage
      if (Platform.OS === 'web' && (!storedUser || !token)) {
        storedUser = localStorage.getItem('user');
        token = localStorage.getItem('token');
      }
      
      if (storedUser && token && !user) {
        const userData = JSON.parse(storedUser);
        // Re-authenticate user with stored credentials
        login(userData, token);
      }
    } catch (error) {
      console.error('Error checking stored credentials:', error);
    }
  };

  const handleTabPress = (index: number, tabName: string) => {
    Animated.spring(slideAnim, {
      toValue: (index * TAB_WIDTH) + INDICATOR_OFFSET,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
    setActiveTab(tabName);
  };

  useEffect(() => {
    // Initialize line position to first tab
    slideAnim.setValue(INDICATOR_OFFSET);
  }, []);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'StudentDashboard':
        return 'Dashboard';
      case 'MyClasses':
        return 'My Classes';
      case 'Records':
        return 'Records';
      default:
        return 'Dashboard';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: STUDENT_COLORS.background }]}>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: STUDENT_COLORS.primary,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.2)',
              height: 70,
              paddingTop: 8,
              paddingBottom: 12,
            },
            tabBarShowLabel: false,
            tabBarItemStyle: {
              paddingBottom: 4,
            },
          }}
          screenListeners={({ navigation }) => ({
            tabPress: (e) => {
              const index = navigation.getState().index;
              const route = navigation.getState().routes[index];
              handleTabPress(index, route.name);
            },
          })}
        >
          <Tab.Screen 
            name="StudentDashboard" 
            component={StudentDashboard}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="home" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(0, 'StudentDashboard'),
            }}
          />
          <Tab.Screen 
            name="MyClasses" 
            component={MyClasses}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="book" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(1, 'MyClasses'),
            }}
          />
          <Tab.Screen 
            name="Records" 
            component={RecordsScreen}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="document-text" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(2, 'Records'),
            }}
          />
        </Tab.Navigator>
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            width: INDICATOR_WIDTH,
            height: 3,
            backgroundColor: STUDENT_COLORS.text.light,
            borderRadius: 1.5,
            transform: [{ translateX: slideAnim }],
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: STUDENT_COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: STUDENT_COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: STUDENT_COLORS.background,
  },
  headerContainer: {
    backgroundColor: STUDENT_COLORS.primary,
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    position: 'relative',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: STUDENT_COLORS.text.light,
    textAlign: 'center',
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: STUDENT_COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: STUDENT_COLORS.text.primary,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    color: STUDENT_COLORS.text.secondary,
    marginBottom: 16,
  },
  attendanceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: STUDENT_COLORS.primary,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  attendancePercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: STUDENT_COLORS.primary,
  },
  attendanceLabel: {
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
  },
  semesterStats: {
    marginTop: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    flex: 2,
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
  },
  statValue: {
    flex: 1,
    fontSize: 14,
    color: STUDENT_COLORS.text.primary,
    textAlign: 'right',
  },
  progressBar: {
    flex: 5,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 16,
  },
  statusIconContainer: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'capitalize',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusInfo: {
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
    textAlign: 'center',
  },
  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  studentIdLabel: {
    fontSize: 12,
    color: 'white',
    marginRight: 4,
  },
  studentIdValue: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  attendanceRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordDate: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: STUDENT_COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  noRecordsText: {
    textAlign: 'center',
    color: STUDENT_COLORS.text.secondary,
    fontSize: 14,
    marginTop: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentDayBadge: {
    backgroundColor: STUDENT_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentDayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  classItem: {
    paddingVertical: 12,
  },
  classItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  classCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: STUDENT_COLORS.primary,
  },
  className: {
    fontSize: 14,
    color: STUDENT_COLORS.text.primary,
    marginBottom: 4,
  },
  classTime: {
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: STUDENT_COLORS.text.secondary,
  },
  noClassesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  noClassesText: {
    marginTop: 10,
    fontSize: 16,
    color: STUDENT_COLORS.text.secondary,
    textAlign: 'center',
  },
  recentSubjectInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  recentSubjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: STUDENT_COLORS.primary,
    marginBottom: 4,
  },
  recentSubjectClass: {
    fontSize: 14,
    color: STUDENT_COLORS.text.primary,
    marginBottom: 4,
  },
  recentSubjectTime: {
    fontSize: 12,
    color: STUDENT_COLORS.text.secondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    margin: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: STUDENT_COLORS.primary,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    color: STUDENT_COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: STUDENT_COLORS.text.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
  },
  noInstructorsText: {
    textAlign: 'center',
    color: STUDENT_COLORS.text.secondary,
    fontSize: 14,
    marginTop: 16,
  },
  instructorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: STUDENT_COLORS.primary,
    marginLeft: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  lastTrackingInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  lastTrackingText: {
    fontSize: 13,
    color: STUDENT_COLORS.primary,
    textAlign: 'center',
  },
  todayStatusContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: STUDENT_COLORS.border,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todayClassesList: {
    flex: 1,
  },
  classCard: {
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  subjectCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: STUDENT_COLORS.primary,
    marginBottom: 4,
  },
  todayClassName: {
    fontSize: 14,
    color: STUDENT_COLORS.text.primary,
    marginBottom: 8,
  },
  todayClassTime: {
    fontSize: 14,
    color: STUDENT_COLORS.text.secondary,
    marginBottom: 8,
  },
  todayClassDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  todayDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayDetailText: {
    fontSize: 12,
    color: STUDENT_COLORS.text.secondary,
  },
});

export default StudentScreen; 