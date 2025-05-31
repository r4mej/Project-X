import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AxiosError } from 'axios';
import { BlurView } from 'expo-blur';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { RootStackParamList } from '../../navigation/types';
import { attendanceAPI, classAPI, Student, studentAPI } from '../../services/api';
import QRGenerator from './QRGenerator';

// Define the route prop type
type ViewClassRouteProp = RouteProp<RootStackParamList, 'ClassList'>;
type ViewClassNavigationProp = StackNavigationProp<RootStackParamList>;

interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection: string;
}

interface Attendance {
  _id: string;
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
}

const ViewClass: React.FC = () => {
  const route = useRoute<ViewClassRouteProp>();
  const navigation = useNavigation<ViewClassNavigationProp>();
  const { classId, subjectCode, yearSection } = route.params;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [selectedTargetClass, setSelectedTargetClass] = useState<string | null>(null);
  const [newStudentId, setNewStudentId] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleInitial, setNewMiddleInitial] = useState('');
  const [editStudentIndex, setEditStudentIndex] = useState<number | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleInitial, setEditMiddleInitial] = useState('');
  const [expandedStudentIndex, setExpandedStudentIndex] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [showDropConfirmModal, setShowDropConfirmModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{index: number; name: string} | null>(null);
  const [sortAscending, setSortAscending] = useState(true);
  const [isAddModalClosing, setIsAddModalClosing] = useState(false);
  const [isEditModalClosing, setIsEditModalClosing] = useState(false);
  const [isCloneModalClosing, setIsCloneModalClosing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  // Fetch students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const data = await studentAPI.getStudentsByClass(classId);
        setStudents(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch students');
      }
      setLoading(false);
    };
    fetchStudents();
  }, [classId]);

  // Fetch available classes for cloning
  const fetchAvailableClasses = async () => {
    try {
      const classes = await classAPI.getClasses();
      // Filter out the current class
      setAvailableClasses(classes.filter((c: Class) => c._id !== classId));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch available classes');
    }
  };

  // Remove the refresh timer
  useEffect(() => {
    fetchAttendance();
  }, [classId]);

  // Simplify fetchAttendance function
  const fetchAttendance = async () => {
    setIsLoadingAttendance(true);
    try {
      const data = await attendanceAPI.getAttendanceByClass(classId);
      setAttendanceData(data.attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceData([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Sort students by surname
  const sortedStudents = [...students].sort((a, b) => {
    const getLastName = (s: Student) => s.lastName.trim().toLowerCase();
    const comparison = getLastName(a).localeCompare(getLastName(b));
    return sortAscending ? comparison : -comparison;
  });

  const handleAddStudent = async () => {
    if (!newStudentId.trim() || !newSurname.trim() || !newFirstName.trim()) {
      Alert.alert('Error', 'Please enter student ID, last name, and first name.');
      return;
    }

    // Validate student ID format
    if (!/^\d{4}-\d{4}$/.test(newStudentId.trim())) {
      Alert.alert('Error', 'Student ID must be in format: YYYY-XXXX');
      return;
    }

    try {
      // Debug: Check if we have a token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Not logged in. Please log in first.');
        return;
      }
      
      // Create a student object with proper handling of empty fields - format specifically for backend
      const studentData = {
        classId: classId,
        studentId: newStudentId.trim(),
        firstName: newFirstName.trim(),
        lastName: newSurname.trim(),
        email: `${newStudentId.trim().toLowerCase()}@student.example.com`,
        yearLevel: '1st Year',  // Default value
        course: 'BSIT'  // Default value
      };
      
      // Double check required fields have values
      if (!studentData.lastName || studentData.lastName === '') {
        Alert.alert('Error', 'Last name is required');
        return;
      }
      
      if (!studentData.course || studentData.course === '') {
        studentData.course = 'BSIT'; // Fallback to default if extraction fails
      }
      
      if (!studentData.yearLevel || studentData.yearLevel === '') {
        studentData.yearLevel = '1st Year'; // Ensure yearLevel is set
      }
      
      // Extract yearLevel and course from class data if available
      if (yearSection) {
        // Extract year from 'BSCS 1-A' -> '1st Year'
        const yearMatch = yearSection.match(/(\d+)/);
        if (yearMatch && yearMatch[1]) {
          const year = parseInt(yearMatch[1]);
          if (year === 1) studentData.yearLevel = '1st Year';
          else if (year === 2) studentData.yearLevel = '2nd Year';
          else if (year === 3) studentData.yearLevel = '3rd Year';
          else if (year === 4) studentData.yearLevel = '4th Year';
        }
      }
      
      // Extract course from subjectCode if available
      if (subjectCode) {
        const courseMatch = subjectCode.match(/([A-Z]+)/);
        if (courseMatch && courseMatch[1]) {
          studentData.course = courseMatch[1];
        }
      }
      
      // Only add middleInitial if it's not empty
      const middleI = newMiddleInitial?.trim();
      if (middleI && middleI.length > 0) {
        Object.assign(studentData, { middleInitial: middleI });
      }
      
      console.log('Adding student with data:', JSON.stringify(studentData));
      const newStudent = await studentAPI.addStudent(studentData);
      
      // Update the students list with the new student
      setStudents(prev => [...prev, newStudent]);
      
      // Clear form and close modal
      setNewStudentId('');
      setNewSurname('');
      setNewFirstName('');
      setNewMiddleInitial('');
      setAddModalVisible(false);

      // Show success modal
      const studentName = `${newStudent.lastName}, ${newStudent.firstName}${newStudent.middleInitial ? ' ' + newStudent.middleInitial + '.' : ''}`;
      setSuccessModalMessage(`${studentName} has been added successfully`);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error('Add student error:', error);
      
      // Get more detailed error information
      const axiosError = error as AxiosError<{message?: string, error?: string}>;
      if (axiosError.response?.data) {
        console.error('Server error details:', axiosError.response.data);
        
        // Handle specific error cases
        const errorData = axiosError.response.data as any;
        let errorMessage = errorData.message || errorData.error || 'Failed to add student';
        
        // Check for MongoDB duplicate key error
        if (errorData.error && errorData.error.includes('E11000 duplicate key error')) {
          // Extract the studentId from the error message
          const match = errorData.error.match(/studentId: "([^"]+)"/);
          const duplicateId = match ? match[1] : 'unknown';
          
          errorMessage = `Student ID ${duplicateId} already exists in the database. Please use a different ID.`;
        }
        
        Alert.alert('Error', errorMessage);
      } else {
        Alert.alert('Error', 'Failed to add student. Please check all required fields and try again.');
      }
    }
  };

  const handleEditStudent = async () => {
    if (editStudentIndex === null) return;
    if (!editStudentId.trim() || !editSurname.trim() || !editFirstName.trim()) {
      Alert.alert('Error', 'Please enter student ID, last name, and first name.');
      return;
    }
    const student = sortedStudents[editStudentIndex];
    try {
      const updatedStudent = {
        ...student,
        studentId: editStudentId.trim(),
        lastName: editSurname.trim(),
        firstName: editFirstName.trim(),
        middleInitial: editMiddleInitial.trim(),
      };

      const updated = await studentAPI.updateStudent(student._id, updatedStudent);
      
      // Update the students list with the updated student
      setStudents(prev => prev.map(s => s._id === student._id ? updated : s));
      
      setEditModalVisible(false);
      setEditStudentIndex(null);
      setEditStudentId('');
      setEditSurname('');
      setEditFirstName('');
      setEditMiddleInitial('');
    } catch (err) {
      console.error('Edit student error:', err);
      Alert.alert('Error', 'Failed to update student information.');
    }
  };

  const handleDropStudent = async (index: number) => {
    const student = sortedStudents[index];
    const studentName = `${student.lastName}, ${student.firstName}${student.middleInitial ? ' ' + student.middleInitial + '.' : ''}`;
    setStudentToDelete({ index, name: studentName });
    setShowDropConfirmModal(true);
  };

  const confirmDropStudent = async () => {
    if (!studentToDelete) return;
    
    const student = sortedStudents[studentToDelete.index];
    try {
      await studentAPI.deleteStudent(student._id);
      setStudents(prev => prev.filter(s => s._id !== student._id));
      setShowDropConfirmModal(false);
      setSuccessModalMessage(`${studentToDelete.name} has been dropped successfully`);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete student');
    }
    setStudentToDelete(null);
  };

  const openEditModal = (index: number) => {
    setEditStudentIndex(index);
    const student = sortedStudents[index];
    setEditStudentId(student.studentId);
    setEditSurname(student.lastName);
    setEditFirstName(student.firstName);
    setEditMiddleInitial(student.middleInitial || '');
    setEditModalVisible(true);
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };

  const handleLongPress = (studentId: string) => {
    setIsSelectionMode(true);
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      newSet.add(studentId);
      return newSet;
    });
  };

  const handleCardPress = (studentId: string) => {
    if (isSelectionMode) {
      setSelectedStudents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(studentId)) {
          newSet.delete(studentId);
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
        } else {
          newSet.add(studentId);
        }
        return newSet;
      });
    } else {
      const index = sortedStudents.findIndex(s => s._id === studentId);
      setExpandedStudentIndex(expandedStudentIndex === index ? null : index);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudents(new Set());
      setIsAllSelected(false);
    } else {
      const allStudentIds = sortedStudents.map(s => s._id);
      setSelectedStudents(new Set(allStudentIds));
      setIsAllSelected(true);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedStudents(new Set());
    setIsAllSelected(false);
  };

  const handleMultipleDelete = async () => {
    try {
      const selectedStudentsList = Array.from(selectedStudents);
      const promises = selectedStudentsList.map(studentId => studentAPI.deleteStudent(studentId));
      
      await Promise.all(promises);
      setSuccessModalMessage(`${selectedStudents.size} student${selectedStudents.size > 1 ? 's' : ''} deleted successfully`);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
      
      setSelectedStudents(new Set());
      setIsSelectionMode(false);
      
      // Refresh the student list
      const data = await studentAPI.getStudentsByClass(classId);
      setStudents(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete students');
    }
    setShowDeleteModal(false);
  };

  const handleCloneStudents = async () => {
    if (!selectedTargetClass) {
      Alert.alert('Error', 'Please select a target class');
      return;
    }

    try {
      // Clone students to the selected class
      await Promise.all(
        students.map(student => 
          studentAPI.addStudent({
            classId: selectedTargetClass,
            studentId: student.studentId,
            lastName: student.lastName,  // Use surname from UI model as lastName for API
            firstName: student.firstName,
            middleInitial: student.middleInitial || '',
            email: `${student.studentId.toLowerCase()}@student.example.com`,
            yearLevel: '1st Year',
            course: 'BSIT',
          })
        )
      );

      showSuccessNotification(`${students.length} students cloned successfully`);
      setCloneModalVisible(false);
      setSelectedTargetClass(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to clone students');
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalClosing(true);
    setTimeout(() => {
      setAddModalVisible(false);
      setIsAddModalClosing(false);
    }, 300);
  };

  const handleCloseEditModal = () => {
    setIsEditModalClosing(true);
    setTimeout(() => {
      setEditModalVisible(false);
      setIsEditModalClosing(false);
    }, 300);
  };

  const handleCloseCloneModal = () => {
    setIsCloneModalClosing(true);
    setTimeout(() => {
      setCloneModalVisible(false);
      setIsCloneModalClosing(false);
      setSelectedTargetClass(null);
    }, 300);
  };

  // Get attendance status for a student
  const getStudentAttendanceStatus = (studentId: string) => {
    const attendance = attendanceData.find(a => a.studentId === studentId);
    return attendance?.status || 'absent';
  };

  // Enhancement to the QR Generator modal
  const handleCloseQRModal = () => {
    setShowQRModal(false);
    // Refresh attendance data when QR modal is closed
    fetchAttendance();
  };

  const renderItem = ({ item, index }: { item: Student; index: number }) => {
    const isExpanded = expandedStudentIndex === index;
    const isSelected = selectedStudents.has(item._id);
    const fullName = `${item.lastName}, ${item.firstName}${item.middleInitial ? ` ${item.middleInitial}.` : ''}`;
    const attendanceStatus = getStudentAttendanceStatus(item.studentId);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleCardPress(item._id)}
        onLongPress={() => handleLongPress(item._id)}
        delayLongPress={500}
        style={[
          styles.studentCard,
          isSelected && styles.selectedCard,
          isExpanded && styles.expandedStudentCard
        ]}
      >
        <View style={styles.studentInfo}>
          <View style={styles.studentHeader}>
            {isSelectionMode && (
              <View style={styles.checkbox}>
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? "#2eada6" : "#666"}
                />
              </View>
            )}
            <View style={styles.studentMainInfo}>
              <Text style={styles.studentName}>{fullName}</Text>
              <Text style={styles.studentId}>{item.studentId}</Text>
            </View>
          </View>
          
          {isExpanded && !isSelectionMode && (
            <View style={styles.studentActionsExpanded}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => openEditModal(index)}
              >
                <Ionicons name="create-outline" size={20} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleDropStudent(index)}
              >
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                <Text style={[styles.actionText, { color: '#ff6b6b' }]}>Drop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student List</Text>
      </View>
      {/* Subject Code Row */}
      <View style={styles.subjectRow}>
        <Text style={styles.subjectCode}>{subjectCode}{yearSection ? ` (${yearSection})` : ''}</Text>
        {isSelectionMode ? (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAll}
          >
            <Ionicons
              name={isAllSelected ? "checkbox" : "square-outline"}
              size={24}
              color="#2eada6"
            />
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cloneButton} 
              onPress={() => {
                fetchAvailableClasses();
                setCloneModalVisible(true);
              }}
            >
              <Ionicons name="copy" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Student List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2eada6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sortedStudents}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: isSelectionMode ? 80 : 140 }
          ]}
          ListEmptyComponent={<Text style={styles.emptyText}>No students yet.</Text>}
          showsVerticalScrollIndicator={true}
          bounces={true}
          overScrollMode="always"
        />
      )}

      {/* Footer */}
      {!isSelectionMode && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.takeAttendanceButton}
            onPress={() => setShowQRModal(true)}
          >
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.takeAttendanceText}>Take Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sortButtonFooter}
            onPress={() => setSortAscending(!sortAscending)}
          >
            <Ionicons 
              name={sortAscending ? "arrow-up" : "arrow-down"} 
              size={24} 
              color="#2eada6" 
            />
            <Text style={styles.sortText}>
              {sortAscending ? "A-Z" : "Z-A"}
            </Text>
          </TouchableOpacity>
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
              selectedStudents.size === 0 && styles.deleteButtonDisabled
            ]}
            onPress={() => {
              if (selectedStudents.size > 0) {
                setShowDeleteModal(true);
              }
            }}
            disabled={selectedStudents.size === 0}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedStudents.size})
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
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete {selectedStudents.size} selected student{selectedStudents.size !== 1 ? 's' : ''}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  if (selectedStudents.size === 1) {
                    setSelectedStudents(new Set());
                  }
                }}
              >
                <Text style={styles.deleteModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmButton]}
                onPress={handleMultipleDelete}
              >
                <Text style={styles.deleteModalButtonText}>Delete</Text>
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
      {/* Blur Overlays */}
      <Modal
        transparent={true}
        visible={addModalVisible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Modal>

      <Modal
        transparent={true}
        visible={editModalVisible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Modal>

      <Modal
        transparent={true}
        visible={cloneModalVisible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Modal>

      {/* Add Student Modal */}
      <Modal 
        visible={addModalVisible} 
        transparent 
        animationType="none"
        onRequestClose={handleCloseAddModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={styles.bottomDrawerContent}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Student</Text>
            <TextInput
              style={styles.input}
              placeholder="ID Number"
              value={newStudentId}
              onChangeText={setNewStudentId}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={newSurname}
              onChangeText={setNewSurname}
            />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={newFirstName}
              onChangeText={setNewFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Middle Initial"
              value={newMiddleInitial}
              onChangeText={setNewMiddleInitial}
              maxLength={1}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCloseAddModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleAddStudent}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        visible={editModalVisible} 
        transparent 
        animationType="none"
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={styles.bottomDrawerContent}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Student</Text>
            <TextInput
              style={styles.input}
              placeholder="ID Number"
              value={editStudentId}
              onChangeText={setEditStudentId}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={editSurname}
              onChangeText={setEditSurname}
            />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={editFirstName}
              onChangeText={setEditFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Middle Initial"
              value={editMiddleInitial}
              onChangeText={setEditMiddleInitial}
              maxLength={1}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCloseEditModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleEditStudent}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Clone Modal */}
      <Modal
        visible={cloneModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseCloneModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={styles.bottomDrawerContent}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Clone Students</Text>
            <Text style={styles.modalSubtitle}>Select target class:</Text>
            
            <FlatList
              data={availableClasses}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.classOption,
                    selectedTargetClass === item._id && styles.selectedClassOption
                  ]}
                  onPress={() => setSelectedTargetClass(item._id)}
                >
                  <Text style={[
                    styles.classOptionText,
                    selectedTargetClass === item._id && styles.selectedClassOptionText
                  ]}>
                    {item.className} - {item.subjectCode}
                    {item.yearSection ? ` (${item.yearSection})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.classOptionsList}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={handleCloseCloneModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  !selectedTargetClass && styles.disabledButton
                ]} 
                onPress={handleCloneStudents}
                disabled={!selectedTargetClass}
              >
                <Text style={styles.modalButtonText}>Clone</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      {/* Drop Student Confirmation Modal */}
      <Modal
        transparent={true}
        visible={showDropConfirmModal}
        onRequestClose={() => setShowDropConfirmModal(false)}
        animationType="fade"
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={50} color="#ff6b6b" />
            </View>
            <Text style={styles.deleteModalTitle}>Drop Student</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to drop {studentToDelete?.name}?
              {'\n'}This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDropConfirmModal(false);
                  setStudentToDelete(null);
                }}
              >
                <Text style={styles.deleteModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmButton]}
                onPress={confirmDropStudent}
              >
                <Text style={styles.deleteModalButtonText}>Drop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Success Modal */}
      <Modal
        transparent={true}
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
            </View>
            <Text style={styles.successModalTitle}>Success!</Text>
            <Text style={styles.successModalText}>{successModalMessage}</Text>
          </View>
        </View>
      </Modal>
      {/* QR Generator Modal */}
      <QRGenerator
        visible={showQRModal}
        onClose={handleCloseQRModal}
        classId={classId}
        subjectCode={subjectCode}
        yearSection={yearSection}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 0,
  },
  headerContainer: {
    width: '100%',
    backgroundColor: '#2eada6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'space-between',
  },
  backButton: {
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
    flex: 1,
    marginLeft: 0,
  },
  subjectRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  addButton: {
    backgroundColor: '#2eada6',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: '#e8f4ea',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  expandedStudentCard: {
    backgroundColor: '#d4e9d7',
    borderWidth: 2,
    borderColor: '#2eada6',
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    width: '100%',
    marginBottom: 8,
  },
  studentMainInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5e57',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#2b4f4c',
    marginBottom: 4,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  attendanceStatusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  studentActionsExpanded: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2b4f4c',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 40,
    fontSize: 16,
  },
  bottomDrawerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomDrawerContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  saveButton: {
    backgroundColor: '#2eada6',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedCard: {
    backgroundColor: '#d4e9d7',
    borderWidth: 2,
    borderColor: '#2eada6',
  },
  checkbox: {
    marginRight: 10,
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
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  confirmButton: {
    backgroundColor: '#ff6b6b',
  },
  deleteModalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cloneButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  classOptionsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  classOption: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedClassOption: {
    backgroundColor: '#e8f4ea',
    borderColor: '#2eada6',
  },
  classOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedClassOptionText: {
    color: '#2eada6',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  successModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    marginBottom: 15,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalIconContainer: {
    marginBottom: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  sortButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
  },
  takeAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2eada6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  takeAttendanceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sortText: {
    color: '#2eada6',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ViewClass; 