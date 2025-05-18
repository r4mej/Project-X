import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface Schedule {
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
  schedules: Schedule[];
  course: string;
  room: string;
  yearSection: string;
}

interface ClassScheduleCalendarProps {
  visible: boolean;
  onClose: () => void;
  classes: Class[];
}

interface MarkedDate {
  marked: boolean;
  dotColor: string;
  dots: Array<{
    color: string;
    key: string;
  }>;
}

interface MarkedDates {
  [date: string]: MarkedDate;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = [
  '#2eada6', // teal
  '#8a2be2', // purple
  '#ff9f43', // orange
  '#4a90e2', // blue
  '#ff6b6b', // red
  '#20bf6b', // green
];

const ClassScheduleCalendar: React.FC<ClassScheduleCalendarProps> = ({
  visible,
  onClose,
  classes,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [classColors, setClassColors] = useState<Map<string, string>>(new Map());
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  useEffect(() => {
    // Assign colors to classes
    const colors = new Map<string, string>();
    classes.forEach((classItem, index) => {
      colors.set(classItem._id, COLORS[index % COLORS.length]);
    });
    setClassColors(colors);

    // Mark dates with classes
    const marked: MarkedDates = {};
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      const dayName = getDayAbbreviation(DAYS[dayOfWeek]);
      const classesForDay = classes.filter(classItem =>
        classItem.schedules.some(schedule => schedule.days.includes(dayName))
      );

      if (classesForDay.length > 0) {
        const dateString = date.toISOString().split('T')[0];
        marked[dateString] = {
          marked: true,
          dotColor: '#2eada6',
          dots: classesForDay.map((classItem, index) => ({
            color: COLORS[index % COLORS.length],
            key: classItem._id
          }))
        };
      }
    }
    setMarkedDates(marked);
  }, [classes]);

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

  const getClassesForDay = (date: Date) => {
    const dayName = getDayAbbreviation(DAYS[date.getDay()]);
    return classes.filter(classItem =>
      classItem.schedules.some(schedule => schedule.days.includes(dayName))
    );
  };

  const renderTimeSlot = (classItem: Class, schedule: Schedule) => (
    <View 
      style={[
        styles.timeSlot,
        { backgroundColor: classColors.get(classItem._id) }
      ]}
    >
      <Text style={styles.timeSlotSubject}>{classItem.subjectCode}</Text>
      <Text style={styles.timeSlotTime}>
        {schedule.startTime}{schedule.startPeriod} - {schedule.endTime}{schedule.endPeriod}
      </Text>
      <Text style={styles.timeSlotRoom}>{classItem.room}</Text>
    </View>
  );

  const onDayPress = (day: DateData) => {
    setSelectedDate(new Date(day.timestamp));
  };

  return (
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
            <Text style={styles.modalTitle}>Class Schedule</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Calendar
            current={selectedDate.toISOString().split('T')[0]}
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              todayTextColor: '#2eada6',
              selectedDayBackgroundColor: '#2eada6',
              selectedDayTextColor: '#ffffff',
              dotColor: '#2eada6',
              selectedDotColor: '#ffffff'
            }}
          />

          <View style={styles.scheduleContainer}>
            <Text style={styles.dayTitle}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <FlatList
              data={getClassesForDay(selectedDate)}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.classCard}>
                  <Text style={styles.className}>{item.className}</Text>
                  {item.schedules
                    .filter(schedule => schedule.days.includes(getDayAbbreviation(DAYS[selectedDate.getDay()])))
                    .map((schedule, index) => (
                      <View key={index}>
                        {renderTimeSlot(item, schedule)}
                      </View>
                    ))
                  }
                </View>
              )}
              contentContainerStyle={styles.scheduleList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>No classes scheduled for this day</Text>
                </View>
              }
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    maxHeight: '90%',
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
  scheduleContainer: {
    flex: 1,
    marginTop: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scheduleList: {
    paddingTop: 10,
  },
  classCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  timeSlot: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeSlotSubject: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  timeSlotTime: {
    color: 'white',
    fontSize: 14,
    marginBottom: 4,
  },
  timeSlotRoom: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ClassScheduleCalendar; 