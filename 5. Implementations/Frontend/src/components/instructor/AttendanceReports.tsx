import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendanceAPI, classAPI, reportAPI, studentAPI } from '../../services/api';
import AttendanceDetails from './AttendanceDetails';

interface Class {
  _id: string;
  className: string;
  subjectCode: string;
}

interface Student {
  _id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  classId: string;
  email?: string;
  yearLevel?: string;
  course?: string;
}

interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  status: 'present' | 'absent';
  classId: string;
  className: string;
  subjectCode: string;
}

interface AttendanceDetails {
  date: string;
  className: string;
  subjectCode: string;
  classId?: string;
  students: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent';
  }>;
  total: number;
  present: number;
  absent: number;
}

interface Report {
  _id: string;
  date: string;
  className: string;
  subjectCode: string;
  classId: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  students: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent';
  }>;
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<AttendanceDetails | null>(null);
  const [sortLatest, setSortLatest] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [attendanceData, setAttendanceData] = useState<{ date: string; present: number; absent: number; percentage: number; }[]>([]);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });

  useEffect(() => {
    fetchData();
    fetchReportsData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch classes
      const classesData = await classAPI.getClasses();
      setClasses(classesData);

      // Fetch attendance records for each class
      const attendancePromises = classesData.map((classItem: Class) => 
        attendanceAPI.getAttendanceByClass(classItem._id)
      );
      const attendanceResults = await Promise.all(attendancePromises);
      
      // Fetch all students for each class
      const studentsPromises = classesData.map((classItem: Class) => 
        studentAPI.getStudentsByClass(classItem._id)
      );
      const studentsResults = await Promise.all(studentsPromises);
      
      // Create a map of studentId to student details
      const newStudentsMap = new Map<string, Student>();
      studentsResults.flat().forEach(student => {
        newStudentsMap.set(student.studentId, student);
      });
      setStudentsMap(newStudentsMap);

      // Process attendance records
      const allAttendance = attendanceResults.flatMap((result, index) => {
        const classItem = classesData[index];
        return result.attendance.map((record: { studentId: string; timestamp: string; status: 'present' | 'absent' | 'late' }) => ({
          ...record,
          className: classItem.className,
          subjectCode: classItem.subjectCode,
          studentName: getStudentName(record.studentId)
        }));
      });
      
      const sortedAttendance = allAttendance.sort((a, b) => 
        sortLatest 
          ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setAttendanceRecords(sortedAttendance);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsData = async () => {
    try {
      // Get today's date
      const today = new Date();
      const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      // Fetch reports for the last 7 days
      const reportsData = await reportAPI.getAllReports(
        last7Days[last7Days.length - 1], // startDate (7 days ago)
        last7Days[0] // endDate (today)
      );

      setReports(reportsData);

      // Calculate overall statistics
      const stats = reportsData.reduce((acc: { total: number; present: number; absent: number }, report: Report) => {
        return {
          total: acc.total + report.totalStudents,
          present: acc.present + report.presentCount,
          absent: acc.absent + report.absentCount
        };
      }, { total: 0, present: 0, absent: 0 });

      const percentage = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 0;

      setReportStats({
        ...stats,
        percentage
      });

    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const calculateTotalAttendance = () => {
    const total = attendanceData.reduce((acc, curr) => {
      return {
        present: acc.present + curr.present,
        absent: acc.absent + curr.absent
      };
    }, { present: 0, absent: 0 });

    const totalStudents = total.present + total.absent;
    return totalStudents > 0 ? Math.round((total.present / totalStudents) * 100) : 0;
  };

  const getStudentName = (studentId: string): string => {
    const student = studentsMap.get(studentId);
    if (student) {
      return `${student.lastName}, ${student.firstName}${student.middleInitial ? ` ${student.middleInitial}.` : ''}`;
    }
    return studentId;
  };

  const handleCardPress = async (date: string, classId: string, className: string, subjectCode: string) => {
    try {
      // Get all students in the class
      const classStudents = await studentAPI.getStudentsByClass(classId);
      
      // Get attendance records for the selected date
      const response = await attendanceAPI.getAttendanceByClass(classId, date);
      
      // Create a map of attendance records for quick lookup
      const attendanceMap = new Map(
        response.attendance.map(a => [a.studentId, a])
      );
      
      // Create the full student list with attendance status
      const allStudentsAttendance = classStudents.map(student => {
        const attendanceRecord = attendanceMap.get(student.studentId);
        return {
          studentId: student.studentId,
          studentName: `${student.lastName}, ${student.firstName}${student.middleInitial ? ` ${student.middleInitial}.` : ''}`,
          status: (attendanceRecord?.status || 'absent') as 'present' | 'absent'
        };
      });

      const presentCount = allStudentsAttendance.filter(s => s.status === 'present').length;
      const absentCount = allStudentsAttendance.filter(s => s.status === 'absent').length;

      setSelectedDetails({
        date,
        className,
        subjectCode,
        classId,
        students: allStudentsAttendance,
        total: allStudentsAttendance.length,
        present: presentCount,
        absent: absentCount
      });
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      Alert.alert('Error', 'Failed to fetch attendance details');
    }
  };

  // Add a new function to handle attendance updates
  const handleAttendanceUpdate = async () => {
    try {
      await fetchData();
      await fetchReportsData();
      
      // If there's a selected details view, refresh it
      if (selectedDetails && selectedDetails.classId) {
        await handleCardPress(
          selectedDetails.date,
          selectedDetails.classId,
          selectedDetails.className,
          selectedDetails.subjectCode
        );
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const toggleSort = () => {
    setSortLatest(!sortLatest);
    setAttendanceRecords(prev => [...prev].reverse());
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };

  const handleRecordPress = (recordId: string, date: string, classId: string, className: string, subjectCode: string) => {
    if (isSelectionMode) {
      setSelectedRecords(prev => {
        const newSet = new Set(prev);
        if (newSet.has(recordId)) {
          newSet.delete(recordId);
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
        } else {
          newSet.add(recordId);
        }
        return newSet;
      });
    } else {
      handleCardPress(date, classId, className, subjectCode);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecords(new Set());
      setIsAllSelected(false);
    } else {
      const allRecordIds = attendanceRecords.map(record => record._id);
      setSelectedRecords(new Set(allRecordIds));
      setIsAllSelected(true);
    }
  };

  const handleLongPress = (recordId: string) => {
    setIsSelectionMode(true);
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      newSet.add(recordId);
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedRecords(new Set());
    setIsAllSelected(false);
  };

  const handleMultipleDelete = async () => {
    try {
      const selectedRecordsList = Array.from(selectedRecords);
      const recordsToDelete = selectedRecordsList.map(recordId => {
        const record = attendanceRecords.find(r => r._id === recordId);
        if (!record) throw new Error(`Record ${recordId} not found`);
        return {
          studentId: record.studentId,
          status: 'absent' as const,
          _delete: true
        };
      });

      // Use bulk update to mark records as deleted
      await attendanceAPI.bulkUpdateAttendance(
        attendanceRecords[0].classId,
        recordsToDelete
      );

      showSuccessNotification(`${selectedRecords.size} records deleted successfully`);
      setSelectedRecords(new Set());
      setIsSelectionMode(false);
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete records';
      Alert.alert('Error', errorMessage);
    }
    setShowDeleteModal(false);
  };

  const handleExport = async () => {
    try {
      if (!selectedDetails) return;
      
      // Create CSV content
      const csvContent = [
        ['Student ID', 'Student Name', 'Status'],
        ...selectedDetails.students.map(student => [
          student.studentId,
          student.studentName,
          student.status
        ])
      ].map(row => row.join(',')).join('\n');

      // Use the File System API to save the file
      const fileName = `attendance_${selectedDetails.className}_${new Date(selectedDetails.date).toISOString().split('T')[0]}.csv`;
      
      // Here you would implement the actual file download
      // For web, you can use the following:
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      
      setShowExportModal(false);
      showSuccessNotification('File exported successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to export file');
    }
  };

  const calculateCurrentStats = () => {
    if (selectedDetails) {
      return {
        total: selectedDetails.total,
        present: selectedDetails.present,
        absent: selectedDetails.absent
      };
    }

    // Get stats from reports data
    // Make sure we don't divide by zero and handle empty data
    const totalStudents = reportStats.total || 0;
    const presentStudents = reportStats.present || 0;
    const absentStudents = reportStats.absent || 0;

    return {
      total: totalStudents,
      present: presentStudents,
      absent: absentStudents
    };
  };

  const calculatePresentPercentage = () => {
    const stats = calculateCurrentStats();
    return stats.total > 0 
      ? Math.round((stats.present / stats.total) * 100) 
      : 0;
  };

  const calculateAbsentPercentage = () => {
    const stats = calculateCurrentStats();
    return stats.total > 0 
      ? Math.round((stats.absent / stats.total) * 100) 
      : 0;
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const syncAttendanceToReports = async () => {
    if (isSyncing) return; // Prevent multiple syncs

    try {
      setIsSyncing(true);
      let successCount = 0;
      let failCount = 0;

      // Get all classes first
      const classesData = await classAPI.getClasses();
      
      // For each class, get attendance and save to reports
      for (const classItem of classesData) {
        try {
          // Get attendance records for this class
          const response = await attendanceAPI.getAttendanceByClass(classItem._id);
          const classStudents = await studentAPI.getStudentsByClass(classItem._id);

          // Group attendance by date
          const attendanceByDate = new Map();
          
          response.attendance.forEach((record: { studentId: string; timestamp: string; status: 'present' | 'absent' | 'late' }) => {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (!attendanceByDate.has(date)) {
              attendanceByDate.set(date, []);
            }
            attendanceByDate.get(date).push(record);
          });

          // For each date, create/update a report
          for (const [date, records] of attendanceByDate.entries()) {
            // Create the full student list with attendance status
            const allStudentsAttendance = classStudents.map(student => {
              const attendanceRecord = records.find((r: { studentId: string; status: 'present' | 'absent' | 'late' }) => 
                r.studentId === student.studentId
              );
              return {
                studentId: student.studentId,
                studentName: `${student.lastName}, ${student.firstName}${student.middleInitial ? ` ${student.middleInitial}.` : ''}`,
                status: (attendanceRecord ? attendanceRecord.status : 'absent') as 'present' | 'absent' | 'late'
              };
            });

            const presentCount = allStudentsAttendance.filter(s => s.status === 'present').length;
            const absentCount = allStudentsAttendance.filter(s => s.status === 'absent').length;

            try {
              // Save to reports
              await reportAPI.saveReport({
                date,
                className: classItem.className,
                subjectCode: classItem.subjectCode,
                classId: classItem._id,
                totalStudents: allStudentsAttendance.length,
                presentCount,
                absentCount,
                students: allStudentsAttendance
              });
              successCount++;
            } catch (error) {
              console.error('Error saving report for date:', date, error);
              failCount++;
            }
          }
        } catch (error) {
          console.error('Error processing class:', classItem._id, error);
          failCount++;
        }
      }

      // Update last sync time
      setLastSyncTime(new Date());
      
      // Show sync status
      showSuccessNotification(`Reports saved: ${successCount} succeeded, ${failCount} failed`);

      // Only try to fetch overview data if we successfully saved some reports
      if (successCount > 0) {
        try {
          await fetchReportsData();
        } catch (error) {
          console.error('Error fetching overview after save:', error);
          // Don't show error for this since the save was successfulll
        }
      }

    } catch (error) {
      console.error('Error in sync process:', error);
      Alert.alert('Sync Error', 'Failed to save attendance records to reports');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    await syncAttendanceToReports();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

  if (selectedDetails) {
    return (
      <AttendanceDetails
        details={selectedDetails}
        onClose={() => setSelectedDetails(null)}
        onStatusChange={handleAttendanceUpdate}
      />
    );
  }

  const currentStats = calculateCurrentStats();
  const presentPercentage = calculatePresentPercentage();
  const absentPercentage = calculateAbsentPercentage();

  return (
    <ScrollView style={styles.container}>
      {/* Attendance Overview Card */}
      <View style={styles.overviewCard}>
        <TouchableOpacity 
          style={styles.overviewHeader}
          onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
        >
          <View>
            <Text style={styles.cardTitle}>Attendance Overview</Text>
            <Text style={styles.subTitle}>
              {`Last 7 Days • ${reports.length} Reports`}
            </Text>
          </View>
          <Ionicons 
            name={isOverviewExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#2eada6" 
          />
        </TouchableOpacity>

        <View style={styles.overviewStats}>
          <View style={[styles.statCircle, { borderColor: '#4CAF50', borderWidth: 2 }]}>
            <Text style={[styles.statPercentage, { color: '#4CAF50' }]}>{calculatePresentPercentage()}%</Text>
            <Text style={[styles.statLabel, { color: '#4CAF50' }]}>Present</Text>
            <Text style={styles.statSubLabel}>
              {calculateCurrentStats().present} students
            </Text>
          </View>
          <View style={[styles.statCircle, { borderColor: '#F44336', borderWidth: 2 }]}>
            <Text style={[styles.statPercentage, { color: '#F44336' }]}>{calculateAbsentPercentage()}%</Text>
            <Text style={[styles.statLabel, { color: '#F44336' }]}>Absent</Text>
            <Text style={styles.statSubLabel}>
              {calculateCurrentStats().absent} students
            </Text>
          </View>
        </View>

        {isOverviewExpanded && (
          <View style={styles.detailedStats}>
            <View style={styles.statRow}>
              <Text style={styles.statTitle}>Total Reports</Text>
              <Text style={styles.statValue}>{reports.length}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statTitle}>Total Students</Text>
              <Text style={styles.statValue}>{calculateCurrentStats().total}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statTitle}>Present Students</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {calculateCurrentStats().present}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statTitle}>Absent Students</Text>
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                {calculateCurrentStats().absent}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Records List Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Attendance List</Text>
          {lastSyncTime && (
            <Text style={styles.syncTime}>
              Last saved to reports: {lastSyncTime.toLocaleTimeString()}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={toggleSort}
          >
            <Ionicons 
              name={sortLatest ? "arrow-down" : "arrow-up"} 
              size={24} 
              color="#2eada6" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.refreshButton, isSyncing && styles.refreshButtonDisabled]}
            onPress={handleRefresh}
            disabled={isSyncing}
          >
            <Ionicons 
              name={isSyncing ? "sync-circle" : "save-outline"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Records List */}
      {attendanceRecords.length === 0 ? (
        <View style={styles.noRecordsContainer}>
          <Text style={styles.noRecordsText}>No attendance records found.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {attendanceRecords.map((item) => {
            const isSelected = selectedRecords.has(item._id);
            return (
              <TouchableOpacity
                key={item._id}
                style={[
                  styles.recordCard,
                  isSelected && styles.selectedCard
                ]}
                onPress={() => handleRecordPress(item._id, item.timestamp, item.classId, item.className, item.subjectCode)}
                onLongPress={() => handleLongPress(item._id)}
                activeOpacity={0.7}
              >
                <View style={styles.dateTimeContainer}>
                  {isSelectionMode && (
                    <View style={styles.checkbox}>
                      <Ionicons 
                        name={isSelected ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={isSelected ? "#2eada6" : "#666"}
                      />
                    </View>
                  )}
                  <Text style={styles.dateTime}>{formatDate(item.timestamp)}</Text>
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>{item.className}</Text>
                    <Text style={styles.subjectCode}>{item.subjectCode}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBottomBar}>
          <TouchableOpacity
            style={styles.cancelSelectionButton}
            onPress={exitSelectionMode}
          >
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteSelectedButton,
              selectedRecords.size === 0 && styles.deleteButtonDisabled
            ]}
            onPress={() => {
              if (selectedRecords.size > 0) {
                setShowDeleteModal(true);
              }
            }}
            disabled={selectedRecords.size === 0}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedRecords.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete {selectedRecords.size} selected record{selectedRecords.size !== 1 ? 's' : ''}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  if (selectedRecords.size === 1) {
                    setSelectedRecords(new Set());
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleMultipleDelete}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Notification */}
      {showNotification && (
        <View style={styles.notificationContainer}>
          <View style={styles.notification}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2eada6',
  },
  syncTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#2eada6',
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  refreshButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  recordCard: {
    backgroundColor: '#2eada6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  classInfo: {
    marginTop: 4,
  },
  className: {
    fontSize: 14,
    color: '#e0f2f1',
    fontWeight: '500',
  },
  subjectCode: {
    fontSize: 12,
    color: '#e0f2f1',
    opacity: 0.8,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 4,
  },
  detailsDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailsClass: {
    fontSize: 14,
    color: '#666',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionsContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 35,
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  studentList: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  studentId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  noRecordsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRecordsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2b4f4c',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  confirmButton: {
    backgroundColor: '#2eada6',
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
  },
  selectAllText: {
    color: '#2eada6',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  selectionBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  cancelSelectionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSelectionText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteSelectedButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ff6b6b',
  },
  deleteButtonDisabled: {
    backgroundColor: '#ffb3b3',
  },
  deleteSelectedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  notificationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  notification: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedCard: {
    backgroundColor: '#d4e9d7',
    borderWidth: 2,
    borderColor: '#2eada6',
  },
  checkbox: {
    marginRight: 10,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
  },
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 25,
    paddingHorizontal: 20,
    gap: 30,
  },
  statCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 2,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
  },
  statSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default Reports; 