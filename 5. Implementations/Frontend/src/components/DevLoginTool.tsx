import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DevLoginTool: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const handleDevLogin = async (role: 'student' | 'instructor' | 'admin') => {
    try {
      // Use predefined test accounts for each role
      const testAccounts = {
        admin: { username: 'admin', password: '12345' }, // This matches the backend's admin credentials
        instructor: { username: 'test_instructor', password: 'T-2024' },
        student: { username: 'test_student', password: '2024-0001' }
      };

      const account = testAccounts[role];
      await login(account.username, account.password);
      
      // Reset navigation stack and navigate to appropriate screen
      navigation.reset({
        index: 0,
        routes: [{ name: role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : 'Student' }],
      });
    } catch (error) {
      console.error('Dev login failed:', error);
      alert('Login failed. Make sure the backend server is running and the test accounts are set up.');
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.devButtonText}>DEV MODE</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Developer Quick Access</Text>
            <Text style={styles.modalSubtitle}>Select Role to Login</Text>

            <TouchableOpacity
              style={[styles.roleButton, styles.adminButton]}
              onPress={() => handleDevLogin('admin')}
            >
              <Text style={styles.roleButtonText}>Login as Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.instructorButton]}
              onPress={() => handleDevLogin('instructor')}
            >
              <Text style={styles.roleButtonText}>Login as Instructor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.studentButton]}
              onPress={() => handleDevLogin('student')}
            >
              <Text style={styles.roleButtonText}>Login as Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.roleButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  devButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    opacity: 0.8,
  },
  devButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  roleButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#2eada6',
  },
  instructorButton: {
    backgroundColor: '#4a90e2',
  },
  studentButton: {
    backgroundColor: '#7ed321',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
    marginTop: 10,
  },
  roleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DevLoginTool; 