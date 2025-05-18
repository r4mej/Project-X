import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  startPeriod: string;
  endPeriod: string;
}

interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  yearSection: string;
  schedules: Schedule[];
  course: string;
  room: string;
}

interface SubjectSelectionDrawerProps {
  visible: boolean;
  onClose: () => void;
  classes: Class[];
  onSelectClass: (classItem: Class) => void;
  mode: 'attendance' | 'view';
}

const SubjectSelectionDrawer: React.FC<SubjectSelectionDrawerProps> = ({
  visible,
  onClose,
  classes,
  onSelectClass,
  mode
}) => {
  const getTitle = () => {
    return mode === 'attendance' ? 'Take Attendance' : 'View Students';
  };

  const getSubtitle = () => {
    return mode === 'attendance' 
      ? 'Select a subject to generate QR code'
      : 'Select a subject to view students';
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={styles.bottomDrawerContent}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getTitle()}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{getSubtitle()}</Text>
            <FlatList
              data={classes}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.subjectItem,
                    mode === 'attendance' ? styles.attendanceItem : styles.viewItem
                  ]}
                  onPress={() => onSelectClass(item)}
                >
                  <View>
                    <Text style={styles.subjectName}>{item.className}</Text>
                    <Text style={styles.subjectCode}>
                      {item.subjectCode} {item.yearSection ? `(${item.yearSection})` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.subjectList}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  subjectList: {
    paddingBottom: 20,
  },
  subjectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  attendanceItem: {
    backgroundColor: '#e8f5f4',
  },
  viewItem: {
    backgroundColor: '#f0e8f5',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 14,
    color: '#666',
  },
});

export default SubjectSelectionDrawer; 