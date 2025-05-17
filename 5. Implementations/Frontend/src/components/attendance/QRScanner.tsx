import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { qrAPI } from '../../services/api';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  classId: string;
  subjectCode: string;
  yearSection: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  visible,
  onClose,
  classId,
  subjectCode,
  yearSection,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      setScanned(true);
      setLoading(true);

      console.log('Scanned QR data:', data);
      
      // Try to parse the QR data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        // If it's not JSON, assume it's a JWT token
        qrData = { type: 'attendance', token: data };
      }

      if (qrData.type === 'student_attendance') {
        // This is a student QR code - mark attendance using student info
        await qrAPI.markAttendance({
          classId,
          studentId: qrData.studentId,
          timestamp: qrData.timestamp
        });
      } else if (qrData.type === 'attendance' || qrData.token) {
        // This is an instructor QR code - validate the token
        await qrAPI.validateQRCode(qrData.token || data);
      } else {
        throw new Error('Invalid QR code format');
      }

      Alert.alert(
        'Success',
        'Attendance marked successfully!',
        [{ text: 'OK', onPress: onClose }]
      );

    } catch (error: any) {
      console.error('Error scanning QR code:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Invalid or expired QR code'
      );
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ActivityIndicator size="large" color={colors.instructor.primary.main} />
            <Text style={styles.modalText}>Requesting camera permission...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Ionicons name="camera-outline" size={48} color={colors.status.error} />
            <Text style={styles.modalText}>No access to camera</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                Platform.OS === 'ios'
                  ? Linking.openURL('app-settings:')
                  : Linking.openSettings();
              }}
            >
              <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerText}>{subjectCode}</Text>
            <Text style={styles.subHeaderText}>{yearSection}</Text>
          </View>
        </View>

        <View style={styles.scannerContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2eada6" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          ) : (
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
          )}
        </View>

        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Position the QR code within the frame to scan
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    marginLeft: 20,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subHeaderText: {
    color: '#ccc',
    fontSize: 14,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2eada6',
    backgroundColor: 'transparent',
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 20,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2eada6',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
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
  modalText: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 16,
    color: colors.text.primary,
  },
});

export default QRScanner; 