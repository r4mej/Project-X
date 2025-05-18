import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { classAPI } from '../../services/api';

interface TimeSlot {
  days: string[];
  startTime: string;
  startPeriod: string;
  endTime: string;
  endPeriod: string;
}

interface Class {
  _id: string;
  className: string;
  subjectCode: string;
  schedules: TimeSlot[];
  course: string;
  room: string;
  yearSection: string;
}

interface QuickViewClassesProps {
  visible: boolean;
  onClose: () => void;
}

const QuickViewClasses: React.FC<QuickViewClassesProps> = ({ visible, onClose }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      fetchClasses();
    }
  }, [visible]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classAPI.getClasses();
      setClasses(data);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (classId: string) => {
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

  const renderClassItem = ({ item }: { item: Class }) => {
    const isExpanded = expandedCards.has(item._id);
    
    return (
      <TouchableOpacity 
        style={styles.classItem}
        onPress={() => toggleCard(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.classInfo}>
          <View style={styles.classHeader}>
            <Text style={styles.className}>{item.className}</Text>
            <Text style={styles.subjectCode}>{item.subjectCode}</Text>
          </View>
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
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
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
            <Text style={styles.modalTitle}>Class List</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2eada6" style={styles.loader} />
          ) : (
            <FlatList
              data={classes}
              renderItem={renderClassItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
            />
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
    justifyContent: 'center',
    alignItems: 'center',
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
  listContainer: {
    paddingHorizontal: 8,
  },
  classItem: {
    backgroundColor: '#2eada6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  subjectCode: {
    color: '#e0f2f1',
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  scheduleText: {
    color: 'white',
    marginBottom: 4,
    fontSize: 15,
  },
  detailText: {
    color: '#e0f2f1',
    marginBottom: 6,
    fontSize: 15,
  },
  loader: {
    marginTop: 50,
  },
});

export default QuickViewClasses; 