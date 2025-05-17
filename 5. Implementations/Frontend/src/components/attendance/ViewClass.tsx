import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
      // Debug: Check if we have a token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Not logged in. Please log in first.');
        return;
      }
      
      const newStudent = await studentAPI.addStudent({
        classId,
        studentId: newStudentId.trim(),
        surname: newSurname.trim(),
        firstName: newFirstName.trim(),
        middleInitial: newMiddleInitial.trim(),
>>>>>>> parent of 2942016 (Vibe coding)
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
      {/* Top Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student List</Text>
      </View>
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

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
=======
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
>>>>>>> parent of 2942016 (Vibe coding)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
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
              placeholder="Surname"
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
>>>>>>> parent of 2942016 (Vibe coding)
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
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
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
              placeholder="Surname"
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
>>>>>>> parent of 2942016 (Vibe coding)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
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
>>>>>>> parent of 2942016 (Vibe coding)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
>>>>>>> parent of 2942016 (Vibe coding)
=======
>>>>>>> parent of 2942016 (Vibe coding)
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
>>>>>>> parent of 2942016 (Vibe coding)
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
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
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of 2942016 (Vibe coding)
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