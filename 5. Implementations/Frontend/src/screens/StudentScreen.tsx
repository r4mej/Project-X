import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StudentDrawerParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList>;

const StudentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const getHeaderTitle = () => {
    return 'Student Dashboard';
  };

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
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
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
              <Text style={styles.attendancePercentage}>78%</Text>
              <Text style={styles.attendanceLabel}>Overall</Text>
            </View>
            <View style={styles.semesterStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>This Semester</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: '78%' }]} />
                </View>
                <Text style={styles.statPercentage}>78%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Last Semester</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progress, { width: '85%' }]} />
                </View>
                <Text style={styles.statPercentage}>85%</Text>
              </View>
            </View>
          </View>

          {/* Today's Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Status</Text>
            <Text style={styles.subTitle}>Your attendance for today</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={colors.status.success} />
              </View>
              <Text style={styles.statusText}>Present</Text>
              <Text style={styles.statusInfo}>You've been marked present for today.</Text>
              <View style={styles.checkInInfo}>
                <Text style={styles.checkInLabel}>Last Check-in:</Text>
                <Text style={styles.checkInTime}>10:05 AM</Text>
                <Text style={styles.checkInMethod}>Method: QR Code Scan</Text>
                <Text style={styles.checkInLocation}>Location: Room 101</Text>
              </View>
            </View>
          </View>

          {/* Today's Classes Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Classes</Text>
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={styles.classItem}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>ITM503</Text>
                  <Text style={styles.classTime}>09:00 AM - 10:30 AM</Text>
                  <Text style={styles.classLocation}>Prof Unknown</Text>
                </View>
                <View style={styles.attendanceStatus}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.status.success} />
                  <Text style={styles.statusLabel}>Present</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Text style={styles.subTitle}>Common attendance tasks</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="qr-code" size={24} color="#2eada6" />
                <Text style={styles.actionText}>Scan QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="location" size={24} color="#2eada6" />
                <Text style={styles.actionText}>GPS Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="document-text" size={24} color="#2eada6" />
                <Text style={styles.actionText}>View Attendance History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="calendar" size={24} color="#2eada6" />
                <Text style={styles.actionText}>Class Schedule</Text>
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
});

export default StudentScreen; 