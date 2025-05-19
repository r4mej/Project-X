import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal } from 'react-native';
import RecordsOverview from '../components/admin/RecordsOverview';
import ManageUser from '../components/admin/UserManager';
import QuickViewClasses from '../components/instructor/QuickViewClasses';
import QuickViewUsers from '../components/instructor/QuickViewUsers';
import { useAuth } from '../context/AuthContext';
import { useRefresh } from '../context/RefreshContext';
import { AdminBottomTabParamList, AdminDrawerParamList, UserRole } from '../navigation/types';
import { classAPI, logAPI, userAPI, instructorDeviceAPI } from '../services/api';

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

const ViewDevicesModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchDevices();
    }
  }, [visible]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      // First fetch all users who are instructors
      const users = await userAPI.getUsers();
      const instructorUsers = users.filter((user: User) => user.role === 'instructor');
      setInstructors(instructorUsers);

      // Then fetch all devices for all instructors
      const allDevices = [];
      for (const instructor of instructorUsers) {
        try {
          // We'll use the admin's access to fetch devices for each instructor
          const response = await instructorDeviceAPI.getDevicesForInstructor(instructor.userId);
          if (response && response.data) {
            const instructorDevices = response.data.map((device: any) => ({
              ...device,
              instructorName: instructor.username,
              instructorId: instructor.userId
            }));
            allDevices.push(...instructorDevices);
          }
        } catch (err) {
          console.log(`Could not fetch devices for instructor ${instructor.username}`);
        }
      }
      setDevices(allDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      Alert.alert('Error', 'Failed to fetch instructor devices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceCount = () => {
    return devices.length;
  };

  const getActiveDeviceCount = () => {
    return devices.filter(device => device.active).length;
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Instructor Devices</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2eada6" />
              <Text style={styles.loadingText}>Loading devices...</Text>
            </View>
          ) : devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>No instructor devices found</Text>
              <Text style={styles.emptySubtext}>Instructors haven't registered any devices yet</Text>
            </View>
          ) : (
            <>
              <View style={styles.deviceSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryCount}>{getDeviceCount()}</Text>
                  <Text style={styles.summaryLabel}>Total Devices</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryCount}>{getActiveDeviceCount()}</Text>
                  <Text style={styles.summaryLabel}>Active Devices</Text>
                </View>
              </View>
              
              <ScrollView style={{maxHeight: '80%'}}>
                {instructors.map(instructor => {
                  const instructorDevices = devices.filter(d => d.instructorId === instructor.userId);
                  if (instructorDevices.length === 0) return null;
                  
                  return (
                    <View key={instructor.userId} style={styles.instructorSection}>
                      <View style={styles.instructorHeader}>
                        <Ionicons name="person" size={18} color="#2eada6" />
                        <Text style={styles.instructorName}>{instructor.username}</Text>
                        <Text style={styles.instructorRole}>Instructor</Text>
                        <View style={{flex: 1}} />
                        <View style={styles.deviceCountBadge}>
                          <Text style={styles.deviceCountText}>{instructorDevices.length}</Text>
                        </View>
                      </View>
                      
                      {instructorDevices.map(device => (
                        <View key={device._id} style={styles.deviceCard}>
                          <View style={styles.deviceHeader}>
                            <Text style={styles.deviceName}>{device.deviceName}</Text>
                            <View style={[
                              styles.statusDot, 
                              {backgroundColor: device.active ? '#4CAF50' : '#999'}
                            ]} />
                          </View>
                          <Text style={styles.deviceId}>ID: {device.deviceId.substring(0, 12)}...</Text>
                          <Text style={styles.deviceDetail}>
                            Registered: {formatDate(device.createdAt)}
                          </Text>
                          {device.lastLocation && device.lastLocation.timestamp ? (
                            <View style={styles.locationInfo}>
                              <Ionicons name="location" size={14} color="#2eada6" />
                              <Text style={styles.locationText}>
                                Last location: {formatDate(device.lastLocation.timestamp)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.noLocationText}>No location data available</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const AdminDashboard: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<AdminDrawerParamList>>();
  const { refreshKey, triggerRefresh } = useRefresh();
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
  const [showDeviceList, setShowDeviceList] = useState(false);

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
  }, [refreshKey]);

  // Add a dedicated effect for handling just refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('Refreshing admin data due to refreshKey change:', refreshKey);
      // Small delay to ensure backend has processed any new data
      setTimeout(() => {
        fetchUsers();
      }, 500);
    }
  }, [refreshKey]);

  const studentPercentage = Math.round((systemStats.studentCount / systemStats.totalUsers) * 100) || 0;
  const instructorPercentage = Math.round((systemStats.instructorCount / systemStats.totalUsers) * 100) || 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

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
          <View style={styles.actionButtonsContainer}>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowUserList(true)}
              >
                <Ionicons name="people" size={22} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>User List</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowClassList(true)}
              >
                <Ionicons name="school" size={22} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>Class List</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('ViewLogs')}
              >
                <Ionicons name="list" size={22} color="#2eada6" />
                <Text style={[styles.actionText, { color: '#2eada6' }]}>Logs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#f0e8f5', borderColor: '#8a2be2' }]}
                onPress={() => setShowDeviceList(true)}
              >
                <Ionicons name="phone-portrait" size={22} color="#8a2be2" />
                <Text style={[styles.actionText, { color: '#8a2be2' }]}>View Devices</Text>
              </TouchableOpacity>
            </View>
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
      <ViewDevicesModal
        visible={showDeviceList} 
        onClose={() => setShowDeviceList(false)}
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
  const { triggerRefresh } = useRefresh();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkStoredCredentials();
    setLoading(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2eada6" />
      </View>
    );
  }

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
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              triggerRefresh();
              Alert.alert("Refreshing", "Updating dashboard data...");
            }}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
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
    position: 'relative',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 0,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
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
  actionButtonsContainer: {
    flexDirection: 'column',
    marginTop: 15,
    gap: 15,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#e8f5f4',
    borderColor: '#2eada6',
    borderWidth: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2eada6',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  instructorSection: {
    marginBottom: 20,
  },
  instructorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2eada6',
    marginBottom: 10,
  },
  deviceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2eada6',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  deviceDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locationText: {
    fontSize: 12,
    color: '#2eada6',
    marginLeft: 5,
  },
  noLocationText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    marginTop: 5,
  },
  deviceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  instructorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
  },
  deviceCountBadge: {
    backgroundColor: '#2eada6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  deviceCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  instructorRole: {
    fontSize: 12,
    color: '#666',
  },
});

export default AdminScreen; 