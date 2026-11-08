import React from 'react';
import { ImageBackground, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function StartupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../assets/images/wreckless-start-screen.jpeg')}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
        accessible={false}
        imageStyle={styles.backgroundImage}
      />
      <StatusBar hidden />
      <View style={styles.safeArea} pointerEvents="box-none">
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open saved jumps"
            onPress={() => router.push('/(tabs)/saved')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Let's ride, open the app"
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [
            styles.rideButton,
            { bottom: Math.max(insets.bottom, height * 0.055) },
            pressed && styles.pressed,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1118',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    ...StyleSheet.absoluteFill,
  },
  topActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: '20%',
    height: 88,
  },
  rideButton: {
    position: 'absolute',
    left: '16%',
    width: '68%',
    height: '8%',
    minHeight: 68,
    maxHeight: 104,
  },
  pressed: {
    opacity: 0.7,
  },
});
