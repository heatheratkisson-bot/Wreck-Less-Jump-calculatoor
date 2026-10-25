import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Share,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import MeasureScreen from './measure';
import type { MeasureScreenHandle, Measurements } from './measure';
import { useBeginnerGuide } from '@/lib/BeginnerGuideContext';
import type { MotorcycleModel } from '@/lib/motorcycleData';
import Svg, { Path, Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import * as Location from 'expo-location';
import {
  calculateJumpLocally,
  CalculationResult,
  applyMotorcycleAdjustmentsToResult,
  fetchJsonWithBackend,
  getDeviceId,
  getSelectedMotorcycle,
  getEmergencyDeviceId,
  getEmergencySettings,
  getLastNearbyAlertSentAt,
  getRemainingAlertCooldownMs,
  isBackendConfigured,
  JumpCalculationInput,
  LocationData,
  logCallForHelp,
  SavedCalculation,
  saveCalculationLocally,
  sendNearbyRidersAlert,
  setLastNearbyAlertSentAt,
} from '@/lib/appSupport';

const { width } = Dimensions.get('window');

export default function Index() {
  const { startBeginnerGuide } = useBeginnerGuide();
  // Input states
  const [rampHeight, setRampHeight] = useState('');
  const [rampAngle, setRampAngle] = useState('');
  const [gapDistance, setGapDistance] = useState('');
  const [bikeWeight, setBikeWeight] = useState('');
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<MotorcycleModel | null>(null);
  const [riderWeight, setRiderWeight] = useState('');
  const [landingHeight, setLandingHeight] = useState('');

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [useMetric, setUseMetric] = useState(false);
  const [inputMethod, setInputMethod] = useState<'manual' | 'measure'>('manual');
  const measureScreenRef = useRef<MeasureScreenHandle>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPacingActive, setIsPacingActive] = useState(false);
  const [pacingSpeed, setPacingSpeed] = useState<number | null>(null);
  const [pacingStatus, setPacingStatus] = useState('');
  const pacingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const pacingRequestedRef = useRef(false);
  const pacingScreenFocusedRef = useRef(false);
  const lastPacingAnnouncementRef = useRef<{ status: string; timestamp: number } | null>(null);
  const lastPacingStatusRef = useRef<string | null>(null);
  const pacingConfigRef = useRef<{
    requiredSpeed: number;
    recommendedSpeed: number;
    isMetric: boolean;
  } | null>(null);

  // Save modal states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [shareCalculation, setShareCalculation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  // Emergency alert states
  const [showCallHelpModal, setShowCallHelpModal] = useState(false);
  const [showAlertRidersModal, setShowAlertRidersModal] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  useEffect(() => {
    pacingConfigRef.current = result
      ? {
          requiredSpeed: useMetric ? result.required_speed_kph : result.required_speed_mph,
          recommendedSpeed: useMetric ? result.safety_speed_kph : result.safety_speed_mph,
          isMetric: useMetric,
        }
      : null;
  }, [result, useMetric]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getSelectedMotorcycle()
        .then((motorcycle) => {
          if (!isMounted) {
            return;
          }
          setSelectedMotorcycle(motorcycle);
          const weight = useMetric ? motorcycle.weight_lbs / 2.20462 : motorcycle.weight_lbs;
          setBikeWeight(weight.toFixed(1));
        })
        .catch((error: unknown) => {
          console.error('Could not load selected bike weight:', error);
        });

      return () => {
        isMounted = false;
      };
    }, [useMetric])
  );

  const stopPacing = useCallback(() => {
    pacingRequestedRef.current = false;
    pacingSubscriptionRef.current?.remove();
    pacingSubscriptionRef.current = null;
    setIsPacingActive(false);
    setPacingSpeed(null);
    setPacingStatus('');
    lastPacingAnnouncementRef.current = null;
    lastPacingStatusRef.current = null;
    void Speech.stop().catch((error: unknown) => {
      console.error('Could not stop pacing speech:', error);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      pacingScreenFocusedRef.current = true;
      return () => {
        pacingScreenFocusedRef.current = false;
        pacingRequestedRef.current = false;
        pacingSubscriptionRef.current?.remove();
        pacingSubscriptionRef.current = null;
        setIsPacingActive(false);
        setPacingSpeed(null);
        setPacingStatus('');
        lastPacingAnnouncementRef.current = null;
        lastPacingStatusRef.current = null;
        void Speech.stop().catch((error: unknown) => {
          console.error('Could not stop pacing speech:', error);
        });
      };
    }, [])
  );

  const handlePacingLocation = useCallback((location: Location.LocationObject) => {
    const config = pacingConfigRef.current;
    const speedMetersPerSecond = location.coords.speed;
    if (!config || speedMetersPerSecond === null || speedMetersPerSecond < 0) {
      return;
    }

    const currentSpeed = config.isMetric
      ? speedMetersPerSecond * 3.6
      : speedMetersPerSecond * 2.236936;
    const previousStatus = lastPacingStatusRef.current;
    const status =
      previousStatus === 'Below calculated speed' &&
      currentSpeed < config.requiredSpeed + 1.5
        ? previousStatus
        : previousStatus === 'Above recommended estimate' &&
            currentSpeed > config.recommendedSpeed - 1.5
          ? previousStatus
          : currentSpeed < config.requiredSpeed
        ? 'Below calculated speed'
        : currentSpeed <= config.recommendedSpeed
          ? 'Within estimated range'
          : 'Above recommended estimate';
    lastPacingStatusRef.current = status;
    setPacingSpeed(currentSpeed);
    setPacingStatus(status);

    const now = Date.now();
    const lastAnnouncement = lastPacingAnnouncementRef.current;
    if (lastAnnouncement?.status === status && now - lastAnnouncement.timestamp < 8000) {
      return;
    }

    lastPacingAnnouncementRef.current = { status, timestamp: now };
    void Speech.stop()
      .then(() => Speech.speak(status, { language: 'en-US', rate: 0.9 }))
      .catch((error: unknown) => {
        console.error('Could not play pacing speech:', error);
      });
  }, []);

  const startPacing = async () => {
    if (!result || isPacingActive || pacingRequestedRef.current) {
      return;
    }

    pacingRequestedRef.current = true;
    setPacingStatus('Waiting for GPS speed…');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!pacingRequestedRef.current || !pacingScreenFocusedRef.current) {
        return;
      }
      if (permission.status !== 'granted') {
        pacingRequestedRef.current = false;
        setPacingStatus('');
        Alert.alert(
          'Location permission needed',
          'Allow location access while using the app to hear live speed guidance.'
        );
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        handlePacingLocation
      );
      if (!pacingRequestedRef.current || !pacingScreenFocusedRef.current) {
        subscription.remove();
        return;
      }

      pacingSubscriptionRef.current = subscription;
      setIsPacingActive(true);
    } catch (error) {
      if (!pacingRequestedRef.current || !pacingScreenFocusedRef.current) {
        return;
      }
      pacingRequestedRef.current = false;
      console.error('Could not start live speed guidance:', error);
      setPacingStatus('');
      Alert.alert('Could not start speed guidance', 'Check location settings and try again.');
    }
  };

  const loadCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLocation(null);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const nextLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0]
          ? `${address[0].city || ''}${address[0].city && address[0].region ? ', ' : ''}${address[0].region || ''}`
          : undefined,
      };
      setCurrentLocation(nextLocation);
      return nextLocation;
    } catch (error) {
      console.log('Error getting location:', error);
      setCurrentLocation(null);
      return null;
    }
  };

  // Animation effect
  useEffect(() => {
    if (isAnimating && result) {
      const duration = result.flight_time_seconds * 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isAnimating, result]);

  const validateInputs = (): boolean => {
    if (!rampAngle || !gapDistance || !bikeWeight || !riderWeight) {
      Alert.alert('Missing Information', 'Please fill in all required fields (ramp angle, gap distance, bike weight, and rider weight).');
      return false;
    }

    const angle = parseFloat(rampAngle);
    if (angle <= 0 || angle >= 90) {
      Alert.alert('Invalid Angle', 'Ramp angle must be between 0 and 90 degrees.');
      return false;
    }

    const gap = parseFloat(gapDistance);
    if (gap <= 0) {
      Alert.alert('Invalid Distance', 'Gap distance must be greater than 0.');
      return false;
    }

    const bikeWeightValue = parseFloat(bikeWeight);
    const riderWeightValue = parseFloat(riderWeight);
    if (
      !Number.isFinite(bikeWeightValue) ||
      bikeWeightValue <= 0 ||
      !Number.isFinite(riderWeightValue) ||
      riderWeightValue <= 0
    ) {
      Alert.alert('Invalid Weight', 'Bike weight and rider weight must be greater than 0.');
      return false;
    }

    return true;
  };

  const calculateSpeed = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    stopPacing();
    setResult(null);

    try {
      const inputData: JumpCalculationInput = {
        ramp_height: parseFloat(rampHeight) || 0,
        ramp_angle: parseFloat(rampAngle),
        gap_distance: parseFloat(gapDistance),
        bike_weight: parseFloat(bikeWeight),
        rider_weight: parseFloat(riderWeight),
        landing_height: parseFloat(landingHeight) || 0,
        unit_system: useMetric ? 'metric' : 'imperial',
      };

      let data: CalculationResult;

      if (isBackendConfigured) {
        try {
          data = await fetchJsonWithBackend<CalculationResult>('/api/calculate-jump', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputData),
          });
        } catch {
          data = calculateJumpLocally(inputData);
        }
      } else {
        data = calculateJumpLocally(inputData);
      }

      const calculationMotorcycle = await getSelectedMotorcycle();
      data = applyMotorcycleAdjustmentsToResult(data, calculationMotorcycle);

      setResult(data);
      // Start animation
      setAnimationProgress(0);
      setIsAnimating(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to calculate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    stopPacing();
    setRampHeight('');
    setRampAngle('');
    setGapDistance('');
    setBikeWeight('');
    setRiderWeight('');
    setLandingHeight('');
    setResult(null);
    setAnimationProgress(0);
  };

  const applyMeasurements = (measurements: Measurements) => {
    measureScreenRef.current?.stopAngleMeasurement();
    const convertDistance = (feet: number) => (useMetric ? feet * 0.3048 : feet);
    if (measurements.rampHeight !== null) {
      setRampHeight(convertDistance(measurements.rampHeight).toFixed(2));
    }
    if (measurements.rampAngle !== null) {
      setRampAngle(String(measurements.rampAngle));
    }
    if (measurements.gapDistance !== null) {
      setGapDistance(convertDistance(measurements.gapDistance).toFixed(2));
    }
    if (measurements.landingHeight !== null) {
      setLandingHeight(convertDistance(measurements.landingHeight).toFixed(2));
    }
    setResult(null);
    setIsAnimating(false);
    setInputMethod('manual');
  };

  const handleSave = async () => {
    if (!result) {
      Alert.alert('Error', 'Run a calculation before saving.');
      return;
    }

    if (!saveName.trim()) {
      Alert.alert('Error', 'Please enter a name for this calculation.');
      return;
    }

    setIsSaving(true);
    try {
      if (shareCalculation && !isBackendConfigured) {
        throw new Error('Share codes require the backend so other riders can look them up.');
      }

      const deviceId = await getDeviceId();
      const locationToSave =
        includeLocation && !currentLocation
          ? await loadCurrentLocation()
          : currentLocation;
      const payload = {
        device_id: deviceId,
        name: saveName,
        description: saveDescription,
        calculation: result,
        location: includeLocation ? locationToSave : null,
        share: shareCalculation,
      };

      let savedData: SavedCalculation;
      let savedLocallyWithoutShare = false;

      if (isBackendConfigured) {
        try {
          savedData = await fetchJsonWithBackend<SavedCalculation>(
            '/api/save-calculation',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
        } catch {
          savedData = await saveCalculationLocally({
            ...payload,
            share: shareCalculation ? false : payload.share,
          });
          savedLocallyWithoutShare = shareCalculation;
        }
      } else {
        savedData = await saveCalculationLocally(payload);
      }

      setShowSaveModal(false);
      setSaveName('');
      setSaveDescription('');

      const shareCode = savedData.share_code;

      if (shareCalculation && shareCode) {
        Alert.alert(
          'Saved & Shared!',
          `Your calculation has been saved.\n\nShare Code: ${shareCode}`,
          [
            { text: 'Copy Code', onPress: () => handleShareCode(shareCode) },
            { text: 'OK' },
          ]
        );
      } else if (savedLocallyWithoutShare) {
        Alert.alert(
          'Saved Locally',
          'The calculation was saved on this device, but a share code could not be created because the backend was unavailable.'
        );
      } else {
        Alert.alert('Saved!', 'Your calculation has been saved successfully.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save calculation.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Check out my dirt bike jump calculation!\n\nShare Code: ${code}\n\nRequired Speed: ${useMetric ? result?.required_speed_kph : result?.required_speed_mph} ${useMetric ? 'km/h' : 'mph'}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleQuickShare = async () => {
    if (!result) return;

    try {
      await Share.share({
        message: `Dirt Bike Jump Calculator Results:\n\nRequired Speed: ${useMetric ? result.required_speed_kph : result.required_speed_mph} ${useMetric ? 'km/h' : 'mph'}\nSafe Speed (+15%): ${useMetric ? result.safety_speed_kph : result.safety_speed_mph} ${useMetric ? 'km/h' : 'mph'}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const replayAnimation = () => {
    setAnimationProgress(0);
    setIsAnimating(true);
  };

  const openSaveModal = async () => {
    setShowSaveModal(true);

    if (includeLocation && !currentLocation) {
      await loadCurrentLocation();
    }
  };

  const toggleIncludeLocation = async () => {
    const nextValue = !includeLocation;
    setIncludeLocation(nextValue);

    if (nextValue && !currentLocation) {
      await loadCurrentLocation();
    }
  };

  const toggleShareCalculation = () => {
    if (!isBackendConfigured) {
      Alert.alert(
        'Backend Required',
        'Share codes are only available when the backend is configured, because other riders need a shared lookup service.'
      );
      return;
    }

    setShareCalculation(!shareCalculation);
  };

  const openCallHelpModal = () => {
    setShowCallHelpModal(true);
  };

  const confirmCallForHelp = async () => {
    setShowCallHelpModal(false);

    // Logging is strictly best-effort and silent: console.log only, never an Alert,
    // and never awaited before opening the dialer so emergency calling is never delayed.
    void (async () => {
      try {
        const emergencyDeviceId = await getEmergencyDeviceId();
        const location = currentLocation ?? (await loadCurrentLocation());
        await logCallForHelp(emergencyDeviceId, location);
      } catch (error) {
        console.log('Error logging call-for-help attempt:', error);
      }
    })();

    try {
      // This only opens the phone dialer pre-filled with 911 — the user must
      // still manually press "Call". The app never auto-dials.
      await Linking.openURL('tel:911');
    } catch {
      Alert.alert('Unable to Open Dialer', 'Please dial 911 manually from your phone.');
    }
  };

  const openAlertRidersModal = async () => {
    try {
      const emergencyDeviceId = await getEmergencyDeviceId();
      const settings = await getEmergencySettings(emergencyDeviceId);

      if (!settings.location_sharing_enabled) {
        Alert.alert(
          'Location Sharing Required',
          'Enable location sharing in Emergency Settings before alerting nearby riders. Your exact location is never broadcast — it is only used to privately check who is within 5 miles.'
        );
        return;
      }

      setShowAlertRidersModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unable to check emergency settings.');
    }
  };

  const confirmAlertNearbyRiders = async () => {
    setShowAlertRidersModal(false);

    const lastSentAt = await getLastNearbyAlertSentAt();
    const remainingCooldownMs = getRemainingAlertCooldownMs(lastSentAt);
    if (remainingCooldownMs > 0) {
      Alert.alert(
        'Please Wait',
        `To prevent spam, you can send another rider alert in ${Math.ceil(remainingCooldownMs / 1000)} seconds.`
      );
      return;
    }

    setIsSendingAlert(true);
    try {
      const emergencyDeviceId = await getEmergencyDeviceId();
      const location = currentLocation ?? (await loadCurrentLocation());

      if (!location) {
        throw new Error('Location is required to alert nearby riders. Please enable location access.');
      }

      if (isBackendConfigured) {
        const response = await sendNearbyRidersAlert(emergencyDeviceId, location);
        await setLastNearbyAlertSentAt(Date.now());
        Alert.alert('Alert Sent', response.message);
      } else {
        await setLastNearbyAlertSentAt(Date.now());
        Alert.alert(
          'Backend Unavailable',
          'Nearby riders could not be notified because the backend is not configured. Always call 911 directly for real emergencies.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send alert. Please try again or call 911 directly.');
    } finally {
      setIsSendingAlert(false);
    }
  };

  const distanceUnit = useMetric ? 'm' : 'ft';
  const weightUnit = useMetric ? 'kg' : 'lbs';
  const speedUnit = useMetric ? 'km/h' : 'mph';

  // Trajectory visualization component
  const renderTrajectory = () => {
    if (!result || !result.trajectory_points || result.trajectory_points.length === 0) return null;

    const svgWidth = width - 40;
    const svgHeight = 180;
    const padding = 30;

    const points = result.trajectory_points;
    const maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y));
    const minY = Math.min(...points.map(p => p.y), 0);

    const scaleX = (svgWidth - padding * 2) / maxX;
    const scaleY = (svgHeight - padding * 2) / (maxY - minY);

    const transformX = (x: number) => padding + x * scaleX;
    const transformY = (y: number) => svgHeight - padding - (y - minY) * scaleY;

    // Create path data
    const pathData = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${transformX(p.x)} ${transformY(p.y)}`)
      .join(' ');

    // Current bike position based on animation
    const currentIndex = Math.floor(animationProgress * (points.length - 1));
    const currentPoint = points[currentIndex] || points[0];
    const landingHeightFeet =
      result.input_data.unit_system === 'metric'
        ? (result.input_data.landing_height || 0) * 3.28084
        : result.input_data.landing_height || 0;

    // Ramp visualization
    const rampLength = maxX * 0.15;
    const rampAngleRad = (result.input_data.ramp_angle * Math.PI) / 180;
    const rampHeight = rampLength * Math.tan(rampAngleRad);

    return (
      <View style={styles.trajectoryContainer}>
        <View style={styles.trajectoryHeader}>
          <Text style={styles.trajectoryTitle}>
            <Ionicons name="analytics" size={18} color="#82B6FF" /> Flight Trajectory
          </Text>
          <TouchableOpacity onPress={replayAnimation} style={styles.replayButton}>
            <Ionicons name="play-circle" size={24} color="#A6D608" />
            <Text style={styles.replayText}>Replay</Text>
          </TouchableOpacity>
        </View>

        <Svg width={svgWidth} height={svgHeight} style={styles.svg}>
          {/* Ground line */}
          <Line
            x1={padding}
            y1={transformY(0)}
            x2={svgWidth - padding}
            y2={transformY(0)}
            stroke="#52666C"
            strokeWidth="2"
          />

          {/* Ramp */}
          <Polygon
            points={`${padding},${transformY(0)} ${transformX(rampLength)},${transformY(0)} ${padding},${transformY(rampHeight)}`}
            fill="#A6D608"
            opacity={0.5}
          />
          <Line
            x1={padding}
            y1={transformY(rampHeight)}
            x2={transformX(rampLength)}
            y2={transformY(0)}
            stroke="#A6D608"
            strokeWidth="3"
          />

          {/* Landing zone */}
          <Line
            x1={transformX(maxX * 0.85)}
            y1={transformY(landingHeightFeet)}
            x2={svgWidth - padding}
            y2={transformY(landingHeightFeet)}
            stroke="#8BD6A7"
            strokeWidth="3"
          />

          {/* Gap indicator */}
          <Line
            x1={transformX(rampLength)}
            y1={transformY(0) + 15}
            x2={transformX(maxX * 0.85)}
            y2={transformY(0) + 15}
            stroke="#C2D0CE"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <SvgText
            x={(transformX(rampLength) + transformX(maxX * 0.85)) / 2}
            y={transformY(0) + 28}
            fill="#C2D0CE"
            fontSize="10"
            textAnchor="middle"
          >
            {result.input_data.gap_distance} {distanceUnit}
          </SvgText>

          {/* Trajectory path */}
          <Path
            d={pathData}
            stroke="#82B6FF"
            strokeWidth="2"
            fill="none"
            strokeDasharray="5,5"
          />

          {/* Animated trajectory (solid) */}
          {animationProgress > 0 && (
            <Path
              d={points
                .slice(0, currentIndex + 1)
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${transformX(p.x)} ${transformY(p.y)}`)
                .join(' ')}
              stroke="#A6D608"
              strokeWidth="3"
              fill="none"
            />
          )}

          {/* Max height indicator */}
          <Line
            x1={transformX(maxX / 2)}
            y1={transformY(maxY)}
            x2={transformX(maxX / 2)}
            y2={transformY(0)}
            stroke="#B79CFF"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity={0.5}
          />
          <SvgText
            x={transformX(maxX / 2) + 5}
            y={transformY(maxY) + 12}
            fill="#B79CFF"
            fontSize="9"
          >
            {useMetric ? result.max_height_meters : result.max_height_feet} {useMetric ? 'm' : 'ft'}
          </SvgText>

          {/* Bike position */}
          <G>
            <Circle
              cx={transformX(currentPoint.x)}
              cy={transformY(currentPoint.y)}
              r="8"
              fill="#A6D608"
            />
            <Circle
              cx={transformX(currentPoint.x)}
              cy={transformY(currentPoint.y)}
              r="12"
              fill="none"
              stroke="#A6D608"
              strokeWidth="2"
              opacity={0.5}
            />
          </G>
        </Svg>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#A6D608' }]} />
            <Text style={styles.legendText}>Ramp</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#267A58' }]} />
            <Text style={styles.legendText}>Landing</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#82B6FF' }]} />
            <Text style={styles.legendText}>Path</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.logoWatermarkContainer}>
        <Image
          source={require('../../assets/images/wreckless-logo.jpg')}
          style={styles.logoWatermark}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View
          accessibilityRole="header"
          accessibilityLabel="Be safer, ride better, wreck less!"
          style={styles.sloganHeader}
        >
          <View style={styles.sloganSideSpace} />
          <View style={styles.sloganCopy}>
            <Text style={styles.sloganFirstLine}>BE SAFER, RIDE BETTER</Text>
            <Text style={styles.sloganSecondLine}>WRECK LESS!</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Instructions"
            accessibilityHint="Replay the beginner walkthrough"
            onPress={startBeginnerGuide}
            style={styles.instructionsButton}
          >
            <Ionicons name="help-circle-outline" size={16} color="#A6D608" />
            <Text style={styles.instructionsButtonText}>Instructions</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputMethodTabs}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: inputMethod === 'manual' }}
            onPress={() => {
              measureScreenRef.current?.stopAngleMeasurement();
              setInputMethod('manual');
            }}
            style={[styles.inputMethodTab, inputMethod === 'manual' && styles.inputMethodTabActive]}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color={inputMethod === 'manual' ? '#000000' : '#C2D0CE'}
            />
            <View>
              <Text style={[styles.inputMethodTitle, inputMethod === 'manual' && styles.inputMethodTextActive]}>
                Enter Manually
              </Text>
              <Text style={[styles.inputMethodSubtitle, inputMethod === 'manual' && styles.inputMethodTextActive]}>
                Type jump details
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: inputMethod === 'measure' }}
            onPress={() => setInputMethod('measure')}
            style={[styles.inputMethodTab, inputMethod === 'measure' && styles.inputMethodTabActive]}
          >
            <Ionicons
              name="camera"
              size={19}
              color={inputMethod === 'measure' ? '#000000' : '#C2D0CE'}
            />
            <View>
              <Text style={[styles.inputMethodTitle, inputMethod === 'measure' && styles.inputMethodTextActive]}>
                Measure
              </Text>
              <Text style={[styles.inputMethodSubtitle, inputMethod === 'measure' && styles.inputMethodTextActive]}>
                Use phone or photo
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.inputMethodContent,
            { display: inputMethod === 'manual' ? 'flex' : 'none' },
          ]}
        >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Unit Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.unitLabel}>Units</Text>
            <TouchableOpacity
              style={[styles.toggleButton, !useMetric && styles.toggleActive]}
              onPress={() => setUseMetric(false)}
            >
              <Text style={[styles.toggleText, !useMetric && styles.toggleTextActive]}>Feet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, useMetric && styles.toggleActive]}
              onPress={() => setUseMetric(true)}
            >
              <Text style={[styles.toggleText, useMetric && styles.toggleTextActive]}>Meters</Text>
            </TouchableOpacity>
          </View>

          {/* Input Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="construct" size={18} color="#A6D608" /> Ramp Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ramp Height ({distanceUnit}) <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={rampHeight}
                onChangeText={setRampHeight}
                placeholder={`e.g., ${useMetric ? '1.5' : '5'}`}
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ramp Angle (degrees) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={rampAngle}
                onChangeText={setRampAngle}
                placeholder="e.g., 30"
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              <Ionicons name="resize" size={18} color="#A6D608" /> Jump Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gap Distance ({distanceUnit}) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={gapDistance}
                onChangeText={setGapDistance}
                placeholder={`e.g., ${useMetric ? '15' : '50'}`}
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Landing Height Diff ({distanceUnit}) <Text style={styles.optional}>(optional, - if lower)</Text></Text>
              <TextInput
                style={styles.input}
                value={landingHeight}
                onChangeText={setLandingHeight}
                placeholder="e.g., -3"
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              <Ionicons name="body" size={18} color="#A6D608" /> Weight Details
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirt Bike Weight ({weightUnit}) <Text style={styles.required}>*</Text></Text>
                {selectedMotorcycle && (
                  <Text style={styles.helperText}>
                    Filled from {selectedMotorcycle.year} {selectedMotorcycle.brand} {selectedMotorcycle.model}. Change the bike in My Bike.
                  </Text>
                )}
                <TextInput
                  style={styles.input}
                value={bikeWeight}
                onChangeText={setBikeWeight}
                placeholder={`e.g., ${useMetric ? '100' : '220'}`}
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rider Weight ({weightUnit}) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={riderWeight}
                onChangeText={setRiderWeight}
                placeholder={`e.g., ${useMetric ? '75' : '165'}`}
                placeholderTextColor="#9AADB0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.calculateButton}
              onPress={calculateSpeed}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Ionicons name="calculator" size={20} color="#000000" />
                  <Text style={styles.calculateButtonText}>Calculate Speed</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
              <Ionicons name="refresh" size={20} color="#A6D608" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          {result && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  <Ionicons name="checkmark-circle" size={22} color="#8BD6A7" /> Results
                </Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity onPress={handleQuickShare} style={styles.actionButton}>
                    <Ionicons name="share-social" size={20} color="#82B6FF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openSaveModal} style={styles.actionButton}>
                    <Ionicons name="bookmark" size={20} color="#A6D608" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Trajectory Visualization */}
              {renderTrajectory()}

              {/* Main Speed Result */}
              <View style={styles.mainResultCard}>
                <Text style={styles.mainResultLabel}>Required Speed</Text>
                <Text style={styles.mainResultValue}>
                  {useMetric ? result.required_speed_kph : result.required_speed_mph}
                  <Text style={styles.mainResultUnit}> {speedUnit}</Text>
                </Text>
              </View>

              <View style={styles.pacingCard}>
                <View style={styles.pacingHeader}>
                  <View style={styles.pacingCopy}>
                    <Text style={styles.pacingTitle}>Audible Pace Guidance</Text>
                    <Text style={styles.pacingDescription}>
                      Hear how your live GPS speed compares with this calculation.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={isPacingActive ? 'Stop audible pacing guidance' : 'Start audible pacing guidance'}
                    onPress={() => {
                      if (isPacingActive) {
                        stopPacing();
                      } else {
                        void startPacing();
                      }
                    }}
                    style={[styles.pacingButton, isPacingActive && styles.pacingButtonActive]}
                  >
                    <Ionicons
                      name={isPacingActive ? 'volume-mute' : 'volume-high'}
                      size={18}
                      color={isPacingActive ? '#F5FAF8' : '#000000'}
                    />
                    <Text style={[styles.pacingButtonText, isPacingActive && styles.pacingButtonTextActive]}>
                      {isPacingActive ? 'Stop' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {isPacingActive && (
                  <View style={styles.pacingStatusRow}>
                    <View style={styles.pacingStatusCopy}>
                      <Text style={styles.pacingStatusText}>
                        {pacingStatus || 'Waiting for GPS speed…'}
                      </Text>
                      <Text style={styles.pacingSpeedText}>
                        {pacingSpeed === null ? '—' : pacingSpeed.toFixed(1)} {speedUnit}
                      </Text>
                    </View>
                  </View>
                )}
                <Text style={styles.pacingDisclaimer}>
                  Keep the app open for live GPS updates. GPS can lag; this is only an estimate, not a safety or go/no-go signal. Ride only on a closed course with qualified supervision, and never use audio that blocks awareness of hazards.
                </Text>
              </View>

              {/* Safety Speed */}
              <View style={styles.safetyCard}>
                <Ionicons name="shield-checkmark" size={24} color="#E8B86D" />
                <View style={styles.safetyContent}>
                  <Text style={styles.safetyLabel}>Recommended Safe Speed (+15%)</Text>
                  <Text style={styles.safetyValue}>
                    {useMetric ? result.safety_speed_kph : result.safety_speed_mph} {speedUnit}
                  </Text>
                </View>
              </View>

              {/* Detailed Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="time" size={20} color="#82B6FF" />
                  <Text style={styles.statValue}>{result.flight_time_seconds}s</Text>
                  <Text style={styles.statLabel}>Flight Time</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="arrow-up" size={20} color="#B79CFF" />
                  <Text style={styles.statValue}>
                    {useMetric ? result.max_height_meters : result.max_height_feet}
                    {useMetric ? 'm' : 'ft'}
                  </Text>
                  <Text style={styles.statLabel}>Max Height</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="arrow-down" size={20} color="#FF7A86" />
                  <Text style={styles.statValue}>
                    {useMetric ? result.landing_velocity_kph : result.landing_velocity_mph}
                    {speedUnit}
                  </Text>
                  <Text style={styles.statLabel}>Landing Speed</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="fitness" size={20} color="#8BD6A7" />
                  <Text style={styles.statValue}>
                    {useMetric ? result.total_weight_kg : result.total_weight_lbs}
                    {weightUnit}
                  </Text>
                  <Text style={styles.statLabel}>Total Weight</Text>
                </View>
              </View>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <View style={styles.warningsContainer}>
                  <Text style={styles.warningsTitle}>
                    <Ionicons name="warning" size={18} color="#E8B86D" /> Safety Warnings
                  </Text>
                  {result.warnings.map((warning, index) => (
                    <Text key={index} style={styles.warningText}>
                      {warning}
                    </Text>
                  ))}
                </View>
              )}

              {/* Emergency Alerts */}
              <View style={styles.emergencyContainer}>
                <View style={styles.emergencyDisclaimer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#E8B86D" />
                  <Text style={styles.emergencyDisclaimerText}>
                    This feature is NOT a substitute for calling 911. In emergencies, call 911 directly.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.callHelpButton}
                  onPress={openCallHelpModal}
                  accessibilityRole="button"
                  accessibilityLabel="Call for Help. Opens your phone dialer pre-filled with 911."
                >
                  <Ionicons name="alert-circle" size={26} color="#F5FAF8" />
                  <Text style={styles.callHelpButtonText}>Call for Help</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.alertRidersButton}
                  onPress={openAlertRidersModal}
                  disabled={isSendingAlert}
                  accessibilityRole="button"
                  accessibilityLabel="Alert Nearby Riders. Notifies opted-in riders within 5 miles that help may be needed."
                >
                  {isSendingAlert ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <>
                      <Ionicons name="heart" size={26} color="#F5FAF8" />
                      <Text style={styles.alertRidersButtonText}>Alert Nearby Riders</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color="#C2D0CE" />
            <Text style={styles.disclaimerText}>
              This calculator provides estimates based on ideal physics conditions. Actual results may vary due to wind, surface conditions, bike setup, and rider technique. Always prioritize safety and call 911 in emergencies.
            </Text>
          </View>
        </ScrollView>
        </View>

        <View
          style={[
            styles.measureContent,
            { display: inputMethod === 'measure' ? 'flex' : 'none' },
          ]}
        >
          <MeasureScreen
            ref={measureScreenRef}
            onUseMeasurements={applyMeasurements}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Save Modal */}
      <Modal
        visible={showSaveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Calculation</Text>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <Ionicons name="close" size={24} color="#F5FAF8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={saveName}
                  onChangeText={setSaveName}
                  placeholder="e.g., Backyard Gap Jump"
                  placeholderTextColor="#9AADB0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={saveDescription}
                  onChangeText={setSaveDescription}
                  placeholder="Add notes about this jump..."
                  placeholderTextColor="#9AADB0"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={toggleIncludeLocation}
              >
                <Ionicons
                  name={includeLocation ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#A6D608"
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Include Location</Text>
                  <Text style={styles.optionSubtitle}>
                    {currentLocation ? currentLocation.address || 'Location available' : 'Location not available'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={toggleShareCalculation}
              >
                <Ionicons
                  name={shareCalculation ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#A6D608"
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Share with Others</Text>
                  <Text style={styles.optionSubtitle}>
                    {isBackendConfigured ? 'Generate a share code' : 'Requires backend connection'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <>
                    <Ionicons name="bookmark" size={20} color="#000000" />
                    <Text style={styles.saveButtonText}>Save Calculation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Call for Help Confirmation Modal */}
      <Modal
        visible={showCallHelpModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCallHelpModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="alert-circle" size={40} color="#FF7A86" style={styles.confirmModalIcon} />
            <Text style={styles.confirmModalTitle}>Are you injured?</Text>
            <Text style={styles.confirmModalBody}>
              You will be calling emergency services directly. This opens your phone&apos;s dialer
              pre-filled with 911 — you must press Call to connect.
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowCallHelpModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalCallButton}
                onPress={confirmCallForHelp}
              >
                <Ionicons name="call" size={18} color="#F5FAF8" />
                <Text style={styles.confirmModalCallText}>Call 911</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Nearby Riders Confirmation Modal */}
      <Modal
        visible={showAlertRidersModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAlertRidersModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="heart" size={40} color="#8BD6A7" style={styles.confirmModalIcon} />
            <Text style={styles.confirmModalTitle}>Alert nearby riders?</Text>
            <Text style={styles.confirmModalBody}>
              Other riders within 5 miles will be notified that help may be needed.
            </Text>
            <Text style={styles.confirmModalDisclaimer}>
              This is an unverified report. Always call 911 for emergencies.
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowAlertRidersModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalAlertButton}
                onPress={confirmAlertNearbyRiders}
              >
                <Ionicons name="send" size={18} color="#F5FAF8" />
                <Text style={styles.confirmModalAlertText}>Send Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081116',
  },
  keyboardView: {
    flex: 1,
  },
  sloganHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 10,
  },
  sloganSideSpace: {
    width: 96,
  },
  sloganCopy: {
    flex: 1,
    alignItems: 'center',
  },
  instructionsButton: {
    width: 96,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#49636A',
    borderRadius: 18,
    backgroundColor: '#14252C',
  },
  instructionsButtonText: {
    color: '#F5FAF8',
    fontSize: 11,
    fontWeight: '700',
  },
  sloganFirstLine: {
    color: '#F5FAF8',
    fontFamily: 'sans-serif-condensed',
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sloganSecondLine: {
    color: '#A6D608',
    fontFamily: 'sans-serif-condensed',
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  inputMethodTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 37, 44, 0.92)',
  },
  inputMethodTab: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  inputMethodTabActive: {
    backgroundColor: '#A6D608',
  },
  inputMethodTitle: {
    color: '#C2D0CE',
    fontSize: 13,
    fontWeight: '700',
  },
  inputMethodSubtitle: {
    marginTop: 2,
    color: '#C2D0CE',
    fontSize: 10,
  },
  inputMethodTextActive: {
    color: '#000000',
  },
  inputMethodContent: {
    flex: 1,
  },
  measureContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  logoWatermarkContainer: {
    position: 'absolute',
    top: 0,
    left: '-25%',
    width: '150%',
    height: 620,
  },
  logoWatermark: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F5FAF8',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#C2D0CE',
    marginTop: 6,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 37, 44, 0.78)',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    alignSelf: 'flex-start',
    gap: 3,
  },
  unitLabel: {
    color: '#C2D0CE',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 9,
  },
  toggleButton: {
    flex: 0,
    minWidth: 76,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#A6D608',
  },
  toggleText: {
    color: '#C2D0CE',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#000000',
  },
  formContainer: {
    backgroundColor: 'rgba(20, 37, 44, 0.76)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5FAF8',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#CED9D6',
    marginBottom: 8,
  },
  required: {
    color: '#A6D608',
  },
  optional: {
    color: '#9AADB0',
    fontSize: 12,
  },
  input: {
    backgroundColor: 'rgba(29, 51, 58, 0.84)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#F5FAF8',
    borderWidth: 1,
    borderColor: '#405C65',
  },
  helperText: {
    color: '#9AADB0',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  calculateButton: {
    flex: 2,
    backgroundColor: '#A6D608',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  calculateButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: 'rgba(20, 37, 44, 0.78)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#A6D608',
  },
  clearButtonText: {
    color: '#A6D608',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: 'rgba(20, 37, 44, 0.76)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5FAF8',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    backgroundColor: 'rgba(29, 51, 58, 0.84)',
    borderRadius: 8,
  },
  trajectoryContainer: {
    backgroundColor: 'rgba(29, 51, 58, 0.78)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  trajectoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trajectoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5FAF8',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replayText: {
    color: '#A6D608',
    fontSize: 12,
  },
  svg: {
    alignSelf: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    color: '#C2D0CE',
    fontSize: 11,
  },
  mainResultCard: {
    backgroundColor: 'rgba(29, 51, 58, 0.78)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8BD6A7',
  },
  mainResultLabel: {
    fontSize: 14,
    color: '#C2D0CE',
    marginBottom: 8,
  },
  mainResultValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8BD6A7',
  },
  mainResultUnit: {
    fontSize: 24,
    fontWeight: 'normal',
  },
  pacingCard: {
    backgroundColor: 'rgba(29, 51, 58, 0.78)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#405C65',
  },
  pacingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pacingCopy: {
    flex: 1,
  },
  pacingTitle: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '700',
  },
  pacingDescription: {
    color: '#C2D0CE',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  pacingButton: {
    minWidth: 86,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#A6D608',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pacingButtonActive: {
    backgroundColor: '#B94D5B',
  },
  pacingButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  pacingButtonTextActive: {
    color: '#F5FAF8',
  },
  pacingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#405C65',
  },
  pacingStatusCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pacingStatusText: {
    color: '#A6D608',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  pacingSpeedText: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '700',
  },
  pacingDisclaimer: {
    color: '#E8B86D',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  safetyCard: {
    backgroundColor: 'rgba(232, 184, 109, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 109, 0.3)',
  },
  safetyContent: {
    marginLeft: 12,
    flex: 1,
  },
  safetyLabel: {
    fontSize: 12,
    color: '#E8B86D',
    marginBottom: 4,
  },
  safetyValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E8B86D',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(29, 51, 58, 0.78)',
    borderRadius: 12,
    padding: 16,
    width: (width - 76) / 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5FAF8',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#C2D0CE',
    marginTop: 4,
  },
  warningsContainer: {
    backgroundColor: 'rgba(232, 184, 109, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 109, 0.3)',
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8B86D',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#F2D39A',
    marginBottom: 8,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 32, 39, 0.82)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#C2D0CE',
    lineHeight: 18,
  },
  // Emergency alert styles
  emergencyContainer: {
    marginTop: 16,
  },
  emergencyDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(232, 184, 109, 0.1)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 109, 0.3)',
  },
  emergencyDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#F2D39A',
    lineHeight: 16,
    fontWeight: '600',
  },
  callHelpButton: {
    backgroundColor: '#FF7A86',
    borderRadius: 12,
    padding: 18,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  callHelpButtonText: {
    color: '#F5FAF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertRidersButton: {
    backgroundColor: '#267A58',
    borderRadius: 12,
    padding: 18,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  alertRidersButtonText: {
    color: '#F5FAF8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 16, 0.84)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1B3038',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confirmModalIcon: {
    marginBottom: 12,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5FAF8',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalBody: {
    fontSize: 14,
    color: '#CED9D6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmModalDisclaimer: {
    fontSize: 12,
    color: '#E8B86D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '600',
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  confirmModalCancelButton: {
    flex: 1,
    backgroundColor: '#28434B',
    borderRadius: 12,
    padding: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelText: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalCallButton: {
    flex: 1,
    backgroundColor: '#FF7A86',
    borderRadius: 12,
    padding: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalCallText: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmModalAlertButton: {
    flex: 1,
    backgroundColor: '#267A58',
    borderRadius: 12,
    padding: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalAlertText: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 16, 0.84)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B3038',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#405C65',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5FAF8',
  },
  modalBody: {
    padding: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#28434B',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: '#F5FAF8',
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#C2D0CE',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#A6D608',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
