import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DevLoginTool from '../components/DevLoginTool';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Login: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const iconRotation = new Animated.Value(0);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

  // Watch for user changes and navigate accordingly
  useEffect(() => {
    if (user && isLoginSuccess) {
      setShowSuccessModal(true);
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        switch (user.role) {
          case 'admin':
            navigation.replace('Admin');
            break;
          case 'instructor':
            navigation.replace('Instructor');
            break;
          case 'student':
            navigation.replace('Student');
            break;
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user, navigation, isLoginSuccess]);

  // Animation effect
  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();
  }, []);

  const spin = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleLogin = async () => {
    // Validate inputs
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        'Validation Error',
        'Please enter both username and password',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      setIsLoginSuccess(true);
    } catch (err: any) {
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      <DevLoginTool />
      
      <View style={styles.formContainer}>
        <View style={styles.iconContainer}>
          <Animated.View style={[{ transform: [{ rotate: spin }] }]}>
            <Ionicons name="calendar" size={80} color="#2eada6" />
          </Animated.View>
        </View>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#9e9e9e"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#9e9e9e"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={togglePasswordVisibility}
            disabled={isLoading}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={24} 
              color="#9e9e9e" 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.button,
            isLoading && styles.buttonDisabled
          ]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Signing in' : 'Sign In'}
            </Text>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingDots}>...</Text>
                <ActivityIndicator size="small" color="white" style={styles.loadingIcon} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={closeErrorModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Login Failed</Text>
            <Text style={styles.modalMessage}>Please try again</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={closeErrorModal}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <SuccessModal 
        visible={showSuccessModal}
        message="Login Successful!"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#2eada6',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#2eada6',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    color: '#424242',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: '#424242',
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: '#2eada6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  loadingDots: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4,
  },
  loadingIcon: {
    marginLeft: 4,
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
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2eada6',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#2eada6',
    padding: 10,
    borderRadius: 5,
    width: '50%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default Login; 