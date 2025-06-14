import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, ActivityIndicator } from 'react-native';
import ClassScheduleCalendar from '../components/ClassScheduleCalendar';
import Reports from '../components/instructor/AttendanceReports';
import ClassManager, { Class } from '../components/instructor/ClassManager';
import QRGenerator from '../components/instructor/QRGenerator';
import SubjectSelectionDrawer from '../components/instructor/SubjectSelectionDrawer';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { InstructorBottomTabParamList, InstructorDrawerParamList, RootStackParamList } from '../navigation/types';
import { classAPI, reportAPI, instructorDeviceAPI } from '../services/api';

// Instructor theme colors
const INSTRUCTOR_COLORS = {
  primary: '#2563eb',          // Main blue
  secondary: '#3b82f6',        // Lighter blue 
  tertiary: '#1e40af',         // Darker blue
  background: '#f5f9ff',       // Very light blue background
  cardBackground: '#ffffff',   // White for cards
  highlight: '#60a5fa',        // Highlight blue
  text: {
    primary: '#1e3a8a',        // Dark blue for main text
    secondary: '#64748b',      // Gray for secondary text
    light: '#ffffff'           // White text
  },
  border: '#bfdbfe',           // Light blue border
  success: '#0ea5e9',          // Success blue
  error: '#ef4444'             // Error red
};

type NavigationProp = DrawerNavigationProp<InstructorDrawerParamList>;
const Tab = createBottomTabNavigator<InstructorBottomTabParamList>();

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
          color={focused ? 'white' : 'rgba(255, 255, 255, 0.6)'}
        />
      </Animated.View>
    </View>
  );
};

