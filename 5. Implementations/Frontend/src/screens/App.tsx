import '../config/reanimated';  // Import reanimated configuration first
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ViewClass from '../components/instructor/ClassList';
import { useAuth } from '../context/AuthContext';
import AdminNavigator from '../navigation/AdminNavigator';
import InstructorNavigator from '../navigation/InstructorNavigator';
import StudentNavigator from '../navigation/StudentNavigator';
import { RootStackParamList } from '../navigation/types';
import Login from './Login';
import SplashScreen from './SplashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const FIRST_LOAD_KEY = '@first_load_completed';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const checkFirstLoad = async () => {
      try {
        let firstLoadCompleted;
        if (Platform.OS === 'web') {
          firstLoadCompleted = localStorage.getItem(FIRST_LOAD_KEY);
        } else {
          firstLoadCompleted = await AsyncStorage.getItem(FIRST_LOAD_KEY);
        }
        
        if (firstLoadCompleted) {
          setShowSplash(false);
          setIsFirstLoad(false);
        } else {
          // If it's the first load, show splash screen for 3 seconds
          const timer = setTimeout(async () => {
            setShowSplash(false);
            // Mark first load as completed
            if (Platform.OS === 'web') {
              localStorage.setItem(FIRST_LOAD_KEY, 'true');
            } else {
              await AsyncStorage.setItem(FIRST_LOAD_KEY, 'true');
            }
          }, 3000);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error checking first load:', error);
        setShowSplash(false);
      }
    };

    checkFirstLoad();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

  if (showSplash && isFirstLoad) {
    return <SplashScreen />;
  }

  // Determine initial route based on auth state
  const initialRoute = user ? (
    user.role === 'admin' ? 'Admin' :
    user.role === 'instructor' ? 'Instructor' :
    'Student'
  ) : 'Login';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ 
            headerShown: false,
            animation: 'fade'
          }}
        >
          {!user ? (
            <Stack.Screen name="Login" component={Login} />
          ) : (
            <>
              {user.role === 'admin' && (
                <Stack.Screen 
                  name="Admin" 
                  component={AdminNavigator}
                />
              )}
              {user.role === 'instructor' && (
                <Stack.Screen 
                  name="Instructor" 
                  component={InstructorNavigator}
                />
              )}
              {user.role === 'student' && (
                <Stack.Screen 
                  name="Student" 
                  component={StudentNavigator}
                />
              )}
              <Stack.Screen name="ClassList" component={ViewClass} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App; 