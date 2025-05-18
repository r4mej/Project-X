import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClassScheduleCalendar from '../components/ClassScheduleCalendar';
import MyClasses from '../components/student/MyClasses';
import QRScanScreen from '../components/student/QRScanner';
import RecordsScreen from '../components/student/StudentRecord';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { StudentBottomTabParamList, StudentDrawerParamList } from '../navigation/types';
import { Attendance, attendanceAPI, classAPI, studentAPI } from '../services/api';

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
          color={focused ? 'white' : 'rgba(255, 255, 255, 0.6)'}
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
  const { refreshKey } = useRefresh();
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

  useEffect(() => {
    if (user?.userId) {
      fetchAttendanceData();
      fetchTodaySchedule();
    }
    fetchClasses();
  }, [user, refreshKey]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Get attendance for the current semester (last 4 months)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 4);
      
      // Fetch attendance data for the student
      const { attendance, stats } = await attendanceAPI.getAttendanceByStudent(
        user!.userId,
        undefined,
        startDate.toISOString().split('T')[0],
        today
      );

      // Calculate attendance statistics
      const totalAttendance = stats.total || 0;
      const presentCount = stats.present || 0;
      const absentCount = stats.absent || 0;
      const lateCount = stats.late || 0;
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

      // Set today's status and subject info from most recent attendance
      const todayAttendance = attendance.find(record => 
        record.timestamp.split('T')[0] === today
      );
      
      setTodayStatus(todayAttendance?.status || 'not recorded');
      
      if (todayAttendance && todayAttendance.classId && typeof todayAttendance.classId === 'object') {
        const classInfo = todayAttendance.classId as unknown as { subjectCode: string; className: string };
        setRecentSubject({
          subjectCode: classInfo.subjectCode,
          className: classInfo.className,
          timestamp: todayAttendance.timestamp
        });
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

  const handleQuickAction = (action: 'scan' | 'schedule') => {
    if (action === 'schedule') {
      setShowScheduleModal(true);
    } else {
      setShowQRScanner(true);
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
    switch (status) {
      case 'present':
        return '#4CAF50';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
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
          {/* Attendance Overview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Attendance Overview</Text>
            <Text style={styles.subTitle}>Your current attendance statistics</Text>
            <View style={styles.attendanceCircle}>
              <Text style={styles.attendancePercentage}>{attendanceStats.presentPercentage}%</Text>
              <Text style={styles.attendanceLabel}>Overall</Text>
            </View>
            <View style={styles.semesterStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Present</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progress, 
                      { 
                        width: `${(attendanceStats.present / attendanceStats.total) * 100}%`,
                        backgroundColor: '#4CAF50'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.statValue}>{attendanceStats.present}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Late</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progress, 
                      { 
                        width: `${(attendanceStats.late / attendanceStats.total) * 100}%`,
                        backgroundColor: '#FF9800'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.statValue}>{attendanceStats.late}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Absent</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progress, 
                      { 
                        width: `${(attendanceStats.absent / attendanceStats.total) * 100}%`,
                        backgroundColor: '#F44336'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.statValue}>{attendanceStats.absent}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Text style={styles.subTitle}>Access frequently used features</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#e8f5f4', borderColor: '#2eada6', borderWidth: 1 }]}
                onPress={() => handleQuickAction('scan')}
              >
                <Ionicons name="qr-code" size={22} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>Scan QR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#e8f5f4', borderColor: '#2eada6', borderWidth: 1 }]}
                onPress={() => handleQuickAction('schedule')}
              >
                <Ionicons name="calendar" size={22} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Status</Text>
            <Text style={styles.subTitle}>Your attendance for today</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusIconContainer}>
                <Ionicons 
                  name={todayStatus === 'present' ? "checkmark-circle" : todayStatus === 'late' ? "time" : "close-circle"} 
                  size={48} 
                  color={getStatusColor(todayStatus)} 
                />
              </View>
              <Text style={[styles.statusText, { color: getStatusColor(todayStatus) }]}>
                {todayStatus.charAt(0).toUpperCase() + todayStatus.slice(1)}
              </Text>
              <Text style={styles.statusInfo}>
                {todayStatus === 'not recorded' 
                  ? 'No attendance recorded for today yet.'
                  : `You've been marked ${todayStatus} for today.`}
              </Text>
              {recentSubject && todayStatus !== 'not recorded' && (
                <View style={styles.recentSubjectInfo}>
                  <Text style={styles.recentSubjectName}>{recentSubject.subjectCode}</Text>
                  <Text style={styles.recentSubjectClass}>{recentSubject.className}</Text>
                  <Text style={styles.recentSubjectTime}>
                    {new Date(recentSubject.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
              </View>
              )}
            </View>
          </View>

          {/* Today's Schedule Card */}
          <View style={styles.card}>
            <View style={styles.scheduleHeader}>
              <View>
                <Text style={styles.cardTitle}>Today's Schedule</Text>
                <Text style={styles.subTitle}>Your classes for today</Text>
              </View>
              <View style={styles.currentDayBadge}>
                <Text style={styles.currentDayText}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
              </View>
            </View>

            {todayClasses.length > 0 ? (
              todayClasses.map((classItem, index) => (
                <View 
                  key={classItem._id} 
                  style={[
                    styles.classItem,
                    index !== todayClasses.length - 1 && styles.classItemBorder
                  ]}
                >
                <View style={styles.classInfo}>
                    <View style={styles.classHeader}>
                      <Text style={styles.classCode}>{classItem.subjectCode}</Text>
                      {classItem.schedules.some(isOngoing) && (
                        <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                          <Text style={styles.statusBadgeText}>Ongoing</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.className}>{classItem.className}</Text>
                    {classItem.schedules.map((schedule, idx) => (
                      <Text key={idx} style={styles.classTime}>
                        {schedule.startTime} {schedule.startPeriod} - {schedule.endTime} {schedule.endPeriod}
                      </Text>
                    ))}
                    <View style={styles.classDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.detailText}>{classItem.instructor}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.detailText}>{classItem.room}</Text>
                      </View>
                    </View>
                </View>
                </View>
              ))
            ) : (
              <View style={styles.noClassesContainer}>
                <Ionicons name="calendar-outline" size={48} color="#666" />
                <Text style={styles.noClassesText}>No classes scheduled for today</Text>
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
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#2eada6',
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
            backgroundColor: 'white',
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
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#2eada6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#2eada6',
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
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
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
    color: '#333',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  attendanceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#2eada6',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  attendancePercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  attendanceLabel: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
  },
  statValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
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
    marginBottom: 4,
  },
  statusInfo: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noRecordsText: {
    textAlign: 'center',
    color: '#666',
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
    color: '#2eada6',
  },
  className: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  classTime: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
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
    color: '#2eada6',
    marginBottom: 4,
  },
  recentSubjectClass: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  recentSubjectTime: {
    fontSize: 12,
    color: '#666',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
  },
  actionButton: {
    width: '45%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default StudentScreen; 