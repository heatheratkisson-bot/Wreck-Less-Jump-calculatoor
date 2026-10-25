import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props {
  onMeasurement: (type: 'rampAngle' | 'rampHeight' | 'gapDistance', value: number) => void;
  onClose: () => void;
}

export default function ARMeasureView({ onMeasurement, onClose }: Props) {
  return (
    <View style={styles.container}>
      {/* AR Visual Mockup */}
      <View style={styles.mockupContainer}>
        <View style={styles.cameraFrame}>
          <View style={styles.cameraInner}>
            {/* Crosshair */}
            <View style={styles.crosshairH} />
            <View style={styles.crosshairV} />
            <View style={styles.crosshairDot} />

            {/* Simulated markers */}
            <View style={[styles.mockMarker, styles.mockMarkerStart]}>
              <View style={styles.mockMarkerDot} />
              <Text style={styles.mockMarkerLabel}>Start</Text>
            </View>
            <View style={[styles.mockMarker, styles.mockMarkerEnd]}>
              <View style={[styles.mockMarkerDot, { backgroundColor: '#A6D608' }]} />
              <Text style={styles.mockMarkerLabel}>End</Text>
            </View>

            {/* Simulated measurement line */}
            <View style={styles.mockLine} />
            <View style={styles.mockDistLabel}>
              <Text style={styles.mockDistText}>45.2 ft</Text>
            </View>

            {/* AR scan indicator */}
            <Ionicons name="scan" size={80} color="rgba(11, 129, 118, 0.2)" style={styles.scanIcon} />
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.deviceBadge}>
          <Ionicons name="phone-portrait" size={18} color="#E8B86D" />
          <Text style={styles.deviceBadgeText}>Requires Physical Device</Text>
        </View>

        <Text style={styles.title}>True AR Measurement</Text>
        <Text style={styles.description}>
          Point your camera at real-world objects and place markers to measure distances with augmented reality precision.
        </Text>

        {/* Capabilities */}
        <View style={styles.capList}>
          <View style={styles.capItem}>
            <View style={styles.capIcon}>
              <Ionicons name="resize" size={20} color="#8BD6A7" />
            </View>
            <View style={styles.capContent}>
              <Text style={styles.capTitle}>Gap Distance</Text>
              <Text style={styles.capDesc}>Measure the jump gap in real-world feet</Text>
            </View>
          </View>
          <View style={styles.capItem}>
            <View style={styles.capIcon}>
              <Ionicons name="arrow-up" size={20} color="#8BD6A7" />
            </View>
            <View style={styles.capContent}>
              <Text style={styles.capTitle}>Ramp Height</Text>
              <Text style={styles.capDesc}>Measure vertical height of the ramp</Text>
            </View>
          </View>
          <View style={styles.capItem}>
            <View style={styles.capIcon}>
              <Ionicons name="analytics" size={20} color="#8BD6A7" />
            </View>
            <View style={styles.capContent}>
              <Text style={styles.capTitle}>Ramp Angle</Text>
              <Text style={styles.capDesc}>Calculate the angle from AR marker positions</Text>
            </View>
          </View>
        </View>

        {/* Platform badges */}
        <View style={styles.platformRow}>
          <View style={styles.platformBadge}>
            <Ionicons name="logo-apple" size={16} color="#F5FAF8" />
            <Text style={styles.platformText}>iOS (ARKit)</Text>
          </View>
          <View style={styles.platformBadge}>
            <Ionicons name="logo-android" size={16} color="#F5FAF8" />
            <Text style={styles.platformText}>Android (ARCore)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mockupContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraFrame: {
    width: width - 60,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#081116',
    borderWidth: 2,
    borderColor: '#405C65',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 30,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1.5,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  crosshairDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A6D608',
  },
  mockMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  mockMarkerStart: {
    left: '25%',
    top: '55%',
  },
  mockMarkerEnd: {
    right: '20%',
    top: '45%',
  },
  mockMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#267A58',
    borderWidth: 2,
    borderColor: '#F5FAF8',
  },
  mockMarkerLabel: {
    color: '#F5FAF8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  mockLine: {
    position: 'absolute',
    width: '35%',
    height: 2,
    backgroundColor: '#E8B86D',
    top: '58%',
    left: '28%',
    transform: [{ rotate: '-8deg' }],
  },
  mockDistLabel: {
    position: 'absolute',
    top: '35%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mockDistText: {
    color: '#E8B86D',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scanIcon: {
    position: 'absolute',
  },
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 184, 109, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 109, 0.3)',
  },
  deviceBadgeText: {
    color: '#E8B86D',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#F5FAF8',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#C2D0CE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  capList: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  capItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3038',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 214, 167, 0.2)',
  },
  capIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 214, 167, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capContent: {
    flex: 1,
  },
  capTitle: {
    color: '#F5FAF8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  capDesc: {
    color: '#C2D0CE',
    fontSize: 12,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28434B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  platformText: {
    color: '#CED9D6',
    fontSize: 12,
    fontWeight: '500',
  },
});
