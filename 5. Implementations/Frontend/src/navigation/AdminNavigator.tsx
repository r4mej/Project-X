import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewLogs from '../components/ActivityLogs';
import ConfirmationModal from '../components/ConfirmationModal';
import ManageUser from '../components/ManageUser';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../screens/AdminScreen';
import { AdminDrawerParamList } from './types';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

const PROFILE_IMAGE_KEY = '@admin_profile_image';

const CustomDrawerContent = ({ navigation }: any) => {
  const { logout, user } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

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

  const handleRemoveImage = async () => {
    try {
      await AsyncStorage.removeItem(PROFILE_IMAGE_KEY);
      setProfileImage(null);
      showSuccessNotification('Profile picture removed successfully');
    } catch (error) {
      console.error('Error removing profile image:', error);
    }
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
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

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Ionicons name="home-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('ManageUsers')}
      >
        <Ionicons name="people-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Manage Users</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.drawerItem}
        onPress={() => navigation.navigate('ViewLogs')}
      >
        <Ionicons name="list-outline" size={24} color="#2eada6" />
        <Text style={styles.drawerItemText}>Activity Logs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.drawerItem, styles.logoutButton]}
        onPress={handleLogoutPress}
      >
        <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
        <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
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
    backgroundColor: colors.primary.main,
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
    backgroundColor: colors.primary.dark,
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
    color: colors.primary.main,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  logoutText: {
    color: colors.status.error,
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
});

export default AdminNavigator; 