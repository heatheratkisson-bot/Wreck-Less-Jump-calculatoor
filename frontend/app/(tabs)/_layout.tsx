import React, { useCallback, useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { useSubscription } from '../_layout';
import { BeginnerGuideProvider } from '@/lib/BeginnerGuideContext';

const TUTORIAL_STORAGE_KEY = 'wreckless_beginner_guide_seen_v1';

const TUTORIAL_STEPS = [
  {
    route: 'index',
    icon: 'calculator' as const,
    title: 'Dial in a jump',
    description:
      'Plug in the ramp angle, gap, and bike setup for a rough speed estimate. Compare setups here, then take your numbers to a coach who knows your track.',
    target: { x: 0.52, y: 0.38 },
  },
  {
    route: 'ride-better',
    icon: 'school' as const,
    title: 'Build your skills',
    description:
      'Cornering, ruts, starts, and more: pick one skill, grab a few cues, then put the work in on the track.',
    target: { x: 0.5, y: 0.21 },
  },
  {
    route: 'saved',
    icon: 'bookmark' as const,
    title: 'Keep your jump log',
    description:
      'Keep jump estimates and setup notes together. Log what changed between runs and see which setup gets you closer.',
    target: { x: 0.5, y: 0.44 },
  },
  {
    route: 'map',
    icon: 'map' as const,
    title: 'Scout the spot',
    description:
      'Browse rider-shared spots, compare notes, and add your own track intel for the crew.',
    target: { x: 0.5, y: 0.35 },
  },
  {
    route: 'profile',
    icon: 'bicycle' as const,
    title: 'Set up your bike',
    description:
      'Save your bike and rider weight once. Your setup will be ready when you crunch the next jump estimate.',
    target: { x: 0.5, y: 0.42 },
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

type CustomTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigateToTab: (routeKey: string) => void;
  guideStep: (typeof TUTORIAL_STEPS)[number];
  showTutorial: boolean;
  onSelectGuideRoute: (routeName: string) => void;
};

function CustomTabBar({
  state,
  navigateToTab,
  guideStep,
  showTutorial,
  onSelectGuideRoute,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;

  useEffect(() => {
    if (showTutorial && guideStep && currentRoute !== guideStep.route) {
      const targetRoute = state.routes.find((route) => route.name === guideStep.route);
      if (targetRoute) {
        navigateToTab(targetRoute.key);
      }
    }
  }, [currentRoute, guideStep, navigateToTab, showTutorial, state.routes]);

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
      {state.routes.filter((route) => route.name !== 'measure').map((route) => {
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
              navigateToTab(route.key);
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
  const [fontsLoaded, fontError] = useFonts({
    TekoBold: require('../../assets/fonts/Teko-Bold.ttf'),
  });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStorageError, setTutorialStorageError] = useState(false);
  const [tutorialCardLayout, setTutorialCardLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [measuredGuideTarget, setMeasuredGuideTarget] = useState<{
    routeName: string;
    x: number;
    y: number;
  } | null>(null);

  const reportGuideTarget = useCallback((target: {
    routeName: string;
    x: number;
    y: number;
  }) => {
    setMeasuredGuideTarget(target);
  }, []);

  useEffect(() => {
    if (fontError) {
      console.error('Could not load the beginner guide font:', fontError);
    }
  }, [fontError]);

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
  const activeGuideTarget =
    measuredGuideTarget?.routeName === currentTutorialStep.route
      ? measuredGuideTarget
      : null;
  const targetX = activeGuideTarget?.x ?? width * currentTutorialStep.target.x;
  const targetY = activeGuideTarget?.y ?? height * currentTutorialStep.target.y;
  const isTargetBelowCard = targetY > height / 2;
  const tutorialPlacement = isTargetBelowCard
    ? { justifyContent: 'flex-start' as const, paddingTop: insets.top + 24 }
    : { justifyContent: 'flex-end' as const, paddingBottom: insets.bottom + 100 };
  const arrowStartX = tutorialCardLayout
    ? tutorialCardLayout.x + tutorialCardLayout.width / 2
    : targetX;
  const arrowStartY = tutorialCardLayout
    ? tutorialCardLayout.y + (isTargetBelowCard ? tutorialCardLayout.height : 0)
    : targetY;
  const arrowDx = targetX - arrowStartX;
  const arrowDy = targetY - arrowStartY;
  const arrowLength = Math.hypot(arrowDx, arrowDy) || 1;
  const arrowUnitX = arrowDx / arrowLength;
  const arrowUnitY = arrowDy / arrowLength;
  const arrowHeadBaseX = targetX - arrowUnitX * 14;
  const arrowHeadBaseY = targetY - arrowUnitY * 14;
  const arrowHeadSideX = -arrowUnitY * 7;
  const arrowHeadSideY = arrowUnitX * 7;
  const arrowCurveY = arrowStartY + (targetY > arrowStartY ? 38 : -38);
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

      <BeginnerGuideProvider value={{ startBeginnerGuide, reportGuideTarget }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            lazy: true,
            sceneStyle: { backgroundColor: '#081116' },
            tabBarStyle: { display: 'none' },
            tabBarShowLabel: false,
          }}
          tabBar={(props) => {
            if (props.state.routes[props.state.index]?.name === 'settings') {
              return null;
            }
            return (
              <CustomTabBar
                {...props}
                guideStep={currentTutorialStep}
                showTutorial={showTutorial}
                onSelectGuideRoute={selectTutorialRoute}
              />
            );
          }}
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
          <Tabs.Screen
            name="settings"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </BeginnerGuideProvider>

      {showTutorial && (
        <View pointerEvents="box-none" style={styles.tutorialOverlay}>
          <View pointerEvents="auto" style={styles.tutorialTouchGuard} />
          <Svg pointerEvents="none" width={width} height={height} style={styles.tutorialArrowOverlay}>
            <Path
              d={`M ${arrowStartX} ${arrowStartY} Q ${(arrowStartX + targetX) / 2} ${arrowCurveY} ${arrowHeadBaseX} ${arrowHeadBaseY}`}
              fill="none"
              stroke="#D4F66E"
              strokeWidth="3"
              strokeDasharray="7,6"
              strokeLinecap="round"
            />
            <Circle
              cx={targetX}
              cy={targetY}
              r="22"
              fill="rgba(166, 214, 8, 0.12)"
              stroke="#D4F66E"
              strokeWidth="2"
            />
            <Polygon
              points={`${targetX},${targetY} ${arrowHeadBaseX + arrowHeadSideX},${arrowHeadBaseY + arrowHeadSideY} ${arrowHeadBaseX - arrowHeadSideX},${arrowHeadBaseY - arrowHeadSideY}`}
              fill="#D4F66E"
            />
          </Svg>
          <View
            pointerEvents="box-none"
            style={[styles.tutorialCenter, tutorialPlacement]}
          >
            <ScrollView
              key={tutorialStep}
              style={[
                styles.tutorialCard,
                { maxHeight: height - insets.top - insets.bottom - 96 },
              ]}
              contentContainerStyle={styles.tutorialCardContent}
              showsVerticalScrollIndicator={false}
              onLayout={({ nativeEvent }) => setTutorialCardLayout(nativeEvent.layout)}
            >
              <View style={styles.tutorialMasthead}>
                <Text style={[styles.tutorialMastheadText, fontsLoaded && styles.tutorialMotoFont]}>
                  TRACK GUIDE
                </Text>
                <Text style={[styles.tutorialStepCount, fontsLoaded && styles.tutorialMotoFont]}>
                  {tutorialStep + 1} of {TUTORIAL_STEPS.length}
                </Text>
              </View>
              <View style={styles.tutorialProgressTrack}>
                {TUTORIAL_STEPS.map((step, index) => (
                  <View
                    key={step.route}
                    style={[
                      styles.tutorialProgressSegment,
                      index <= tutorialStep && styles.tutorialProgressSegmentActive,
                    ]}
                  />
                ))}
              </View>
              <View style={styles.tutorialHeader}>
                <View style={styles.tutorialIcon}>
                  <Ionicons name={currentTutorialStep.icon} size={23} color="#A6D608" />
                </View>
                <View style={styles.tutorialHeading}>
                  <Text
                    style={[
                      styles.tutorialTitle,
                      fontsLoaded && styles.tutorialMotoFont,
                    ]}
                  >
                    {currentTutorialStep.title}
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
              <Text
                style={[
                  styles.tutorialDescription,
                  fontsLoaded && styles.tutorialMotoFont,
                ]}
              >
                {currentTutorialStep.description}
              </Text>

              {tutorialStorageError && (
                <Text
                  style={[
                    styles.tutorialError,
                    fontsLoaded && styles.tutorialMotoFont,
                  ]}
                >
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
                    <Text
                      style={[
                        styles.tutorialSecondaryText,
                        fontsLoaded && styles.tutorialMotoFont,
                      ]}
                    >
                      Back
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void finishTutorial()}
                    style={styles.tutorialSecondaryButton}
                  >
                    <Text
                      style={[
                        styles.tutorialSecondaryText,
                        fontsLoaded && styles.tutorialMotoFont,
                      ]}
                    >
                      Skip
                    </Text>
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
                  <Text
                    style={[
                      styles.tutorialPrimaryText,
                      fontsLoaded && styles.tutorialMotoFont,
                    ]}
                  >
                    {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Finish'}
                  </Text>
                  <Ionicons
                    name={tutorialStep < TUTORIAL_STEPS.length - 1 ? 'arrow-forward' : 'checkmark'}
                    size={18}
                    color="#000000"
                  />
                </Pressable>
              </View>
            </ScrollView>
            {tutorialStorageError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowTutorial(false)}
                style={styles.tutorialCloseAnyway}
              >
                <Text
                  style={[
                    styles.tutorialSecondaryText,
                    fontsLoaded && styles.tutorialMotoFont,
                  ]}
                >
                  Close guide anyway
                </Text>
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
  tutorialTouchGuard: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  tutorialArrowOverlay: {
    ...StyleSheet.absoluteFill,
  },
  tutorialCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  tutorialCard: {
    width: '100%',
    maxWidth: 560,
    flexGrow: 0,
    borderWidth: 1,
    borderColor: '#A6D608',
    borderRadius: 32,
    backgroundColor: '#102027',
    shadowColor: '#000000',
    shadowOpacity: 0.48,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  tutorialCardContent: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
  },
  tutorialMasthead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialMastheadText: {
    flex: 1,
    color: '#A6D608',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
  },
  tutorialStepCount: {
    color: '#C2D0CE',
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tutorialProgressTrack: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },
  tutorialProgressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 3,
    backgroundColor: '#35515A',
  },
  tutorialProgressSegmentActive: {
    backgroundColor: '#A6D608',
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  tutorialIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(166, 214, 8, 0.45)',
    backgroundColor: 'rgba(166, 214, 8, 0.12)',
  },
  tutorialHeading: {
    flex: 1,
  },
  tutorialCloseButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#28434B',
  },
  tutorialTitle: {
    color: '#F5FAF8',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 0,
  },
  tutorialDescription: {
    marginTop: 18,
    color: '#E4EEEB',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  tutorialActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    marginTop: 20,
  },
  tutorialSecondaryButton: {
    minWidth: 120,
    minHeight: 74,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#28434B',
  },
  tutorialSecondaryText: {
    color: '#F5FAF8',
    fontSize: 28,
    fontWeight: '800',
  },
  tutorialPrimaryButton: {
    flex: 1,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: APP_THEME.accent,
  },
  tutorialPrimaryText: {
    color: '#000000',
    fontSize: 29,
    fontWeight: '900',
  },
  tutorialError: {
    marginTop: 14,
    color: '#FF7A86',
    fontSize: 18,
    lineHeight: 24,
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
  tutorialMotoFont: {
    fontFamily: 'TekoBold',
  },
});
