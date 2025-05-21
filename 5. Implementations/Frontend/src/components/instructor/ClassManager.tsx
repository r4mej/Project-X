import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../../navigation/types';
import { classAPI } from '../../services/api';

interface TimeSlot {
  days: string[];
  startTime: string;
  startPeriod: string;
  endTime: string;
  endPeriod: string;
}

interface DaySelection {
  M: boolean;
  T: boolean;
  W: boolean;
  TH: boolean;
  F: boolean;
  S: boolean;
}

export interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  schedules: TimeSlot[];
  course: string;
  room: string;
  yearSection: string;
}

const AttendanceManager: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [schedules, setSchedules] = useState<TimeSlot[]>([]);
  const [selectedDays, setSelectedDays] = useState<DaySelection>({
    M: false,
    T: false,
    W: false,
    TH: false,
    F: false,
    S: false,
  });
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [isStartAM, setIsStartAM] = useState(true);
  const [isEndAM, setIsEndAM] = useState(false);
  const [course, setCourse] = useState('');
  const [room, setRoom] = useState('');
  const [yearSection, setYearSection] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [savedClassName, setSavedClassName] = useState('');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    fetchClasses();
  }, []);

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classAPI.getClasses();
      setClasses(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (classId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const addSchedule = () => {
    const selectedDaysList = Object.entries(selectedDays)
      .filter(([_, isSelected]) => isSelected)
      .map(([day]) => day);

    if (selectedDaysList.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (!startTimeInput || !endTimeInput) {
      Alert.alert('Error', 'Please enter both start and end times');
      return;
    }

    const newSchedule: TimeSlot = {
      days: selectedDaysList,
      startTime: startTimeInput,
      startPeriod: isStartAM ? 'AM' : 'PM',
      endTime: endTimeInput,
      endPeriod: isEndAM ? 'AM' : 'PM'
    };

    setSchedules([...schedules, newSchedule]);

    // Reset schedule form
    setSelectedDays({
      M: false,
      T: false,
      W: false,
      TH: false,
      F: false,
      S: false,
    });
    setStartTimeInput('');
    setEndTimeInput('');
    setIsStartAM(true);
    setIsEndAM(false);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setClassName(classItem.className);
    setSubjectCode(classItem.subjectCode);
    setSchedules(classItem.schedules);
    setCourse(classItem.course);
    setRoom(classItem.room);
    setYearSection(classItem.yearSection);
    setModalVisible(true);
  };

  const handleDeleteClass = async (id: string) => {
    try {
      setSelectedClasses(new Set([id]));
      setShowDeleteModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete class');
    }
  };

  const handleMultipleDelete = async () => {
    try {
      const selectedClassesList = Array.from(selectedClasses);
      const promises = selectedClassesList.map(classId => classAPI.deleteClass(classId));
      
      await Promise.all(promises);
      showSuccessNotification(`${selectedClasses.size} classes deleted successfully`);
      setSelectedClasses(new Set());
      setIsSelectionMode(false);
      fetchClasses();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete classes');
    }
    setShowDeleteModal(false);
  };

  const handleSaveClass = async () => {
    try {
      if (schedules.length === 0) {
        Alert.alert('Error', 'Please add at least one schedule');
        return;
      }

      const classData = {
        className,
        subjectCode,
        schedules,
        course,
        room,
        yearSection
      };

      if (editingClass) {
        await classAPI.updateClass(editingClass._id, classData);
        showSuccessNotification('Class updated successfully');
      } else {
        await classAPI.createClass(classData);
        showSuccessNotification('Class added successfully');
      }

      setModalVisible(false);
      fetchClasses();
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save class');
    }
  };

  const resetForm = () => {
    setClassName('');
    setSubjectCode('');
    setSchedules([]);
    setCourse('');
    setRoom('');
    setYearSection('');
    setEditingClass(null);
  };

  const handleAddClass = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleLongPress = (classId: string) => {
    setIsSelectionMode(true);
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      newSet.add(classId);
      return newSet;
    });
  };

  const handleEllipsisPress = (classId: string) => {
    // Expand the card if not already expanded
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      newSet.add(classId);
      return newSet;
    });
    setShowOptionsMenu(showOptionsMenu === classId ? null : classId);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClasses(new Set());
      setIsAllSelected(false);
    } else {
      const allClassIds = classes.map(c => c._id);
      setSelectedClasses(new Set(allClassIds));
      setIsAllSelected(true);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedClasses(new Set());
    setIsAllSelected(false);
  };

  const handleViewClass = (classItem: Class) => {
    navigation.navigate('ClassList', {
      classId: classItem._id,
      className: classItem.className,
      subjectCode: classItem.subjectCode,
      yearSection: classItem.yearSection,
    });
  };

  const renderScheduleItem = (schedule: TimeSlot, index: number) => (
    <View key={index} style={styles.scheduleItem}>
      <View style={styles.scheduleContent}>
        <Text style={styles.scheduleDays}>{schedule.days.join(', ')}</Text>
        <Text style={styles.scheduleTime}>
          {schedule.startTime} {schedule.startPeriod} - {schedule.endTime} {schedule.endPeriod}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeScheduleButton}
        onPress={() => removeSchedule(index)}
      >
        <Ionicons name="close-circle" size={24} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const renderOptionsMenu = (classId: string) => {
    if (showOptionsMenu !== classId) return null;

    return (
      <View style={styles.optionsMenu}>
        <TouchableOpacity 
          style={styles.optionItem}
          onPress={() => {
            const classItem = classes.find(c => c._id === classId);
            if (classItem) {
              handleEditClass(classItem);
            }
            setShowOptionsMenu(null);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#3b82f6" />
          <Text style={styles.optionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.optionItem}
          onPress={() => {
            handleDeleteClass(classId);
            setShowOptionsMenu(null);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          <Text style={[styles.optionText, { color: '#ff6b6b' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderClassItem = ({ item }: { item: Class }) => {
    const isExpanded = expandedCards.has(item._id);
    const isSelected = selectedClasses.has(item._id);
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleCardPress(item._id)}
        style={[
          styles.classItem,
          isSelected && styles.selectedCard
        ]}
      >
        <View style={styles.classInfo}>
          <View style={styles.classHeader}>
            <View style={styles.titleSection}>
              {isSelectionMode && (
                <View style={styles.checkbox}>
                  <Ionicons 
                    name={isSelected ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={isSelected ? "#3b82f6" : "#666"}
                  />
                </View>
              )}
              <View>
                <Text style={styles.className}>{item.className}</Text>
                <Text style={styles.subjectCode}>{item.subjectCode}</Text>
              </View>
            </View>
            {!isSelectionMode && (
              <TouchableOpacity 
                style={styles.optionsButton}
                onPress={(e) => {
                  e.stopPropagation && e.stopPropagation();
                  handleEllipsisPress(item._id);
                }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          {renderOptionsMenu(item._id)}
          {isExpanded && (
            <>
              {item.schedules.map((schedule, index) => (
                <View key={index} style={styles.scheduleDisplay}>
                  <Text style={styles.scheduleText}>
                    {schedule.days.join(', ')}
                  </Text>
                  <Text style={styles.scheduleText}>
                    {schedule.startTime} {schedule.startPeriod} - {schedule.endTime} {schedule.endPeriod}
                  </Text>
                </View>
              ))}
              <Text style={styles.detailText}>Course: {item.course}</Text>
              <Text style={styles.detailText}>Room: {item.room}</Text>
              <Text style={styles.detailText}>Year/Section: {item.yearSection}</Text>
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#3b82f6',
                }}
                onPress={(e) => {
                  e.stopPropagation && e.stopPropagation();
                  handleViewClass(item);
                }}
              >
                <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 16 }}>View Class</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const toggleDay = (day: keyof DaySelection) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleTimeInput = (text: string, setter: (text: string) => void) => {
    // Only allow numbers and colon
    const cleaned = text.replace(/[^0-9:]/g, '');
    if (cleaned.length <= 5) {
      setter(cleaned);
    }
  };

  const DayButton = ({ day, label }: { day: keyof DaySelection; label: string }) => (
    <TouchableOpacity
      style={[
        styles.dayButton,
        selectedDays[day] && styles.dayButtonActive
      ]}
      onPress={() => toggleDay(day)}
    >
      <Text style={[
        styles.dayButtonText,
        selectedDays[day] && styles.dayButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Class List</Text>
          {isSelectionMode ? (
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Ionicons
                name={isAllSelected ? "checkbox" : "square-outline"}
                size={24}
                color="#3b82f6"
              />
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
        ) : (
          <FlatList
            data={classes}
            renderItem={renderClassItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

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
              selectedClasses.size === 0 && styles.deleteButtonDisabled
            ]}
            onPress={() => {
              if (selectedClasses.size > 0) {
                setShowDeleteModal(true);
              }
            }}
            disabled={selectedClasses.size === 0}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedClasses.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Blur Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
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
              <Ionicons name="checkmark-circle" size={50} color="#3b82f6" />
            </View>
            <Text style={styles.successModalTitle}>Class Added Successfully!</Text>
            <Text style={styles.successModalText}>{savedClassName} has been added to your class list.</Text>
          </View>
        </View>
      </Modal>

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
              Are you sure you want to delete {selectedClasses.size} selected class{selectedClasses.size !== 1 ? 'es' : ''}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  if (selectedClasses.size === 1) {
                    setSelectedClasses(new Set());
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

      {/* Content Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Class</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.input}
                placeholder="Class Name (e.g., ITC 130)"
                placeholderTextColor="#999"
                value={className}
                onChangeText={setClassName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Subject Code (e.g., CSC101)"
                placeholderTextColor="#999"
                value={subjectCode}
                onChangeText={setSubjectCode}
                autoCapitalize="characters"
              />

              <Text style={styles.sectionTitle}>Schedules</Text>
              
              {schedules.map((schedule, index) => renderScheduleItem(schedule, index))}

              <View style={styles.scheduleForm}>
                <Text style={styles.label}>Select Days</Text>
                <View style={styles.daysContainer}>
                  <DayButton day="M" label="M" />
                  <DayButton day="T" label="T" />
                  <DayButton day="W" label="W" />
                  <DayButton day="TH" label="TH" />
                  <DayButton day="F" label="F" />
                  <DayButton day="S" label="S" />
                </View>

                <Text style={styles.label}>Time</Text>
                <View style={styles.timeRangeContainer}>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[styles.timeButton, styles.timeInput]}
                      placeholder="Start Time (e.g., 8:00)"
                      placeholderTextColor="#999"
                      value={startTimeInput}
                      onChangeText={(text) => handleTimeInput(text, setStartTimeInput)}
                      keyboardType="numeric"
                    />
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={isStartAM ? 'AM' : 'PM'}
                        style={styles.periodPicker}
                        onValueChange={(value) => setIsStartAM(value === 'AM')}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[styles.timeButton, styles.timeInput]}
                      placeholder="End Time (e.g., 11:00)"
                      placeholderTextColor="#999"
                      value={endTimeInput}
                      onChangeText={(text) => handleTimeInput(text, setEndTimeInput)}
                      keyboardType="numeric"
                    />
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={isEndAM ? 'AM' : 'PM'}
                        style={styles.periodPicker}
                        onValueChange={(value) => setIsEndAM(value === 'AM')}
                      >
                        <Picker.Item label="AM" value="AM" />
                        <Picker.Item label="PM" value="PM" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.addScheduleButton}
                  onPress={addSchedule}
                >
                  <Text style={styles.addScheduleButtonText}>Add Schedule</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Course (e.g., BSCS)"
                placeholderTextColor="#999"
                value={course}
                onChangeText={setCourse}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Room (e.g., Room 301)"
                placeholderTextColor="#999"
                value={room}
                onChangeText={setRoom}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Year/Section (e.g., 3A)"
                placeholderTextColor="#999"
                value={yearSection}
                onChangeText={setYearSection}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={handleSaveClass}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 60,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dayButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: 'white',
  },
  timeRangeContainer: {
    gap: 10,
    marginBottom: 15,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  timeButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeInput: {
    fontSize: 16,
    color: '#333',
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    height: 50,
  },
  periodPicker: {
    height: 50,
    backgroundColor: 'transparent',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
    flexWrap: 'wrap',
    gap: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    marginHorizontal: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
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
    textAlign: 'center',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  classItem: {
    backgroundColor: '#2eada6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 14,
    color: '#e0f2f1',
    marginBottom: 4,
  },
  optionsButton: {
    padding: 4,
    borderRadius: 4,
  },
  optionsMenu: {
    position: 'absolute',
    top: 30,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#2eada6',
    fontWeight: '500',
  },
  scheduleDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  scheduleText: {
    color: '#ffffff',
    marginBottom: 4,
    fontSize: 14,
  },
  detailText: {
    color: '#e0f2f1',
    marginBottom: 2,
    fontSize: 14,
  },
  loader: {
    marginTop: 50,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleDays: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 14,
    color: '#666',
  },
  removeScheduleButton: {
    padding: 4,
  },
  scheduleForm: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  addScheduleButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addScheduleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '80%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 10,
    textAlign: 'center',
  },
  successModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#1a8c85',
    borderWidth: 2,
    borderColor: '#e0f2f1',
  },
  checkbox: {
    marginRight: 10,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  selectAllText: {
    color: '#3b82f6',
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
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2b4f4c',
  },
  deleteModalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
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
});

export default AttendanceManager; 