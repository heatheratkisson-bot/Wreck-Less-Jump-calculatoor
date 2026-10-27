import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { useSubscription } from '../_layout';
import { BeginnerGuideProvider } from '@/lib/BeginnerGuideContext';

const TUTORIAL_STORAGE_KEY = 'wreckless_beginner_guide_seen_v1';

const TUTORIAL_STEPS = [
  {
    route: 'index',
    icon: 'calculator' as const,
    title: 'Set up your jump',
    description: 'Build a jump estimate from measured dimensions. Start with the ramp angle and gap, then check every input before reading the result.',
    drill: 'Try the camera or inclinometer tools, or enter dimensions by hand. Treat every result as an estimate, not a go / no-go call.',
  },
  {
    route: 'ride-better',
    icon: 'school' as const,
    title: 'Sharpen your skills',
    description: 'Find motocross skills, riding habits, and local riding information in one spot.',
    drill: 'Pick one skill to work on at a properly managed track. Progress at your pace, wear protective gear, and follow the track rules.',
  },
  {
    route: 'saved',
    icon: 'bookmark' as const,
    title: 'Save your sessions',
    description: 'Keep jump estimates you want to revisit and organize your riding notes.',
    drill: 'Save a calculation with a clear name. Add notes so you remember what was measured and when.',
  },
  {
    route: 'map',
    icon: 'map' as const,
    title: 'Explore shared spots',
    description: 'Browse locations shared by riders and review the details attached to each one.',
    drill: 'Use shared data as a starting point only. Conditions change—inspect the actual track and landing area yourself.',
  },
  {
    route: 'profile',
    icon: 'bicycle' as const,
    title: 'Set up your bike',
    description: 'Save your motocross bike and body weight so the calculator can fill them in for you.',
    drill: 'Choose the bike you ride and enter your weight. Double-check both values before each calculation.',
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
  const { width, height } = useWindowDimensions();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStorageError, setTutorialStorageError] = useState(false);
  const [tutorialCardLayout, setTutorialCardLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [completedTutorialSteps, setCompletedTutorialSteps] = useState<Set<string>>(
    () => new Set()
  );

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
    setCompletedTutorialSteps(new Set());
    setShowTutorial(true);
  };

  const currentTutorialStep = TUTORIAL_STEPS[tutorialStep];
  const guideTabIndex = TUTORIAL_STEPS.findIndex(
    (step) => step.route === currentTutorialStep.route
  );
  const tabCenterX = 4 + ((width - 8) * (guideTabIndex + 0.5)) / TUTORIAL_STEPS.length;
  const tabCenterY = height - insets.bottom - 40;
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
          <View pointerEvents="none" style={styles.tutorialScrim} />
          {tutorialCardLayout && (
            <Svg
              pointerEvents="none"
              width={width}
              height={height}
              style={styles.tutorialArrowOverlay}
            >
              <Path
                d={`M ${tutorialCardLayout.x + tutorialCardLayout.width / 2} ${tutorialCardLayout.y + tutorialCardLayout.height} C ${tutorialCardLayout.x + tutorialCardLayout.width / 2} ${tutorialCardLayout.y + tutorialCardLayout.height + 48}, ${tabCenterX} ${tabCenterY - 76}, ${tabCenterX} ${tabCenterY - 20}`}
                fill="none"
                stroke="#D4F66E"
                strokeWidth="3"
                strokeDasharray="7,6"
                strokeLinecap="round"
              />
              <Circle
                cx={tabCenterX}
                cy={tabCenterY}
                r="22"
                fill="none"
                stroke="#D4F66E"
                strokeWidth="2"
                opacity={0.55}
              />
              <Polygon
                points={`${tabCenterX},${tabCenterY - 5} ${tabCenterX - 8},${tabCenterY - 22} ${tabCenterX + 8},${tabCenterY - 22}`}
                fill="#D4F66E"
              />
            </Svg>
          )}
          <View
            pointerEvents="box-none"
            style={[styles.tutorialCenter, { paddingBottom: insets.bottom + 72 }]}
          >
            <View
              onLayout={({ nativeEvent }) =>
                setTutorialCardLayout({
                  ...nativeEvent.layout,
                  x: nativeEvent.layout.x + 12,
                })
              }
              style={styles.tutorialCard}
            >
            <View style={styles.tutorialMasthead}>
              <View style={styles.tutorialMastheadIcon}>
                <Ionicons name="trail-sign" size={16} color="#081116" />
              </View>
              <Text style={styles.tutorialMastheadText}>ROOKIE TO RIDE-READY</Text>
              <Text style={styles.tutorialStepCount}>
                {String(tutorialStep + 1).padStart(2, '0')} / {String(TUTORIAL_STEPS.length).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.tutorialProgressTrack}>
              {TUTORIAL_STEPS.map((step, index) => (
                <View
                  key={step.route}
                  style={[
                    styles.tutorialProgressSegment,
                    index <= tutorialStep && styles.tutorialProgressSegmentActive,
                    completedTutorialSteps.has(step.route) && styles.tutorialProgressSegmentDone,
                  ]}
                />
              ))}
            </View>
            <View style={styles.tutorialHeader}>
              <View style={styles.tutorialIcon}>
                <Ionicons name={currentTutorialStep.icon} size={23} color="#A6D608" />
              </View>
              <View style={styles.tutorialHeading}>
                <Text style={styles.tutorialTitle}>{currentTutorialStep.title}</Text>
                <Text style={styles.tutorialSubtitle}>
                  {routeLabelMap[currentTutorialStep.route]} · RIDER STARTER GUIDE
                </Text>
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
            <View style={styles.tutorialDrill}>
              <View style={styles.tutorialDrillHeader}>
                <Ionicons name="flash" size={15} color="#A6D608" />
                <Text style={styles.tutorialDrillLabel}>YOUR RIDER MOVE</Text>
              </View>
              <Text style={styles.tutorialDrillText}>{currentTutorialStep.drill}</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: completedTutorialSteps.has(currentTutorialStep.route),
                }}
                accessibilityLabel={`Mark ${currentTutorialStep.title} guide step ${
                  completedTutorialSteps.has(currentTutorialStep.route) ? 'incomplete' : 'complete'
                }`}
                onPress={() => {
                  setCompletedTutorialSteps((previous) => {
                    const updated = new Set(previous);
                    if (updated.has(currentTutorialStep.route)) {
                      updated.delete(currentTutorialStep.route);
                    } else {
                      updated.add(currentTutorialStep.route);
                    }
                    return updated;
                  });
                }}
                style={[
                  styles.tutorialDoneButton,
                  completedTutorialSteps.has(currentTutorialStep.route) &&
                    styles.tutorialDoneButtonComplete,
                ]}
              >
                <Ionicons
                  name={
                    completedTutorialSteps.has(currentTutorialStep.route)
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={18}
                  color={
                    completedTutorialSteps.has(currentTutorialStep.route)
                      ? '#A6D608'
                      : '#C2D0CE'
                  }
                />
                <Text style={styles.tutorialDoneText}>
                  {completedTutorialSteps.has(currentTutorialStep.route)
                    ? 'STEP COMPLETE'
                    : 'MARK STEP COMPLETE'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.tutorialPointerText}>
              Tap the glowing tab to jump straight to this part of the app.
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
                  <Ionicons name="arrow-back" size={16} color="#F5FAF8" />
                  <Text style={styles.tutorialSecondaryText}>Back</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void finishTutorial()}
                  style={styles.tutorialSecondaryButton}
                >
                  <Text style={styles.tutorialSecondaryText}>Skip guide</Text>
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
                  {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next trail stop' : 'Finish guide'}
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
  tutorialScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 10, 13, 0.58)',
  },
  tutorialArrowOverlay: {
    ...StyleSheet.absoluteFill,
  },
  tutorialCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tutorialCard: {
    width: '100%',
    maxWidth: 420,
    padding: 18,
    borderWidth: 1,
    borderColor: '#A6D608',
    borderRadius: 22,
    backgroundColor: '#102027',
    shadowColor: '#000000',
    shadowOpacity: 0.48,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  tutorialMasthead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tutorialMastheadIcon: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#A6D608',
  },
  tutorialMastheadText: {
    flex: 1,
    color: '#D4F66E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  tutorialStepCount: {
    color: '#F5FAF8',
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  tutorialProgressTrack: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 14,
  },
  tutorialProgressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#35515A',
  },
  tutorialProgressSegmentActive: {
    backgroundColor: '#55741B',
  },
  tutorialProgressSegmentDone: {
    backgroundColor: '#A6D608',
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tutorialIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(166, 214, 8, 0.45)',
    backgroundColor: 'rgba(166, 214, 8, 0.12)',
  },
  tutorialHeading: {
    flex: 1,
  },
  tutorialSubtitle: {
    marginTop: 4,
    color: '#A6D608',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  tutorialCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#28434B',
  },
  tutorialTitle: {
    color: '#F5FAF8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  tutorialDescription: {
    marginTop: 14,
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  tutorialDrill: {
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 14,
    backgroundColor: '#172B32',
  },
  tutorialDrillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tutorialDrillLabel: {
    color: '#D4F66E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tutorialDrillText: {
    marginTop: 7,
    color: '#E4EEEB',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  tutorialDoneButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#49636A',
    borderRadius: 10,
    backgroundColor: '#102027',
  },
  tutorialDoneButtonComplete: {
    borderColor: '#A6D608',
    backgroundColor: 'rgba(166, 214, 8, 0.1)',
  },
  tutorialDoneText: {
    color: '#F5FAF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  tutorialPointerText: {
    marginTop: 10,
    color: '#D4F66E',
    fontSize: 11,
    fontWeight: '800',
  },
  tutorialActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 15,
  },
  tutorialSecondaryButton: {
    minWidth: 84,
    minHeight: 46,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#28434B',
  },
  tutorialSecondaryText: {
    color: '#F5FAF8',
    fontSize: 13,
    fontWeight: '800',
  },
  tutorialPrimaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: APP_THEME.accent,
  },
  tutorialPrimaryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
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
