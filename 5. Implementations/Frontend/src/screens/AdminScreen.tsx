import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RecordsOverview from '../components/admin/RecordsOverview';
import ManageUser from '../components/admin/UserManager';
import QuickViewClasses from '../components/instructor/QuickViewClasses';
import QuickViewUsers from '../components/instructor/QuickViewUsers';
import { useAuth } from '../context/AuthContext';
import { AdminBottomTabParamList, AdminDrawerParamList, UserRole } from '../navigation/types';
import { classAPI, logAPI, userAPI } from '../services/api';

type NavigationProp = DrawerNavigationProp<AdminDrawerParamList>;
const Tab = createBottomTabNavigator<AdminBottomTabParamList>();

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 3;
const INDICATOR_WIDTH = 24;
const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  userId: string;
  isActive?: boolean;
}

interface SystemStats {
  totalUsers: number;
  studentCount: number;
  instructorCount: number;
  totalClasses: number;
  totalSections: number;
  activityStats: {
    adminLogins: number;
    studentLogins: number;
    instructorLogins: number;
    totalLogins: number;
  };
}

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size?: number;
}

const TabIcon = ({ name, focused, size = 24 }: TabIconProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 10,
    }).start();
  }, [focused]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap}
          size={size}
          color={focused ? 'white' : 'rgba(255, 255, 255, 0.6)'}
        />
      </Animated.View>
    </View>
  );
};

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<AdminDrawerParamList>>();
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    studentCount: 0,
    instructorCount: 0,
    totalClasses: 0,
    totalSections: 0,
    activityStats: {
      adminLogins: 0,
      studentLogins: 0,
      instructorLogins: 0,
      totalLogins: 0
    }
  });
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserList, setShowUserList] = useState(false);
  const [showClassList, setShowClassList] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userAPI.getUsers();
      setUsers(data);
      
      // Calculate system stats
      const totalUsers = data.length;
      const studentCount = data.filter((user: User) => user.role === 'student').length;
      const instructorCount = data.filter((user: User) => user.role === 'instructor').length;

      // Get classes data
      const classesData = await classAPI.getClasses();
      const totalClasses = classesData.length;
      const uniqueSections = new Set(classesData.map((c: any) => `${c.course}-${c.yearSection}`));
      const totalSections = uniqueSections.size;

      // Get activity logs
      const activityLogs = await logAPI.getUserActivityLogs();
      const roleLogins = activityLogs.reduce((acc: any, log: any) => {
        if (log.role === 'admin') acc.adminLogins++;
        else if (log.role === 'student') acc.studentLogins++;
        else if (log.role === 'instructor') acc.instructorLogins++;
        return acc;
      }, { adminLogins: 0, studentLogins: 0, instructorLogins: 0 });

      const totalLogins = roleLogins.adminLogins + roleLogins.studentLogins + roleLogins.instructorLogins;

      setSystemStats({
        totalUsers,
        studentCount,
        instructorCount,
        totalClasses,
        totalSections,
        activityStats: {
          ...roleLogins,
          totalLogins
        }
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchUsers, 300000);
    return () => clearInterval(interval);
  }, []);

  const studentPercentage = Math.round((systemStats.studentCount / systemStats.totalUsers) * 100) || 0;
  const instructorPercentage = Math.round((systemStats.instructorCount / systemStats.totalUsers) * 100) || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* System Overview Card */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.overviewHeader}
            onPress={() => setIsStatsExpanded(!isStatsExpanded)}
          >
            <View>
              <Text style={styles.cardTitle}>System Overview</Text>
              <Text style={styles.subTitle}>User Distribution</Text>
            </View>
            <Ionicons 
              name={isStatsExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#2eada6" 
            />
          </TouchableOpacity>

          <View style={styles.overviewStats}>
            <View style={[styles.statCircle, { borderColor: '#2eada6' }]}>
              <Text style={[styles.totalUsers, { color: '#2eada6' }]}>{systemStats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.percentageContainer}>
              <View style={[styles.percentageItem, { borderColor: '#8a2be2', borderWidth: 1 }]}>
                <Text style={[styles.percentageLabel, { color: '#8a2be2' }]}>Students</Text>
                <Text style={[styles.percentageValue, { color: '#8a2be2' }]}>{studentPercentage}%</Text>
              </View>
              <View style={[styles.percentageItem, { borderColor: '#2196F3', borderWidth: 1 }]}>
                <Text style={[styles.percentageLabel, { color: '#2196F3' }]}>Instructors</Text>
                <Text style={[styles.percentageValue, { color: '#2196F3' }]}>{instructorPercentage}%</Text>
              </View>
            </View>
          </View>

          {isStatsExpanded && (
            <View style={styles.detailedStats}>
              <View style={[styles.statRow, { borderColor: '#8a2be2', borderLeftWidth: 2, paddingLeft: 10 }]}>
                <Text style={[styles.statTitle, { color: '#8a2be2' }]}>Total Students</Text>
                <Text style={[styles.statValue, { color: '#8a2be2' }]}>{systemStats.studentCount}</Text>
              </View>
              <View style={[styles.statRow, { borderColor: '#2196F3', borderLeftWidth: 2, paddingLeft: 10, marginTop: 10 }]}>
                <Text style={[styles.statTitle, { color: '#2196F3' }]}>Total Instructors</Text>
                <Text style={[styles.statValue, { color: '#2196F3' }]}>{systemStats.instructorCount}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Total Classes and Sections Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Classes Overview</Text>
          <Text style={styles.subTitle}>Total Classes and Sections</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={[styles.classStatCircle, { borderColor: '#8a2be2' }]}>
                <Text style={[styles.totalClasses, { color: '#8a2be2' }]}>{systemStats.totalClasses}</Text>
                <Text style={[styles.classLabel, { color: '#8a2be2' }]}>Classes</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.classStatCircle, { borderColor: '#2196F3' }]}>
                <Text style={[styles.totalClasses, { color: '#2196F3' }]}>{systemStats.totalSections}</Text>
                <Text style={[styles.classLabel, { color: '#2196F3' }]}>Sections</Text>
              </View>
            </View>
          </View>

          {/* Activity Log Statistics */}
          <View style={styles.activityStats}>
            <Text style={styles.activityTitle}>Login Activity Distribution</Text>
            <View style={styles.activityContainer}>
              {systemStats.activityStats.totalLogins > 0 ? (
                <>
                  <View style={[styles.activityItem, { borderColor: '#2eada6', borderWidth: 1 }]}>
                    <Text style={[styles.activityLabel, { color: '#2eada6' }]}>Admin</Text>
                    <Text style={[styles.activityValue, { color: '#2eada6' }]}>
                      {Math.round((systemStats.activityStats.adminLogins / systemStats.activityStats.totalLogins) * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.activityItem, { borderColor: '#8a2be2', borderWidth: 1 }]}>
                    <Text style={[styles.activityLabel, { color: '#8a2be2' }]}>Student</Text>
                    <Text style={[styles.activityValue, { color: '#8a2be2' }]}>
                      {Math.round((systemStats.activityStats.studentLogins / systemStats.activityStats.totalLogins) * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.activityItem, { borderColor: '#2196F3', borderWidth: 1 }]}>
                    <Text style={[styles.activityLabel, { color: '#2196F3' }]}>Instructor</Text>
                    <Text style={[styles.activityValue, { color: '#2196F3' }]}>
                      {Math.round((systemStats.activityStats.instructorLogins / systemStats.activityStats.totalLogins) * 100)}%
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.noActivityText}>No login activity recorded</Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.subTitle}>Access frequently used features</Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#e8f5f4', borderColor: '#2eada6', borderWidth: 1 }]}
              onPress={() => setShowUserList(true)}
            >
              <Ionicons name="people" size={22} color="#2eada6" />
              <Text style={[styles.actionText, { color: '#2eada6' }]}>User List</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#e8f5f4', borderColor: '#2eada6', borderWidth: 1 }]}
              onPress={() => setShowClassList(true)}
            >
              <Ionicons name="school" size={22} color="#2eada6" />
              <Text style={[styles.actionText, { color: '#2eada6' }]}>Class List</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#e8f5f4', borderColor: '#2eada6', borderWidth: 1 }]}
              onPress={() => navigation.navigate('ViewLogs')}
            >
              <Ionicons name="list" size={22} color="#2eada6" />
              <Text style={[styles.actionText, { color: '#2eada6' }]}>Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick View Modals */}
      <QuickViewUsers
        visible={showUserList}
        onClose={() => setShowUserList(false)}
      />
      <QuickViewClasses
        visible={showClassList}
        onClose={() => setShowClassList(false)}
      />
    </ScrollView>
  );
};

