import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const SplashScreen: React.FC = () => {
  const iconRotation = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const subtitleFadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Start rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Start fade-in animations with sequence
    Animated.sequence([
      // Fade in main content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Wait a bit before showing subtitle
      Animated.delay(500),
      // Fade in subtitle
      Animated.timing(subtitleFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Run rotation animation
    rotateAnimation.start();

    return () => {
      rotateAnimation.stop();
    };
  }, []);

  const spin = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <Animated.View 
          style={[
            styles.content,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.iconContainer}>
            <Animated.View style={[{ transform: [{ rotate: spin }] }]}>
              <Ionicons name="calendar" size={120} color="#fff" />
            </Animated.View>
          </View>
          <Text style={styles.title}>Project X</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.subtitleContainer, { opacity: subtitleFadeAnim }]}>
        <Text style={styles.subtitle}>Attendance App</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2eada6',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  subtitleContainer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    opacity: 0.9,
  },
});

export default SplashScreen; 