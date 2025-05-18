import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendanceAPI, classAPI, reportAPI } from '../../services/api';

interface RecordStats {
  totalRecords: number;
  todayRecords: number;
  weeklyRecords: number;
  monthlyRecords: number;
  attendanceStats: {
    present: number;
    absent: number;
    total: number;
  };
  classStats: {
    totalClasses: number;
    activeClasses: number;
    completedClasses: number;
  };
  records: Array<{
    date: string;
    className: string;
    subjectCode: string;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    students: Array<{
      studentId: string;
      studentName: string;
      status: 'present' | 'absent' | 'late';
    }>;
  }>;
}

const RecordsOverview: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RecordStats>({
    totalRecords: 0,
    todayRecords: 0,
    weeklyRecords: 0,
    monthlyRecords: 0,
    attendanceStats: {
      present: 0,
      absent: 0,
      total: 0
    },
    classStats: {
      totalClasses: 0,
      activeClasses: 0,
      completedClasses: 0
    },
    records: []
  });
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isClassExpanded, setIsClassExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get today's date
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));

      // Get start of week and month
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch all necessary data in parallel
      const [allAttendance, allClasses, reports] = await Promise.all([
        attendanceAPI.getAllAttendance(),
        classAPI.getClasses(),
        reportAPI.getAllReports()
      ]);

      // Filter attendance records by date ranges
      const todayAttendance = allAttendance.filter((record: any) => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startOfToday && recordDate <= endOfToday;
      });

      const weeklyAttendance = allAttendance.filter((record: any) => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startOfWeek && recordDate <= endOfToday;
      });

      const monthlyAttendance = allAttendance.filter((record: any) => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startOfMonth && recordDate <= endOfToday;
      });

      // Calculate attendance stats
      const attendanceStats = reports.reduce((acc: any, report: any) => {
        acc.present += report.presentCount;
        acc.absent += report.absentCount;
        acc.total += report.totalStudents;
        return acc;
      }, { present: 0, absent: 0, total: 0 });

      // Calculate class statistics
      const classStats = {
        totalClasses: allClasses.length,
        activeClasses: allClasses.filter((c: any) => !c.isCompleted).length,
        completedClasses: allClasses.filter((c: any) => c.isCompleted).length
      };

      // Sort reports by date (newest first)
      const sortedRecords = [...reports].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setStats({
        totalRecords: reports.length,
        todayRecords: todayAttendance.length,
        weeklyRecords: weeklyAttendance.length,
        monthlyRecords: monthlyAttendance.length,
        attendanceStats,
        classStats,
        records: sortedRecords
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);

      // Create CSV header
      const csvHeader = 'Date,Class Name,Subject Code,Total Students,Present,Absent,Attendance Rate\n';
      
      // Create CSV rows from sorted records
      const csvRows = stats.records.map(record => {
        const date = new Date(record.date).toLocaleDateString();
        const attendanceRate = ((record.presentCount / record.totalStudents) * 100).toFixed(2);
        return `${date},"${record.className}","${record.subjectCode}",${record.totalStudents},${record.presentCount},${record.absentCount},${attendanceRate}%`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const fileName = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'web') {
        // For web platform
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      } else {
        // For mobile platforms
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });

        if (Platform.OS === 'android') {
          await Sharing.shareAsync(filePath, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Attendance Records'
          });
        } else {
          await Sharing.shareAsync(filePath);
        }
      }

      Alert.alert('Success', 'Records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      Alert.alert('Error', 'Failed to export records');
    } finally {
      setIsExporting(false);
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          {/* Overview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Records Overview</Text>
            <Text style={styles.subTitle}>Attendance Records Summary</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.totalRecords}</Text>
                <Text style={styles.statLabel}>Total Records</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.todayRecords}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.weeklyRecords}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.monthlyRecords}</Text>
                <Text style={styles.statLabel}>This Month</Text>
              </View>
            </View>
          </View>

          {/* Attendance Statistics Card */}
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.cardHeader}
              onPress={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
            >
              <View>
                <Text style={styles.cardTitle}>Attendance Statistics</Text>
                <Text style={styles.subTitle}>Overall Attendance Rate</Text>
              </View>
              <Ionicons 
                name={isAttendanceExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#2eada6" 
              />
            </TouchableOpacity>

            <View style={styles.attendanceStats}>
              <View style={[styles.statCircle, { borderColor: '#4CAF50' }]}>
                <Text style={[styles.circleValue, { color: '#4CAF50' }]}>
                  {calculatePercentage(stats.attendanceStats.present, stats.attendanceStats.total)}%
                </Text>
                <Text style={styles.circleLabel}>Present Rate</Text>
              </View>
              <View style={[styles.statCircle, { borderColor: '#F44336' }]}>
                <Text style={[styles.circleValue, { color: '#F44336' }]}>
                  {calculatePercentage(stats.attendanceStats.absent, stats.attendanceStats.total)}%
                </Text>
                <Text style={styles.circleLabel}>Absent Rate</Text>
              </View>
            </View>

            {isAttendanceExpanded && (
              <View style={styles.expandedStats}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Students:</Text>
                  <Text style={styles.detailValue}>{stats.attendanceStats.total}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Present Rate:</Text>
                  <Text style={[styles.detailValue, { color: '#4CAF50' }]}>
                    {calculatePercentage(stats.attendanceStats.present, stats.attendanceStats.total)}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Absent Rate:</Text>
                  <Text style={[styles.detailValue, { color: '#F44336' }]}>
                    {calculatePercentage(stats.attendanceStats.absent, stats.attendanceStats.total)}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Class Statistics Card */}
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.cardHeader}
              onPress={() => setIsClassExpanded(!isClassExpanded)}
            >
              <View>
                <Text style={styles.cardTitle}>Class Statistics</Text>
                <Text style={styles.subTitle}>Class Status Overview</Text>
              </View>
              <Ionicons 
                name={isClassExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#2eada6" 
              />
            </TouchableOpacity>

            <View style={styles.classStats}>
              <View style={[styles.classStatBox, { borderColor: '#2196F3' }]}>
                <Text style={[styles.classStatValue, { color: '#2196F3' }]}>
                  {stats.classStats.activeClasses}
                </Text>
                <Text style={styles.classStatLabel}>Active Classes</Text>
              </View>
              <View style={[styles.classStatBox, { borderColor: '#4CAF50' }]}>
                <Text style={[styles.classStatValue, { color: '#4CAF50' }]}>
                  {stats.classStats.completedClasses}
                </Text>
                <Text style={styles.classStatLabel}>Completed</Text>
              </View>
            </View>

            {isClassExpanded && (
              <View style={styles.expandedStats}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Classes:</Text>
                  <Text style={styles.detailValue}>{stats.classStats.totalClasses}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Active Rate:</Text>
                  <Text style={[styles.detailValue, { color: '#2196F3' }]}>
                    {calculatePercentage(stats.classStats.activeClasses, stats.classStats.totalClasses)}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completion Rate:</Text>
                  <Text style={[styles.detailValue, { color: '#4CAF50' }]}>
                    {calculatePercentage(stats.classStats.completedClasses, stats.classStats.totalClasses)}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Export Button at Bottom */}
      <View style={styles.exportContainer}>
        <TouchableOpacity
          style={[
            styles.exportButton,
            isExporting && styles.exportButtonDisabled
          ]}
          onPress={exportToCSV}
          disabled={isExporting || stats.totalRecords === 0}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#2eada6" />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="#2eada6" />
              <Text style={styles.exportButtonText}>Export Records to CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80, // Add padding to account for export button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  statBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2eada6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  circleValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  circleLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  expandedStats: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2eada6',
  },
  classStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  classStatBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
  },
  classStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  classStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  exportContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5f4',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2eada6',
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    color: '#2eada6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RecordsOverview; 