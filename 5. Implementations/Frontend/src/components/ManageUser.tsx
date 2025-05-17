import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AdminDrawerParamList, UserRole } from '../navigation/types';
import { authAPI, userAPI } from '../services/api';

type NavigationProp = DrawerNavigationProp<AdminDrawerParamList>;

interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  userId: string;
}

const ManageUser: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [userId, setUserId] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getUsers();
      setUsers(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddUser = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setRole('student');
    setUserId('');
    setModalVisible(true);
  };
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
    setUserId(user.userId);
    setModalVisible(true);
  };
  
  const handleDeleteUser = async (id: string) => {
    try {
      const user = users.find(u => u._id === id);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if trying to delete yourself
      const currentUser = await authAPI.getCurrentUser();
      if (user._id === currentUser._id) {
        Alert.alert('Error', 'You cannot delete your own account');
        return;
      }

      setSelectedUsers(new Set([id]));
      setShowDeleteModal(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
      Alert.alert('Error', errorMessage);
    }
  };
  
  const handleSaveUser = async () => {
    if (!username || !email || !userId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    // Reset field errors
    setFieldErrors({});
    
    // Validate ID format based on role
    if (role === 'student' && !/^\d{4}-\d{4}$/.test(userId)) {
      Alert.alert('Error', 'Invalid student ID format. Use format: YYYY-XXXX');
      return;
    }
    
    if (role === 'instructor' && !/^T-\d{4}$/.test(userId)) {
      Alert.alert('Error', 'Invalid instructor ID format. Use format: T-YYYY');
      return;
    }

    if (role === 'admin' && !/^ADMIN-\d{3}$/.test(userId)) {
      Alert.alert('Error', 'Invalid admin ID format. Use format: ADMIN-XXX');
      return;
    }
    
    try {
      const userData = {
        username,
        email,
        role,
        userId
      };

      if (editingUser) {
        await userAPI.updateUser(editingUser._id, userData);
        showSuccessNotification('User updated successfully');
      } else {
        await userAPI.createUser(userData);
        showSuccessNotification('User added successfully');
      }
      
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.duplicates) {
        // Handle duplicate fields
        const newFieldErrors: { [key: string]: boolean } = {};
        errorData.duplicates.forEach((field: string) => {
          switch (field) {
            case 'email':
              newFieldErrors.email = true;
              break;
            case 'username':
              newFieldErrors.username = true;
              break;
            case 'user ID':
              newFieldErrors.userId = true;
              break;
          }
        });
        setFieldErrors(newFieldErrors);
        Alert.alert('Duplicate Fields', errorData.message);
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
      }
    }
  };
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  // Function to get the next admin number
  const getNextAdminNumber = () => {
    const adminUsers = users.filter(user => user.role === 'admin');
    const adminNumbers = adminUsers.map(user => {
      const match = user.userId.match(/ADMIN-(\d{3})/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = adminNumbers.length > 0 ? Math.max(...adminNumbers) + 1 : 1;
    return `ADMIN-${String(nextNumber).padStart(3, '0')}`;
  };

  // Handle role change
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'admin') {
      setUserId(getNextAdminNumber());
    } else {
      setUserId('');
    }
  };
  
  const toggleCard = (userId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };
  
  // Function to handle long press
  const handleLongPress = (userId: string) => {
    setIsSelectionMode(true);
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      return newSet;
    });
  };

  // Function to handle card press based on mode
  const handleCardPress = (userId: string) => {
    if (isSelectionMode) {
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
          if (newSet.size === 0) {
            setIsSelectionMode(false);
          }
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
    } else {
      toggleCard(userId);
    }
  };

  // Function to delete multiple users
  const handleMultipleDelete = async () => {
    try {
      // First check if trying to delete yourself
      const currentUser = await authAPI.getCurrentUser();
      const selectedUsersList = Array.from(selectedUsers);
      
      if (selectedUsersList.includes(currentUser._id)) {
        Alert.alert('Error', 'You cannot delete your own account');
        return;
      }

      const promises = selectedUsersList.map(async userId => {
        const user = users.find(u => u._id === userId);
        if (!user) {
          throw new Error(`User not found: ${userId}`);
        }
        try {
          await userAPI.deleteUser(user._id);
        } catch (error: any) {
          console.error(`Failed to delete user ${user.username} (${user.role}):`, error.response?.data || error.message);
          throw error;
        }
      });

      await Promise.all(promises);
      showSuccessNotification(`${selectedUsers.size} users deleted successfully`);
      setSelectedUsers(new Set());
      setIsSelectionMode(false);
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete users';
      Alert.alert('Error', errorMessage);
      console.error('Delete error details:', error.response?.data);
    }
    setShowDeleteModal(false);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers(new Set());
      setIsAllSelected(false);
    } else {
      const allUserIds = users.map(user => user._id);
      setSelectedUsers(new Set(allUserIds));
      setIsAllSelected(true);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedUsers(new Set());
    setIsAllSelected(false);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isExpanded = expandedCards.has(item._id);
    const isSelected = selectedUsers.has(item._id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.userItem,
          isSelected && styles.selectedCard
        ]}
        onPress={() => handleCardPress(item._id)}
        onLongPress={() => handleLongPress(item._id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
      <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            {isSelectionMode && (
              <View style={styles.checkbox}>
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? "#2eada6" : "#666"}
                />
              </View>
            )}
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userRole}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Text>
          </View>
          
          {isExpanded && !isSelectionMode && (
            <>
              <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userId}>ID: {item.userId}</Text>
            </>
          )}
      </View>
        {!isSelectionMode && (
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => handleEditUser(item)}
        >
          <Ionicons name="create-outline" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteUser(item._id)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
        )}
              </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
      fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  addButton: {
    backgroundColor: '#2eada6',
    padding: 8,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userItem: {
      backgroundColor: '#e8f4ea',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
      alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 8,
    },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
      color: '#1a5e57',
    marginBottom: 4,
  },
  userEmail: {
      color: '#2b4f4c',
    marginBottom: 2,
  },
  userRole: {
      color: '#2b4f4c',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  userId: {
      color: '#2b4f4c',
  },
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#2eada6',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
  },
  loader: {
    marginTop: 50,
  },
  modalContainer: {
    flex: 1,
      justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    padding: 20,
      width: '100%',
      minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
        height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2eada6',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#424242',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
      fontSize: 16,
      color: '#2b4f4c',
      marginBottom: 8,
      fontWeight: '500',
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8,
      backgroundColor: '#f0f0f0',
      overflow: 'hidden',
  },
  picker: {
    height: 50,
      backgroundColor: 'transparent',
      color: '#2b4f4c',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
      marginBottom: 10,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  saveButton: {
    backgroundColor: '#2eada6',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  infoText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: '#e0e0e0',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 15,
    },
    inputDisabled: {
      backgroundColor: '#f0f0f0',
      color: '#666',
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
    selectedCard: {
      backgroundColor: '#d4e9d7',
      borderWidth: 2,
      borderColor: '#2eada6',
    },
    checkbox: {
      marginRight: 10,
    },
    selectionInfo: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    selectedCount: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    selectAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(46, 173, 166, 0.1)',
    },
    selectAllText: {
      color: '#2eada6',
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '500',
    },
    selectionBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      flexDirection: 'row',
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 5,
    },
    cancelSelectionButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#f0f0f0',
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelSelectionText: {
      color: '#666',
      fontSize: 16,
      fontWeight: '500',
    },
    deleteSelectedButton: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#ff6b6b',
    },
    deleteButtonDisabled: {
      backgroundColor: '#ffb3b3',
    },
    deleteSelectedText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
    },
    deleteModalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalContent: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 20,
      width: '80%',
      alignItems: 'center',
    },
    deleteModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      color: '#2b4f4c',
    },
    deleteModalText: {
      fontSize: 16,
      marginBottom: 20,
      textAlign: 'center',
      color: '#666',
    },
    deleteModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
    },
    deleteModalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      marginHorizontal: 5,
    },
    confirmButton: {
      backgroundColor: '#ff6b6b',
    },
    deleteModalButtonText: {
      color: 'white',
      textAlign: 'center',
      fontSize: 16,
      fontWeight: 'bold',
    },
    selectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    selectionCountContainer: {
      backgroundColor: '#2eada6',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 15,
    },
    selectionCountText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
    },
    inputError: {
      borderColor: '#ff6b6b',
      borderWidth: 2,
      backgroundColor: '#fff0f0',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Users</Text>
        </View>
      </View>

      <View style={[styles.contentContainer, { marginTop: 0 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>User List</Text>
          {isSelectionMode ? (
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Ionicons
                name={isAllSelected ? "checkbox" : "square-outline"}
                size={24}
                color="#2eada6"
              />
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2eada6" style={styles.loader} />
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
      
      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBottomBar}>
          <TouchableOpacity
            style={styles.cancelSelectionButton}
            onPress={exitSelectionMode}
          >
            <Text style={styles.cancelSelectionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteSelectedButton,
              selectedUsers.size === 0 && styles.deleteButtonDisabled
            ]}
            onPress={() => {
              if (selectedUsers.size > 0) {
                setShowDeleteModal(true);
              }
            }}
            disabled={selectedUsers.size === 0}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.deleteSelectedText}>
              Delete Selected ({selectedUsers.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Blur Modal - No animation for instant effect */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Modal>

      {/* Content Modal - Slides up independently */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingUser ? 'Edit User' : 'Add New User'}
            </Text>
            
            <TextInput
              style={[
                styles.input,
                fieldErrors.username && styles.inputError
              ]}
              placeholder="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setFieldErrors(prev => ({ ...prev, username: false }));
              }}
            />
            
            <TextInput
              style={[
                styles.input,
                fieldErrors.email && styles.inputError
              ]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setFieldErrors(prev => ({ ...prev, email: false }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Role</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={role}
                  style={styles.picker}
                  onValueChange={handleRoleChange}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Instructor" value="instructor" />
                  <Picker.Item label="Admin" value="admin" />
                </Picker>
              </View>
            </View>
            
            <TextInput
              style={[
                styles.input,
                fieldErrors.userId && styles.inputError,
                role === 'admin' && styles.inputDisabled
              ]}
              placeholder={
                role === 'student' 
                  ? "Student ID (YYYY-XXXX)" 
                  : role === 'instructor'
                  ? "Instructor ID (T-YYYY)"
                  : "Admin ID (Auto-generated)"
              }
              value={userId}
              onChangeText={text => {
                if (role !== 'admin') {
                  setUserId(text);
                  setFieldErrors(prev => ({ ...prev, userId: false }));
                }
              }}
              editable={role !== 'admin'}
            />
            
            {!editingUser && (
              <Text style={styles.infoText}>
                Note: The user ID will be used as the password for login.
              </Text>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveUser}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
        animationType="fade"
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Confirm Delete</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete {selectedUsers.size} selected user{selectedUsers.size !== 1 ? 's' : ''}?
              {selectedUsers.size === 1 && users.find(u => u._id === Array.from(selectedUsers)[0])?.role === 'admin' && (
                '\n\nWarning: You are about to delete an admin user.'
              )}
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  if (selectedUsers.size === 1) {
                    setSelectedUsers(new Set());
                  }
                }}
              >
                <Text style={styles.deleteModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmButton]}
                onPress={handleMultipleDelete}
              >
                <Text style={styles.deleteModalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

export default ManageUser; 