const ManageUsers: React.FC = () => {
  return <ManageUser />;
};

const Records: React.FC = () => {
  return <RecordsOverview />;
};

const AdminScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('Dashboard');
  const { user, login } = useAuth();
  
  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      // Try AsyncStorage first
      let storedUser = await AsyncStorage.getItem('user');
      let token = await AsyncStorage.getItem('token');
      
      // If we're on web and don't have credentials in AsyncStorage, try localStorage
      if (Platform.OS === 'web' && (!storedUser || !token)) {
        storedUser = localStorage.getItem('user');
        token = localStorage.getItem('token');
      }
      
      if (storedUser && token && !user) {
        const userData = JSON.parse(storedUser);
        // Re-authenticate user with stored credentials
        login(userData, token);
      }
    } catch (error) {
      console.error('Error checking stored credentials:', error);
    }
  };

  const handleTabPress = (index: number, tabName: string) => {
    Animated.spring(slideAnim, {
      toValue: (index * TAB_WIDTH) + INDICATOR_OFFSET,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
    setActiveTab(tabName);
  };

  useEffect(() => {
    // Initialize line position to first tab
    slideAnim.setValue(INDICATOR_OFFSET);
  }, []);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'Dashboard':
        return 'Dashboard';
      case 'ManageUsers':
        return 'User Manager';
      case 'Records':
        return 'Records Overview';
      default:
        return 'Dashboard';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#2eada6',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.2)',
              height: 70,
              paddingTop: 8,
              paddingBottom: 12,
            },
            tabBarShowLabel: false,
            tabBarItemStyle: {
              paddingBottom: 4,
            },
          }}
          screenListeners={({ navigation }) => ({
            tabPress: (e) => {
              const index = navigation.getState().index;
              const route = navigation.getState().routes[index];
              handleTabPress(index, route.name);
            },
          })}
        >
          <Tab.Screen 
            name="Dashboard" 
            component={AdminDashboard}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="home" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(0, 'Dashboard'),
            }}
          />
          <Tab.Screen 
            name="ManageUsers" 
            component={ManageUsers}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="people" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(1, 'ManageUsers'),
            }}
          />
          <Tab.Screen 
            name="Records" 
            component={Records}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon name="document-text" focused={focused} />
              ),
            }}
            listeners={{
              tabPress: () => handleTabPress(2, 'Records'),
            }}
          />
        </Tab.Navigator>
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            width: INDICATOR_WIDTH,
            height: 3,
            backgroundColor: 'white',
            borderRadius: 1.5,
            transform: [{ translateX: slideAnim }],
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#2eada6',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2eada6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  totalUsers: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  percentageContainer: {
    flex: 1,
    marginLeft: 20,
    flexDirection: 'column',
    gap: 20,
  },
  percentageItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  percentageLabel: {
    fontSize: 14,
    marginRight: 10,
  },
  detailedStats: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statTitle: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButton: {
    width: '30%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  classStatCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#2eada6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  totalClasses: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classLabel: {
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  activityStats: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2eada6',
    marginBottom: 15,
  },
  activityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityItem: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noActivityText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
  },
});

export default AdminScreen; 