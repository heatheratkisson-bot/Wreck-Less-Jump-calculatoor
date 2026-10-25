import React, { forwardRef, useCallback, useImperativeHandle, useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const PHOTO_CONTENT_WIDTH = width - 76;

// Credit card standard dimensions in inches
const CREDIT_CARD_WIDTH_INCHES = 3.370;
interface MeasurementPoint {
  x: number;
  y: number;
}

export interface Measurements {
  rampAngle: number | null;
  rampHeight: number | null;
  gapDistance: number | null;
  landingHeight: number | null;
}

type MeasureMode = 'sensor' | 'photo';

export interface MeasureScreenHandle {
  stopAngleMeasurement: () => void;
}

interface MeasureScreenProps {
  onUseMeasurements?: (measurements: Measurements) => void;
}

const MeasureScreen = forwardRef<MeasureScreenHandle, MeasureScreenProps>(
  function MeasureScreen({ onUseMeasurements }, ref) {
  const [mode, setMode] = useState<MeasureMode>('sensor');

  // Angle measurement states
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [angleStable, setAngleStable] = useState(false);
  const angleHistory = useRef<number[]>([]);

  // Photo measurement states
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [measurementMode, setMeasurementMode] = useState<'card' | 'rampHeight' | 'gap' | 'landing' | null>(null);
  const [cardPoints, setCardPoints] = useState<MeasurementPoint[]>([]);
  const [measurePoints, setMeasurePoints] = useState<MeasurementPoint[]>([]);
  const [pixelsPerInch, setPixelsPerInch] = useState<number | null>(null);

  // Final measurements
  const [measurements, setMeasurements] = useState<Measurements>({
    rampAngle: null,
    rampHeight: null,
    gapDistance: null,
    landingHeight: null,
  });

  // Accelerometer for angle measurement
  const startAngleMeasurement = () => {
    setIsCalibrating(true);
    setAngleStable(false);
    angleHistory.current = [];

    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener((data) => {
      // Calculate angle from accelerometer data
      // When phone is flat: z ≈ 1, x ≈ 0, y ≈ 0
      // When phone is tilted: angle = atan2(y, z) for pitch
      const { x, y, z } = data;
      
      // Calculate pitch angle (rotation around x-axis)
      const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
      
      // We want the angle of the surface the phone is resting on
      // If phone screen is facing up on a ramp, the angle is the pitch
      const angle = Math.abs(pitch);
      
      angleHistory.current.push(angle);
      
      // Keep last 20 readings
      if (angleHistory.current.length > 20) {
        angleHistory.current.shift();
      }
      
      // Calculate average and check stability
      if (angleHistory.current.length >= 10) {
        const avg = angleHistory.current.reduce((a, b) => a + b, 0) / angleHistory.current.length;
        const variance = angleHistory.current.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / angleHistory.current.length;
        
        setCurrentAngle(Math.round(avg * 10) / 10);
        
        // If variance is low, readings are stable
        if (variance < 1) {
          setAngleStable(true);
        } else {
          setAngleStable(false);
        }
      }
    });

    setSubscription(sub);
  };

  const stopAngleMeasurement = useCallback(() => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setIsCalibrating(false);
  }, [subscription]);

  useImperativeHandle(ref, () => ({ stopAngleMeasurement }), [stopAngleMeasurement]);

  const saveAngle = () => {
    if (currentAngle !== null) {
      setMeasurements(prev => ({ ...prev, rampAngle: currentAngle }));
      stopAngleMeasurement();
      Alert.alert('Saved!', `Ramp angle: ${currentAngle}°`);
    }
  };

  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [subscription]);

  // Photo measurement functions
  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take measurements.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage(asset.uri);
      setImageSize({ width: asset.width, height: asset.height });
      setCardPoints([]);
      setMeasurePoints([]);
      setPixelsPerInch(null);
      setMeasurementMode('card');
    }
  };

  const handleImagePress = (event: any) => {
    if (!measurementMode || !imageSize) return;

    const { locationX, locationY } = event.nativeEvent;
    const point: MeasurementPoint = {
      x: locationX,
      y: locationY,
    };

    if (measurementMode === 'card') {
      if (cardPoints.length < 2) {
        const newPoints = [...cardPoints, point];
        setCardPoints(newPoints);
        
        if (newPoints.length === 2) {
          // Calculate pixels per inch from credit card width
          const dx = newPoints[1].x - newPoints[0].x;
          const dy = newPoints[1].y - newPoints[0].y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          const ppi = pixelDistance / CREDIT_CARD_WIDTH_INCHES;
          setPixelsPerInch(ppi);
          setMeasurementMode(null);
        }
      }
    } else if (measurementMode === 'rampHeight' || measurementMode === 'gap' || measurementMode === 'landing') {
      if (measurePoints.length < 2) {
        const newPoints = [...measurePoints, point];
        setMeasurePoints(newPoints);
        
        if (newPoints.length === 2 && pixelsPerInch) {
          // Calculate distance
          const dx = newPoints[1].x - newPoints[0].x;
          const dy = newPoints[1].y - newPoints[0].y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          const inches = pixelDistance / pixelsPerInch;
          const feet = inches / 12;
          
          const roundedFeet = Math.round(feet * 10) / 10;
          
          if (measurementMode === 'rampHeight') {
            setMeasurements(prev => ({ ...prev, rampHeight: roundedFeet }));
          } else if (measurementMode === 'gap') {
            setMeasurements(prev => ({ ...prev, gapDistance: roundedFeet }));
          } else if (measurementMode === 'landing') {
            setMeasurements(prev => ({ ...prev, landingHeight: roundedFeet }));
          }
          
          setMeasurePoints([]);
          setMeasurementMode(null);
        }
      }
    }
  };

  const startMeasurement = (type: 'rampHeight' | 'gap' | 'landing') => {
    if (!pixelsPerInch) {
      Alert.alert('Mark Credit Card First', 'Please mark the credit card width first by tapping its left and right edges.');
      return;
    }
    setMeasurePoints([]);
    setMeasurementMode(type);
  };

  const resetPhoto = () => {
    setImage(null);
    setImageSize(null);
    setCardPoints([]);
    setMeasurePoints([]);
    setPixelsPerInch(null);
    setMeasurementMode(null);
  };

  const getModeInstructions = () => {
    switch (measurementMode) {
      case 'card':
        return cardPoints.length === 0
          ? 'Step 1 of 2: tap the left edge of the card'
          : 'Step 2 of 2: tap the right edge of the card';
      case 'rampHeight':
        return measurePoints.length === 0
          ? 'Step 1 of 2: tap the bottom of the ramp'
          : 'Step 2 of 2: tap the top of the ramp';
      case 'gap':
        return measurePoints.length === 0
          ? 'Step 1 of 2: tap the start of the gap'
          : 'Step 2 of 2: tap the end of the gap';
      case 'landing':
        return measurePoints.length === 0
          ? 'Step 1 of 2: tap the bottom of the landing'
          : 'Step 2 of 2: tap the top of the landing';
      default:
        return pixelsPerInch
          ? 'Card calibrated. Choose a measurement below, then tap two points on the photo.'
          : 'Take a photo with a standard card visible to set the scale.';
    }
  };

  const renderImageOverlay = () => {
    if (!imageSize) return null;
    const displayWidth = PHOTO_CONTENT_WIDTH;
    const displayHeight = (displayWidth / imageSize.width) * imageSize.height;

    return (
      <Svg width={displayWidth} height={displayHeight} style={styles.svgOverlay}>
        {/* Credit card points and line */}
        {cardPoints.map((point, index) => (
          <Circle
            key={`card-${index}`}
            cx={point.x}
            cy={point.y}
            r={8}
            fill="#8BD6A7"
            stroke="#F5FAF8"
            strokeWidth={2}
          />
        ))}
        {cardPoints.length === 2 && (
          <Line
            x1={cardPoints[0].x}
            y1={cardPoints[0].y}
            x2={cardPoints[1].x}
            y2={cardPoints[1].y}
            stroke="#8BD6A7"
            strokeWidth={3}
          />
        )}
        
        {/* Measurement points and line */}
        {measurePoints.map((point, index) => (
          <Circle
            key={`measure-${index}`}
            cx={point.x}
            cy={point.y}
            r={8}
            fill="#A6D608"
            stroke="#F5FAF8"
            strokeWidth={2}
          />
        ))}
        {measurePoints.length === 2 && (
          <Line
            x1={measurePoints[0].x}
            y1={measurePoints[0].y}
            x2={measurePoints[1].x}
            y2={measurePoints[1].y}
            stroke="#A6D608"
            strokeWidth={3}
            strokeDasharray="5,5"
          />
        )}
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="construct" size={26} color="#A6D608" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Measure</Text>
            <Text style={styles.subtitle}>Get ramp dimensions for your jump setup</Text>
          </View>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'sensor' }}
            style={[styles.modeTab, mode === 'sensor' && styles.modeTabActive]}
            onPress={() => setMode('sensor')}
          >
            <Ionicons name="phone-portrait" size={18} color={mode === 'sensor' ? '#000000' : '#C2D0CE'} />
            <View>
              <Text style={[styles.modeTabText, mode === 'sensor' && styles.modeTabTextActive]}>Angle</Text>
              <Text style={[styles.modeTabHint, mode === 'sensor' && styles.modeTabHintActive]}>Phone sensor</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'photo' }}
            style={[styles.modeTab, mode === 'photo' && styles.modeTabActive]}
            onPress={() => {
              if (isCalibrating) {
                stopAngleMeasurement();
              }
              setMode('photo');
            }}
          >
            <Ionicons name="camera" size={18} color={mode === 'photo' ? '#000000' : '#C2D0CE'} />
            <View>
              <Text style={[styles.modeTabText, mode === 'photo' && styles.modeTabTextActive]}>Distance</Text>
              <Text style={[styles.modeTabHint, mode === 'photo' && styles.modeTabHintActive]}>Photo scale</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sensor Mode - Angle Measurement */}
        {mode === 'sensor' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="analytics" size={20} color="#A6D608" />
            </View>
            <Text style={styles.sectionTitle}>Ramp Angle</Text>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>STEP 1</Text></View>
          </View>
          
          <Text style={styles.instructions}>
            Place your phone flat on the ramp surface to measure the angle.
          </Text>

          {isCalibrating ? (
            <View style={styles.angleDisplay}>
              <View style={styles.angleCircle}>
                <Text style={styles.angleValue}>{currentAngle ?? '--'}°</Text>
                <Text style={styles.angleLabel}>
                  {angleStable ? 'Stable' : 'Stabilizing...'}
                </Text>
              </View>
              
              <View style={styles.angleButtons}>
                <TouchableOpacity
                  style={[styles.angleButton, styles.saveButton]}
                  onPress={saveAngle}
                  disabled={!angleStable}
                  accessibilityRole="button"
                  accessibilityLabel="Save measured ramp angle"
                >
                  <Ionicons name="checkmark" size={20} color="#F5FAF8" />
                  <Text style={styles.angleButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.angleButton, styles.cancelButton]}
                  onPress={stopAngleMeasurement}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={20} color="#A6D608" />
                  <Text style={[styles.angleButtonText, { color: '#A6D608' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startAngleMeasurement}
              accessibilityRole="button"
            >
              <Ionicons name="phone-portrait" size={24} color="#000000" />
              <Text style={styles.startButtonText}>Measure Angle</Text>
            </TouchableOpacity>
          )}

          {measurements.rampAngle !== null && (
            <View style={styles.savedMeasurement}>
              <Ionicons name="checkmark-circle" size={16} color="#8BD6A7" />
              <Text style={styles.savedText}>Saved: {measurements.rampAngle}°</Text>
            </View>
          )}
        </View>
        )}

        {/* Photo Mode - Distance Measurement */}
        {mode === 'photo' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="image" size={20} color="#A6D608" />
            </View>
            <Text style={styles.sectionTitle}>Distance Measurement</Text>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>STEP 2</Text></View>
          </View>
          
          <Text style={styles.instructions}>
            Take a photo with a credit card in the frame as a reference. Then measure distances.
          </Text>

          {!image ? (
            <TouchableOpacity
              style={styles.startButton}
              onPress={pickImage}
              accessibilityRole="button"
            >
              <Ionicons name="camera" size={24} color="#000000" />
              <Text style={styles.startButtonText}>Take Photo with Credit Card</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoContainer}>
              {/* Instructions banner */}
              <View style={[
                styles.instructionBanner,
                measurementMode ? styles.instructionBannerActive : null
              ]}>
                <Ionicons
                  name={measurementMode ? 'hand-left' : pixelsPerInch ? 'checkmark-circle' : 'information-circle'}
                  size={19}
                  color={measurementMode ? '#000000' : pixelsPerInch ? '#8BD6A7' : '#E8B86D'}
                />
                <Text
                  style={[
                    styles.instructionText,
                    measurementMode && styles.instructionTextActive,
                  ]}
                >
                  {getModeInstructions()}
                </Text>
              </View>

              {/* Image with overlay */}
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={handleImagePress}
                style={styles.imageWrapper}
              >
                <Image
                  source={{ uri: image }}
                  style={[
                    styles.previewImage,
                    imageSize && {
                      height: (PHOTO_CONTENT_WIDTH / imageSize.width) * imageSize.height,
                    },
                  ]}
                  resizeMode="contain"
                />
                {renderImageOverlay()}
              </TouchableOpacity>

              {/* Calibration status */}
              <View style={styles.calibrationStatus}>
                <Ionicons 
                  name={pixelsPerInch ? "checkmark-circle" : "ellipse-outline"} 
                  size={16} 
                  color={pixelsPerInch ? "#8BD6A7" : "#C2D0CE"}
                />
                <Text style={[
                  styles.calibrationText,
                  pixelsPerInch ? styles.calibrationTextActive : null
                ]}>
                  {pixelsPerInch ? 'Scale set from standard card width' : 'First, mark both card edges on the photo'}
                </Text>
              </View>

              {/* Measurement buttons */}
              <View style={styles.measureButtons}>
                <TouchableOpacity
                  style={[
                    styles.measureButton,
                    measurementMode === 'rampHeight' && styles.measureButtonActive,
                    measurements.rampHeight !== null && styles.measureButtonDone,
                    !pixelsPerInch && styles.measureButtonDisabled
                  ]}
                  onPress={() => startMeasurement('rampHeight')}
                  disabled={!pixelsPerInch}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={measurements.rampHeight !== null ? '#F5FAF8' : measurementMode === 'rampHeight' ? '#000000' : '#A6D608'}
                  />
                  <Text style={[styles.measureButtonText, measurementMode === 'rampHeight' && styles.measureButtonTextActive]}>
                    {measurements.rampHeight !== null ? `${measurements.rampHeight} ft` : 'Ramp Height'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={measurements.rampHeight !== null ? '#F5FAF8' : measurementMode === 'rampHeight' ? '#000000' : '#C2D0CE'} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.measureButton,
                    measurementMode === 'gap' && styles.measureButtonActive,
                    measurements.gapDistance !== null && styles.measureButtonDone,
                    !pixelsPerInch && styles.measureButtonDisabled
                  ]}
                  onPress={() => startMeasurement('gap')}
                  disabled={!pixelsPerInch}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="resize"
                    size={20}
                    color={measurements.gapDistance !== null ? '#F5FAF8' : measurementMode === 'gap' ? '#000000' : '#A6D608'}
                  />
                  <Text style={[styles.measureButtonText, measurementMode === 'gap' && styles.measureButtonTextActive]}>
                    {measurements.gapDistance !== null ? `${measurements.gapDistance} ft` : 'Gap Distance'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={measurements.gapDistance !== null ? '#F5FAF8' : measurementMode === 'gap' ? '#000000' : '#C2D0CE'} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.measureButton,
                    measurementMode === 'landing' && styles.measureButtonActive,
                    measurements.landingHeight !== null && styles.measureButtonDone,
                    !pixelsPerInch && styles.measureButtonDisabled
                  ]}
                  onPress={() => startMeasurement('landing')}
                  disabled={!pixelsPerInch}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={measurements.landingHeight !== null ? '#F5FAF8' : measurementMode === 'landing' ? '#000000' : '#A6D608'}
                  />
                  <Text style={[styles.measureButtonText, measurementMode === 'landing' && styles.measureButtonTextActive]}>
                    {measurements.landingHeight !== null ? `${measurements.landingHeight} ft` : 'Landing Height'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={measurements.landingHeight !== null ? '#F5FAF8' : measurementMode === 'landing' ? '#000000' : '#C2D0CE'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetPhoto}
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={18} color="#C2D0CE" />
                <Text style={styles.resetButtonText}>Take New Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* Summary Section */}
        {(measurements.rampAngle !== null || measurements.rampHeight !== null || 
          measurements.gapDistance !== null || measurements.landingHeight !== null) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#A6D608" />
              <Text style={styles.sectionTitle}>Measurements Summary</Text>
            </View>
            
            <View style={styles.summaryGrid}>
              {measurements.rampAngle !== null && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Ramp Angle</Text>
                  <Text style={styles.summaryValue}>{measurements.rampAngle}°</Text>
                </View>
              )}
              {measurements.rampHeight !== null && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Ramp Height</Text>
                  <Text style={styles.summaryValue}>{measurements.rampHeight} ft</Text>
                </View>
              )}
              {measurements.gapDistance !== null && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Gap Distance</Text>
                  <Text style={styles.summaryValue}>{measurements.gapDistance} ft</Text>
                </View>
              )}
              {measurements.landingHeight !== null && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Landing Height</Text>
                  <Text style={styles.summaryValue}>{measurements.landingHeight} ft</Text>
                </View>
              )}
            </View>

            {onUseMeasurements ? (
              <TouchableOpacity
                style={styles.useMeasurementsButton}
                onPress={() => onUseMeasurements(measurements)}
                accessibilityRole="button"
              >
                <Ionicons name="calculator" size={19} color="#000000" />
                <Text style={styles.useMeasurementsButtonText}>Use Measurements in How Fast</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.tipText}>
                Use these measurements in How Fast to get your required speed!
              </Text>
            )}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>
            <Ionicons name="bulb" size={16} color="#E8B86D" /> Tips for Accurate Measurements
          </Text>
          <Text style={styles.tipItem}>• Place credit card flat on the ground parallel to camera</Text>
          <Text style={styles.tipItem}>• Keep camera level when taking photo</Text>
          <Text style={styles.tipItem}>• For angle: place phone directly on ramp surface</Text>
          <Text style={styles.tipItem}>• Measure at the same distance from camera as the credit card</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

