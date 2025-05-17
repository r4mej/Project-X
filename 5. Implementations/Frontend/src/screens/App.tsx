import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ViewClass from '../components/attendance/ViewClass';
import { useAuth } from '../context/AuthContext';
import AdminNavigator from '../navigation/AdminNavigator';
import InstructorNavigator from '../navigation/InstructorNavigator';
import StudentNavigator from '../navigation/StudentNavigator';
import { RootStackParamList } from '../navigation/types';
import Login from './Login';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            animation: 'fade'
          }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="ClassList" component={ViewClass} />
          {user && (
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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App; 