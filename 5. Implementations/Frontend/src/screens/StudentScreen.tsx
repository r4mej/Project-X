import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StudentDrawerParamList } from '../navigation/types';

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
            <Ionicons name="menu" size={28} color="white" />
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
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
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
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
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
    padding: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  attendanceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#2eada6',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  attendancePercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  semesterStats: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    flex: 2,
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    flex: 3,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  progress: {
    height: '100%',
    backgroundColor: '#2eada6',
    borderRadius: 3,
  },
  statPercentage: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 8,
  },
  statusIconContainer: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statusInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  checkInInfo: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
  },
  checkInLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  checkInTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  checkInMethod: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  checkInLocation: {
    fontSize: 12,
    color: '#666',
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  classTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  classLocation: {
    fontSize: 12,
    color: '#666',
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4CAF50',
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
});

export default StudentScreen; 