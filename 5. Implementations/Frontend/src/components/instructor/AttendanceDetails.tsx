import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { attendanceAPI } from '../../services/api';

interface AttendanceDetailsProps {
  details: {
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
  };
  onClose: () => void;
  onStatusChange?: () => void;
}

const AttendanceDetails: React.FC<AttendanceDetailsProps> = ({ details, onClose, onStatusChange }) => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent'>('absent');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleStatusChange = async () => {
    if (!selectedStudent || !details.classId) return;

    try {
      // Find the student in the details
      const student = details.students.find(s => s.studentId === selectedStudent);
      if (!student) return;

      // Call the API to update the attendance
      const response = await attendanceAPI.submitAttendance({
        classId: details.classId,
        studentId: student.studentId,
        studentName: student.studentName,
        status: selectedStatus,
        timestamp: new Date(details.date).toISOString(),
        recordedVia: 'manual'
      });

      // Update the local state to reflect the change
      details.students = details.students.map(s => {
        if (s.studentId === selectedStudent) {
          return { ...s, status: selectedStatus };
        }
        return s;
      });

      // Update the counts
      details.present = details.students.filter(s => s.status === 'present').length;
      details.absent = details.students.filter(s => s.status === 'absent').length;

      // Show success message
      Alert.alert(
        'Success',
        `Student has been marked as ${selectedStatus}`,
        [{ text: 'OK' }]
      );

      // Trigger refresh of attendance data
      if (onStatusChange) {
        await onStatusChange();
      }
    } catch (error: any) {
      console.error('Error updating attendance status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update attendance status. Please try again.';
      Alert.alert(
        'Error',
        errorMessage
      );
    }

    setShowStatusModal(false);
    setSelectedStudent(null);
  };

  const openStatusModal = (studentId: string, currentStatus: 'present' | 'absent') => {
    setSelectedStudent(studentId);
    setSelectedStatus(currentStatus === 'present' ? 'absent' : 'present');
    setShowStatusModal(true);
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);

      // Format date for filename (YYYY-MM-DD)
      const fileDate = new Date(details.date).toISOString().split('T')[0];
      
      // Extract section from className (assuming format includes section)
      const section = details.className.split(' ').pop() || '';
      
      // Create a clean filename without special characters
      const cleanSubjectCode = details.subjectCode.replace(/[^a-zA-Z0-9]/g, '');
      const cleanSection = section.replace(/[^a-zA-Z0-9]/g, '');
      
      // Format: SubjectCode_Section_YYYY-MM-DD.csv
      const fileName = `${cleanSubjectCode}_${cleanSection}_${fileDate}.csv`;

      // Create CSV header
      const csvHeader = 'Student ID,Student Name,Status,Date,Class,Subject Code\n';
      
      // Create CSV rows
      const csvRows = details.students.map(student => {
        return `"${student.studentId}","${student.studentName}","${student.status}","${formatDate(details.date)}","${details.className}","${details.subjectCode}"`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;

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
            dialogTitle: 'Export Attendance Details'
          });
        } else {
          await Sharing.shareAsync(filePath);
        }
      }

      Alert.alert('Success', `Attendance details exported as ${fileName}`);
    } catch (error) {
      console.error('Error exporting details:', error);
      Alert.alert('Error', 'Failed to export attendance details');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color="#2eada6" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.detailsTitle}>Attendance Details</Text>
            <Text style={styles.detailsDate}>{formatDate(details.date)}</Text>
            <Text style={styles.detailsClass}>{details.className} - {details.subjectCode}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{details.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {details.present}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>
              {details.absent}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        <FlatList
          data={details.students}
          keyExtractor={(item) => item.studentId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentItem}
              onPress={() => openStatusModal(item.studentId, item.status)}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.studentName}</Text>
                <Text style={styles.studentId}>{item.studentId}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'present' ? '#4CAF50' : '#F44336' }
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.markButton}
                onPress={() => openStatusModal(item.studentId, item.status)}
              >
                <Ionicons name="swap-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.studentList}
        />
      </View>

      {/* Export Button at Bottom */}
      <View style={styles.exportContainer}>
        <TouchableOpacity
          style={[
            styles.exportButton,
            isExporting && styles.exportButtonDisabled
          ]}
          onPress={exportToCSV}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#2eada6" />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="#2eada6" />
              <Text style={styles.exportButtonText}>Export Details to CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Status Change Confirmation Modal */}
      <Modal
        transparent={true}
        visible={showStatusModal}
        onRequestClose={() => setShowStatusModal(false)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Attendance Status</Text>
            <Text style={styles.modalText}>
              Are you sure you want to mark this student as {selectedStatus}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedStudent(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  selectedStatus === 'present' ? styles.presentButton : styles.absentButton
                ]}
                onPress={handleStatusChange}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
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
  studentList: {
    padding: 16,
    paddingBottom: 80, // Add padding to account for export button
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  markButton: {
    padding: 8,
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
  },
  presentButton: {
    backgroundColor: '#4CAF50',
  },
  absentButton: {
    backgroundColor: '#F44336',
  },
  exportContainer: {
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

export default AttendanceDetails; 