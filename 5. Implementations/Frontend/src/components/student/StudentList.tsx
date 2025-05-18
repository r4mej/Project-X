import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface Student {
  _id: string;
  studentId: string;
  surname?: string;
  lastName?: string;
  firstName: string;
  middleInitial?: string;
  userId?: string;
  email?: string;
}

interface StudentListProps {
  visible: boolean;
  onClose: () => void;
  students: Student[];
  loading: boolean;
  subjectCode?: string;
  yearSection?: string;
}

const StudentList: React.FC<StudentListProps> = ({
  visible,
  onClose,
  students,
  loading,
  subjectCode,
  yearSection,
}) => {
  const renderStudentItem = ({ item }: { item: Student }) => {
    const surname = item.surname || item.lastName || '';
    const fullName = `${surname}, ${item.firstName}${item.middleInitial ? ' ' + item.middleInitial + '.' : ''}`;
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.studentCard}
      >
        <View style={styles.studentInfo}>
          <View style={styles.studentHeader}>
            <View style={styles.studentMainInfo}>
              <Text style={styles.studentName}>{fullName}</Text>
              <Text style={styles.studentId}>{item.studentId}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.modalContainer}>
        <Animated.View 
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.springify().damping(15)}
          style={styles.modalContent}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Student List</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Subject Code Row */}
          <View style={styles.subjectRow}>
            <Text style={styles.subjectCode}>
              {subjectCode}{yearSection ? ` (${yearSection})` : ''}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2eada6" style={styles.loader} />
          ) : students && students.length > 0 ? (
            <FlatList
              data={students}
              renderItem={renderStudentItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={true}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          )}
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
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
    paddingBottom: 24,
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
    marginVertical: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2eada6',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  listContainer: {
    padding: 12,
  },
  studentCard: {
    backgroundColor: '#e8f4ea',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    width: '100%',
    marginBottom: 0,
  },
  studentMainInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a5e57',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 13,
    color: '#2b4f4c',
    marginBottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  loader: {
    marginTop: 32,
  },
  subjectRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  subjectCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2eada6',
  },
});

export default StudentList; 