import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../_layout';
import { BeginnerGuideProvider } from '@/lib/BeginnerGuideContext';

const TUTORIAL_STORAGE_KEY = 'wreckless_beginner_guide_seen_v1';

const TUTORIAL_STEPS = [
  {
    route: 'index',
    icon: 'calculator' as const,
    title: 'How Fast',
    description:
      'This is where you scan your jump with your camera and set your phone on the lip to measure its angle! Or you can type in the dimensions yourself if you prefer.',
  },
  {
    route: 'ride-better',
    icon: 'school' as const,
    title: 'Ride Better',
    description:
      'Even if it\'s only one, we created this page hoping to prevent devastating wrecks. You can find your local motorcycle laws, tips, and reminders of riding habits that might save your life or your motorcycle. Along with a skills index for learning new skills and techniques.',
  },
  {
    route: 'saved',
    icon: 'bookmark' as const,
    title: 'My Jumps',
    description:
      'This is your jump map. Save jumps that you might want to go back to later. You can also choose to share those jumps with all other Wreck-Less riders or challenge your friends by sending them your jump share code.',
  },
  {
    route: 'map',
    icon: 'map' as const,
    title: 'Nearby Jumps',
    description:
      'This is where you can find all the jumps that Wreck-Less riders have shared and save time by using their calculation data to skip the measuring.',
  },
  {
    route: 'profile',
    icon: 'bicycle' as const,
    title: 'My Bike',
    description:
      'Save your body weight and your exact motorcycle to be automatically factored into the calculation.',
  },
];

const APP_THEME = {
  accent: '#A6D608',
  accentSoft: '#A6D608',
  tabBar: '#0F2026',
  tabBarBorder: '#35515A',
  inactive: '#C2D0CE',
  text: '#F5FAF8',
  panel: '#1B3038',
};

const routeLabelMap: Record<string, string> = {
  index: 'How Fast',
  'ride-better': 'Ride Better',
  saved: 'My Jumps',
  map: 'Nearby Jumps',
  profile: 'My Bike',
};

const routeIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'calculator',
  'ride-better': 'school',
  saved: 'bookmark',
  map: 'map',
  profile: 'person',
};

