import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet, type ColorValue } from 'react-native';
import { useSubscription } from '../_layout';

// Tab bar icon components defined outside of render
type TabIconProps = { color: ColorValue; size: number };

const CalculatorIcon = ({ color, size }: TabIconProps) => (
  <Ionicons name="calculator" size={size} color={color} />
);

const MeasureIcon = ({ color, size }: TabIconProps) => (
  <Ionicons name="camera" size={size} color={color} />
);

const SavedIcon = ({ color, size }: TabIconProps) => (
  <Ionicons name="bookmark" size={size} color={color} />
);

const MapIcon = ({ color, size }: TabIconProps) => (
  <Ionicons name="map" size={size} color={color} />
);

const ProfileIcon = ({ color, size }: TabIconProps) => (
  <Ionicons name="person" size={size} color={color} />
);

const RED_BULL_THEME = {
  accent: '#E10600',
  accentSoft: '#FF4D3A',
  tabBar: '#151515',
  tabBarBorder: '#2B2B2B',
  inactive: '#9AA0A6',
  text: '#FFFFFF',
  panel: '#1E1E1E',
};

const HONDA_THEME = {
  accent: '#F97316',
  accentSoft: '#FB923C',
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  inactive: '#94A3B8',
  text: '#F8FAFC',
  panel: '#111827',
};

const getThemeForRoute = (routeName: string) =>
  routeName === 'map' || routeName === 'profile' ? HONDA_THEME : RED_BULL_THEME;

export default function TabLayout() {
  const { isTrial, trialInfo } = useSubscription();

  return (
    <View style={{ flex: 1 }}>
      {/* Trial Banner */}
      {isTrial && trialInfo && (
        <View style={styles.trialBanner}>
          <Ionicons name="time" size={16} color="#fff" />
          <Text style={styles.trialBannerText}>
            Free Trial: {trialInfo.trial_days_remaining?.toFixed(1)} days remaining
          </Text>
        </View>
      )}

      <Tabs
        initialRouteName="index"
        screenOptions={({ route }) => {
          const theme = getThemeForRoute(route.name);

          return {
            headerShown: false,
            lazy: true,
            tabBarStyle: {
              backgroundColor: theme.tabBar,
              borderTopColor: theme.tabBarBorder,
              borderTopWidth: 1,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 85 : 65,
            },
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.inactive,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            tabBarIconStyle: {
              marginTop: 4,
            },
          };
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Calculator',
            tabBarIcon: CalculatorIcon,
          }}
        />
        <Tabs.Screen
          name="measure"
          options={{
            title: 'Measure',
            tabBarIcon: MeasureIcon,
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved',
            tabBarIcon: SavedIcon,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: MapIcon,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ProfileIcon,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    backgroundColor: '#E10600',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  trialBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