export default MeasureScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081116',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  headerIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#1B3038',
    borderWidth: 1,
    borderColor: '#405C65',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#F5FAF8',
  },
  subtitle: {
    fontSize: 13,
    color: '#C2D0CE',
    marginTop: 4,
    lineHeight: 19,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#14262D',
    borderColor: '#35515A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 5,
    marginBottom: 18,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 10,
  },
  modeTabActive: {
    backgroundColor: '#A6D608',
  },
  modeTabText: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#000000',
  },
  modeTabHint: {
    marginTop: 2,
    color: '#C2D0CE',
    fontSize: 11,
  },
  modeTabHintActive: {
    color: '#000000',
  },
  section: {
    backgroundColor: '#1B3038',
    borderColor: '#35515A',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(166, 214, 8, 0.14)',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#F5FAF8',
  },
  stepBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 9,
    backgroundColor: '#14262D',
  },
  stepBadgeText: {
    color: '#A6D608',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  instructions: {
    fontSize: 14,
    color: '#D6E2E0',
    marginBottom: 18,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: '#A6D608',
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#A6D608',
    elevation: 2,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  angleDisplay: {
    alignItems: 'center',
  },
  angleCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#14262D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#A6D608',
    marginBottom: 20,
  },
  angleValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#A6D608',
  },
  angleLabel: {
    fontSize: 14,
    color: '#D6E2E0',
    marginTop: 4,
  },
  angleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  angleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#267A58',
    borderWidth: 1,
    borderColor: '#8BD6A7',
  },
  cancelButton: {
    backgroundColor: '#14262D',
    borderWidth: 1,
    borderColor: '#A6D608',
  },
  angleButtonText: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '600',
  },
  savedMeasurement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(139, 214, 167, 0.12)',
  },
  savedText: {
    color: '#8BD6A7',
    fontSize: 14,
    fontWeight: '600',
  },
  arUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#14262D',
    borderWidth: 1,
    borderColor: '#28434B',
    gap: 8,
  },
  arUnavailableTitle: {
    color: '#F5FAF8',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  arUnavailableText: {
    color: '#CED9D6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  useMeasurementsButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#A6D608',
  },
  useMeasurementsButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  photoContainer: {
    marginTop: 8,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#14262D',
    borderColor: '#405C65',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  instructionBannerActive: {
    backgroundColor: '#A6D608',
    borderWidth: 1,
    borderColor: '#A6D608',
  },
  instructionText: {
    color: '#F5FAF8',
    fontSize: 14,
    flex: 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  instructionTextActive: {
    color: '#000000',
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: PHOTO_CONTENT_WIDTH,
    borderRadius: 12,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  calibrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#14262D',
  },
  calibrationText: {
    flex: 1,
    color: '#D6E2E0',
    fontSize: 13,
    lineHeight: 18,
  },
  calibrationTextActive: {
    color: '#8BD6A7',
  },
  measureButtons: {
    flexDirection: 'column',
    gap: 9,
    marginTop: 16,
  },
  measureButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#14262D',
    borderColor: '#405C65',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  measureButtonActive: {
    backgroundColor: '#A6D608',
    borderColor: '#A6D608',
  },
  measureButtonDone: {
    backgroundColor: '#267A58',
    borderColor: '#8BD6A7',
  },
  measureButtonText: {
    flex: 1,
    color: '#F5FAF8',
    fontSize: 14,
    fontWeight: '700',
  },
  measureButtonTextActive: {
    color: '#000000',
  },
  measureButtonDisabled: {
    opacity: 0.48,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    color: '#C2D0CE',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#14262D',
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 13,
    padding: 16,
    minWidth: (width - 80) / 2 - 6,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#C2D0CE',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#A6D608',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tipText: {
    color: '#8BD6A7',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  tipsContainer: {
    backgroundColor: '#14262D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#80653B',
  },
  tipsTitle: {
    color: '#E8B86D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    color: '#F2D39A',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
});
