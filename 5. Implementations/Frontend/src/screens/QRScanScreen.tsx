import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as IntentLauncher from 'expo-intent-launcher';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { StudentDrawerParamList } from '../navigation/types';
import { attendanceAPI, authAPI } from '../services/api';

// Import webcam for web platform
import jsQR from 'jsqr';
import Webcam from 'react-webcam';

type NavigationProp = DrawerNavigationProp<StudentDrawerParamList>;

// Define a type for attendance record to store locally
interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  class: string;
  status: 'Present' | 'Absent' | 'Late';
  studentName: string;
}

const QRScanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [confirmationSubject, setConfirmationSubject] = useState<string | null>(null);
  const [confirmationClass, setConfirmationClass] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Web camera refs and state
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(false);
  const scannerInterval = useRef<NodeJS.Timeout | null>(null);

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    if (!isWeb) {
      (async () => {
        setPermissionLoading(true);
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        setPermissionLoading(false);
      })();
    } else {
      // For web, we'll check permission when starting the camera
      setPermissionLoading(false);
      setHasPermission(true);
    }
  }, [isWeb]);

  // Add a connection test when component loads
  useEffect(() => {
    const testAPIConnection = async () => {
      try {
        console.log('Testing API connection...');
        const isConnected = await attendanceAPI.testConnection();
        if (isConnected) {
          console.log('API connection successful');
        } else {
          console.error('Failed to connect to API server');
          Alert.alert(
            'Connection Issue', 
            'Could not connect to the attendance server. Please check your connection and try again.'
          );
        }
      } catch (error) {
        console.error('Error testing connection:', error);
      }
    };
    
    testAPIConnection();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await authAPI.getCurrentUser();
        console.log('Current User:', user);
        if (user && user.userId) {
          console.log('Setting studentId to user.userId:', user.userId);
          setStudentId(user.userId);
        } else {
          console.warn('User or user.userId is undefined:', user);
          setStudentId(null);
        }
      } catch (e) {
        console.error('Error getting current user:', e);
        setStudentId(null);
      }
    })();
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (scannerInterval.current) {
        clearInterval(scannerInterval.current);
      }
    };
  }, []);

  // Save attendance record to AsyncStorage to be used in Records screen
  const saveAttendanceRecord = async (
    classId: string, 
    subjectCode: string, 
    className: string,
    studentName: string
  ) => {
    try {
      // Get existing records
      const recordsJson = await AsyncStorage.getItem('attendance_records');
      let records: AttendanceRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
      
      // Create new record
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(), // Unique ID
        date: formattedDate,
        subject: subjectCode,
        class: className,
        status: 'Present',
        studentName: studentName
      };
      
      // Add new record at the beginning
      records = [newRecord, ...records];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('attendance_records', JSON.stringify(records));
      
      // Show success message
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving attendance record:', error);
    }
  };

  const startWebScanner = () => {
    setShowScanner(true);
    setScanning(true);
    
    // Show scanning feedback to user
    const scanFeedback = document.createElement('div');
    scanFeedback.id = 'qr-scan-feedback';
    scanFeedback.style.position = 'fixed';
    scanFeedback.style.bottom = '80px';
    scanFeedback.style.left = '50%';
    scanFeedback.style.transform = 'translateX(-50%)';
    scanFeedback.style.backgroundColor = 'rgba(0,0,0,0.7)';
    scanFeedback.style.color = 'white';
    scanFeedback.style.padding = '8px 16px';
    scanFeedback.style.borderRadius = '20px';
    scanFeedback.style.zIndex = '9999';
    scanFeedback.style.fontFamily = 'Arial, sans-serif';
    scanFeedback.textContent = 'Scanning for QR code...';
    document.body.appendChild(scanFeedback);
    
    // Start scanning for QR codes with increased frequency
    scannerInterval.current = setInterval(() => {
      if (webcamRef.current) {
        try {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            // Update feedback occasionally to show the scanner is working
            scanFeedback.textContent = 'Scanning for QR code... ' + 
              new Date().toLocaleTimeString().split(' ')[0];
            
            // Use window.Image for web platform
            const image = new window.Image();
            image.src = imageSrc;
            
            image.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext('2d');
                
                if (context) {
                  context.drawImage(image, 0, 0, canvas.width, canvas.height);
                  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                  
                  const code = jsQR(imageData.data, imageData.width, imageData.height);
                  
                  if (code) {
                    // Show success feedback
                    scanFeedback.textContent = 'QR Code found! Saving attendance...';
                    scanFeedback.style.backgroundColor = '#4CAF50';
                    
                    // QR code found - handle it
                    console.log('QR Code detected:', code.data);
                    
                    // Clean up feedback element after a delay
                    setTimeout(() => {
                      if (document.body.contains(scanFeedback)) {
                        document.body.removeChild(scanFeedback);
                      }
                    }, 2000);
                    
                    handleQRCodeData(code.data);
                  }
                }
              } catch (err) {
                console.error('Error processing QR:', err);
                scanFeedback.textContent = 'Error scanning QR code. Please try again.';
                scanFeedback.style.backgroundColor = '#F44336';
              }
            };
          }
        } catch (e) {
          console.error('Screenshot error:', e);
        }
      }
    }, 100); // Scan more frequently for better responsiveness
  };

  const stopWebScanner = () => {
    setScanning(false);
    setShowScanner(false);
    
    // Clean up interval
    if (scannerInterval.current) {
      clearInterval(scannerInterval.current);
      scannerInterval.current = null;
    }
    
    // Remove feedback element if it exists
    const feedbackElement = document.getElementById('qr-scan-feedback');
    if (feedbackElement && document.body.contains(feedbackElement)) {
      document.body.removeChild(feedbackElement);
    }
  };
  
  const handleQRCodeData = async (data: string) => {
    try {
      // Stop scanning once we've found a code
      if (isWeb && scannerInterval.current) {
        clearInterval(scannerInterval.current);
        scannerInterval.current = null;
      }
      
      const qrData = JSON.parse(data);
      console.log('QR Data parsed:', qrData);
      
      if (qrData.type !== 'attendance') {
        Alert.alert('Invalid QR Code', 'This QR code is not for attendance');
        return;
      }
      
      if (!studentId) {
        Alert.alert('Error', 'Student ID not found. Please log in again.');
        return;
      }

      // Get current user's details
      let studentName = '';
      try {
        const user = await authAPI.getCurrentUser();
        if (user && user.firstName && user.lastName) {
          studentName = `${user.lastName}, ${user.firstName}`;
        }
      } catch (error) {
        console.error('Error fetching student name:', error);
      }
      
      console.log('Submitting attendance with studentId:', studentId);
      console.log('Class from QR code:', qrData.classId);
      
      // Test connection before submission
      const isConnected = await attendanceAPI.testConnection();
      if (!isConnected) {
        Alert.alert(
          'Connection Issue', 
          'Cannot connect to attendance server. Your attendance will be saved locally but cannot be synchronized now.'
        );
        
        // Save locally anyway
        saveAttendanceRecord(
          qrData.classId, 
          qrData.subjectCode || 'Unknown', 
          qrData.className || qrData.yearSection || 'Unknown',
          studentName
        );
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
        
        setShowScanner(false);
        setScanning(false);
        setConfirmationCode(qrData.classId);
        setConfirmationSubject(qrData.subjectCode || 'Unknown');
        setConfirmationClass(qrData.className || qrData.yearSection || 'Unknown');
        return;
      }
      
      // Try to get device location if available
      const submitAttendanceWithLocation = async () => {
        let locationData = undefined;
        
        // Only try to get location on mobile devices
        if (!isWeb && navigator && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
              });
            });
            
            locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
          } catch (error) {
            console.log('Error getting location:', error);
            // Continue without location data
          }
        }
        
        // Process attendance with enhanced data
        attendanceAPI.submitAttendance({
          classId: qrData.classId,
          studentId,
          studentName,
          timestamp: new Date().toISOString(),
          status: 'present',
          recordedVia: 'qr',
          location: locationData
        }).then((attendance) => {
          setShowScanner(false);
          setScanning(false);
          setConfirmationCode(qrData.classId);
          setConfirmationSubject(qrData.subjectCode || 'Unknown');
          setConfirmationClass(qrData.className || qrData.yearSection || 'Unknown');
          
          // Save to local storage for records
          saveAttendanceRecord(
            qrData.classId, 
            qrData.subjectCode || 'Unknown', 
            qrData.className || qrData.yearSection || 'Unknown',
            studentName
          );
          
          // Also show success notification explicitly here
          setShowSuccess(true);
          // Ensure notification stays visible for 3 seconds
          setTimeout(() => {
            setShowSuccess(false);
          }, 3000);
        }).catch(error => {
          console.error('Error submitting attendance:', error);
          
          // Close scanner
          setShowScanner(false);
          setScanning(false);
          
          // Display more specific error messages
          let errorMessage = 'Failed to submit attendance';
          if (error.message && error.message.includes('Authentication')) {
            errorMessage = error.message;
          } else if (error.message && error.message.includes('server')) {
            errorMessage = error.message;
          } else if (error.response?.status === 404) {
            errorMessage = 'Server endpoint not found. Backend may not be running.';
          } else if (error.response?.status === 401 || error.response?.status === 403) {
            errorMessage = 'Authentication failed. Please log in again.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          
          Alert.alert('Error', errorMessage);
        });
      };
      
      submitAttendanceWithLocation();
      
    } catch (error) {
      console.error('Error scanning QR code:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
    }
  };

  // Launch native QR code scanner
  const launchNativeScanner = async () => {
    if (isAndroid) {
      try {
        // Try to open common QR code scanner apps on Android
        // First try Google Lens (widely available on modern Android devices)
        try {
          await IntentLauncher.startActivityAsync('com.google.android.gms.vision.barcode.ui.BarcodeActivity', {
            flags: 0,
          });
          return; // Exit if successful
        } catch (e) {
          // Google Lens not available, try ZXing
          try {
            await IntentLauncher.startActivityAsync('com.google.zxing.client.android.SCAN', {
              flags: 0,
              category: 'android.intent.category.DEFAULT',
              data: 'SCAN_MODE=QR_CODE_MODE',
              extra: {
                'SCAN_MODE': 'QR_CODE_MODE',
              }
            });
            return; // Exit if successful
          } catch (e2) {
            // No standard scanner found, try to open general barcode intent
            try {
              // Try general barcode intent
              await Linking.openURL('market://search?q=barcode+scanner&c=apps');
              return;
            } catch (e3) {
              // All attempts failed, fallback to our scanner
              setShowScanner(true);
            }
          }
        }
      } catch (error) {
        // Fallback to built-in scanner
        setShowScanner(true);
      }
    } else if (isIOS) {
      // On iOS, try to use the Camera app which has QR scanning
      try {
        // First try opening camera app
        const canOpenCamera = await Linking.canOpenURL('camera://');
        if (canOpenCamera) {
          await Linking.openURL('camera://');
        } else {
          // Try a common QR scanner app URL scheme
          const canOpenScanner = await Linking.canOpenURL('qrscanner://');
          if (canOpenScanner) {
            await Linking.openURL('qrscanner://');
          } else {
            // Fallback to built-in scanner
            setShowScanner(true);
          }
        }
      } catch (error) {
        // Fallback to our scanner
        setShowScanner(true);
      }
    } else {
      // Fallback to custom scanner for other platforms
      setShowScanner(true);
    }
  };

  const handleStartCamera = () => {
    if (hasPermission === false) {
      Alert.alert('Permission Required', 'Camera permission is required to scan QR codes');
      return;
    }
    
    if (isWeb) {
      startWebScanner();
    } else {
      // Try to use native scanner first
      launchNativeScanner();
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    handleQRCodeData(data);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }
    try {
      if (!studentId) {
        Alert.alert('Error', 'Student ID not found. Please log in again.');
        return;
      }
      
      console.log('Manual attendance submission:');
      console.log('Class code:', manualCode);
      console.log('Student ID:', studentId);
      
      await attendanceAPI.submitAttendance({
        classId: manualCode,
        studentId,
        timestamp: new Date().toISOString(),
        status: 'present',
        recordedVia: 'manual'
      });
      
      setShowManualEntry(false);
      setConfirmationCode(manualCode);
      setConfirmationSubject('Manual Entry');
      setConfirmationClass('Manual Entry');
      
      // Save to local storage for records
      saveAttendanceRecord(manualCode, 'Manual Entry', 'Manual Entry', '');
      
    } catch (error) {
      console.error('Error submitting manual code:', error);
      Alert.alert('Error', 'Failed to submit attendance');
    }
  };

  const requestPermission = async () => {
    if (isWeb) {
      setHasPermission(true);
      setPermissionLoading(false);
    } else {
      setPermissionLoading(true);
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      setPermissionLoading(false);
    }
  };

  const openAppSettings = () => {
    Linking.openSettings();
  };

  const renderScanner = () => {
    if (!showScanner) return null;
    
    if (isWeb) {
      return (
        <View style={[StyleSheet.absoluteFill, styles.webcamContainer]}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            style={styles.webcam}
            videoConstraints={{
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            audio={false}
            mirrored={false}
            screenshotQuality={1}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanCorner1} />
            <View style={styles.scanCorner2} />
            <View style={styles.scanCorner3} />
            <View style={styles.scanCorner4} />
            <View style={styles.scanFocusArea} />
          </View>
          <View style={styles.webcamHelp}>
            <Text style={styles.webcamHelpText}>
              Position QR code in the center box
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={stopWebScanner}
          >
            <Ionicons name="close-circle" size={36} color="white" />
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.scanCorner1} />
            <View style={styles.scanCorner2} />
            <View style={styles.scanCorner3} />
            <View style={styles.scanCorner4} />
          </View>
          <View style={styles.barcodeHelp}>
            <Text style={styles.barcodeHelpText}>
              Point camera at QR code
            </Text>
          </View>
        </BarCodeScanner>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Code Attendance</Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>QR CODE{'\n'}ATTENDANCE</Text>
          <Text style={styles.subtitle}>Scan the QR code to mark your attendance</Text>

          <View style={styles.scannerContainer}>
            {permissionLoading ? (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Checking camera permission...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.placeholderContainer}>
                <Ionicons name="close-circle" size={48} color="#ff6b6b" />
                <Text style={styles.placeholderText}>
                  Camera permission denied. Please enable camera access in your device settings.
                </Text>
                <TouchableOpacity style={styles.startButton} onPress={openAppSettings}>
                  <Text style={styles.startButtonText}>Open Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.startButton, { marginTop: 10 }]} onPress={requestPermission}>
                  <Text style={styles.startButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : !showScanner ? (
              <View style={styles.placeholderContainer}>
                <Ionicons name="qr-code" size={48} color="#666" />
                <Text style={styles.placeholderText}>
                  Tap the button below to scan QR code
                </Text>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartCamera}
                >
                  <Text style={styles.startButtonText}>
                    {Platform.OS === 'web' ? 'Start Camera' : 'Open QR Scanner'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : renderScanner()}
          </View>

          {confirmationCode && (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.confirmationTitle}>Attendance Confirmed</Text>
              </View>
              <Text style={styles.confirmationText}>
                Your attendance has been recorded for:
              </Text>
              <Text style={styles.confirmationCode}>{confirmationSubject || confirmationCode}</Text>
              {confirmationClass && confirmationClass !== 'Manual Entry' && (
                <Text style={styles.confirmationClass}>Class: {confirmationClass}</Text>
              )}
              <TouchableOpacity 
                style={styles.viewRecordsButton}
                onPress={() => navigation.navigate('Records')}
              >
                <Text style={styles.viewRecordsText}>View All Records</Text>
                <Ionicons name="arrow-forward" size={16} color="#2eada6" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowManualEntry(true)}
          >
            <Text style={styles.manualButtonText}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Notification */}
      {showSuccess && (
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <Ionicons name="checkmark-circle" size={28} color="white" />
            <View style={styles.successTextContainer}>
              <Text style={styles.successText}>Attendance recorded successfully!</Text>
              {confirmationSubject && (
                <Text style={styles.successSubText}>
                  Saved to database: {confirmationSubject}{confirmationClass && confirmationClass !== 'Manual Entry' ? ` (${confirmationClass})` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Attendance Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter code"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
            <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowManualEntry(false)}
            >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2eada6',
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
    width: '100%',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  scannerContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: 'white',
    fontSize: 16,
  },
  webcamContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  webcam: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  confirmationCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  confirmationCode: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  confirmationClass: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  viewRecordsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  viewRecordsText: {
    color: '#2eada6',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  manualButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manualButtonText: {
    color: '#2eada6',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    width: '90%',
    maxWidth: 500,
  },
  successText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  successSubText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  submitButton: {
    backgroundColor: '#2eada6',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCorner1: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'white',
  },
  scanCorner2: {
    position: 'absolute',
    top: '25%',
    right: '20%',
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: 'white',
  },
  scanCorner3: {
    position: 'absolute',
    bottom: '25%',
    left: '20%',
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'white',
  },
  scanCorner4: {
    position: 'absolute',
    bottom: '25%',
    right: '20%',
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: 'white',
  },
  webcamHelp: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  webcamHelpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barcodeHelp: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  barcodeHelpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanFocusArea: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
});

export default QRScanScreen; 