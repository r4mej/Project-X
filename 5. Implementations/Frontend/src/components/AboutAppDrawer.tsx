import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AboutAppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const AboutAppDrawer: React.FC<AboutAppDrawerProps> = ({ visible, onClose }) => {
  return (
    <>
      {/* Blur Modal - No animation for instant effect */}
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

      {/* Content Modal - Slides up independently */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomDrawerContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About App</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Triple Threat + One</Text>
                <Text style={styles.version}>Version 1.0.0</Text>
                <Text style={styles.description}>
                  A comprehensive attendance management system designed to streamline the process of tracking student attendance in educational institutions.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="qr-code-outline" size={24} color="#2eada6" />
                    <Text style={styles.featureText}>QR Code Attendance</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="calendar-outline" size={24} color="#2eada6" />
                    <Text style={styles.featureText}>Class Schedule Management</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="stats-chart-outline" size={24} color="#2eada6" />
                    <Text style={styles.featureText}>Attendance Analytics</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="people-outline" size={24} color="#2eada6" />
                    <Text style={styles.featureText}>Student Management</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Development Team</Text>
                <Text style={styles.teamText}>
                  Created by the Triple Threat + One team as part of the Software Engineering project.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <Text style={styles.contactText}>
                  For support or inquiries:{'\n'}
                  Email: support@triplethreatplus.one{'\n'}
                  Website: www.triplethreatplus.one
                </Text>
              </View>
            </ScrollView>
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
  },
  content: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  teamText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AboutAppDrawer; 