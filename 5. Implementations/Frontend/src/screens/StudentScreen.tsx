import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StudentDrawerParamList } from '../navigation/types';
import { studentAPI } from '../services/api';
import { colors } from '../theme/colors';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList, 'Dashboard'>;

interface AttendanceOverview {
  overall: number;
  currentSemester: number;
  lastSemester: number;
}

interface TodayStatus {
  status: 'present' | 'absent' | 'late';
  lastCheckIn?: {
    time: string;
    method: string;
    location: string;
  };
}

interface ClassInfo {
  _id: string;
  className: string;
  classTime: string;
  instructor: string;
  status: 'present' | 'absent' | 'late' | 'pending';
}

const StudentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AttendanceOverview>({
    overall: 0,
    currentSemester: 0,
    lastSemester: 0
  });
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [todayClasses, setTodayClasses] = useState<ClassInfo[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      const [overviewData, statusData, classesData] = await Promise.all([
        studentAPI.getAttendanceOverview(user.userId),
        studentAPI.getTodayStatus(user.userId),
        studentAPI.getTodayClasses(user.userId)
      ]);

      setOverview(overviewData);
      setTodayStatus(statusData);
      setTodayClasses(classesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return colors.status.success;
      case 'absent':
        return colors.status.error;
      case 'late':
        return colors.status.warning;
      default:
        return colors.status.info;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'absent':
        return 'close-circle';
      case 'late':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.student.primary.main} />
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
            <Ionicons name="menu" size={28} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Dashboard</Text>
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
              <Text style={styles.attendancePercentage}>{overview.overall}%</Text>
              <Text style={styles.attendanceLabel}>Overall</Text>
            </View>
            <View style={styles.semesterStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>This Semester</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: `${overview.currentSemester}%` }]} />
                </View>
                <Text style={styles.statPercentage}>{overview.currentSemester}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last Semester</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: `${overview.lastSemester}%` }]} />
                </View>
                <Text style={styles.statPercentage}>{overview.lastSemester}%</Text>
              </View>
            </View>
          </View>

          {/* Today's Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Status</Text>
            <Text style={styles.subTitle}>Your attendance for today</Text>
            <View style={styles.statusContainer}>
              {todayStatus ? (
                <>
                  <View style={styles.statusIconContainer}>
                    <Ionicons 
                      name={getStatusIcon(todayStatus.status)} 
                      size={48} 
                      color={getStatusColor(todayStatus.status)} 
                    />
                  </View>
                  <Text style={[styles.statusText, { color: getStatusColor(todayStatus.status) }]}>
                    {todayStatus.status.charAt(0).toUpperCase() + todayStatus.status.slice(1)}
                  </Text>
                  {todayStatus.lastCheckIn && (
                    <View style={styles.checkInInfo}>
                      <Text style={styles.checkInLabel}>Last Check-in:</Text>
                      <Text style={styles.checkInTime}>{todayStatus.lastCheckIn.time}</Text>
                      <Text style={styles.checkInMethod}>Method: {todayStatus.lastCheckIn.method}</Text>
                      <Text style={styles.checkInLocation}>Location: {todayStatus.lastCheckIn.location}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.noStatusText}>No attendance recorded for today</Text>
              )}
            </View>
          </View>

          {/* Today's Classes Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Classes</Text>
            {todayClasses.length > 0 ? (
              todayClasses.map((classInfo) => (
                <View key={classInfo._id} style={styles.classItem}>
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{classInfo.className}</Text>
                    <Text style={styles.classTime}>{classInfo.classTime}</Text>
                    <Text style={styles.classLocation}>{classInfo.instructor}</Text>
                  </View>
                  <View style={styles.attendanceStatus}>
                    <Ionicons 
                      name={getStatusIcon(classInfo.status)} 
                      size={24} 
                      color={getStatusColor(classInfo.status)} 
                    />
                    <Text style={[styles.statusLabel, { color: getStatusColor(classInfo.status) }]}>
                      {classInfo.status.charAt(0).toUpperCase() + classInfo.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noClassesText}>No classes scheduled for today</Text>
            )}
          </View>

          {/* Quick Actions Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Text style={styles.subTitle}>Common attendance tasks</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('QRScanner')}
              >
                <Ionicons name="qr-code" size={24} color={colors.student.primary.main} />
                <Text style={styles.actionText}>Scan QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Location')}
              >
                <Ionicons name="location" size={24} color={colors.student.primary.main} />
                <Text style={styles.actionText}>GPS Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('History')}
              >
                <Ionicons name="document-text" size={24} color={colors.student.primary.main} />
                <Text style={styles.actionText}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Schedule')}
              >
                <Ionicons name="calendar" size={24} color={colors.student.primary.main} />
                <Text style={styles.actionText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.student.primary.main,
  },
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  headerContainer: {
    backgroundColor: colors.student.primary.main,
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
  notificationButton: {
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.student.primary.main,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  attendanceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: colors.student.primary.main,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  attendancePercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.student.primary.main,
  },
  attendanceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
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
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressBar: {
    flex: 2,
    height: 8,
    backgroundColor: colors.neutral.lightGray,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  progress: {
    height: '100%',
    backgroundColor: colors.student.primary.main,
    borderRadius: 4,
  },
  statPercentage: {
    width: 40,
    fontSize: 14,
    color: colors.student.primary.main,
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 16,
  },
  statusIconContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.student.primary.main,
    marginBottom: 8,
  },
  statusInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  checkInInfo: {
    width: '100%',
    backgroundColor: colors.neutral.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  checkInLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  checkInTime: {
    fontSize: 16,
    color: colors.student.primary.main,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  checkInMethod: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  checkInLocation: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  classTime: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  classLocation: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusLabel: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  studentIdLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  studentIdValue: {
    fontSize: 14,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.background,
  },
  noStatusText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 16,
    marginVertical: 20,
  },
  noClassesText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 16,
    marginVertical: 20,
  },
});

export default StudentScreen; 