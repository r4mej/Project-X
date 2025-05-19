import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { StudentDrawerParamList } from '../../navigation/types';
import { attendanceAPI, classAPI, studentAPI } from '../../services/api';
import StudentList from './StudentList';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList>;

interface Schedule {
  days: string[];
  startTime: string;
  startPeriod: string;
  endTime: string;
  endPeriod: string;
}

interface Subject {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection?: string;
  schedules?: Schedule[];
  room?: string;
  attendanceStats?: {
    total: number;
    present: number;
    percentage: number;
  };
}

interface Student {
  _id: string;
  studentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

const MyClasses: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<Subject | null>(null);
  const [showStudentList, setShowStudentList] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user?.userId) {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const allClasses = await classAPI.getClasses();
      
      // For each class, check if the student is enrolled and get attendance stats
      const enrolledClasses = await Promise.all(
        allClasses.map(async (classItem: Subject) => {
          const students = await studentAPI.getStudentsByClass(classItem._id);
          const isEnrolled = students.some(student => student.studentId === user!.userId);
          
          if (isEnrolled) {
            // Get attendance stats for this class
            const stats = await attendanceAPI.getAttendanceByStudent(
              user!.userId,
              classItem._id
            );
            
            return {
              ...classItem,
              attendanceStats: {
                total: stats.stats.total || 0,
                present: stats.stats.present || 0,
                percentage: stats.stats.total > 0 
                  ? Math.round((stats.stats.present / stats.stats.total) * 100) 
                  : 0
              }
            };
          }
          return null;
        })
      );

      // Filter out null values and set subjects
      const validClasses = enrolledClasses.filter((c): c is Subject => c !== null);
      setSubjects(validClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (subject: Subject) => {
    try {
      setSelectedClass(subject);
      setLoadingStudents(true);
      setShowStudentList(true);
      const studentList = await studentAPI.getStudentsByClass(subject._id);
      const mappedStudents = studentList.map(student => ({
        _id: student._id,
        studentId: student.studentId,
        userId: student.studentId, // Using studentId as userId since that's what we have
        firstName: student.firstName,
        lastName: student.lastName, // Map lastName to lastName
        email: student.studentId + '@example.com' // Creating a placeholder email since it's required
      }));
      setStudents(mappedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const getDayAbbreviation = (fullDay: string): string => {
    switch (fullDay.toUpperCase()) {
      case 'MONDAY': return 'M';
      case 'TUESDAY': return 'T';
      case 'WEDNESDAY': return 'W';
      case 'THURSDAY': return 'TH';
      case 'FRIDAY': return 'F';
      case 'SATURDAY': return 'S';
      default: return '';
    }
  };

  const isOngoing = (schedule: Schedule) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    const currentDay = getDayAbbreviation(now.toLocaleDateString('en-US', { weekday: 'long' }));
    
    if (!schedule.days.includes(currentDay)) return false;

    const convertTo24Hour = (time: string, period: string) => {
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const currentMinutes = convertTo24Hour(
      currentTime.split(' ')[0],
      currentTime.split(' ')[1]
    );
    const startMinutes = convertTo24Hour(schedule.startTime, schedule.startPeriod);
    const endMinutes = convertTo24Hour(schedule.endTime, schedule.endPeriod);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const toggleCard = (subjectId: string) => {
    setExpandedCardId(expandedCardId === subjectId ? null : subjectId);
    Animated.spring(animation, {
      toValue: expandedCardId === subjectId ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

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
          <Text style={styles.headerTitle}>My Classes</Text>
        </View>
      </View>

      <View style={styles.mainContainer}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewContent}>
            <Text style={styles.overviewTitle}>Class Overview</Text>
            <View style={styles.totalClassesCircle}>
              <Text style={styles.totalClassesNumber}>{subjects.length}</Text>
              <Text style={styles.totalClassesLabel}>Classes</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer}>
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2eada6" />
                <Text style={styles.loadingText}>Loading classes...</Text>
              </View>
            ) : subjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No classes found</Text>
                <Text style={styles.emptySubText}>You are not enrolled in any classes yet</Text>
              </View>
            ) : (
              <View style={styles.classList}>
                {subjects.map((subject) => {
                  const hasOngoingClass = subject.schedules?.some(isOngoing);
                  const isExpanded = expandedCardId === subject._id;
                  
                  return (
                    <TouchableOpacity
                      key={subject._id}
                      style={[
                        styles.classCard,
                        { backgroundColor: hasOngoingClass ? '#e8f5f4' : '#2eada6' }
                      ]}
                      onPress={() => toggleCard(subject._id)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.classHeader}>
                        <View style={styles.classInfo}>
                          <Text style={[styles.classCode, { color: 'white' }]}>{subject.subjectCode}</Text>
                          <Text style={[styles.className, { color: 'white' }]}>{subject.className}</Text>
                          {subject.yearSection && (
                            <Text style={[styles.yearSection, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                              {subject.yearSection}
                            </Text>
                          )}
                        </View>
                        <View style={styles.statsContainer}>
                          <View style={[styles.attendanceBadge, {
                            backgroundColor: (subject.attendanceStats?.percentage ?? 0) >= 75 ? '#e8f5e9' : '#ffebee'
                          }]}>
                            <Text style={[styles.attendanceText, {
                              color: (subject.attendanceStats?.percentage ?? 0) >= 75 ? '#4caf50' : '#f44336'
                            }]}>
                              {subject.attendanceStats?.percentage ?? 0}%
                            </Text>
                          </View>
                          {hasOngoingClass && (
                            <View style={[styles.ongoingBadge, { backgroundColor: '#fff' }]}>
                              <Text style={[styles.ongoingText, { color: '#2eada6' }]}>Ongoing</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Animated.View style={[
                        styles.expandableContent,
                        {
                          maxHeight: isExpanded ? undefined : 0,
                          opacity: isExpanded ? 1 : 0,
                          transform: [{
                            translateY: animation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-10, 0]
                            })
                          }]
                        }
                      ]}>
                        <View style={styles.scheduleContainer}>
                          {subject.schedules?.map((schedule, index) => (
                            <View key={index} style={styles.scheduleItem}>
                              <View style={styles.scheduleInfo}>
                                <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
                                <Text style={[styles.scheduleText, { color: 'white' }]}>
                                  {schedule.startTime} {schedule.startPeriod} - {schedule.endTime} {schedule.endPeriod}
                                </Text>
                              </View>
                              <View style={styles.daysContainer}>
                                {schedule.days.map((day, idx) => (
                                  <Text key={idx} style={styles.dayText}>{day}</Text>
                                ))}
                              </View>
                            </View>
                          ))}
                        </View>

                        {subject.room && (
                          <View style={styles.roomContainer}>
                            <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
                            <Text style={[styles.roomText, { color: 'white' }]}>{subject.room}</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.viewStudentsButton}
                          onPress={() => handleViewStudents(subject)}
                        >
                          <Ionicons name="people-outline" size={16} color="#2eada6" />
                          <Text style={styles.viewStudentsText}>View Class List</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <StudentList
          visible={showStudentList}
          onClose={() => setShowStudentList(false)}
          students={students}
          loading={loadingStudents}
          subjectCode={selectedClass?.subjectCode}
          yearSection={selectedClass?.yearSection}
        />
      </View>
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
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  classList: {
    gap: 16,
  },
  classCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  classCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 4,
  },
  className: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  yearSection: {
    fontSize: 14,
    color: '#666',
  },
  ongoingBadge: {
    backgroundColor: '#2eada6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ongoingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
  },
  scheduleItem: {
    marginBottom: 12,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: 14,
    color: '#666',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 22,
  },
  dayText: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#2eada6',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  roomText: {
    fontSize: 14,
    color: '#666',
  },
  overviewCard: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  overviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  totalClassesCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2eada6',
  },
  totalClassesNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 2,
  },
  totalClassesLabel: {
    fontSize: 12,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  attendanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewStudentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  viewStudentsText: {
    color: '#2eada6',
    fontWeight: '600',
    fontSize: 14,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  expandableContent: {
    overflow: 'hidden',
  },
});

export default MyClasses; 