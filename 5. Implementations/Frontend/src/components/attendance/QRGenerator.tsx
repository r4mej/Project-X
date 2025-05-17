import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/colors';
import { qrAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QRGeneratorProps {
  visible: boolean;
  onClose: () => void;
  classId: string;
  subjectCode: string;
  yearSection: string;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({
  visible,
  onClose,
  classId,
  subjectCode,
  yearSection
}) => {
  const [qrData, setQRData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Function to check if we're offline
  const checkConnectivity = async () => {
    try {
      await qrAPI.testConnection();
      setIsOffline(false);
      return true;
    } catch (error) {
      setIsOffline(true);
      return false;
    }
  };

  // Function to generate a temporary offline QR code
  const generateOfflineQR = () => {
    const timestamp = new Date().toISOString();
    const offlineData = {
      classId,
      timestamp,
      type: 'attendance',
      mode: 'offline',
      subjectCode,
      yearSection
    };
    return JSON.stringify(offlineData);
  };

  const generateQR = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Check connectivity first
      const isConnected = await checkConnectivity();
      
      if (!isConnected) {
        console.log('Device is offline, generating offline QR code');
        const offlineQR = generateOfflineQR();
        setQRData(offlineQR);
        setError('Offline Mode - Attendance will be synced when online');
        return;
      }

      console.log('Generating QR code for class:', classId);
      const { token } = await qrAPI.generateQRCode(classId);
      console.log('QR code generated successfully');
      setQRData(token);
    } catch (err: any) {
      console.error('Error generating QR code:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate QR code';
      setError(errorMessage);
      
      // If server connection fails, switch to offline mode
      console.log('Server connection failed, switching to offline mode');
      const offlineQR = generateOfflineQR();
      setQRData(offlineQR);
      setError('Failed to connect to server - Using offline mode');
      
      Alert.alert(
        'QR Code Generation Issue',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      generateQR();
      // Refresh QR code every 4.5 minutes (since token expires in 5 minutes)
      const interval = setInterval(generateQR, 4.5 * 60 * 1000);
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      setQRData('');
      setError('');
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [visible, classId]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Attendance QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.classInfo}>
            <Text style={styles.subjectCode}>{subjectCode}</Text>
            <Text style={styles.yearSection}>{yearSection}</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={16} color={colors.status.warning} />
                <Text style={styles.offlineText}>Offline Mode</Text>
              </View>
            )}
          </View>

          <View style={styles.qrContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.instructor.primary.main} />
                <Text style={styles.loadingText}>Generating QR Code...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons 
                  name={isOffline ? "cloud-offline" : "warning"} 
                  size={48} 
                  color={isOffline ? colors.status.warning : colors.status.error} 
                />
                <Text style={[
                  styles.errorText,
                  isOffline && { color: colors.status.warning }
                ]}>{error}</Text>
                {!isOffline && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={generateQR}
                  >
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : qrData ? (
              <>
                <QRCode
                  value={qrData}
                  size={250}
                  backgroundColor="white"
                />
                <Text style={styles.instruction}>
                  Show this QR code to your students to mark their attendance
                </Text>
                <Text style={styles.note}>
                  {isOffline 
                    ? 'QR code will work offline and sync when online'
                    : 'QR code refreshes automatically every 4.5 minutes'
                  }
                </Text>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No QR code data available</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={generateQR}
                >
                  <Text style={styles.retryText}>Generate QR Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.instructor.primary.main,
  },
  closeButton: {
    padding: 5,
  },
  classInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subjectCode: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  yearSection: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface.card,
    borderRadius: 10,
  },
  instruction: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  note: {
    marginTop: 10,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.status.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.instructor.primary.main,
    borderRadius: 8,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  offlineText: {
    color: colors.status.warning,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default QRGenerator; 