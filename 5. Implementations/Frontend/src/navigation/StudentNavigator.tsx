import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import StudentQRScreen from '../screens/StudentQRScreen';
import RecordsScreen from '../screens/RecordsScreen';
import StudentDashboard from '../screens/StudentScreen';
import LocationScreen from '../screens/LocationScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import { StudentDrawerParamList } from './types';
import { colors } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';

const Drawer = createDrawerNavigator<StudentDrawerParamList>();
const Tab = createBottomTabNavigator();

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 3; // Updated for 3 tabs
const INDICATOR_WIDTH = 24;
const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size?: number;
}

const TabIcon = ({ name, focused, size = 24 }: TabIconProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 10,
    }).start();
  }, [focused]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap}
          size={size}
          color={focused ? 'white' : 'rgba(255, 255, 255, 0.6)'}
        />
      </Animated.View>
    </View>
  );
};

const PROFILE_IMAGE_KEY = '@student_profile_image';

const CustomDrawerContent = ({ navigation }: any) => {
  const { logout, user } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadProfileImage();
    loadNotificationSettings();
  }, []);

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

  const loadNotificationSettings = async () => {
    try {
      const savedSetting = await AsyncStorage.getItem('@notifications_enabled');
      setNotificationsEnabled(savedSetting !== 'false');
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveProfileImage = async (imageUri: string) => {
    try {
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, imageUri);
    } catch (error) {
      console.error('Error saving profile image:', error);
    }
  };

  const handleImageUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await saveProfileImage(imageUri);
        showSuccessNotification('Profile picture updated successfully');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
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

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('@notifications_enabled', value.toString());
      showSuccessNotification(value ? 'Notifications enabled' : 'Notifications disabled');
    } catch (error) {
      console.error('Error saving notification settings:', error);
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
            <Text style={styles.email}>{user?.userId || 'No ID'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Settings Section */}
      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <Ionicons name="person-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Edit Profile</Text>
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>!</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('AttendanceSettings')}
      >
        <Ionicons name="calendar-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Attendance Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.drawerItem, styles.notificationItem]}
        onPress={() => {}}
        activeOpacity={1}
      >
        <View style={styles.drawerItemLeft}>
          <Ionicons name="notifications-outline" size={24} color="#2eada6" />
          <Text style={styles.drawerItemText}>Notifications & Alerts</Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#d4d4d4', true: '#93d5d1' }}
          thumbColor={notificationsEnabled ? '#2eada6' : '#f4f3f4'}
          ios_backgroundColor="#d4d4d4"
          style={styles.notificationToggle}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('PrivacySecurity')}
      >
        <Ionicons name="shield-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Privacy & Security</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('HelpSupport')}
      >
        <Ionicons name="help-circle-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Help & Support</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('AboutApp')}
      >
        <Ionicons name="information-circle-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>About App</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.drawerItem, styles.logoutButton]}
        onPress={handleLogoutPress}
      >
        <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
        <Text style={[styles.drawerItemText, styles.logoutText]}>Log out</Text>
      </TouchableOpacity>

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

      {showNotification && (
        <View style={styles.notificationContainer}>
          <View style={styles.notification}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const TabNavigator = () => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('Home');

  const handleTabPress = (index: number, tabName: string) => {
    Animated.spring(slideAnim, {
      toValue: (index * TAB_WIDTH) + INDICATOR_OFFSET,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
    setActiveTab(tabName);
  };

  useEffect(() => {
    // Initialize line position to first tab
    slideAnim.setValue(INDICATOR_OFFSET);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#2eada6',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.2)',
            height: 70,
            paddingTop: 8,
            paddingBottom: 12,
          },
          tabBarShowLabel: false,
          tabBarItemStyle: {
            paddingBottom: 4,
          },
        }}
        screenListeners={({ navigation }) => ({
          tabPress: (e) => {
            const index = navigation.getState().index;
            const route = navigation.getState().routes[index];
            handleTabPress(index, route.name);
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={StudentDashboard}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home" focused={focused} />
            ),
          }}
          listeners={{
            tabPress: () => handleTabPress(0, 'Dashboard'),
          }}
        />
        <Tab.Screen 
          name="QRScanner" 
          component={StudentQRScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="qr-code" focused={focused} />
            ),
          }}
          listeners={{
            tabPress: () => handleTabPress(1, 'QRScanner'),
          }}
        />
        <Tab.Screen 
          name="Records" 
          component={RecordsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon name="document-text" focused={focused} />
            ),
          }}
          listeners={{
            tabPress: () => handleTabPress(2, 'Records'),
          }}
        />
      </Tab.Navigator>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          width: INDICATOR_WIDTH,
          height: 3,
          backgroundColor: 'white',
          borderRadius: 1.5,
          transform: [{ translateX: slideAnim }],
        }}
      />
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
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
      <Drawer.Screen name="QRScanner" component={StudentQRScreen} />
      <Drawer.Screen name="Location" component={LocationScreen} />
      <Drawer.Screen name="History" component={HistoryScreen} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} />
      <Drawer.Screen name="Records" component={RecordsScreen} />
      <Drawer.Screen name="EditProfile" component={StudentDashboard} />
      <Drawer.Screen name="AttendanceSettings" component={StudentDashboard} />
      <Drawer.Screen name="PrivacySecurity" component={StudentDashboard} />
      <Drawer.Screen name="HelpSupport" component={StudentDashboard} />
      <Drawer.Screen name="AboutApp" component={StudentDashboard} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: colors.student.primary.main,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: colors.student.primary.dark,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.text.inverse,
  },
  profileInfo: {
    marginTop: 4,
    alignItems: 'center',
  },
  username: {
    color: colors.text.inverse,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  role: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  email: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
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
    borderBottomColor: colors.border.light,
  },
  drawerItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: colors.student.primary.main,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  logoutText: {
    color: colors.student.error,
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
    backgroundColor: colors.status.success,
    borderRadius: 25,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '500',
  },
  drawerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationToggle: {
    marginLeft: 'auto',
  },
  warningBadge: {
    backgroundColor: colors.student.error,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  warningText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default StudentNavigator; 