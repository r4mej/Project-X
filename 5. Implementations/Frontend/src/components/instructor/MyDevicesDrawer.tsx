import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { instructorDeviceAPI } from '../../services/api';

interface Device {
  _id: string;
  deviceId: string;
  deviceName: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  active: boolean;
  createdAt: Date;
}

interface MyDevicesDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const MyDevicesDrawer: React.FC<MyDevicesDrawerProps> = ({ visible, onClose }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchDevices();
    }
  }, [visible]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await instructorDeviceAPI.getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
      Alert.alert('Error', 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const registerDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    try {
      setIsRegistering(true);
      // Generate a unique device ID
      const deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      await instructorDeviceAPI.registerDevice(deviceId, deviceName);
      Alert.alert('Success', 'Device registered successfully');
      setShowAddModal(false);
      setDeviceName('');
      fetchDevices(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to register device');
    } finally {
      setIsRegistering(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to remove this device?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              await instructorDeviceAPI.removeDevice(deviceId);
              fetchDevices(); // Refresh after deletion
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing device:', error);
      Alert.alert('Error', 'Failed to remove device');
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Devices</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.addButtonContainer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.addButtonText}>Add New Device</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2eada6" />
              <Text style={styles.loadingText}>Loading devices...</Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait" size={48} color="#999" />
              <Text style={styles.emptyText}>No devices registered yet</Text>
              <Text style={styles.emptySubtext}>Register a new device to enable tracking</Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.deviceItem}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{item.deviceName}</Text>
                    <Text style={styles.deviceId}>ID: {item.deviceId.substring(0, 15)}...</Text>
                    <Text style={styles.deviceDate}>Added: {formatDate(item.createdAt)}</Text>
                    {item.lastLocation && (
                      <View style={styles.locationInfo}>
                        <Ionicons name="location" size={14} color="#2eada6" />
                        <Text style={styles.locationText}>
                          Last updated: {formatDate(item.lastLocation.timestamp)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeDevice(item.deviceId)}
                  >
                    <Ionicons name="trash-outline" size={22} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.devicesList}
            />
          )}

          {/* Add Device Modal */}
          <Modal
            visible={showAddModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.addModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Register New Device</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  Register this device to enable location tracking for students
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Device Name (e.g. My iPhone)"
                  value={deviceName}
                  onChangeText={setDeviceName}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={[
                    styles.registerButton, 
                    { opacity: isRegistering ? 0.7 : 1 }
                  ]}
                  onPress={registerDevice}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.registerButtonText}>Register Device</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#2eada6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  devicesList: {
    paddingHorizontal: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  deviceDate: {
    fontSize: 12,
    color: '#999',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locationText: {
    fontSize: 12,
    color: '#2eada6',
    marginLeft: 5,
  },
  removeButton: {
    padding: 8,
  },
  addModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#2eada6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MyDevicesDrawer; 