import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdminDrawerParamList } from '../navigation/types';
import { logAPI } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';

type NavigationProp = DrawerNavigationProp<AdminDrawerParamList>;

interface UserActivityLog {
  _id?: string;
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  loginTime: string;
  logoutTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'terminated';
  deviceInfo?: string;
  ipAddress?: string;
}

const ViewLogs: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await logAPI.getUserActivityLogs();
      // Filter out any logs with undefined sessionId and add index-based fallback
      const validLogs = data.map((log: Partial<UserActivityLog>, index: number) => ({
        ...log,
        sessionId: log.sessionId || `fallback-session-${index}`
      }));
      setLogs(validLogs as UserActivityLog[]);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLog = (sessionId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60000);
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'terminated':
        return '#FF5722';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'radio-button-on';
      case 'completed':
        return 'checkmark-circle';
      case 'terminated':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const generateUniqueKey = (prefix: string, item: UserActivityLog, suffix?: string) => {
    const baseKey = item.sessionId || `fallback-${item._id || Date.now()}`;
    return `${prefix}-${baseKey}${suffix ? `-${suffix}` : ''}`;
  };

  const renderLogItem = ({ item, index }: { item: UserActivityLog; index: number }) => {
    const isExpanded = expandedLogs.has(item.sessionId);
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        key={generateUniqueKey('log-item', item)}
        style={[styles.logItem, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}
        onPress={() => toggleLog(item.sessionId)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={styles.logMainInfo}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.userRole}>{item.role}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={20} 
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            Last Activity: {formatDate(item.loginTime)}
          </Text>
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View key={generateUniqueKey('detail', item, 'duration')} style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Session Duration:</Text>
                <Text style={styles.detailText}>{formatDuration(item.duration)}</Text>
              </View>
            </View>

            <View key={generateUniqueKey('detail', item, 'login')} style={styles.detailRow}>
              <Ionicons name="log-in-outline" size={18} color="#4CAF50" />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Login Time:</Text>
                <Text style={styles.detailText}>{formatDate(item.loginTime)}</Text>
              </View>
            </View>

            {item.logoutTime && (
              <View key={generateUniqueKey('detail', item, 'logout')} style={styles.detailRow}>
                <Ionicons name="log-out-outline" size={18} color="#FF5722" />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Logout Time:</Text>
                  <Text style={styles.detailText}>{formatDate(item.logoutTime)}</Text>
                </View>
              </View>
            )}

            {item.deviceInfo && (
              <View key={generateUniqueKey('detail', item, 'device')} style={styles.detailRow}>
                <Ionicons name="hardware-chip-outline" size={18} color="#666" />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Device Info:</Text>
                  <Text style={styles.detailText}>{item.deviceInfo}</Text>
                </View>
              </View>
            )}

            {item.ipAddress && (
              <View key={generateUniqueKey('detail', item, 'ip')} style={styles.detailRow}>
                <Ionicons name="globe-outline" size={18} color="#666" />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>IP Address:</Text>
                  <Text style={styles.detailText}>{item.ipAddress}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleClearLogs = async () => {
    console.log('Clear logs button clicked');
    setShowConfirmModal(true);
  };

  const handleConfirmClear = async () => {
    try {
      console.log('Starting to clear logs...');
      setLoading(true);
      const result = await logAPI.clearLogs();
      console.log('Clear logs result:', result);
      setLogs([]);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 1500);
    } catch (error: any) {
      console.error('Error clearing logs:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Logs</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>User Sessions</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleClearLogs} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchLogs} style={styles.iconButton}>
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2eada6" style={styles.loader} />
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item, index) => generateUniqueKey('session', item, index.toString())}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <ConfirmationModal
          visible={showConfirmModal}
          title="Clear Log History"
          message="Are you sure you want to delete all logs? This action cannot be undone."
          onConfirm={handleConfirmClear}
          onCancel={() => setShowConfirmModal(false)}
        />

        <SuccessModal
          visible={showSuccessModal}
          message="Log history cleared successfully"
          duration={1500}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'right',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2eada6',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  logItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logHeader: {
    gap: 8,
  },
  logMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5e57',
  },
  userRole: {
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timestamp: {
    color: '#666',
    fontSize: 14,
  },
  expandedContent: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  detailText: {
    color: '#2b4f4c',
    fontSize: 14,
  },
  loader: {
    marginTop: 50,
  },
});

export default ViewLogs; 