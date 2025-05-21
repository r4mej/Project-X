import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AboutAppDrawer from '../components/AboutAppDrawer';
import ChangePasswordDrawer from '../components/ChangePasswordDrawer';
import ConfirmationModal from '../components/ConfirmationModal';
import NotificationsDrawer from '../components/NotificationsDrawer';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../screens/StudentScreen';
import { StudentDrawerParamList } from './types';
import * as ImagePicker from 'expo-image-picker';

// Define interfaces for global types
interface Schedule {
  startTime: string;
  endTime: string;
  startPeriod: 'AM' | 'PM';
  endPeriod: 'AM' | 'PM';
}

interface ClassItem {
  _id: string;
  subjectCode: string;
  className: string;
  yearSection?: string;
  schedules: Schedule[];
}

// Extend global to include todayClasses
declare global {
  var todayClasses: ClassItem[] | undefined;
}

const Drawer = createDrawerNavigator<StudentDrawerParamList>();

const PROFILE_IMAGE_KEY = '@student_profile_image';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'upcoming' | 'ongoing' | 'ended';
  read: boolean;
}

const CustomDrawerContent = ({ navigation }: any) => {
  const { logout, user } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    loadProfileImage();
    generateNotifications();
    // Set up interval to update notifications every minute
    const interval = setInterval(generateNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateNotifications = () => {
    const currentTime = new Date();
    // Use global variable without directly referencing window
    const todayClasses: ClassItem[] = global.todayClasses || [];

    const newNotifications: Notification[] = todayClasses.flatMap((classItem: ClassItem) => {
      return classItem.schedules.map((schedule: Schedule) => {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
        const adjustedStartHour = schedule.startPeriod === 'PM' && startHour !== 12 ? startHour + 12 : startHour;
        const adjustedEndHour = schedule.endPeriod === 'PM' && endHour !== 12 ? endHour + 12 : endHour;

        const startTimeDate = new Date(
          currentTime.getFullYear(),
          currentTime.getMonth(),
          currentTime.getDate(),
          adjustedStartHour,
          startMinute
        );

        const endTimeDate = new Date(
          currentTime.getFullYear(),
          currentTime.getMonth(),
          currentTime.getDate(),
          adjustedEndHour,
          endMinute
        );

        const timeDiffStart = startTimeDate.getTime() - currentTime.getTime();
        const minutesUntilStart = Math.floor(timeDiffStart / (1000 * 60));

        let type: 'upcoming' | 'ongoing' | 'ended';
        let message: string;

        if (currentTime < startTimeDate && minutesUntilStart <= 30) {
          type = 'upcoming';
          message = `Starting in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}`;
        } else if (currentTime >= startTimeDate && currentTime <= endTimeDate) {
          type = 'ongoing';
          message = 'Class is currently in session';
        } else if (currentTime > endTimeDate && (currentTime.getTime() - endTimeDate.getTime()) <= 30 * 60 * 1000) {
          type = 'ended';
          message = 'Class has ended recently';
        } else {
          return null;
        }

        return {
          id: `${classItem._id}-${schedule.startTime}-${schedule.endTime}`,
          title: `${classItem.subjectCode} - ${classItem.className}`,
          message,
          time: `${schedule.startTime} ${schedule.startPeriod} - ${schedule.endTime} ${schedule.endPeriod}`,
          type,
          read: false
        };
      });
    }).filter((notification: any): notification is Notification => notification !== null);

    setNotifications(newNotifications);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const saveProfileImage = async (imageUri: string) => {
    try {
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, imageUri);
    } catch (error) {
      console.error('Error saving profile image:', error);
    }
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };

  const handleImageUpload = async () => {
    // Ask for permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload an image');
      return;
    }
    
    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      await saveProfileImage(imageUri);
      showSuccessNotification('Profile picture updated successfully');
    }
  };

  const handleRemoveImage = async () => {
    try {
      await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
      setProfileImage(null);
      showSuccessNotification('Profile picture removed successfully');
    } catch (error) {
      console.error('Error removing profile image:', error);
    }
  };

  const handleLogoutPress = () => {
    setShowConfirmModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await logout();

      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 1500);
    } catch (error) {
      console.error('Logout error:', error);
      setShowConfirmModal(false);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleLogoutCancel = () => {
    setShowConfirmModal(false);
  };

  return (
    <View style={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.profileImageContainer}
            onPress={handleImageUpload}
            onLongPress={profileImage ? handleRemoveImage : undefined}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={styles.profileIconContainer}>
                <Ionicons name="person" size={32} color="white" />
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="camera" size={14} color="white" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user?.username || 'Student'}</Text>
            <Text style={styles.role}>{user?.role?.toUpperCase() || 'STUDENT'}</Text>
            <Text style={styles.studentId}>ID: {user?.userId || 'S-0000'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuItems}>
        {/* Notifications */}
      <TouchableOpacity
        style={styles.drawerItem}
          onPress={() => setShowNotificationsModal(true)}
      >
          <Ionicons name="notifications-outline" size={24} color="#dc2626" />
          <Text style={styles.drawerItemText}>Notifications</Text>
          {getUnreadCount() > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{getUnreadCount()}</Text>
        </View>
          )}
      </TouchableOpacity>

        {/* Change Password */}
      <TouchableOpacity
        style={styles.drawerItem}
          onPress={() => setShowChangePasswordModal(true)}
      >
          <Ionicons name="lock-closed-outline" size={24} color="#dc2626" />
          <Text style={styles.drawerItemText}>Change Password</Text>
      </TouchableOpacity>

        {/* About App */}
      <TouchableOpacity
        style={styles.drawerItem}
          onPress={() => setShowAboutModal(true)}
      >
        <Ionicons name="information-circle-outline" size={24} color="#dc2626" />
        <Text style={styles.drawerItemText}>About App</Text>
      </TouchableOpacity>

        {/* Logout Button */}
      <TouchableOpacity
          style={[styles.drawerItem, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 0 }]}
        onPress={handleLogoutPress}
      >
        <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
        <Text style={[styles.drawerItemText, styles.logoutText]}>Log out</Text>
      </TouchableOpacity>
      </View>

      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Logout"
        message="Are you sure you want to logout from your account?"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />

      <SuccessModal
        visible={showSuccessModal}
        message="Logged out successfully!"
        duration={1500}
      />

      <ChangePasswordDrawer
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      <AboutAppDrawer
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <NotificationsDrawer
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />

      {showNotification && (
        <View style={styles.notificationContainer}>
          <View style={styles.notification}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.notificationToast}>{notificationMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const StudentNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.7)',
        swipeEnabled: true,
        swipeEdgeWidth: 100,
        drawerStatusBarAnimation: 'slide',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={StudentDashboard}
        options={{
          swipeEnabled: true,
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileSection: {
    flex: 1,
    marginRight: 16,
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profileIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    marginTop: 4,
    alignItems: 'center',
  },
  username: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  role: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    textAlign: 'center',
  },
  studentId: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 24,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '500',
  },
  logoutText: {
    color: '#ff6b6b',
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
    backgroundColor: '#dc2626',
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
  notificationToast: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  notificationBadge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
});

export default StudentNavigator; 