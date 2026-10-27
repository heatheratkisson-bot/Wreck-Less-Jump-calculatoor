import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

function readNumber(value: string | string[] | undefined): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function GhostTrajectoryViewfinder() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    speedMph?: string;
    gapFeet?: string;
    rampAngle?: string;
    rampHeightFeet?: string;
    landingHeightFeet?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const speedMph = readNumber(params.speedMph);
  const gapFeet = readNumber(params.gapFeet);
  const rampAngle = readNumber(params.rampAngle);
  const rampHeightFeet = readNumber(params.rampHeightFeet) ?? 0;
  const landingHeightFeet = readNumber(params.landingHeightFeet) ?? 0;
  const hasValidCalculation =
    speedMph !== null && speedMph > 0 && gapFeet !== null && gapFeet > 0 &&
    rampAngle !== null && rampAngle > 0 && rampAngle < 90;

  const curvePath = useMemo(() => {
    if (!hasValidCalculation || speedMph === null || gapFeet === null || rampAngle === null) {
      return '';
    }

    const fps = speedMph * 1.46667;
    const angleRadians = (rampAngle * Math.PI) / 180;
    const horizontalVelocity = fps * Math.cos(angleRadians);
    const verticalVelocity = fps * Math.sin(angleRadians);
    const gravity = 32.174;
    const flightTime = gapFeet / horizontalVelocity;
    const sceneWidth = width * 0.82;
    const sceneHeight = height * 0.42;
    const startX = width * 0.09;
    const startY = height * 0.66;
    const xScale = sceneWidth / gapFeet;
    const yScale = sceneHeight / Math.max(
      1,
      Math.max(
        rampHeightFeet + (verticalVelocity * verticalVelocity) / (2 * gravity),
        rampHeightFeet + landingHeightFeet,
        1,
      ),
    );
    const points = Array.from({ length: 41 }, (_, index) => {
      const progress = index / 40;
      const time = progress * flightTime;
      const horizontalDistance = horizontalVelocity * time;
      const heightAboveRamp = verticalVelocity * time - 0.5 * gravity * time * time;
      return {
        x: startX + horizontalDistance * xScale,
        y: startY - heightAboveRamp * yScale,
      };
    });

    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [
    gapFeet,
    hasValidCalculation,
    height,
    rampHeightFeet,
    rampAngle,
    speedMph,
    width,
  ]);

  if (!hasValidCalculation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back to results">
            <Ionicons name="arrow-back" size={23} color="#F5FAF8" />
          </Pressable>
          <Text style={styles.headerTitle}>Ghost Trajectory Viewfinder</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.permissionMessage}>
          <Ionicons name="alert-circle-outline" size={32} color="#E8B86D" />
          <Text style={styles.messageTitle}>Calculation details unavailable</Text>
          <Text style={styles.messageBody}>Return to the calculator and run a new jump calculation.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" />
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
          <Ionicons name="camera-outline" size={42} color="#A6D608" />
          <Text style={styles.messageTitle}>Camera access needed</Text>
          <Text style={styles.messageBody}>
            Allow camera access to see this illustrative trajectory over the live view.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.permissionButton}
            onPress={() => void requestPermission()}
          >
            {permission === null ? (
              <ActivityIndicator color="#07111E" />
            ) : (
              <>
                <Ionicons name="camera" size={18} color="#07111E" />
                <Text style={styles.permissionButtonText}>Enable camera</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to results"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={23} color="#F5FAF8" />
          </Pressable>
          <Text style={styles.headerTitle}>Ghost Trajectory</Text>
          <View style={styles.backButton} />
        </View>

        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path
            d={curvePath}
            fill="none"
            stroke="#A6D608"
            strokeWidth="5"
            strokeDasharray="9,7"
            strokeLinecap="round"
          />
          <Path
            d={curvePath}
            fill="none"
            stroke="#D4F66E"
            strokeWidth="1.5"
            strokeDasharray="9,7"
            strokeLinecap="round"
            opacity="0.9"
          />
          <Circle cx={width * 0.09} cy={height * 0.66} r="7" fill="#A6D608" />
          <Line
            x1={width * 0.09}
            y1={height * 0.66 + 13}
            x2={width * 0.91}
            y2={height * 0.66 + 13}
            stroke="#F5FAF8"
            strokeWidth="1"
            strokeDasharray="4,5"
            opacity="0.65"
          />
          <SvgText
            x={width * 0.5}
            y={height * 0.66 + 31}
            fill="#F5FAF8"
            fontSize="13"
            textAnchor="middle"
          >
            {gapFeet.toFixed(1)} ft estimated gap
          </SvgText>
        </Svg>

        <View style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <Ionicons name="eye-outline" size={19} color="#A6D608" />
            <Text style={styles.infoTitle}>Illustrative camera overlay</Text>
          </View>
          <Text style={styles.infoText}>
            {speedMph.toFixed(1)} mph · {rampAngle.toFixed(1)}° ramp · {gapFeet.toFixed(1)} ft gap
          </Text>
          <Text style={styles.warningText}>
            Not world-tracked AR. The path is not anchored to the ground and cannot measure terrain, distance, or a safe landing. Do not use it to decide whether to attempt a jump.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#07111E',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#081116',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    backgroundColor: '#07111E',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(7, 17, 30, 0.78)',
    borderBottomWidth: 1,
    borderBottomColor: '#35515A',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '800',
  },
  permissionMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  messageTitle: {
    marginTop: 12,
    color: '#F5FAF8',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageBody: {
    maxWidth: 320,
    marginTop: 8,
    color: '#C2D0CE',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: '#A6D608',
  },
  permissionButtonText: {
    color: '#07111E',
    fontSize: 14,
    fontWeight: '800',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#526E76',
    borderRadius: 14,
    backgroundColor: 'rgba(7, 17, 30, 0.9)',
  },
  infoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    color: '#F5FAF8',
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    marginTop: 7,
    color: '#D4F66E',
    fontSize: 13,
    fontWeight: '700',
  },
  warningText: {
    marginTop: 8,
    color: '#F2D39A',
    fontSize: 11,
    lineHeight: 16,
  },
});
