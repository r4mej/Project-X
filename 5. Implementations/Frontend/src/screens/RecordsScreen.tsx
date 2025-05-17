import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StudentDrawerParamList } from '../navigation/types';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList>;

interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  class: string;
  status: 'Present' | 'Absent' | 'Late';
}

const RecordsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadAttendanceRecords();

    // Add listener to reload records when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadAttendanceRecords();
    });

    return unsubscribe;
  }, [navigation]);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const recordsJson = await AsyncStorage.getItem('attendance_records');
      
      if (recordsJson) {
        const records: AttendanceRecord[] = JSON.parse(recordsJson);
        setAttendanceRecords(records);
      } else {
        // If no records, set some sample data for better UX
        const sampleRecords: AttendanceRecord[] = [
          { id: '1', date: '2025-03-26', subject: 'ITMSD4', class: 'IT3C', status: 'Present' },
          { id: '2', date: '2025-03-24', subject: 'ITP134', class: 'IT3C', status: 'Present' },
          { id: '3', date: '2025-03-21', subject: 'ITMSD2', class: 'IT3C', status: 'Present' },
        ];
        setAttendanceRecords(sampleRecords);
        
        // Save sample records for future reference
        await AsyncStorage.setItem('attendance_records', JSON.stringify(sampleRecords));
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAttendanceRecords = async () => {
    try {
      await AsyncStorage.removeItem('attendance_records');
      setAttendanceRecords([]);
    } catch (error) {
      console.error('Error clearing attendance records:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present':
        return '#4CAF50';
      case 'Absent':
        return '#FF6B6B';
      case 'Late':
        return '#FFA726';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const calculateStatistics = () => {
    const total = attendanceRecords.length;
    if (total === 0) {
      return {
        present: { count: 0, percentage: 0 },
        late: { count: 0, percentage: 0 },
        absent: { count: 0, percentage: 0 },
        total: 0,
      };
    }
    
    const present = attendanceRecords.filter(record => record.status === 'Present').length;
    const late = attendanceRecords.filter(record => record.status === 'Late').length;
    const absent = attendanceRecords.filter(record => record.status === 'Absent').length;

    return {
      present: {
        count: present,
        percentage: (present / total) * 100,
      },
      late: {
        count: late,
        percentage: (late / total) * 100,
      },
      absent: {
        count: absent,
        percentage: (absent / total) * 100,
      },
      total,
    };
  };

  const stats = calculateStatistics();
  
  // Get unique dates for the date filter
  const getUniqueDates = () => {
    const dates = attendanceRecords.map(record => record.date);
    return [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  };
  
  const uniqueDates = getUniqueDates();
  const mostRecentDate = uniqueDates.length > 0 ? formatDate(uniqueDates[0]) : 'All Dates';

  // Filter records based on selection
  const getFilteredRecords = () => {
    return attendanceRecords.filter(record => {
      // Filter by date if selected
      if (selectedDate && record.date !== selectedDate) {
        return false;
      }
      
      // Filter by subject if not "All Subjects"
      if (selectedSubject !== 'All Subjects' && record.subject !== selectedSubject) {
        return false;
      }
      
      // Filter by class if not "All Classes"
      if (selectedClass !== 'All Classes' && record.class !== selectedClass) {
        return false;
      }
      
      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

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
          <Text style={styles.headerTitle}>Attendance Records</Text>
        </View>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>View and track your past attendance records.</Text>

          {/* Filters Section */}
          <View style={styles.filtersContainer}>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.filterButtonText}>{selectedDate ? formatDate(selectedDate) : mostRecentDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={clearAttendanceRecords}
            >
              <Ionicons name="trash-outline" size={20} color="#666" />
              <Text style={styles.filterButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Overview Cards */}
          <View style={styles.overviewContainer}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Total Classes</Text>
              <Text style={styles.overviewValue}>{stats.total}</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewLabel}>Attendance Rate</Text>
              <Text style={styles.overviewValue}>
                {stats.total > 0 ? Math.round((stats.present.percentage + stats.late.percentage / 2)) : 0}%
              </Text>
            </View>
          </View>

          {/* Attendance Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Attendance Summary</Text>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFA726' }]} />
                <Text style={styles.legendText}>Late</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>
          </View>

          {/* Attendance Log */}
          <View style={styles.logContainer}>
            <Text style={styles.sectionTitle}>Attendance Log</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2eada6" />
                <Text style={styles.loadingText}>Loading records...</Text>
              </View>
            ) : filteredRecords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No attendance records found</Text>
              </View>
            ) : (
              <>
                <View style={styles.logHeader}>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>Date</Text>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>Subject</Text>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>Class</Text>
                  <Text style={[styles.columnHeader, { flex: 1 }]}>Status</Text>
                </View>
                {filteredRecords.map((record) => (
                  <View key={record.id} style={styles.logRow}>
                    <Text style={[styles.logText, { flex: 1 }]}>{formatDate(record.date)}</Text>
                    <Text style={[styles.logText, { flex: 1 }]}>{record.subject}</Text>
                    <Text style={[styles.logText, { flex: 1 }]}>{record.class}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
                      <Text style={styles.statusText}>{record.status}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Attendance Statistics */}
          {stats.total > 0 && (
            <View style={styles.statisticsContainer}>
              <Text style={styles.sectionTitle}>Attendance Statistics</Text>
              <Text style={styles.statisticsSubtitle}>Your attendance breakdown for the current semester</Text>
              
              {/* Present Bar */}
              <View style={styles.statRow}>
                <View style={styles.statLabelContainer}>
                  <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${stats.present.percentage}%`, backgroundColor: '#4CAF50' }]} />
                </View>
                <Text style={styles.statValue}>{stats.present.count} days ({Math.round(stats.present.percentage)}%)</Text>
              </View>

              {/* Late Bar */}
              <View style={styles.statRow}>
                <View style={styles.statLabelContainer}>
                  <View style={[styles.statDot, { backgroundColor: '#FFA726' }]} />
                  <Text style={styles.statLabel}>Late</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${stats.late.percentage}%`, backgroundColor: '#FFA726' }]} />
                </View>
                <Text style={styles.statValue}>{stats.late.count} days ({Math.round(stats.late.percentage)}%)</Text>
              </View>

              {/* Absent Bar */}
              <View style={styles.statRow}>
                <View style={styles.statLabelContainer}>
                  <View style={[styles.statDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${stats.absent.percentage}%`, backgroundColor: '#FF6B6B' }]} />
                </View>
                <Text style={styles.statValue}>{stats.absent.count} days ({Math.round(stats.absent.percentage)}%)</Text>
              </View>
            </View>
          )}
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
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
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  logContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  logHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logText: {
    fontSize: 14,
    color: '#333',
  },
  statusBadge: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statisticsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  statisticsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 8,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#333',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statValue: {
    fontSize: 12,
    color: '#666',
    width: 100,
    textAlign: 'right',
  },
});

export default RecordsScreen; 