import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { studentAPI } from '../../services/api';

interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  startPeriod: string;
  endPeriod: string;
}

interface Subject {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
  schedules?: Schedule[];
  room?: string;
  instructor?: string;
}

interface Student {
  _id: string;
  studentId: string;
  firstName: string;
  lastName?: string;
  attendanceRate?: number;
}

interface SubjectDetailsCardProps {
  subject: Subject;
  visible: boolean;
  onClose: () => void;
}

const SubjectDetailsCard: React.FC<SubjectDetailsCardProps> = ({
  subject,
  visible,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (visible) {
      loadStudents();
    }
  }, [visible]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsList = await studentAPI.getStudentsByClass(subject._id);
      setStudents(studentsList);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDays = (days: string[]) => {
    return days.join(', ');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView
        intensity={50}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.modalContainer}>
        <Animated.View 
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
          style={styles.modalContent}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Subject Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText}>{subject.subjectCode}</Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Subject Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book-outline" size={20} color="#2eada6" />
                <Text style={styles.sectionTitle}>Course Information</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.subjectName}>{subject.className}</Text>
                {subject.yearSection && (
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionText}>{subject.yearSection}</Text>
                  </View>
                )}
                {subject.instructor && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{subject.instructor}</Text>
                  </View>
                )}
                {subject.room && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{subject.room}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Schedule Section */}
            {subject.schedules && subject.schedules.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={20} color="#ff9800" />
                  <Text style={styles.sectionTitle}>Schedule</Text>
                </View>
                {subject.schedules.map((schedule, index) => (
                  <View key={index} style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                      <View style={styles.daysBadge}>
                        <Text style={styles.daysText}>{formatDays(schedule.days)}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleTime}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.timeText}>
                        {schedule.startTime} {schedule.startPeriod} - {schedule.endTime} {schedule.endPeriod}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Students List Section */}
            <View style={[styles.section, styles.lastSection]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#7c4dff" />
                <Text style={styles.sectionTitle}>Class List</Text>
              </View>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2eada6" />
                  <Text style={styles.loadingText}>Loading students...</Text>
                </View>
              ) : (
                <View style={styles.studentsList}>
                  {students.map((student) => (
                    <View key={student._id} style={styles.studentCard}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>
                          {student.firstName} {student.lastName}
                        </Text>
                        <Text style={styles.studentId}>{student.studentId}</Text>
                      </View>
                      {student.attendanceRate !== undefined && (
                        <View style={[styles.attendanceRate, { 
                          backgroundColor: student.attendanceRate >= 75 ? '#e8f5e9' : '#ffebee'
                        }]}>
                          <Text style={[styles.attendanceText, {
                            color: student.attendanceRate >= 75 ? '#4caf50' : '#f44336'
                          }]}>
                            {student.attendanceRate}%
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 12,
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
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 0,
    padding: 8,
  },
  subjectBadge: {
    backgroundColor: '#e8f5f4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  subjectBadgeText: {
    color: '#2eada6',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  scheduleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  scheduleHeader: {
    marginBottom: 12,
  },
  daysBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  daysText: {
    color: '#f57c00',
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
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
  studentsList: {
    gap: 8,
  },
  studentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
  },
  attendanceRate: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  attendanceText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SubjectDetailsCard; 