import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

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
    <LinearGradient
      colors={[colors.primary.main, colors.primary.dark]}
      style={styles.container}
    >
      <View style={styles.mainContent}>
        <Animated.View 
          style={[
            styles.content,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.iconContainer}>
            <Animated.View style={[{ transform: [{ rotate: spin }] }]}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>X</Text>
                <View style={styles.logoHighlight} />
              </View>
            </Animated.View>
          </View>
          <Text style={styles.title}>Project X</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.subtitleContainer, { opacity: subtitleFadeAnim }]}>
        <Text style={styles.subtitle}>Attendance App</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoText: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.text.inverse,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginTop: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleContainer: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: colors.text.inverse,
    opacity: 0.9,
    fontWeight: '500',
  },
});

export default SplashScreen; 