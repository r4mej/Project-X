import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DevLoginTool from '../components/DevLoginTool';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

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
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>X</Text>
              <View style={styles.logoHighlight} />
            </View>
          </Animated.View>
        </View>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your Account</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.text.secondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={colors.text.secondary}
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
              color={colors.text.secondary} 
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
                <ActivityIndicator size="small" color={colors.text.inverse} style={styles.loadingIcon} />
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
    backgroundColor: colors.primary.main,
  },
  formContainer: {
    backgroundColor: colors.surface.card,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary.main,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    transform: [{ rotate: '0deg' }],
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text.inverse,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.primary.main,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.neutral.lightGray,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    color: colors.text.primary,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    backgroundColor: colors.neutral.lightGray,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    color: colors.text.primary,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary.main,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral.gray,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingDots: {
    color: colors.text.inverse,
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
    backgroundColor: colors.surface.modal,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary.main,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary.main,
    padding: 14,
    borderRadius: 12,
    width: '60%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 16,
  }
});

export default Login; 