const InstructorDashboard: React.FC<{ classes: Class[]; attendanceData: { date: string; present: number; absent: number; }[] }> = ({ classes, attendanceData }) => {
  const { user } = useAuth();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [todayClasses, setTodayClasses] = useState<Class[]>([]);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'attendance' | 'view' | 'students'>('attendance');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [classOverview, setClassOverview] = useState({
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
    averageAttendance: 0,
    ongoingClasses: 0
  });
  const [attendanceTaken, setAttendanceTaken] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      console.log('Fetching instructor data due to user or refresh change');
      setIsLoading(true);
      filterTodayClasses();
      calculateClassOverview().finally(() => setIsLoading(false));
    }
  }, [classes, refreshKey, user]);
  
  // Add a dedicated effect for handling just refreshKey changes
  // This ensures data is refreshed even when user is already loaded
  useEffect(() => {
    if (user?.userId && refreshKey > 0) {
      console.log('Refreshing instructor data due to refreshKey change:', refreshKey);
      // Small delay to ensure backend has processed any new data
      setTimeout(() => {
        calculateClassOverview();
      }, 500);
    }
  }, [refreshKey]);

  // Add an effect to handle the attendance taken flag
  useEffect(() => {
    if (attendanceTaken) {
      // Only refresh once when attendance is marked as taken
      triggerRefresh();
      setAttendanceTaken(false);
    }
  }, [attendanceTaken]);

  const getDayAbbreviation = (fullDay: string): string => {
    switch (fullDay.toUpperCase()) {
      case 'MONDAY': return 'M';
      case 'TUESDAY': return 'T';
      case 'WEDNESDAY': return 'W';
      case 'THURSDAY': return 'TH';
      case 'FRIDAY': return 'F';
      case 'SATURDAY': return 'S';
      default: return '';
    }
  };

  const filterTodayClasses = () => {
    const today = new Date();
    const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentDayAbbrev = getDayAbbreviation(currentDay);
    const currentTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    const todaySchedule = classes.filter(classItem => 
      classItem.schedules.some(schedule => {
        const isToday = schedule.days.includes(currentDayAbbrev);
        if (!isToday) return false;

        // Convert schedule times to comparable format
        const startTime = `${schedule.startTime} ${schedule.startPeriod}`;
        const endTime = `${schedule.endTime} ${schedule.endPeriod}`;
        const isOngoing = isTimeInRange(currentTime, startTime, endTime);
        
        return isToday;
      })
    );
    
    // Sort classes by start time
    todaySchedule.sort((a, b) => {
      const aTime = a.schedules[0]?.startTime || '';
      const bTime = b.schedules[0]?.startTime || '';
      const aIsPM = a.schedules[0]?.startPeriod === 'PM';
      const bIsPM = b.schedules[0]?.startPeriod === 'PM';
      
      // Convert to 24-hour format for comparison
      const aHour = parseInt(aTime.split(':')[0]);
      const bHour = parseInt(bTime.split(':')[0]);
      
      const a24Hour = aIsPM && aHour !== 12 ? aHour + 12 : aHour;
      const b24Hour = bIsPM && bHour !== 12 ? bHour + 12 : bHour;
      
      return a24Hour - b24Hour;
    });
    
    setTodayClasses(todaySchedule);
  };

  const isTimeInRange = (current: string, start: string, end: string) => {
    const convertTo24Hour = (time: string) => {
      const [timeStr, period] = time.split(' ');
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + (minutes || 0);
    };

    const currentMinutes = convertTo24Hour(current);
    const startMinutes = convertTo24Hour(start);
    const endMinutes = convertTo24Hour(end);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const calculateClassOverview = async () => {
    try {
      // Get today's date and 7 days ago for report fetching
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Get current time for ongoing classes calculation
      const currentTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      
      // Calculate ongoing classes
      let ongoingClasses = 0;
      todayClasses.forEach(classItem => {
        classItem.schedules.forEach(schedule => {
          if (isTimeInRange(currentTime, `${schedule.startTime} ${schedule.startPeriod}`, `${schedule.endTime} ${schedule.endPeriod}`)) {
            ongoingClasses++;
          }
        });
      });

      // Fetch reports for the last 7 days
      const reports = await reportAPI.getAllReports(
        sevenDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      // Calculate total students and attendance from reports
      const stats = reports.reduce((acc: { 
        totalStudents: number; 
        presentCount: number; 
        reportCount: number; 
      }, report: { 
        totalStudents: number; 
        presentCount: number; 
      }) => ({
        totalStudents: acc.totalStudents + report.totalStudents,
        presentCount: acc.presentCount + report.presentCount,
        reportCount: acc.reportCount + 1
      }), { totalStudents: 0, presentCount: 0, reportCount: 0 });

      // Calculate average attendance percentage
      const averageAttendance = stats.reportCount > 0
        ? Math.round((stats.presentCount / stats.totalStudents) * 100)
        : 0;

      setClassOverview({
        totalClasses: classes.length,
        activeClasses: todayClasses.length,
        totalStudents: Math.round(stats.totalStudents / (stats.reportCount || 1)), // Average students per report
        averageAttendance,
        ongoingClasses
      });
      return true; // Return a value to indicate completion
    } catch (error) {
      console.error('Error calculating class overview:', error);
      // Set default values if there's an error
      setClassOverview({
        totalClasses: classes.length,
        activeClasses: todayClasses.length,
        totalStudents: 0,
        averageAttendance: 0,
        ongoingClasses: 0
      });
      return false; // Return a value to indicate completion with error
    }
  };

  const handleQuickAction = (action: 'attendance' | 'students' | 'schedule' | 'device') => {
    switch (action) {
      case 'attendance':
        setShowSubjectsModal(true);
        setDrawerMode('attendance');
        break;
      case 'students':
        setShowSubjectsModal(true);
        setDrawerMode('students');
        break;
      case 'schedule':
        setShowScheduleModal(true);
        break;
      case 'device':
        setShowDeviceModal(true);
        break;
    }
  };

  const handleClassSelect = (classItem: Class) => {
    setSelectedClass(classItem);
    if (drawerMode === 'attendance') {
      setShowQRModal(true);
    } else {
      navigation.navigate('ClassList', {
        classId: classItem._id,
        className: classItem.className,
        subjectCode: classItem.subjectCode,
        yearSection: classItem.yearSection || '',
      });
    }
    setShowSubjectsModal(false);
  };

  const registerDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    try {
      setIsRegistering(true);
      // Generate a unique device ID
      const deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      await instructorDeviceAPI.registerDevice(deviceId, deviceName);
      Alert.alert('Success', 'Device registered successfully');
      setShowDeviceModal(false);
      setDeviceName('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to register device');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleQRModalClose = () => {
    setShowQRModal(false);
    setSelectedClass(null);
    setAttendanceTaken(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
        <Text style={styles.loadingText}>Loading instructor data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: INSTRUCTOR_COLORS.background }]}>
      <View style={styles.contentContainer}>
        {/* Today's Schedule Card */}
        <View style={styles.card}>
          <View style={styles.scheduleHeader}>
            <Text style={[styles.cardTitle, { color: INSTRUCTOR_COLORS.primary }]}>Today's Schedule</Text>
            <View style={[styles.currentDayBadge, { backgroundColor: INSTRUCTOR_COLORS.secondary }]}>
              <Text style={styles.currentDayText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
            </View>
          </View>
          <Text style={[styles.subTitle, { color: INSTRUCTOR_COLORS.text.secondary }]}>Your classes for today</Text>
          <View style={styles.classList}>
            {todayClasses.length > 0 ? (
              todayClasses.map((classItem, index) => {
                const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
                const isOngoing = classItem.schedules.some(schedule => 
                  isTimeInRange(currentTime, `${schedule.startTime} ${schedule.startPeriod}`, `${schedule.endTime} ${schedule.endPeriod}`)
                );

                return (
                  <View
                    key={classItem._id}
                    style={[
                      styles.classCard,
                      { backgroundColor: isOngoing ? '#dbeafe' : index % 2 === 0 ? '#eff6ff' : '#f8fafc' },
                      { borderLeftColor: isOngoing ? INSTRUCTOR_COLORS.primary : index % 2 === 0 ? INSTRUCTOR_COLORS.secondary : INSTRUCTOR_COLORS.tertiary }
                    ]}
                  >
                    <View style={styles.classHeader}>
                      <View style={styles.classCodeContainer}>
                        <View style={styles.subjectInfo}>
                          <Text style={[
                            styles.classCode,
                            { color: isOngoing ? INSTRUCTOR_COLORS.primary : index % 2 === 0 ? INSTRUCTOR_COLORS.secondary : INSTRUCTOR_COLORS.tertiary }
                          ]}>{classItem.subjectCode}</Text>
                          <Text style={styles.className}>{classItem.className}</Text>
                          <Text style={styles.yearSectionText}>{classItem.yearSection}</Text>
                        </View>
                      </View>
                      {isOngoing && (
                        <View style={[styles.statusBadge, { backgroundColor: INSTRUCTOR_COLORS.primary }]}>
                          <Text style={styles.statusText}>Ongoing</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.classDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={16} color={INSTRUCTOR_COLORS.text.secondary} />
                        <Text style={styles.detailText}>{classItem.room}</Text>
                      </View>
                      <View style={styles.scheduleTimeContainer}>
                        {classItem.schedules.map((schedule, idx) => (
                          <View key={idx} style={styles.scheduleTimeItem}>
                            <Ionicons name="time-outline" size={16} color={INSTRUCTOR_COLORS.text.secondary} />
                            <Text style={styles.scheduleTimeText}>
                              {schedule.startTime}{schedule.startPeriod} - {schedule.endTime}{schedule.endPeriod}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.noClassesContainer}>
                <Ionicons name="calendar-outline" size={48} color={INSTRUCTOR_COLORS.text.secondary} />
                <Text style={styles.noClassesText}>No classes scheduled for today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: INSTRUCTOR_COLORS.primary }]}>Quick Actions</Text>
          <Text style={[styles.subTitle, { color: INSTRUCTOR_COLORS.text.secondary }]}>Access frequently used features</Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#dbeafe', borderColor: INSTRUCTOR_COLORS.primary }]}
              onPress={() => handleQuickAction('schedule')}
            >
              <Ionicons name="calendar" size={22} color={INSTRUCTOR_COLORS.primary} />
              <Text style={[styles.actionText, { color: INSTRUCTOR_COLORS.primary }]}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#dbeafe', borderColor: INSTRUCTOR_COLORS.primary }]}
              onPress={() => handleQuickAction('students')}
            >
              <Ionicons name="people" size={22} color={INSTRUCTOR_COLORS.primary} />
              <Text style={[styles.actionText, { color: INSTRUCTOR_COLORS.primary }]}>Students</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#dbeafe', borderColor: INSTRUCTOR_COLORS.primary }]}
              onPress={() => handleQuickAction('attendance')}
            >
              <Ionicons name="qr-code" size={22} color={INSTRUCTOR_COLORS.primary} />
              <Text style={[styles.actionText, { color: INSTRUCTOR_COLORS.primary }]}>Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#dbeafe', borderColor: INSTRUCTOR_COLORS.primary }]}
              onPress={() => handleQuickAction('device')}
            >
              <Ionicons name="phone-portrait" size={22} color={INSTRUCTOR_COLORS.primary} />
              <Text style={[styles.actionText, { color: INSTRUCTOR_COLORS.primary }]}>Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subject Selection Drawer */}
      <SubjectSelectionDrawer
        visible={showSubjectsModal}
        onClose={() => setShowSubjectsModal(false)}
        classes={classes}
        onSelectClass={handleClassSelect}
        mode={drawerMode}
      />

      {/* Schedule Calendar Modal */}
      <ClassScheduleCalendar
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        classes={classes}
      />

      {/* QR Generator Modal */}
      {selectedClass && (
        <QRGenerator
          visible={showQRModal}
          onClose={handleQRModalClose}
          classId={selectedClass._id}
          subjectCode={selectedClass.subjectCode}
          yearSection={selectedClass.yearSection}
        />
      )}

      {/* Device Registration Modal */}
      <Modal
        visible={showDeviceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderColor: INSTRUCTOR_COLORS.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: INSTRUCTOR_COLORS.text.primary }]}>Register Device</Text>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
                <Ionicons name="close" size={24} color={INSTRUCTOR_COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: INSTRUCTOR_COLORS.text.secondary }]}>
              Register this device to enable location tracking for students
            </Text>
            <TextInput
              style={[styles.input, { borderColor: INSTRUCTOR_COLORS.border }]}
              placeholder="Device Name (e.g. My iPhone)"
              value={deviceName}
              onChangeText={setDeviceName}
              autoCapitalize="none"
              placeholderTextColor={INSTRUCTOR_COLORS.text.secondary}
            />
            <TouchableOpacity 
              style={[
                styles.registerButton, 
                { backgroundColor: INSTRUCTOR_COLORS.primary, opacity: isRegistering ? 0.7 : 1 }
              ]}
              onPress={registerDevice}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <ActivityIndicator size="small" color={INSTRUCTOR_COLORS.text.light} />
              ) : (
                <Text style={[styles.registerButtonText, { color: INSTRUCTOR_COLORS.text.light }]}>Register Device</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const InstructorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('InstructorDashboard');
  const { user, login } = useAuth();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStoredCredentials();
    fetchClasses();
  }, [refreshKey]);

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

  // Mock attendance data per date
  const mockAttendanceData = [
    { date: '2023-10-01', present: 18, absent: 2 },
    { date: '2023-10-02', present: 19, absent: 1 },
    { date: '2023-10-03', present: 20, absent: 0 },
  ];

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
      case 'InstructorDashboard':
        return 'Dashboard';
      case 'AttendanceManager':
        return 'Class Manager';
      case 'Reports':
        return 'Attendance Reports';
      default:
        return 'Dashboard';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: INSTRUCTOR_COLORS.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: INSTRUCTOR_COLORS.primary }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color={INSTRUCTOR_COLORS.text.light} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: INSTRUCTOR_COLORS.text.light }]}>{getHeaderTitle()}</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              triggerRefresh();
              Alert.alert("Refreshing", "Updating class data...");
            }}
          >
            <Ionicons name="refresh" size={24} color={INSTRUCTOR_COLORS.text.light} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: INSTRUCTOR_COLORS.primary,
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
            name="InstructorDashboard" 
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="home" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(0, 'InstructorDashboard'),
            }}
          >
            {() => <InstructorDashboard classes={classes} attendanceData={mockAttendanceData} />}
          </Tab.Screen>
          <Tab.Screen 
            name="AttendanceManager" 
            component={ClassManager}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="school" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(1, 'AttendanceManager'),
            }}
          />
          <Tab.Screen 
            name="Reports" 
            component={Reports}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="document-text" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(2, 'Reports'),
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
            backgroundColor: INSTRUCTOR_COLORS.text.light,
            borderRadius: 1.5,
            transform: [{ translateX: slideAnim }],
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INSTRUCTOR_COLORS.background,
  },
  headerContainer: {
    backgroundColor: INSTRUCTOR_COLORS.primary,
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
    color: INSTRUCTOR_COLORS.text.light,
    textAlign: 'center',
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileIconContainer: {
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  instructorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
    marginTop: 4,
  },
  card: {
    backgroundColor: INSTRUCTOR_COLORS.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: INSTRUCTOR_COLORS.primary,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 14,
    color: INSTRUCTOR_COLORS.text.secondary,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  statCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2eada6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  detailedStats: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2eada6',
  },
  classList: {
    gap: 15,
  },
  classCard: {
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  classCodeContainer: {
    flexDirection: 'column',
  },
  className: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  classCode: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5f4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classSection: {
    marginLeft: 4,
    fontSize: 14,
    color: '#2eada6',
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  scheduleText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    width: '22%',
    margin: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#e8f5f4',
    borderColor: '#2eada6',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    color: '#2eada6',
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
    color: '#666',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  currentDayBadge: {
    backgroundColor: '#2eada6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentDayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectInfo: {
    flex: 1,
  },
  yearSectionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  scheduleTimeContainer: {
    marginTop: 8,
  },
  scheduleTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleTimeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#2eada6',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: INSTRUCTOR_COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: INSTRUCTOR_COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default InstructorScreen; 