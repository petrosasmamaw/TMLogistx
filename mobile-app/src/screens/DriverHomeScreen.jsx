import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useTranslation } from '../i18n';
import DriverAssignedScreen from './DriverAssignedScreen';
import DriverActiveTripScreen from './DriverActiveTripScreen';
import DriverHistoryScreen from './DriverHistoryScreen';
import DriverFuelScreen from './DriverFuelScreen';
import DriverAccidentScreen from './DriverAccidentScreen';
import TabBarIcon from '../components/TabBarIcon';
import AppFooter from '../components/AppFooter';
import AccountScreen from './AccountScreen';

export const DriverHomeScreen = ({ openProfileSignal = 0 }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('STEPPER'); // 'ASSIGNED', 'STEPPER', 'FUEL', 'INCIDENT', 'STATS'

  useEffect(() => {
    if (openProfileSignal > 0) setActiveTab('ACCOUNT');
  }, [openProfileSignal]);

  return (
    <View style={styles.container}>
      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'ASSIGNED' && (
          <DriverAssignedScreen onNavigateToActive={() => setActiveTab('STEPPER')} />
        )}
        {activeTab === 'STEPPER' && (
          <DriverActiveTripScreen onNavigateToAssigned={() => setActiveTab('ASSIGNED')} />
        )}
        {activeTab === 'FUEL' && (
          <DriverFuelScreen onBack={() => setActiveTab('STEPPER')} />
        )}
        {activeTab === 'INCIDENT' && (
          <DriverAccidentScreen onBack={() => setActiveTab('STEPPER')} onComplete={() => setActiveTab('STEPPER')} />
        )}
        {activeTab === 'STATS' && (
          <DriverHistoryScreen />
        )}
        {activeTab === 'ACCOUNT' && <AccountScreen />}
      </View>

      <AppFooter />

      <View style={styles.bottomNav}>
        {/* Tab 1: Assigned Trips */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'ASSIGNED' && styles.navItemActive]}
          onPress={() => setActiveTab('ASSIGNED')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'ASSIGNED' ? 'mail' : 'mail-outline'} focused={activeTab === 'ASSIGNED'} size={20} />
          <Text style={[styles.navLabel, activeTab === 'ASSIGNED' && styles.navLabelActive]}>
            Trips
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Trip Stepper Workflow */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'STEPPER' && styles.navItemActive]}
          onPress={() => setActiveTab('STEPPER')}
          activeOpacity={0.8}
        >
          <View style={styles.pulseContainer}>
            <TabBarIcon name={activeTab === 'STEPPER' ? 'navigate' : 'navigate-outline'} focused={activeTab === 'STEPPER'} size={20} />
            {activeTab === 'STEPPER' ? <View style={styles.activeDot} /> : null}
          </View>
          <Text style={[styles.navLabel, activeTab === 'STEPPER' && styles.navLabelActive]}>
            Active
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Fuel Logging */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'FUEL' && styles.navItemActive]}
          onPress={() => setActiveTab('FUEL')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'FUEL' ? 'water' : 'water-outline'} focused={activeTab === 'FUEL'} size={20} />
          <Text style={[styles.navLabel, activeTab === 'FUEL' && styles.navLabelActive]}>
            Fuel
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Accident Report */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'INCIDENT' && styles.navItemActive]}
          onPress={() => setActiveTab('INCIDENT')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'INCIDENT' ? 'warning' : 'warning-outline'} focused={activeTab === 'INCIDENT'} size={20} />
          <Text style={[styles.navLabel, activeTab === 'INCIDENT' && styles.navLabelActive]}>
            Accident
          </Text>
        </TouchableOpacity>

        {/* Tab 5: Performance & Stats */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'STATS' && styles.navItemActive]}
          onPress={() => setActiveTab('STATS')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'STATS' ? 'stats-chart' : 'stats-chart-outline'} focused={activeTab === 'STATS'} size={20} />
          <Text style={[styles.navLabel, activeTab === 'STATS' && styles.navLabelActive]}>
            Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'ACCOUNT' && styles.navItemActive]}
          onPress={() => setActiveTab('ACCOUNT')}
          activeOpacity={0.8}
        >
          <TabBarIcon name={activeTab === 'ACCOUNT' ? 'person' : 'person-outline'} focused={activeTab === 'ACCOUNT'} size={20} />
          <Text style={[styles.navLabel, activeTab === 'ACCOUNT' && styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    paddingVertical: 8,
    paddingBottom: 22,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
  navItemActive: {},
  navLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  pulseContainer: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

export default DriverHomeScreen;
