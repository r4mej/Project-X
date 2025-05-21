import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendanceAPI, classAPI, reportAPI } from '../../services/api';
import * as MediaLibrary from 'expo-media-library';

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
      
      // Request permissions on Android
      if (Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need storage permission to save the exported file');
          setIsExporting(false);
          return;
        }
      }

      // Create main summary CSV file
      const summaryFileName = `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`;
      let csvHeader = 'Date,Class Name,Subject Code,Total Students,Present,Absent,Attendance Rate\n';
      
      // Create CSV rows from sorted records
      let csvRows = stats.records.map(record => {
        const date = new Date(record.date).toLocaleDateString();
        const attendanceRate = ((record.presentCount / record.totalStudents) * 100).toFixed(2);
        return `${date},"${record.className}","${record.subjectCode}",${record.totalStudents},${record.presentCount},${record.absentCount},${attendanceRate}%`;
      }).join('\n');

      const summaryCsvContent = csvHeader + csvRows;
      
      // Create detailed CSV with student-level data
      const detailedFileName = `attendance_detailed_${new Date().toISOString().split('T')[0]}.csv`;
      csvHeader = 'Date,Class Name,Subject Code,Student ID,Student Name,Status\n';
      
      // Flatten the records to include individual student attendance
      csvRows = stats.records.flatMap(record => {
        const date = new Date(record.date).toLocaleDateString();
        return record.students.map(student => {
          return `${date},"${record.className}","${record.subjectCode}","${student.studentId}","${student.studentName}","${student.status}"`;
        });
      }).join('\n');

      const detailedCsvContent = csvHeader + csvRows;
      
      // Handle different platforms
      if (Platform.OS === 'web') {
        // For web platform - summary file
        const summaryBlob = new Blob([summaryCsvContent], { type: 'text/csv;charset=utf-8;' });
        const summaryLink = document.createElement('a');
        summaryLink.href = URL.createObjectURL(summaryBlob);
        summaryLink.download = summaryFileName;
        summaryLink.click();
        
        // For web platform - detailed file
        const detailedBlob = new Blob([detailedCsvContent], { type: 'text/csv;charset=utf-8;' });
        const detailedLink = document.createElement('a');
        detailedLink.href = URL.createObjectURL(detailedBlob);
        detailedLink.download = detailedFileName;
        detailedLink.click();
      } else {
        // For mobile platforms
        const summaryFilePath = `${FileSystem.documentDirectory}${summaryFileName}`;
        const detailedFilePath = `${FileSystem.documentDirectory}${detailedFileName}`;
        
        // Write files
        await FileSystem.writeAsStringAsync(summaryFilePath, summaryCsvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });
        
        await FileSystem.writeAsStringAsync(detailedFilePath, detailedCsvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });

        // For Android, save to MediaLibrary first to make files accessible by other apps
        if (Platform.OS === 'android') {
          try {
            // Save summary file to media library
            const asset1 = await MediaLibrary.createAssetAsync(summaryFilePath);
            await MediaLibrary.createAlbumAsync('Attendance Reports', asset1, false);
            
            // Save detailed file to media library
            const asset2 = await MediaLibrary.createAssetAsync(detailedFilePath);
            await MediaLibrary.createAlbumAsync('Attendance Reports', asset2, false);
            
            // Choose which file to share
            Alert.alert(
              'Export Options',
              'Which report would you like to share?',
              [
                {
                  text: 'Summary',
                  onPress: async () => {
                    await Sharing.shareAsync(summaryFilePath, {
                      mimeType: 'text/csv',
                      dialogTitle: 'Share Attendance Summary'
                    });
                  }
                },
                {
                  text: 'Detailed',
                  onPress: async () => {
                    await Sharing.shareAsync(detailedFilePath, {
                      mimeType: 'text/csv',
                      dialogTitle: 'Share Detailed Attendance'
                    });
                  }
                },
                {
                  text: 'Both',
                  onPress: async () => {
                    // On Android, we can only share one file at a time through the API
                    // Tell the user files are saved and available in the gallery
                    Alert.alert(
                      'Files Saved',
                      'Both files have been saved to your device in the "Attendance Reports" album.'
                    );
                  }
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          } catch (error) {
            console.error('Error saving to media library:', error);
            // Fallback to direct sharing
            await Sharing.shareAsync(summaryFilePath, {
              mimeType: 'text/csv',
              dialogTitle: 'Share Attendance Records'
            });
          }
        } else {
          // For iOS, we can share multiple files
          Alert.alert(
            'Export Options',
            'Which report would you like to share?',
            [
              {
                text: 'Summary',
                onPress: async () => {
                  await Sharing.shareAsync(summaryFilePath);
                }
              },
              {
                text: 'Detailed',
                onPress: async () => {
                  await Sharing.shareAsync(detailedFilePath);
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      }

      Alert.alert('Success', 'Records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      Alert.alert('Error', 'Failed to export records: ' + (error instanceof Error ? error.message : String(error)));
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
          
          {/* Export Button */}
          <TouchableOpacity
            style={styles.exportButtonContainer}
            onPress={exportToCSV}
            activeOpacity={0.8}
            disabled={isExporting || stats.records.length === 0}
          >
            <View style={[
              styles.exportButton, 
              stats.records.length === 0 && styles.exportButtonDisabled
            ]}>
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={22} color="white" />
                  <Text style={styles.exportButtonText}>Export Records to CSV</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exportButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2eada6',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: '100%',
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 1,
    shadowOpacity: 0.1,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default RecordsOverview; 