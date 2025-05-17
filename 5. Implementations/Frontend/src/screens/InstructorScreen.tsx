import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ClassManager, { Class } from '../components/attendance/AttendanceManager';
import QRScanner from '../components/attendance/QRScanner';
import Reports from '../components/Reports';
import { useAuth } from '../context/AuthContext';
import { InstructorBottomTabParamList, InstructorDrawerParamList } from '../navigation/types';
import { attendanceAPI, classAPI } from '../services/api';
import { colors } from '../theme/colors';

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
          color={focused ? colors.text.inverse : colors.instructor.primary.light}
        />
      </Animated.View>
    </View>
  );
};

const InstructorDashboard: React.FC<{ classes: Class[]; attendanceData: { date: string; present: number; absent: number; }[] }> = ({ classes, attendanceData }) => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [todayClasses, setTodayClasses] = useState<Class[]>([]);
  const [classOverview, setClassOverview] = useState({
    totalClasses: 0,
    activeClasses: 0,
    totalStudents: 0,
    averageAttendance: 0,
    ongoingClasses: 0
  });

  useEffect(() => {
    filterTodayClasses();
    calculateClassOverview();
  }, [classes]);

  const getDayAbbreviation = (fullDay: string): string => {
    console.log('Getting abbreviation for:', fullDay);
    // Extract just the day name from the full date string
    const dayName = fullDay.split(',')[0].trim();
    console.log('Extracted day name:', dayName);
    
    const abbreviation = (() => {
      switch (dayName.toUpperCase()) {
        case 'SUNDAY': return 'SU';
        case 'MONDAY': return 'M';
        case 'TUESDAY': return 'T';
        case 'WEDNESDAY': return 'W';
        case 'THURSDAY': return 'TH';
        case 'FRIDAY': return 'F';
        case 'SATURDAY': return 'S';
        default: return '';
      }
    })();
    console.log('Abbreviation result:', abbreviation);
    return abbreviation;
  };

  const filterTodayClasses = () => {
    const today = new Date();
    const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    const currentDayAbbrev = getDayAbbreviation(currentDay);
    const currentTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    console.log('Current day:', currentDay);
    console.log('Current day abbreviation:', currentDayAbbrev);
    console.log('Current time:', currentTime);
    console.log('Available classes:', classes);
    
    const todaySchedule = classes.filter(classItem => {
      console.log('Checking class:', classItem.subjectCode);
      console.log('Class schedules:', classItem.schedules);
      
      return classItem.schedules.some(schedule => {
        const isToday = schedule.days.includes(currentDayAbbrev);
        console.log('Is today?', isToday);
        return isToday;
      });
    });
    
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
    
    console.log('Today\'s schedule:', todaySchedule);
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
      let totalStudents = 0;
      let totalAttendance = 0;
      let ongoingClasses = 0;
      
      // Calculate ongoing classes
      const today = new Date();
      const currentTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
      
      todayClasses.forEach(classItem => {
        classItem.schedules.forEach(schedule => {
          if (isTimeInRange(currentTime, `${schedule.startTime} ${schedule.startPeriod}`, `${schedule.endTime} ${schedule.endPeriod}`)) {
            ongoingClasses++;
          }
        });
      });

      // Calculate total students and average attendance
      for (const classItem of classes) {
        const response = await attendanceAPI.getAttendanceByClass(classItem._id);
        if (response.stats) {
          totalStudents += response.stats.total || 0;
          totalAttendance += response.stats.present || 0;
        }
      }

      setClassOverview({
        totalClasses: classes.length,
        activeClasses: todayClasses.length,
        totalStudents,
        averageAttendance: totalStudents > 0 
          ? Math.round((totalAttendance / totalStudents) * 100) 
          : 0,
        ongoingClasses
      });
    } catch (error) {
      console.error('Error calculating class overview:', error);
    }
  };

  const handleScanQR = () => {
    // Find the current ongoing class or the next class for today
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    // First, try to find an ongoing class
    const ongoingClass = todayClasses.find(classItem =>
      classItem.schedules.some(schedule =>
        isTimeInRange(currentTime, `${schedule.startTime} ${schedule.startPeriod}`, `${schedule.endTime} ${schedule.endPeriod}`)
      )
    );

    if (ongoingClass) {
      setSelectedClass(ongoingClass);
      setShowQRModal(true);
      return;
    }

    // If no ongoing class, get the next upcoming class
    const upcomingClass = todayClasses[0]; // Since todayClasses is already sorted by time
    if (upcomingClass) {
      setSelectedClass(upcomingClass);
      setShowQRModal(true);
    } else {
      // Show alert if no classes available
      Alert.alert(
        'No Classes Available',
        'There are no classes scheduled for today.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleViewStudents = (classItem: Class) => {
    navigation.navigate('ClassList', {
      classId: classItem._id,
      className: classItem.className,
      subjectCode: classItem.subjectCode,
      yearSection: classItem.yearSection
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Class Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Class Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewItem, { backgroundColor: '#e8f5f4' }]}>
              <Text style={[styles.overviewValue, { color: '#2eada6' }]}>{classOverview.totalClasses}</Text>
              <Text style={styles.overviewLabel}>Total Classes</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#f0e8f5' }]}>
              <Text style={[styles.overviewValue, { color: '#8a2be2' }]}>{classOverview.activeClasses}</Text>
              <Text style={styles.overviewLabel}>Today's Classes</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#fff4e6' }]}>
              <Text style={[styles.overviewValue, { color: '#ff9f43' }]}>{classOverview.ongoingClasses}</Text>
              <Text style={styles.overviewLabel}>Ongoing Classes</Text>
            </View>
            <View style={[styles.overviewItem, { backgroundColor: '#e8f0f5' }]}>
              <Text style={[styles.overviewValue, { color: '#4a90e2' }]}>{classOverview.averageAttendance}%</Text>
              <Text style={styles.overviewLabel}>Avg. Attendance</Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule Card */}
        <View style={styles.card}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.cardTitle}>Today's Schedule</Text>
            <View style={styles.currentDayBadge}>
              <Text style={styles.currentDayText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
            </View>
          </View>
          <Text style={styles.subTitle}>Your classes for today</Text>
          <View style={styles.classList}>
            {todayClasses.length > 0 ? (
              todayClasses.map((classItem, index) => {
                const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
                const isOngoing = classItem.schedules.some(schedule => 
                  isTimeInRange(currentTime, `${schedule.startTime} ${schedule.startPeriod}`, `${schedule.endTime} ${schedule.endPeriod}`)
                );

                return (
                  <TouchableOpacity
                    key={classItem._id}
                    style={[
                      styles.classCard,
                      { backgroundColor: isOngoing ? '#e8f5f4' : index % 2 === 0 ? '#f0e8f5' : '#fff4e6' },
                      { borderLeftColor: isOngoing ? '#2eada6' : index % 2 === 0 ? '#8a2be2' : '#ff9f43' }
                    ]}
                    onPress={() => handleScanQR()}
                  >
                    <View style={styles.classHeader}>
                      <View style={styles.classCodeContainer}>
                        <View style={styles.subjectInfo}>
                          <Text style={[
                            styles.classCode,
                            { color: isOngoing ? '#2eada6' : index % 2 === 0 ? '#8a2be2' : '#ff9f43' }
                          ]}>{classItem.subjectCode}</Text>
                          <Text style={styles.className}>{classItem.className}</Text>
                          <Text style={styles.yearSectionText}>{classItem.yearSection}</Text>
                        </View>
                      </View>
                      {isOngoing && (
                        <View style={[styles.statusBadge, { backgroundColor: '#2eada6' }]}>
                          <Text style={styles.statusText}>Ongoing</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.classDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.detailText}>{classItem.room}</Text>
                      </View>
                      <View style={styles.scheduleTimeContainer}>
                        {classItem.schedules.map((schedule, idx) => (
                          <View key={idx} style={styles.scheduleTimeItem}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.scheduleTimeText}>
                              {schedule.startTime}{schedule.startPeriod} - {schedule.endTime}{schedule.endPeriod}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noClassesContainer}>
                <Ionicons name="calendar-outline" size={48} color="#666" />
                <Text style={styles.noClassesText}>No classes scheduled for today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.subTitle}>Common tasks</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                { backgroundColor: '#e8f5f4' },
                todayClasses.length === 0 && styles.disabledButton
              ]}
              onPress={handleScanQR}
              disabled={todayClasses.length === 0}
            >
              <Ionicons 
                name="scan" 
                size={24} 
                color={todayClasses.length === 0 ? '#999' : '#2eada6'} 
              />
              <Text style={[
                styles.actionText, 
                { color: todayClasses.length === 0 ? '#999' : '#2eada6' }
              ]}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#f0e8f5' }]}
              onPress={() => {
                if (todayClasses.length > 0) {
                  handleViewStudents(todayClasses[0]);
                } else if (classes.length > 0) {
                  handleViewStudents(classes[0]);
                } else {
                  Alert.alert('No Classes', 'You have no classes to view.');
                }
              }}
            >
              <Ionicons name="people" size={24} color="#8a2be2" />
              <Text style={[styles.actionText, { color: '#8a2be2' }]}>View Students</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fff4e6' }]}>
              <Ionicons name="checkbox" size={24} color="#ff9f43" />
              <Text style={[styles.actionText, { color: '#ff9f43' }]}>Take Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#e8f0f5' }]}>
              <Ionicons name="calendar" size={24} color="#4a90e2" />
              <Text style={[styles.actionText, { color: '#4a90e2' }]}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* QR Scanner Modal */}
      {selectedClass && (
        <QRScanner
          visible={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedClass(null);
          }}
          classId={selectedClass._id}
          subjectCode={selectedClass.subjectCode}
          yearSection={selectedClass.yearSection}
        />
      )}
    </ScrollView>
  );
};

const InstructorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

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
        return 'Instructor Dashboard';
      case 'AttendanceManager':
        return 'Attendance Manager';
      case 'Reports':
        return 'Reports';
      default:
        return 'Instructor Dashboard';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.instructor.primary.main,
              borderTopWidth: 1,
              borderTopColor: colors.instructor.primary.light,
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
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  headerContainer: {
    backgroundColor: colors.instructor.primary.main,
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
    color: colors.text.inverse,
    textAlign: 'right',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.neutral.black,
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
    color: colors.text.secondary,
    marginTop: 10,
  },
  instructorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.instructor.primary.main,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.instructor.primary.main,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  overviewItem: {
    width: '48%',
    backgroundColor: colors.neutral.lightGray,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.instructor.primary.main,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
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
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
    backgroundColor: colors.instructor.primary.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: colors.text.inverse,
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
    backgroundColor: colors.instructor.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentDayText: {
    color: colors.text.inverse,
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
  disabledButton: {
    opacity: 0.5,
  },
});

export default InstructorScreen; 