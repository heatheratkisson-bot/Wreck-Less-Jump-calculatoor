import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StartupScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const compactLayout = height < 700;

  return (
    <View style={styles.screen}>
      <Image
        source={require('../assets/images/wreckless-logo.jpg')}
        style={styles.backgroundImage}
        resizeMode="contain"
        accessible={false}
        accessibilityIgnoresInvertColors
      />
      <View pointerEvents="none" style={styles.backgroundScrim} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
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

          <View style={styles.bottomBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Let's ride, open the app"
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => [styles.rideButton, pressed && styles.rideButtonPressed]}
            >
              <Text style={styles.rideButtonText}>LET’S RIDE</Text>
              <Ionicons name="arrow-forward" size={20} color="#101820" />
            </Pressable>
            <Text style={styles.footerNote}>Ride smart. Ride in control.</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1118',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 10, 16, 0.28)',
  },
  safeArea: {
    flex: 1,
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
    paddingTop: 16,
  },
  eyebrow: {
    color: '#63D9E7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowRadius: 8,
  },
  slogan: {
    marginTop: 13,
    color: '#F5FAF8',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1.4,
    lineHeight: 35,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowRadius: 10,
  },
  sloganAccent: {
    color: '#E6BD65',
  },
  tagline: {
    marginTop: 10,
    color: '#E3E9EC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowRadius: 8,
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
    borderWidth: 2,
    borderColor: '#72D9E4',
    backgroundColor: '#E6BD65',
    shadowColor: '#E6BD65',
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  rideButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  rideButtonText: {
    color: '#101820',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  footerNote: {
    marginTop: 12,
    color: '#E3E9EC',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowRadius: 8,
  },
});
