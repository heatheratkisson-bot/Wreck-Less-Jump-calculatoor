import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../_layout';

const RED_BULL_THEME = {
  accent: '#FF6B35',
  accentSoft: '#FF9A5C',
  tabBar: '#171717',
  tabBarBorder: '#2A2A2A',
  inactive: '#8E8E93',
  text: '#FFFFFF',
  panel: '#1E1E1E',
};

const HONDA_THEME = {
  accent: '#F59E0B',
  accentSoft: '#FBBF24',
  tabBar: '#171717',
  tabBarBorder: '#2A2A2A',
  inactive: '#8E8E93',
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
  const activeTheme = getThemeForRoute(activeRouteName);

  return (
    <View style={styles.tabBarContainer}>
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: activeTheme.tabBar,
            borderColor: activeTheme.tabBarBorder,
            paddingBottom: insets.bottom + 12,
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
                  shadowColor: routeTheme.accent,
                  shadowOpacity: 0.28,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
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
    </View>
  );
}

export default function TabLayout() {
  const { isTrial, trialInfo } = useSubscription();

  return (
    <View style={styles.screenWrapper}>
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
  screenWrapper: {
    flex: 1,
    backgroundColor: '#121212',
  },
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
    zIndex: 20,
  },
  trialBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 6,
    zIndex: 10,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 10,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 78,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 18,
    minHeight: 56,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
