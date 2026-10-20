import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../_layout';

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

const routeLabelMap: Record<string, string> = {
  index: 'Calculator',
  measure: 'Measure',
  saved: 'Saved',
  map: 'Map',
  profile: 'Profile',
};

const routeIconMap: Record<string, string> = {
  index: 'calculator',
  measure: 'camera',
  saved: 'bookmark',
  map: 'map',
  profile: 'person',
};

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name ?? 'index';

  return (
    <View
      style={[
        styles.tabRail,
        {
          backgroundColor: getThemeForRoute(activeRouteName).tabBar,
          borderRightColor: getThemeForRoute(activeRouteName).tabBarBorder,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const routeTheme = getThemeForRoute(route.name);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            onPress={() => navigation.navigate(route.name)}
            style={[
              styles.tabButton,
              isFocused && {
                backgroundColor: routeTheme.accent,
              },
            ]}
          >
            <Ionicons
              name={routeIconMap[route.name] ?? 'ellipse'}
              size={20}
              color={isFocused ? '#fff' : routeTheme.inactive}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? '#fff' : routeTheme.inactive },
              ]}
            >
              {routeLabelMap[route.name] ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isTrial, trialInfo } = useSubscription();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
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
        screenOptions={{
          headerShown: false,
          lazy: true,
          tabBarStyle: { display: 'none' },
          tabBarShowLabel: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Calculator',
          }}
        />
        <Tabs.Screen
          name="measure"
          options={{
            title: 'Measure',
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved',
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E10600',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  trialBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabRail: {
    width: 104,
    borderRightWidth: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
