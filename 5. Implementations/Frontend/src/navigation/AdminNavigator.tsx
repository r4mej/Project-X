import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AboutAppDrawer from '../components/AboutAppDrawer';
import ViewLogs from '../components/admin/ActivityLogs';
import ManageUser from '../components/admin/UserManager';
import ChangePasswordDrawer from '../components/ChangePasswordDrawer';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../screens/AdminScreen';
import { AdminDrawerParamList } from './types';
import * as ImagePicker from 'expo-image-picker';

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

const PROFILE_IMAGE_KEY = '@admin_profile_image';

const CustomDrawerContent = ({ navigation }: any) => {
  const { logout, user } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Load saved profile image on component mount
  useEffect(() => {
    loadProfileImage();
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

  const saveProfileImage = async (imageUri: string) => {
    try {
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, imageUri);
    } catch (error) {
      console.error('Error saving profile image:', error);
    }
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

  const handleLogoutPress = () => {
    setShowConfirmModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      
      // First wait for a short delay to show the modal
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then perform logout
      await logout();

      // Wait for the success modal to be visible
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
            <Text style={styles.username}>{user?.username || 'Admin'}</Text>
            <Text style={styles.role}>{user?.role?.toUpperCase() || 'ADMIN'}</Text>
            <Text style={styles.email}>{user?.email || 'admin@example.com'}</Text>
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
      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('ViewLogs')}
      >
        <Ionicons name="list-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Activity Logs</Text>
      </TouchableOpacity>
      
        {/* Change Password */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => setShowChangePasswordModal(true)}
        >
          <Ionicons name="lock-closed-outline" size={24} color="#2eada6" />
          <Text style={styles.drawerItemText}>Change Password</Text>
        </TouchableOpacity>

        {/* About App */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => setShowAboutModal(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#2eada6" />
          <Text style={styles.drawerItemText}>About App</Text>
        </TouchableOpacity>

        {/* Logout Button */}
      <TouchableOpacity
          style={[styles.drawerItem, { borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}
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

const AdminNavigator = () => {
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
        component={AdminDashboard}
        options={{
          swipeEnabled: true,
        }}
      />
      <Drawer.Screen 
        name="ManageUsers" 
        component={ManageUser}
        options={{
          swipeEnabled: true,
        }}
      />
      <Drawer.Screen 
        name="ViewLogs" 
        component={ViewLogs}
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
    backgroundColor: '#2eada6',
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
    backgroundColor: '#2eada6',
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
  menuItems: {
    flex: 1,
    paddingTop: 20,
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
    color: '#2eada6',
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
});

export default AdminNavigator; 