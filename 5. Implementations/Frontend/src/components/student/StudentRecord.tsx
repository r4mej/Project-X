import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { StudentDrawerParamList } from '../../navigation/types';
import { attendanceAPI } from '../../services/api';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList>;

interface Subject {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
}

interface Attendance {
  _id: string;
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  classId: Subject;
  recordedVia?: 'qr' | 'manual';
}

interface APIAttendance {
  _id: string;
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  classId: {
    _id: string;
    className: string;
    subjectCode: string;
    yearSection?: string;
  };
  recordedVia?: 'qr' | 'manual';
}

interface ClassItem {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
  schedules?: any[];
  course?: string;
  room?: string;
}

const RecordsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    present: { count: 0, percentage: 0 },
    absent: { count: 0, percentage: 0 }
  });

  useEffect(() => {
    if (user?.userId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      console.log('Today\'s date (Records):', todayStr);
      
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
      console.log('Using date range for records:', startDateStr, 'to', todayStr);

      // Fetch attendance records
      const { attendance, stats: attendanceStats } = await attendanceAPI.getAttendanceByStudent(
        user!.userId,
        undefined,
        startDateStr,
        todayStr
      );

      console.log('Records response:', { recordsCount: attendance?.length, stats: attendanceStats });

      // Convert API response to our interface
      const convertedAttendance: Attendance[] = ((attendance as unknown) as APIAttendance[]).map(record => ({
        _id: record._id,
        studentId: record.studentId,
        timestamp: record.timestamp,
        status: record.status,
        classId: {
          _id: record.classId._id,
          className: record.classId.className,
          subjectCode: record.classId.subjectCode,
          yearSection: record.classId.yearSection
        },
        recordedVia: record.recordedVia
      }));

      // Sort records by date (most recent first)
      const sortedRecords = convertedAttendance.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setAttendanceRecords(sortedRecords);
        
      // Calculate statistics
      console.log('Processing attendance stats:', attendanceStats);
      
      let total = attendanceStats?.total || 0;
      let present = attendanceStats?.present || 0;
      let absent = attendanceStats?.absent || 0;
      
      // If we have attendance data but no stats, calculate them from the attendance data
      if (attendance?.length > 0 && total === 0) {
        present = attendance.filter(record => record.status === 'present').length;
        absent = attendance.filter(record => record.status === 'absent').length;
        const late = attendance.filter(record => record.status === 'late').length;
        total = present + absent + late;
        console.log('Calculated stats from attendance records:', { total, present, absent });
      }
      
      // Calculate percentages, avoiding division by zero
      const presentPercentage = total > 0 ? (present / total) * 100 : 0;
      const absentPercentage = total > 0 ? (absent / total) * 100 : 0;
      
      console.log('Final attendance stats:', { 
        total, 
        present, 
        absent, 
        presentPercentage, 
        absentPercentage 
      });
      
      setStats({
        total,
        present: {
          count: present,
          percentage: presentPercentage
        },
        absent: {
          count: absent,
          percentage: absentPercentage
        }
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return '#4CAF50';
      case 'absent':
        return '#FF6B6B';
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
          <Text style={styles.headerTitle}>Attendance Record</Text>
        </View>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Overview Cards */}
          <View style={styles.overviewContainer}>
            <View style={styles.overviewCard}>
              <Ionicons name="book-outline" size={24} color="#2eada6" style={styles.overviewIcon} />
              <Text style={styles.overviewLabel}>Total Classes</Text>
              <Text style={styles.overviewValue}>{stats.total}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#2eada6" style={styles.overviewIcon} />
              <Text style={styles.overviewLabel}>Attendance Rate</Text>
              <Text style={styles.overviewValue}>
                {Math.round(stats.present.percentage)}%
              </Text>
            </View>
          </View>

          {/* Attendance Summary */}
          <View style={[styles.summaryCard, { marginBottom: 16 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Attendance Summary</Text>
              <Text style={styles.cardSubtitle}>Overall attendance statistics</Text>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Present</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progress, 
                      { 
                        width: `${stats.present.percentage}%`,
                        backgroundColor: '#4CAF50'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.statValue}>{stats.present.count}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Absent</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progress, 
                      { 
                        width: `${stats.absent.percentage}%`,
                        backgroundColor: '#FF6B6B'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.statValue}>{stats.absent.count}</Text>
              </View>
            </View>
          </View>

          {/* Recent Attendance Log */}
          <View style={styles.logContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Attendance</Text>
              <Text style={styles.cardSubtitle}>Your latest attendance records</Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2eada6" />
                <Text style={styles.loadingText}>Loading records...</Text>
              </View>
            ) : attendanceRecords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No attendance records found</Text>
              </View>
            ) : (
              <View style={styles.recordsList}>
                {attendanceRecords.slice(0, 5).map((record, index) => (
                  <View 
                    key={record._id} 
                    style={[
                      styles.recordItem,
                      index !== Math.min(attendanceRecords.length - 1, 4) && styles.recordItemBorder
                    ]}
                  >
                    <View style={styles.recordHeader}>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordDate}>{formatDate(record.timestamp)}</Text>
                        <Text style={styles.recordSubject}>{record.classId.className}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
                        <Text style={styles.statusText}>{record.status}</Text>
                      </View>
                    </View>
                    <View style={styles.recordDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.detailText}>
                          {new Date(record.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </Text>
                      </View>
                      {record.recordedVia && (
                        <View style={styles.detailItem}>
                          <Ionicons 
                            name={record.recordedVia === 'qr' ? "qr-code-outline" : "person-outline"} 
                            size={14} 
                            color="#666" 
                          />
                          <Text style={styles.detailText}>
                            {record.recordedVia === 'qr' ? 'QR Scan' : 'Manual Entry'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
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
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'right',
  },
  contentContainer: {
    padding: 16,
  },
  overviewContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  summaryCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  summaryContent: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
  statValue: {
    width: 40,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  logContainer: {
    backgroundColor: '#f3e5f5',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  recordsList: {
    gap: 12,
  },
  recordItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  recordItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recordSubject: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recordDetails: {
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
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  overviewIcon: {
    marginBottom: 8,
  },
});

export default RecordsScreen; 