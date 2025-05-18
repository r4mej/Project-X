import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

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
  yearSection,
}) => {
  const [qrData, setQrData] = useState<string>('');
  const qrRef = useRef<any>(null);
  const [qrValue, setQrValue] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      // Generate QR data with class information and timestamp
      const now = new Date();
      
      const data = {
        classId,
        subjectCode,
        yearSection,
        className: `${subjectCode} ${yearSection || ''}`.trim(),
        timestamp: now.toISOString(),
        type: 'attendance'
      };
      
      const qrString = JSON.stringify(data);
      setQrData(qrString);
      setQrValue(data);
    }
  }, [visible, classId, subjectCode, yearSection]);

  const handleShare = async () => {
    try {
      // Optionally, you can generate a base64 image and share it
      // For now, just share the code as text
      await Share.share({
        message: `Attendance Code for ${subjectCode} ${yearSection}:
${qrData}`,
      });
      Alert.alert('Success', 'Attendance code has been shared');
    } catch (error) {
      console.error('Error sharing attendance code:', error);
      Alert.alert('Error', 'Failed to share attendance code');
    }
  };

  return (
    <>
      {/* Blur Overlay */}
      <Modal
        transparent={true}
        visible={visible}
        animationType="none"
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            style={styles.bottomDrawerContent}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Attendance QR Code</Text>
            
            <View style={styles.qrContainer}>
              {qrData ? (
                <QRCode
                  value={qrData}
                  size={250}
                  color="#2eada6"
                  backgroundColor="white"
                  getRef={(c) => { qrRef.current = c; }}
                />
              ) : null}
            </View>

            <View style={styles.classInfoContainer}>
              <Text style={styles.classInfoTitle}>{subjectCode}</Text>
              {yearSection ? (
                <Text style={styles.classInfoSubtitle}>{yearSection}</Text>
              ) : null}
            </View>

            <Text style={styles.instructionText}>
              Students can scan this QR code to mark their attendance
            </Text>

            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color="white" />
              <Text style={styles.shareButtonText}>Share Code</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomDrawerContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: -8,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  classInfoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  classInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  classInfoSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#2eada6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default QRGenerator; 