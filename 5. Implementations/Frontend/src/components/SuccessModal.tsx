import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  duration?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  visible, 
  message,
  duration = 1500 
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration - 600),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
    >
      <View style={styles.centeredView}>
        <Animated.View 
          style={[
            styles.modalView,
            {
              opacity: fadeAnim,
              transform: [{
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#2eada6" />
          </View>
          <Text style={styles.modalText}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 15,
    backgroundColor: 'rgba(46, 173, 166, 0.1)',
    borderRadius: 40,
    padding: 10,
  },
  modalText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
});

export default SuccessModal; 