function CustomTabBar({
  state,
  navigation,
  guideStep,
  showTutorial,
  onSelectGuideRoute,
}: any) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;

  useEffect(() => {
    if (showTutorial && guideStep && currentRoute !== guideStep.route) {
      navigation.navigate(guideStep.route);
    }
  }, [currentRoute, guideStep, navigation, showTutorial]);

  return (
    <View
      style={[
        styles.tabRail,
        {
          backgroundColor: APP_THEME.tabBar,
          borderTopColor: APP_THEME.tabBarBorder,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {state.routes.filter((route: any) => route.name !== 'measure').map((route: any) => {
        const isFocused = state.routes[state.index]?.key === route.key;
        const isGuideTarget = showTutorial && guideStep?.route === route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={routeLabelMap[route.name] ?? route.name}
            accessibilityState={{ selected: isFocused }}
            accessibilityHint={isGuideTarget ? 'Highlighted by the beginner guide' : undefined}
            onPress={() => {
              navigation.navigate(route.name);
              if (showTutorial) {
                onSelectGuideRoute(route.name);
              }
            }}
            style={[
              styles.tabButton,
              isFocused && {
                backgroundColor: APP_THEME.accent,
              },
              isGuideTarget && styles.guideTabButton,
            ]}
          >
            {isGuideTarget && (
              <Ionicons
                name="arrow-up"
                size={13}
                color={isFocused ? '#000000' : APP_THEME.accent}
              />
            )}
            <Ionicons
              name={routeIconMap[route.name] ?? 'ellipse'}
              size={20}
              color={isFocused ? '#000000' : APP_THEME.inactive}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? '#000000' : APP_THEME.inactive },
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
  const insets = useSafeAreaInsets();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStorageError, setTutorialStorageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY)
      .then((hasSeenTutorial) => {
        if (isMounted && hasSeenTutorial !== 'true') {
          setShowTutorial(true);
        }
      })
      .catch((error: unknown) => {
        console.error('Could not read beginner guide preference:', error);
        if (isMounted) {
          setShowTutorial(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const finishTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setShowTutorial(false);
      setTutorialStorageError(false);
    } catch (error) {
      console.error('Could not save beginner guide preference:', error);
      setTutorialStorageError(true);
    }
  };

  const startBeginnerGuide = () => {
    setTutorialStep(0);
    setTutorialStorageError(false);
    setShowTutorial(true);
  };

  const currentTutorialStep = TUTORIAL_STEPS[tutorialStep];
  const selectTutorialRoute = (routeName: string) => {
    const matchingStep = TUTORIAL_STEPS.findIndex((step) => step.route === routeName);
    if (matchingStep >= 0) {
      setTutorialStep(matchingStep);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Trial Banner */}
      {isTrial && trialInfo && (
        <View style={styles.trialBanner}>
          <Ionicons name="time" size={16} color="#000000" />
          <Text style={styles.trialBannerText}>
            Free Trial: {trialInfo.trial_days_remaining?.toFixed(1)} days remaining
          </Text>
        </View>
      )}

      <BeginnerGuideProvider value={{ startBeginnerGuide }}>
        <Tabs
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            lazy: true,
            sceneStyle: { backgroundColor: '#081116' },
            tabBarStyle: { display: 'none' },
            tabBarShowLabel: false,
          }}
          tabBar={(props) => (
            <CustomTabBar
              {...props}
              guideStep={currentTutorialStep}
              showTutorial={showTutorial}
              onSelectGuideRoute={selectTutorialRoute}
            />
          )}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'How Fast',
            }}
          />
          <Tabs.Screen
            name="ride-better"
            options={{
              title: 'Ride Better',
            }}
          />
          <Tabs.Screen
            name="measure"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="saved"
            options={{
              title: 'My Jumps',
            }}
          />
          <Tabs.Screen
            name="map"
            options={{
              title: 'Nearby Jumps',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'My Bike',
            }}
          />
        </Tabs>
      </BeginnerGuideProvider>

      {showTutorial && (
        <View pointerEvents="box-none" style={styles.tutorialOverlay}>
          <View style={[styles.tutorialCard, { bottom: insets.bottom + 84 }]}>
            <View style={styles.tutorialHeader}>
              <View style={styles.tutorialIcon}>
                <Ionicons name={currentTutorialStep.icon} size={23} color="#A6D608" />
              </View>
              <View style={styles.tutorialHeading}>
                <Text style={styles.tutorialEyebrow}>
                  BEGINNER GUIDE · {tutorialStep + 1} OF {TUTORIAL_STEPS.length}
                </Text>
                <Text style={styles.tutorialTitle}>{currentTutorialStep.title}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close beginner guide"
                onPress={() => void finishTutorial()}
                style={styles.tutorialCloseButton}
              >
                <Ionicons name="close" size={20} color="#CED9D6" />
              </Pressable>
            </View>
            <Text style={styles.tutorialDescription}>{currentTutorialStep.description}</Text>
            <Text style={styles.tutorialPointerText}>
              The highlighted tab below is where you’ll find this feature.
            </Text>

            {tutorialStorageError && (
              <Text style={styles.tutorialError}>
                Your guide preference could not be saved. It may appear again next time.
              </Text>
            )}

            <View style={styles.tutorialActions}>
              {tutorialStep > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTutorialStep((step) => step - 1)}
                  style={styles.tutorialSecondaryButton}
                >
                  <Text style={styles.tutorialSecondaryText}>Back</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void finishTutorial()}
                  style={styles.tutorialSecondaryButton}
                >
                  <Text style={styles.tutorialSecondaryText}>Skip</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (tutorialStep < TUTORIAL_STEPS.length - 1) {
                    setTutorialStep((step) => step + 1);
                  } else {
                    void finishTutorial();
                  }
                }}
                style={styles.tutorialPrimaryButton}
              >
                <Text style={styles.tutorialPrimaryText}>
                  {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next tab' : 'Finish'}
                </Text>
                <Ionicons
                  name={tutorialStep < TUTORIAL_STEPS.length - 1 ? 'arrow-forward' : 'checkmark'}
                  size={18}
                  color="#000000"
                />
              </Pressable>
            </View>
            {tutorialStorageError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowTutorial(false)}
                style={styles.tutorialCloseAnyway}
              >
                <Text style={styles.tutorialSecondaryText}>Close guide anyway</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#A6D608',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  trialBannerText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  tabRail: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  tutorialCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    maxWidth: 420,
    padding: 16,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 18,
    backgroundColor: '#14262D',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tutorialIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(166, 214, 8, 0.14)',
  },
  tutorialHeading: {
    flex: 1,
  },
  tutorialCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#28434B',
  },
  tutorialEyebrow: {
    color: '#A6D608',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tutorialTitle: {
    marginTop: 3,
    color: '#F5FAF8',
    fontSize: 19,
    fontWeight: '700',
  },
  tutorialDescription: {
    marginTop: 12,
    color: '#CED9D6',
    fontSize: 14,
    lineHeight: 20,
  },
  tutorialPointerText: {
    marginTop: 9,
    color: '#A6D608',
    fontSize: 12,
    fontWeight: '600',
  },
  tutorialActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  tutorialSecondaryButton: {
    minWidth: 72,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#28434B',
  },
  tutorialSecondaryText: {
    color: '#CED9D6',
    fontSize: 14,
    fontWeight: '600',
  },
  tutorialPrimaryButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: APP_THEME.accent,
  },
  tutorialPrimaryText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  tutorialError: {
    marginTop: 10,
    color: '#FF7A86',
    fontSize: 13,
    lineHeight: 18,
  },
  guideTabButton: {
    borderWidth: 2,
    borderColor: '#F5FAF8',
    paddingTop: 1,
  },
  tutorialCloseAnyway: {
    alignSelf: 'center',
    paddingTop: 12,
  },
});
