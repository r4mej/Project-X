import '../utils/text-encoder-polyfill';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const StudentQRScreen: React.FC = () => {
  const { user } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQR = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create QR data with student information
      const qrContent = JSON.stringify({
        type: 'student_attendance',
        studentId: user?.userId,
        studentName: user?.username,
        timestamp: new Date().toISOString(),
      });
      
      setQrData(qrContent);
    } catch (err) {
      setError('Failed to generate QR code. Please try again.');
      console.error('QR generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
  }, []);

  const handleRefresh = () => {
    generateQR();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Attendance QR Code</Text>
          <Text style={styles.subtitle}>Show this to your instructor to mark your attendance</Text>
        </View>

        <View style={styles.qrContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.student.primary.main} />
              <Text style={styles.loadingText}>Generating QR Code...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color={colors.status.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : qrData ? (
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrData}
                size={250}
                color="black"
                backgroundColor="white"
              />
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={handleRefresh}
              >
                <Ionicons name="refresh" size={24} color={colors.student.primary.main} />
                <Text style={styles.refreshText}>Refresh QR Code</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Instructions:</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.student.primary.main} />
            <Text style={styles.infoText}>Show this QR code to your instructor</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={24} color={colors.student.primary.main} />
            <Text style={styles.infoText}>QR code updates automatically every few minutes</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={24} color={colors.student.primary.main} />
            <Text style={styles.infoText}>Each QR code is unique to you and this session</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.student.primary.main,
  },
  container: {
    flex: 1,
    backgroundColor: colors.student.primary.light,
  },
  header: {
    backgroundColor: colors.student.primary.main,
    padding: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  qrContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.status.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.status.error,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrWrapper: {
    alignItems: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
    borderRadius: 8,
  },
  refreshText: {
    marginLeft: 8,
    color: colors.student.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
});

export default StudentQRScreen; 