import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdminDrawerParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type NavigationProp = DrawerNavigationProp<AdminDrawerParamList>;

const AdminScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Welcome to the Admin Dashboard</Text>
        <Text style={styles.instructionText}>Use the menu to navigate between different admin functions.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  headerContainer: {
    backgroundColor: colors.admin.primary.main,
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
    color: colors.text.inverse,
    textAlign: 'right',
  },
  contentContainer: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.admin.primary.main,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});

export default AdminScreen; 