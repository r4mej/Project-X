import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { RootStackParamList } from '../../navigation/types';
import { attendanceAPI, classAPI, Student, studentAPI, authAPI } from '../../services/api';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';

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
  const [newUsername, setNewUsername] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleInitial, setNewMiddleInitial] = useState('');
  const [editStudentIndex, setEditStudentIndex] = useState<number | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editUsername, setEditUsername] = useState('');
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
  const [showScanner, setShowScanner] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{
    _id: string;
    subjectCode: string;
    yearSection: string;
  }>({
    _id: '1',
    subjectCode: 'CS101',
    yearSection: '3A',
  });

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

  // Sort students by username
  const sortedStudents = [...students].sort((a, b) => {
    const getUsername = (s: Student) => s.username.trim().toLowerCase();
    const comparison = getUsername(a).localeCompare(getUsername(b));
    return comparison;
  });

  // Helper function to format student ID
  const formatStudentId = (id: string) => {
    const studentIdRegex = /^\d{4}-\d{4}$/;
    if (!studentIdRegex.test(id)) {
      // If it's not in the correct format, return it with a warning indicator
      return `${id} (Invalid Format)`;
    }
    return id;
  };

  const handleAddStudent = async () => {
    try {
      if (!newStudentId.trim() || !newUsername.trim()) {
        Alert.alert('Error', 'Please enter student ID and username.');
        return;
      }

      const response = await fetch(`${API_URL}/students/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: classId,
          studentId: newStudentId.trim(),
          username: newUsername.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add student');
      }

      // Add the new student to the list
      const newStudent = data.student;
      setStudents(prev => [...prev, newStudent]);

      // Clear input fields
      setNewStudentId('');
      setNewUsername('');

      // Show success message
      Alert.alert('Success', `Student ${newStudent.username} has been added to the class.`);

    } catch (error: any) {
      console.error('Error adding student:', error);
      Alert.alert('Error', error.message || 'Failed to add student');
    }
  };

  const handleEditStudent = async () => {
    try {
      if (!editStudentId.trim() || !editUsername.trim()) {
        Alert.alert('Error', 'Please enter student ID and username.');
        return;
      }

      const response = await fetch(`${API_URL}/students/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: editStudentId.trim(),
          username: editUsername.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update student');
      }

      // Update the student in the list
      setStudents(prev => prev.map(s => 
        s.studentId === editStudentId ? data.student : s
      ));

      // Clear input fields
      setEditStudentId('');
      setEditUsername('');
      setEditModalVisible(false);

      // Show success message
      Alert.alert('Success', `Student ${data.student.username} has been updated.`);

    } catch (error: any) {
      console.error('Error updating student:', error);
      Alert.alert('Error', error.message || 'Failed to update student');
    }
  };

  const handleDropStudent = async (index: number) => {
    const student = sortedStudents[index];
    const studentName = `${student.surname}, ${student.firstName}${student.middleInitial ? ' ' + student.middleInitial + '.' : ''}`;
    setStudentToDelete({ index, name: studentName });
    setShowDropConfirmModal(true);
  };

  const confirmDropStudent = async () => {
    if (!studentToDelete) return;
    
    const student = sortedStudents[studentToDelete.index];
    try {
      // Use the MongoDB _id instead of registration number
      if (!student._id) {
        Alert.alert('Error', 'Student ID not found');
        return;
      }
      
      await studentAPI.deleteStudent(student._id, classId);
      setStudents(prev => prev.filter(s => s._id !== student._id));
      setShowDropConfirmModal(false);
      setSuccessModalMessage(`${studentToDelete.name} has been dropped successfully`);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (err) {
      console.error('Error dropping student:', err);
      Alert.alert('Error', 'Failed to drop student. Please try again.');
    }
    setStudentToDelete(null);
  };

  const openEditModal = (index: number) => {
    setEditStudentIndex(index);
    const student = sortedStudents[index];
    setEditStudentId(student.studentId);
    setEditSurname(student.surname);
    setEditFirstName(student.firstName);
    setEditMiddleInitial(student.middleInitial || '');
    setEditUsername(student.username);
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
      const index = sortedStudents.findIndex(s => s.studentId === studentId);
      setExpandedStudentIndex(expandedStudentIndex === index ? null : index);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudents(new Set());
      setIsAllSelected(false);
    } else {
      const allStudentIds = sortedStudents.map(s => s.studentId);
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
      const promises = selectedStudentsList.map(studentId => 
        studentAPI.deleteStudent(studentId, classId)
      );
      
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
            surname: student.surname,
            firstName: student.firstName,
            middleInitial: student.middleInitial || '',
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
    const attendance = attendanceData.find(a => a.studentId === studentId);  // Using registration number
    return attendance?.status || 'absent';
  };

  // Enhancement to the QR Generator modal
  const handleCloseQRModal = () => {
    setShowQRModal(false);
    // Refresh attendance data when QR modal is closed
    fetchAttendance();
  };

  const renderItem = ({ item }: { item: Student }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentId}>{item.studentId}</Text>
        <Text style={styles.studentName}>{item.username}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => openEditModal(sortedStudents.findIndex(s => s.studentId === item.studentId))}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.removeButton]}
          onPress={() => handleDropStudent(sortedStudents.findIndex(s => s.studentId === item.studentId))}
        >
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class View</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.classHeader}>
          <Text style={styles.classInfo}>
            {subjectCode} - {yearSection}
          </Text>
          <View style={styles.headerActions}>
            {isSelectionMode ? (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSelectAll}
                >
                  <Ionicons
                    name={isAllSelected ? "checkbox" : "square-outline"}
                    size={24}
                    color="#2eada6"
                  />
                  <Text style={styles.actionText}>
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#ff6b6b" }]}
                  onPress={() => setShowDeleteModal(true)}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                  <Text style={[styles.actionText, { color: "white" }]}>
                    Delete Selected
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={exitSelectionMode}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#2eada6" }]}
                  onPress={() => setAddModalVisible(true)}
                >
                  <Ionicons name="add" size={24} color="white" />
                  <Text style={[styles.actionText, { color: "white" }]}>
                    Add Student
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    fetchAvailableClasses();
                    setCloneModalVisible(true);
                  }}
                >
                  <Ionicons name="copy-outline" size={24} color="#2eada6" />
                  <Text style={styles.actionText}>Clone Students</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2eada6" style={styles.loader} />
        ) : students.length > 0 ? (
          <FlatList
            data={sortedStudents}
            renderItem={renderItem}
            keyExtractor={item => item.studentId}
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No students added yet</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#2eada6" }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text style={[styles.actionText, { color: "white" }]}>
                Add Your First Student
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Student Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseAddModal}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Student</Text>
                <TouchableOpacity onPress={handleCloseAddModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Student ID"
                value={newStudentId}
                onChangeText={setNewStudentId}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={newUsername}
                onChangeText={setNewUsername}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddStudent}
              >
                <Text style={styles.submitButtonText}>Add Student</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseEditModal}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Student</Text>
                <TouchableOpacity onPress={handleCloseEditModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Student ID"
                value={editStudentId}
                onChangeText={setEditStudentId}
                editable={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={editUsername}
                onChangeText={setEditUsername}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleEditStudent}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Clone Students Modal */}
      <Modal
        visible={cloneModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCloneModal}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Clone Students</Text>
                <TouchableOpacity onPress={handleCloseCloneModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScrollContent}>
                {availableClasses.map((classItem) => (
                  <TouchableOpacity
                    key={classItem._id}
                    style={[
                      styles.classOption,
                      selectedTargetClass === classItem._id && styles.selectedClassOption
                    ]}
                    onPress={() => setSelectedTargetClass(classItem._id)}
                  >
                    <View>
                      <Text style={styles.classOptionTitle}>{classItem.className}</Text>
                      <Text style={styles.classOptionSubtitle}>
                        {classItem.subjectCode} - {classItem.yearSection}
                      </Text>
                    </View>
                    {selectedTargetClass === classItem._id && (
                      <Ionicons name="checkmark-circle" size={24} color="#2eada6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !selectedTargetClass && styles.disabledButton
                ]}
                onPress={handleCloneStudents}
                disabled={!selectedTargetClass}
              >
                <Text style={styles.submitButtonText}>Clone Students</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationContent}>
              <Ionicons name="warning" size={48} color="#ff6b6b" />
              <Text style={styles.confirmationTitle}>Delete Students?</Text>
              <Text style={styles.confirmationText}>
                Are you sure you want to delete {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}?
                This action cannot be undone.
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.cancelButton]}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.confirmationButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.deleteButton]}
                  onPress={handleMultipleDelete}
                >
                  <Text style={[styles.confirmationButtonText, { color: 'white' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Drop Student Confirmation Modal */}
      <Modal
        visible={showDropConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDropConfirmModal(false)}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationContent}>
              <Ionicons name="warning" size={48} color="#ff6b6b" />
              <Text style={styles.confirmationTitle}>Drop Student?</Text>
              <Text style={styles.confirmationText}>
                Are you sure you want to drop {studentToDelete?.name}?
                This action cannot be undone.
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.cancelButton]}
                  onPress={() => setShowDropConfirmModal(false)}
                >
                  <Text style={styles.confirmationButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmationButton, styles.deleteButton]}
                  onPress={confirmDropStudent}
                >
                  <Text style={[styles.confirmationButtonText, { color: 'white' }]}>Drop</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
      >
        <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.successModal}>
            <View style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={48} color="#2eada6" />
              <Text style={styles.successText}>{successModalMessage}</Text>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* QR Scanner Modal */}
      {selectedClass && (
        <QRScanner
          visible={showQRModal}
          onClose={handleCloseQRModal}
          classId={selectedClass._id}
          subjectCode={selectedClass.subjectCode}
          yearSection={selectedClass.yearSection}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2eada6',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  classHeader: {
    marginBottom: 16,
  },
  classInfo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2eada6',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#2eada6',
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    backgroundColor: '#f0f9f9',
    borderWidth: 2,
    borderColor: '#2eada6',
  },
  expandedStudentCard: {
    paddingBottom: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  studentMainInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  studentActionsExpanded: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#2eada6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    maxHeight: '70%',
  },
  classOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedClassOption: {
    borderColor: '#2eada6',
    backgroundColor: '#f0f9f9',
  },
  classOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  classOptionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  cancelButton: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  confirmButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successModal: {
    position: 'absolute',
    bottom: '10%',
    left: '10%',
    right: '10%',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  expandButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmationModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
  },
  confirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2eada6',
    padding: 8,
    borderRadius: 6,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 6,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addForm: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: '#2eada6',
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ViewClass; 