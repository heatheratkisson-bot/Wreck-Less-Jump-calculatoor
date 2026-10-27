import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StartupScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compactLayout = height < 700;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.topGlow} />
      <View style={[styles.content, compactLayout && styles.compactContent]}>
        <View style={styles.sloganBlock}>
          <Text style={styles.eyebrow}>WRECK-LESS JUMP CALCULATOR</Text>
          <Text accessibilityRole="header" style={styles.slogan}>
            BE SAFER.
            {'\n'}RIDE BETTER.
            {'\n'}
            <Text style={styles.sloganAccent}>WRECK LESS.</Text>
          </Text>
          <Text style={styles.tagline}>Know the numbers. Ride within your limits.</Text>
        </View>

        <View style={[styles.logoFrame, { width: Math.min(width - 32, 560) }]}>
          <Image
            source={require('../assets/images/wreckless-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Wreck-Less dirt bike jump calculator logo"
          />
        </View>

        <View style={styles.bottomBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Let's ride, open the app"
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.rideButton, pressed && styles.rideButtonPressed]}
          >
            <Text style={styles.rideButtonText}>LET’S RIDE</Text>
            <Ionicons name="arrow-forward" size={20} color="#081116" />
          </Pressable>
          <Text style={styles.footerNote}>Ride smart. Ride in control.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081116',
  },
  topGlow: {
    position: 'absolute',
    top: -180,
    left: '10%',
    width: '80%',
    height: 360,
    borderRadius: 220,
    backgroundColor: 'rgba(166, 214, 8, 0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  compactContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sloganBlock: {
    alignItems: 'center',
    width: '100%',
  },
  eyebrow: {
    color: '#A6D608',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  slogan: {
    marginTop: 13,
    color: '#F5FAF8',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 35,
    textAlign: 'center',
  },
  sloganAccent: {
    color: '#A6D608',
  },
  tagline: {
    marginTop: 10,
    color: '#C2D0CE',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoFrame: {
    flex: 1,
    maxHeight: 390,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  bottomBlock: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  rideButton: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#A6D608',
    shadowColor: '#A6D608',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  rideButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  rideButtonText: {
    color: '#081116',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  footerNote: {
    marginTop: 12,
    color: '#9AADB0',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
