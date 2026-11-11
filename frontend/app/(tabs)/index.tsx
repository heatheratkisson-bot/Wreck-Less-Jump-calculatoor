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
  Modal,
  Share,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { getPreferredUnitSystem, savePreferredUnitSystem } from '@/lib/preferences';
import MeasureScreen from './measure';
import type { MeasureScreenHandle, Measurements } from './measure';
import { useBeginnerGuide } from '@/lib/BeginnerGuideContext';
import type { MotorcycleModel } from '@/lib/motorcycleData';
import Svg, { Path, Circle, Line, Text as SvgText, G, Polygon, Rect } from 'react-native-svg';
import * as Location from 'expo-location';
import {
  calculateJumpLocally,
  CalculationResult,
  applyMotorcycleAdjustmentsToResult,
  fetchJsonWithBackend,
  getDeviceId,
  getSavedRiderWeight,
  getSelectedMotorcycle,
  getEmergencyDeviceId,
  getEmergencySettings,
  getLastNearbyAlertSentAt,
  getRemainingAlertCooldownMs,
  getRiderProfileData,
  isBackendConfigured,
  JumpCalculationInput,
  LocationData,
  logCallForHelp,
  recordRiderJump,
  SavedCalculation,
  saveCalculationLocally,
  sendNearbyRidersAlert,
  setLastNearbyAlertSentAt,
} from '@/lib/appSupport';

export default function Index() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWideLayout = windowWidth >= 400 && windowWidth > windowHeight;
  const router = useRouter();
  const { startBeginnerGuide } = useBeginnerGuide();
  // Input states
  const [rampHeight, setRampHeight] = useState('');
  const [rampAngle, setRampAngle] = useState('');
  const [gapDistance, setGapDistance] = useState('');
  const [bikeWeight, setBikeWeight] = useState('');
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<MotorcycleModel | null>(null);
  const [riderWeight, setRiderWeight] = useState('');
  const [landingHeight, setLandingHeight] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [inputStep, setInputStep] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showResultsPage, setShowResultsPage] = useState(false);
  const [pendingGhostTrajectoryParams, setPendingGhostTrajectoryParams] = useState<{
    speedMph: string;
    gapFeet: string;
    rampAngle: string;
    rampHeightFeet: string;
    landingHeightFeet: string;
  } | null>(null);
  const [useMetric, setUseMetric] = useState(false);
  const [inputMethod, setInputMethod] = useState<'manual' | 'measure'>('manual');
  const measureScreenRef = useRef<MeasureScreenHandle>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isPacingActive, setIsPacingActive] = useState(false);
  const [pacingSpeed, setPacingSpeed] = useState<number | null>(null);
  const [pacingStatus, setPacingStatus] = useState('');
  const pacingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const pacingRequestedRef = useRef(false);
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
  const [isLoggingSimulatedJump, setIsLoggingSimulatedJump] = useState(false);
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
      const loadRiderSettings = async () => {
        try {
          const preferredUnits = await getPreferredUnitSystem();
          if (!isMounted) {
            return;
          }
          const metric = preferredUnits === 'metric';
          setUseMetric(metric);

          try {
            const motorcycle = await getSelectedMotorcycle();
            if (isMounted) {
              setSelectedMotorcycle(motorcycle);
              const weight = metric ? motorcycle.weight_lbs / 2.20462 : motorcycle.weight_lbs;
              setBikeWeight(weight.toFixed(1));
            }
          } catch (error) {
            console.error('Could not load selected bike weight:', error);
          }

          try {
            const savedRiderWeight = await getSavedRiderWeight();
            if (isMounted && savedRiderWeight !== null) {
              const riderWeightValue = metric ? savedRiderWeight / 2.20462 : savedRiderWeight;
              setRiderWeight(riderWeightValue.toFixed(1));
            }
          } catch (error) {
            console.error('Could not load saved rider weight:', error);
          }
        } catch (error) {
          console.error('Could not load unit preference:', error);
        }
      };

      void loadRiderSettings();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const updateUnitPreference = async (metric: boolean) => {
    const previousValue = useMetric;
    setUseMetric(metric);
    try {
      await savePreferredUnitSystem(metric ? 'metric' : 'imperial');
    } catch (error) {
      console.error('Could not save unit preference:', error);
      setUseMetric(previousValue);
      Alert.alert('Could not save units', 'Your unit preference was not changed. Please try again.');
    }
  };

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
      return () => {
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

  useEffect(() => {
    if (
      !pendingGhostTrajectoryParams ||
      showResultsPage ||
      Platform.OS === 'ios'
    ) {
      return;
    }
    const timeout = setTimeout(() => {
      router.push({
        pathname: '/ghost-ar',
        params: pendingGhostTrajectoryParams,
      });
      setPendingGhostTrajectoryParams(null);
    }, 350);

    return () => clearTimeout(timeout);
  }, [pendingGhostTrajectoryParams, router, showResultsPage]);

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
      if (!pacingRequestedRef.current) {
        return;
      }
      if (permission.status !== 'granted') {
        pacingRequestedRef.current = false;
        setPacingStatus('Location permission is required for speed guidance.');
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
      if (!pacingRequestedRef.current) {
        subscription.remove();
        return;
      }

      pacingSubscriptionRef.current = subscription;
      setIsPacingActive(true);
    } catch (error) {
      if (!pacingRequestedRef.current) {
        return;
      }
      pacingRequestedRef.current = false;
      console.error('Could not start live speed guidance:', error);
      setPacingStatus('Could not start speed guidance. Check location settings and try again.');
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
      setShowResultsPage(true);
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
    setShowResultsPage(false);
    setAnimationProgress(0);
    setInputStep(0);
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

  const logSimulatedJump = async () => {
    if (!result) {
      Alert.alert('No simulation to log', 'Calculate a jump before adding it to your jump log.');
      return;
    }

    setIsLoggingSimulatedJump(true);
    try {
      const riderData = await getRiderProfileData();
      if (!riderData.activeProfileId) {
        Alert.alert('No active bike', 'Select or add a bike in your profile before logging a jump.');
        return;
      }

      const gapFeet =
        result.input_data.unit_system === 'metric'
          ? result.input_data.gap_distance * 3.28084
          : result.input_data.gap_distance;

      await recordRiderJump({
        profileId: riderData.activeProfileId,
        speedMph: result.required_speed_mph,
        gapFeet,
        jumpHeightFeet: result.max_height_feet,
        outcome: 'completed',
      });

      Alert.alert('Jump logged', 'Simulator values were added to the active bike as a completed jump.');
    } catch (error) {
      console.error('Error logging simulated jump:', error);
      Alert.alert(
        'Could not log jump',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsLoggingSimulatedJump(false);
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
  const inputSteps = [
    {
      key: 'rampHeight',
      title: 'Ramp Height',
      label: `Ramp Height (${distanceUnit})`,
      value: rampHeight,
      onChangeText: setRampHeight,
      placeholder: useMetric ? 'e.g., 1.5' : 'e.g., 5',
      keyboardType: 'decimal-pad' as const,
      required: false,
      helperText: 'Optional. Leave blank if you do not know the ramp height.',
      icon: 'construct' as const,
    },
    {
      key: 'gapDistance',
      title: 'Gap Distance',
      label: `Gap Distance (${distanceUnit})`,
      value: gapDistance,
      onChangeText: setGapDistance,
      placeholder: useMetric ? 'e.g., 15' : 'e.g., 50',
      keyboardType: 'decimal-pad' as const,
      required: true,
      helperText: '',
      icon: 'resize' as const,
    },
    {
      key: 'rampAngle',
      title: 'Ramp Angle',
      label: 'Ramp Angle (degrees)',
      value: rampAngle,
      onChangeText: setRampAngle,
      placeholder: 'e.g., 30',
      keyboardType: 'decimal-pad' as const,
      required: true,
      helperText: 'Enter an angle greater than 0° and less than 90°.',
      icon: 'trending-up' as const,
    },
    {
      key: 'landingHeight',
      title: 'Landing Height',
      label: `Landing Height Difference (${distanceUnit})`,
      value: landingHeight,
      onChangeText: setLandingHeight,
      placeholder: 'e.g., -3',
      keyboardType: 'numbers-and-punctuation' as const,
      required: false,
      helperText: 'Optional. Use a negative number if the landing is lower.',
      icon: 'arrow-down' as const,
    },
    {
      key: 'bikeWeight',
      title: 'Dirt Bike Weight',
      label: `Dirt Bike Weight (${weightUnit})`,
      value: bikeWeight,
      onChangeText: setBikeWeight,
      placeholder: useMetric ? 'e.g., 100' : 'e.g., 220',
      keyboardType: 'decimal-pad' as const,
      required: true,
      helperText: selectedMotorcycle
        ? `${selectedMotorcycle.year} ${selectedMotorcycle.brand} ${selectedMotorcycle.model} profile default. Editable for this calculation.`
        : 'Enter the weight of your dirt bike.',
      icon: 'bicycle' as const,
    },
    {
      key: 'riderWeight',
      title: 'Rider Weight',
      label: `Rider Weight (${weightUnit})`,
      value: riderWeight,
      onChangeText: setRiderWeight,
      placeholder: useMetric ? 'e.g., 75' : 'e.g., 165',
      keyboardType: 'decimal-pad' as const,
      required: true,
      helperText: 'Synced from Rider Profile. Editable for this calculation.',
      icon: 'person' as const,
    },
  ];
  const currentInputStep = inputSteps[inputStep];

  const advanceInputStep = () => {
    if (!currentInputStep) {
      return;
    }

    const value = currentInputStep.value.trim();
    const number = Number(value);
    if (currentInputStep.required && !value) {
      Alert.alert('Missing Information', `${currentInputStep.label} is required.`);
      return;
    }
    if (value && !Number.isFinite(number)) {
      Alert.alert('Invalid Number', `Enter a valid number for ${currentInputStep.label}.`);
      return;
    }
    if (currentInputStep.key === 'rampAngle' && (number <= 0 || number >= 90)) {
      Alert.alert('Invalid Angle', 'Ramp angle must be between 0 and 90 degrees.');
      return;
    }
    if (currentInputStep.key === 'gapDistance' && number <= 0) {
      Alert.alert('Invalid Distance', 'Gap distance must be greater than 0.');
      return;
    }
    if (
      (currentInputStep.key === 'bikeWeight' || currentInputStep.key === 'riderWeight') &&
      number <= 0
    ) {
      Alert.alert('Invalid Weight', 'Bike weight and rider weight must be greater than 0.');
      return;
    }

    setFocusedField(null);
    setInputStep((step) => Math.min(step + 1, inputSteps.length - 1));
  };

  // Trajectory visualization component
  const renderTrajectory = () => {
    if (!result || !result.trajectory_points || result.trajectory_points.length === 0) return null;

    const svgWidth = Math.max(windowWidth - 102, 220);
    const svgHeight = 228;
    const plotLeft = 46;
    const plotRight = 12;
    const plotTop = 14;
    const plotBottom = 50;

    const points = result.trajectory_points;
    const gapFeet =
      result.input_data.unit_system === 'metric'
        ? result.input_data.gap_distance * 3.28084
        : result.input_data.gap_distance;
    const landingHeightFeet =
      result.input_data.unit_system === 'metric'
        ? (result.input_data.landing_height || 0) * 3.28084
        : result.input_data.landing_height || 0;
    const rampHeightFeet =
      result.input_data.unit_system === 'metric'
        ? (result.input_data.ramp_height || 0) * 3.28084
        : result.input_data.ramp_height || 0;
    const rampAngleRad = (result.input_data.ramp_angle * Math.PI) / 180;
    const rampLength =
      rampHeightFeet > 0 && Math.tan(rampAngleRad) > 0
        ? rampHeightFeet / Math.tan(rampAngleRad)
        : gapFeet * 0.12;
    const visibleRampHeight = rampHeightFeet || rampLength * Math.tan(rampAngleRad);
    const landingX = rampLength + gapFeet;
    const landingRun = gapFeet * 0.12;
    const landingRampEndX = landingX + landingRun;
    const landingWorldY = visibleRampHeight + landingHeightFeet;
    const landingRampEndY = landingWorldY - landingRun * Math.tan(rampAngleRad);
    const sceneEndX = landingRampEndX + gapFeet * 0.04;
    const flightPoints = points.map((point) => ({
      x: rampLength + point.x,
      y: visibleRampHeight + point.y,
    }));
    const apexPoint = flightPoints.reduce((highest, point) => point.y > highest.y ? point : highest);
    const flightMaxY = apexPoint.y;
    const maxY = Math.max(flightMaxY, visibleRampHeight, landingWorldY);
    const minY = Math.min(...flightPoints.map((point) => point.y), 0, landingRampEndY);

    const scaleX = (svgWidth - plotLeft - plotRight) / sceneEndX;
    const scaleY = (svgHeight - plotTop - plotBottom) / Math.max(maxY - minY, 1);

    const transformX = (x: number) => plotLeft + x * scaleX;
    const transformY = (y: number) => svgHeight - plotBottom - (y - minY) * scaleY;
    const displayDistance = (feet: number) => feet * (useMetric ? 0.3048 : 1);
    const formatDistance = (feet: number) => {
      const value = displayDistance(feet);
      return value.toFixed(Math.abs(value) < 10 ? 1 : 0);
    };
    const createTrajectoryPath = (pathPoints: typeof flightPoints) => {
      return pathPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${transformX(point.x)} ${transformY(point.y)}`)
        .join(' ');
    };
    const pathData = createTrajectoryPath(flightPoints);

    // Current bike position based on animation
    const progressIndex = animationProgress * (points.length - 1);
    const currentIndex = Math.floor(progressIndex);
    const nextIndex = Math.min(currentIndex + 1, points.length - 1);
    const segmentProgress = progressIndex - currentIndex;
    const segmentStart = flightPoints[currentIndex] || flightPoints[0];
    const segmentEnd = flightPoints[nextIndex] || segmentStart;
    const currentPoint = {
      x: segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentProgress,
      y: segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentProgress,
    };
    const orientationStart = flightPoints[Math.max(0, currentIndex - 1)] || segmentStart;
    const orientationEnd = flightPoints[Math.min(flightPoints.length - 1, currentIndex + 1)] || segmentEnd;
    const animatedPath = createTrajectoryPath(flightPoints
      .slice(0, currentIndex + 1)
      .concat(currentPoint));
    const simulatedTime = result.flight_time_seconds * animationProgress;
    const angleRadians = (result.input_data.ramp_angle * Math.PI) / 180;
    const horizontalVelocityFps = result.required_speed_fps * Math.cos(angleRadians);
    const verticalVelocityFps = result.required_speed_fps * Math.sin(angleRadians) - 32.174 * simulatedTime;
    const simulatedSpeedFps = Math.hypot(horizontalVelocityFps, verticalVelocityFps);
    const simulatedSpeed = useMetric ? simulatedSpeedFps * 1.09728 : simulatedSpeedFps * 0.681818;
    const tangentX = orientationEnd.x - orientationStart.x;
    const tangentY = orientationEnd.y - orientationStart.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const vectorScale = (sceneEndX * 0.08) / tangentLength;
    const bikeAngleDegrees = Math.atan2(-tangentY * scaleY, tangentX * scaleX) * (180 / Math.PI);
    const velocityVectorEnd = {
      x: currentPoint.x + tangentX * vectorScale,
      y: currentPoint.y + tangentY * vectorScale,
    };

    return (
      <View style={styles.trajectoryContainer}>
        <View style={styles.trajectoryHeader}>
          <Text style={styles.trajectoryTitle}>
            <Ionicons name="analytics" size={18} color="#82B6FF" /> Flight Simulator
          </Text>
          <TouchableOpacity onPress={replayAnimation} style={styles.replayButton}>
            <Ionicons name="refresh-circle" size={24} color="#A6D608" />
            <Text style={styles.replayText}>Run again</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.simulationSpeedPanel}>
          <View style={styles.simulationSpeedCard}>
            <Text style={styles.simulationSpeedLabel}>REQUIRED SPEED</Text>
            <Text style={styles.simulationSpeedValue}>
              {useMetric ? result.required_speed_kph : result.required_speed_mph}
              <Text style={styles.simulationSpeedUnit}> {speedUnit}</Text>
            </Text>
          </View>
          <View style={styles.simulationSpeedCard}>
            <Text style={styles.simulationSpeedLabel}>RECOMMENDED SPEED</Text>
            <Text style={styles.simulationSpeedValue}>
              {useMetric ? result.safety_speed_kph : result.safety_speed_mph}
              <Text style={styles.simulationSpeedUnit}> {speedUnit}</Text>
            </Text>
          </View>
        </View>

        <Svg width={svgWidth} height={svgHeight} style={styles.svg}>
          <Rect x="0" y="0" width={svgWidth} height={svgHeight} rx="10" fill="#091720" />
          <Path
            d={`M ${transformX(0)} ${transformY(0)} L ${transformX(rampLength)} ${transformY(0)} L ${transformX(rampLength)} ${svgHeight - plotBottom} L ${transformX(0)} ${svgHeight - plotBottom} Z`}
            fill="#18332C"
            opacity={0.65}
          />
          <Path
            d={`M ${transformX(landingX)} ${transformY(landingWorldY)} L ${transformX(landingRampEndX)} ${transformY(landingRampEndY)} L ${transformX(landingRampEndX)} ${svgHeight - plotBottom} L ${transformX(landingX)} ${svgHeight - plotBottom} Z`}
            fill="#173329"
            opacity={0.65}
          />
          {[0, 1, 2, 3, 4].map((tick) => {
            const fraction = tick / 4;
            const x = plotLeft + (svgWidth - plotLeft - plotRight) * fraction;
            const y = plotTop + (svgHeight - plotTop - plotBottom) * fraction;
            const elevation = minY + (maxY - minY) * (1 - fraction);
            const distance = sceneEndX * fraction;
            return (
              <G key={`axis-${tick}`}>
                <Line
                  x1={x}
                  y1={plotTop}
                  x2={x}
                  y2={svgHeight - plotBottom}
                  stroke="#79919C"
                  strokeWidth="1"
                  opacity={tick === 0 ? 0.3 : 0.16}
                />
                <Line
                  x1={plotLeft}
                  y1={y}
                  x2={svgWidth - plotRight}
                  y2={y}
                  stroke="#79919C"
                  strokeWidth="1"
                  opacity={tick === 0 ? 0.3 : 0.16}
                />
                <SvgText
                  x={x}
                  y={svgHeight - plotBottom + 12}
                  fill="#91A7B0"
                  fontSize="8"
                  textAnchor="middle"
                >
                  {formatDistance(distance)}
                </SvgText>
                <SvgText
                  x={plotLeft - 6}
                  y={y + 3}
                  fill="#91A7B0"
                  fontSize="8"
                  textAnchor="end"
                >
                  {formatDistance(elevation)}
                </SvgText>
              </G>
            );
          })}
          <SvgText
            x="12"
            y={(plotTop + svgHeight - plotBottom) / 2}
            fill="#91A7B0"
            fontSize="8"
            textAnchor="middle"
            transform={`rotate(-90 12 ${(plotTop + svgHeight - plotBottom) / 2})`}
          >
            ELEVATION ({distanceUnit})
          </SvgText>
          <SvgText
            x={(plotLeft + svgWidth - plotRight) / 2}
            y={svgHeight - 3}
            fill="#91A7B0"
            fontSize="8"
            textAnchor="middle"
          >
            DISTANCE ({distanceUnit})
          </SvgText>

          {/* Takeoff ramp */}
          <Polygon
            points={`${transformX(0)},${transformY(0)} ${transformX(rampLength)},${transformY(visibleRampHeight)} ${transformX(rampLength)},${transformY(0)}`}
            fill="#A6D608"
            opacity={0.28}
          />
          <Line
            x1={transformX(0)}
            y1={transformY(0)}
            x2={transformX(rampLength)}
            y2={transformY(visibleRampHeight)}
            stroke="#D4F66E"
            strokeWidth="4"
          />
          <Line
            x1={transformX(0) + 4}
            y1={transformY(0) - 7}
            x2={transformX(rampLength) - 3}
            y2={transformY(visibleRampHeight) + 2}
            stroke="#D4F66E"
            strokeWidth="1"
            opacity={0.7}
          />

          {/* The receiving ramp slopes down away from the jump. */}
          <Line
            x1={transformX(landingX)}
            y1={transformY(landingWorldY)}
            x2={transformX(landingRampEndX)}
            y2={transformY(landingRampEndY)}
            stroke="#8BD6A7"
            strokeWidth="4"
          />
          <SvgText
            x={transformX(rampLength)}
            y={Math.max(plotTop + 10, transformY(visibleRampHeight) - 7)}
            fill="#D4F66E"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
          >
            TAKEOFF
          </SvgText>
          <SvgText
            x={transformX(landingX) + 2}
            y={Math.max(plotTop + 10, transformY(landingWorldY) - 7)}
            fill="#8BD6A7"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
          >
            LANDING
          </SvgText>

          {/* Gap indicator */}
          <Line
            x1={transformX(rampLength)}
            y1={svgHeight - plotBottom + 17}
            x2={transformX(landingX)}
            y2={svgHeight - plotBottom + 17}
            stroke="#91A7B0"
            strokeWidth="1"
          />
          <Line
            x1={transformX(rampLength)}
            y1={svgHeight - plotBottom + 14}
            x2={transformX(rampLength)}
            y2={svgHeight - plotBottom + 20}
            stroke="#91A7B0"
            strokeWidth="1"
          />
          <Line
            x1={transformX(landingX)}
            y1={svgHeight - plotBottom + 14}
            x2={transformX(landingX)}
            y2={svgHeight - plotBottom + 20}
            stroke="#91A7B0"
            strokeWidth="1"
          />
          <SvgText
            x={(transformX(rampLength) + transformX(landingX)) / 2}
            y={svgHeight - plotBottom + 30}
            fill="#F5FAF8"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
          >
            GAP {result.input_data.gap_distance} {distanceUnit}
          </SvgText>

          <Path
            d={pathData}
            stroke="#4AAEFF"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <Path
            d={animatedPath}
            stroke="#D4F66E"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1={transformX(apexPoint.x)}
            y1={transformY(apexPoint.y)}
            x2={transformX(apexPoint.x)}
            y2={transformY(visibleRampHeight)}
            stroke="#C5A7FF"
            strokeWidth="1"
            strokeDasharray="3,4"
            opacity={0.8}
          />
          <Circle
            cx={transformX(apexPoint.x)}
            cy={transformY(apexPoint.y)}
            r="3.5"
            fill="#C5A7FF"
          />
          <SvgText
            x={transformX(apexPoint.x) + 7}
            y={Math.max(plotTop + 9, transformY(apexPoint.y) - 6)}
            fill="#D9C7FF"
            fontSize="8"
            fontWeight="700"
          >
            APEX +{useMetric ? result.max_height_meters : result.max_height_feet} {distanceUnit}
          </SvgText>

          <Line
            x1={transformX(currentPoint.x)}
            y1={transformY(currentPoint.y)}
            x2={transformX(currentPoint.x)}
            y2={svgHeight - plotBottom}
            stroke="#91A7B0"
            strokeWidth="1"
            strokeDasharray="3,4"
            opacity={0.55}
          />
          {animationProgress < 1 && (
            <Line
              x1={transformX(currentPoint.x)}
              y1={transformY(currentPoint.y)}
              x2={transformX(velocityVectorEnd.x)}
              y2={transformY(velocityVectorEnd.y)}
              stroke="#F5FAF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          <G
            transform={`translate(${transformX(currentPoint.x)} ${transformY(currentPoint.y)}) rotate(${bikeAngleDegrees})`}
          >
            <Circle cx="-11" cy="2" r="4.3" fill="#091720" stroke="#D4F66E" strokeWidth="1.7" />
            <Circle cx="11" cy="2" r="4.3" fill="#091720" stroke="#D4F66E" strokeWidth="1.7" />
            <Circle cx="-11" cy="2" r="1" fill="#91A7B0" />
            <Circle cx="11" cy="2" r="1" fill="#91A7B0" />
            <Path
              d="M -11 2 L -4 -4 L 4 2 L -11 2 M -4 -4 L 1 -5 L 11 2 M 4 2 L 7 -5 L 10 -7 M -5 -5 L -8 -7"
              fill="none"
              stroke="#F18A24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path d="M -2 -5 L 2 -6 L 5 -4 L 1 -2 Z" fill="#82B6FF" stroke="#DCE8EF" strokeWidth="0.7" />
            <Path
              d="M -4 -12 L -1 -7 L 4 -5 M -1 -7 L -7 -5 L -9 -7 M -1 -7 L 3 -2 L 7 1"
              fill="none"
              stroke="#F5FAF8"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx="-5" cy="-14" r="3.1" fill="#F18A24" stroke="#F5FAF8" strokeWidth="0.8" />
            <Path d="M -8 -14 Q -6 -19 -1 -16 L -2 -13 Z" fill="#F18A24" stroke="#F5FAF8" strokeWidth="0.7" />
          </G>
        </Svg>

        <View style={styles.simulationReadout}>
          <View style={styles.simulationIndicator} />
          <Text style={styles.simulationReadoutText}>
            {isAnimating ? 'IN FLIGHT' : animationProgress >= 1 ? 'LANDED' : 'READY'}
          </Text>
          <Text style={styles.simulationReadoutValue}>
            t {simulatedTime.toFixed(1)} s {' · '}v {simulatedSpeed.toFixed(1)} {speedUnit}
            {' · '}{Math.round(animationProgress * 100)}%
          </Text>
        </View>

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
        <Text style={styles.simulationDisclaimer}>
          {result.input_data.ramp_height > 0
            ? 'Idealized 2D ballistic model; landing-ramp shape is illustrative because its angle is not an input. Wind, terrain, suspension, and rider control are not modeled; this is not a safety guarantee.'
            : 'Takeoff and landing profiles are illustrative because ramp height and landing-ramp angle were not provided. Wind, terrain, suspension, and rider control are not modeled; this is not a safety guarantee.'}
        </Text>
        <TouchableOpacity
          style={[styles.logSimulatedJumpButton, isLoggingSimulatedJump && styles.logSimulatedJumpDisabled]}
          onPress={() => void logSimulatedJump()}
          disabled={isLoggingSimulatedJump}
          accessibilityRole="button"
          accessibilityLabel="Log simulator values as a completed jump for the active bike"
        >
          {isLoggingSimulatedJump ? (
            <ActivityIndicator color="#07111E" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#07111E" />
              <Text style={styles.logSimulatedJumpButtonText}>Log Simulator Values to Jump Log</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.logSimulatedJumpHint}>Saved as completed using predicted values.</Text>
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
          accessibilityLabel="WreckLess Jump Calculator"
          style={styles.sloganHeader}
        >
          <View style={styles.sloganCopy}>
            <Text style={styles.sloganFirstLine}>
              <Text style={styles.brandName}>WreckLess</Text> Jump Calculator
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Instructions"
            accessibilityHint="Replay the beginner walkthrough"
            onPress={startBeginnerGuide}
            style={styles.instructionsButton}
          >
            <Ionicons name="help-circle-outline" size={16} color="#A6D608" />
          </TouchableOpacity>
        </View>
        <View style={[styles.controlsRow, isWideLayout && styles.wideControlsRow]}>
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
              <Text style={[styles.inputMethodTitle, inputMethod === 'manual' && styles.inputMethodTextActive]}>
                Enter Manually
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="tab"
              accessibilityState={{ selected: inputMethod === 'measure' }}
              onPress={() => setInputMethod('measure')}
              style={[styles.inputMethodTab, inputMethod === 'measure' && styles.inputMethodTabActive]}
            >
              <Text style={[styles.inputMethodTitle, inputMethod === 'measure' && styles.inputMethodTextActive]}>
                Measure
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.toggleContainer}>
            <Text style={styles.unitLabel}>Units</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use feet"
              accessibilityState={{ selected: !useMetric }}
              style={[styles.toggleButton, !useMetric && styles.toggleActive]}
              onPress={() => void updateUnitPreference(false)}
            >
              <Text style={[styles.toggleText, !useMetric && styles.toggleTextActive]}>Feet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use meters"
              accessibilityState={{ selected: useMetric }}
              style={[styles.toggleButton, useMetric && styles.toggleActive]}
              onPress={() => void updateUnitPreference(true)}
            >
              <Text style={[styles.toggleText, useMetric && styles.toggleTextActive]}>Meters</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.inputMethodContent,
            isWideLayout && styles.wideInputMethodContent,
            { display: inputMethod === 'manual' ? 'flex' : 'none' },
          ]}
        >
        <ScrollView
          style={[styles.scrollView, isWideLayout && styles.wideScrollView]}
          contentContainerStyle={[
            styles.scrollContent,
            isWideLayout && styles.wideScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputWizard}>
              <View style={styles.inputWizardProgress}>
                <Text style={styles.inputWizardStepText}>
                  Step {inputStep + 1} of {inputSteps.length}
                </Text>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 1, max: inputSteps.length, now: inputStep + 1 }}
                  style={styles.inputWizardProgressTrack}
                >
                  <View
                    style={[
                      styles.inputWizardProgressFill,
                      { width: `${((inputStep + 1) / inputSteps.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              <View
                style={styles.inputWizardCard}
              >
                <Ionicons name={currentInputStep.icon} size={30} color="#A6D608" />
                <Text style={styles.inputWizardTitle}>{currentInputStep.title}</Text>
                <Text style={styles.inputWizardDescription}>
                  {currentInputStep.required ? 'Required for your calculation' : 'Optional'}
                </Text>
                <Text style={styles.inputWizardLabel}>
                  {currentInputStep.label}
                  {currentInputStep.required && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                  key={currentInputStep.key}
                  accessibilityLabel={currentInputStep.label}
                  style={[
                    styles.inputWizardInput,
                    focusedField === currentInputStep.key && styles.inputFocused,
                  ]}
                  value={currentInputStep.value}
                  onChangeText={currentInputStep.onChangeText}
                  onFocus={() => setFocusedField(currentInputStep.key)}
                  onBlur={() => setFocusedField(null)}
                  placeholder={currentInputStep.placeholder}
                  placeholderTextColor="#9AADB0"
                  keyboardType={currentInputStep.keyboardType}
                  returnKeyType="done"
                  autoFocus
                />
                {!!currentInputStep.helperText && (
                  <Text style={styles.inputWizardHelper}>{currentInputStep.helperText}</Text>
                )}
              </View>

              <View style={styles.inputWizardSecondaryActions}>
                {inputStep > 0 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      setFocusedField(null);
                      setInputStep((step) => Math.max(step - 1, 0));
                    }}
                    style={styles.inputWizardBackButton}
                  >
                    <Ionicons name="arrow-back" size={18} color="#C2D0CE" />
                    <Text style={styles.inputWizardBackText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={clearForm}
                  style={styles.inputWizardResetButton}
                >
                  <Ionicons name="refresh" size={16} color="#A8B5C4" />
                  <Text style={styles.inputWizardResetText}>Reset Fields</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={inputStep === inputSteps.length - 1 ? calculateSpeed : advanceInputStep}
                disabled={isLoading}
                style={styles.inputWizardNextButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#07111E" />
                ) : (
                  <>
                    <Text style={styles.inputWizardNextText}>
                      {inputStep === inputSteps.length - 1 ? 'How Fast?' : 'Next'}
                    </Text>
                    <Ionicons
                      name={inputStep === inputSteps.length - 1 ? 'calculator' : 'arrow-forward'}
                      size={20}
                      color="#07111E"
                    />
                  </>
                )}
              </TouchableOpacity>
          </View>

          {/* Results page */}
          <Modal
            visible={showResultsPage && result !== null}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {
              stopPacing();
              setShowResultsPage(false);
              setResult(null);
            }}
            onDismiss={() => {
              if (Platform.OS === 'ios' && pendingGhostTrajectoryParams) {
                router.push({
                  pathname: '/ghost-ar',
                  params: pendingGhostTrajectoryParams,
                });
                setPendingGhostTrajectoryParams(null);
              }
            }}
          >
            <SafeAreaView style={styles.resultsPage}>
              <View style={styles.resultsPageHeader}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Back to jump calculator"
                  onPress={() => {
                    stopPacing();
                    setShowResultsPage(false);
                    setResult(null);
                  }}
                  style={styles.resultsBackButton}
                >
                  <Ionicons name="arrow-back" size={22} color="#F5FAF8" />
                </TouchableOpacity>
                <Text style={styles.resultsPageTitle}>Jump Results</Text>
                <View style={styles.resultsBackButtonPlaceholder} />
              </View>
              <ScrollView
                style={styles.resultsPageScroll}
                contentContainerStyle={styles.resultsPageContent}
                showsVerticalScrollIndicator={false}
              >
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
              <View style={styles.resultsControlsRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open Ghost Trajectory"
                  accessibilityHint="Opens the camera overlay with this calculated jump path."
                  onPress={() => {
                    const feet = (value: number) =>
                      result.input_data.unit_system === 'metric' ? value * 3.28084 : value;
                    setPendingGhostTrajectoryParams({
                      speedMph: String(result.required_speed_mph),
                      gapFeet: String(feet(result.input_data.gap_distance)),
                      rampAngle: String(result.input_data.ramp_angle),
                      rampHeightFeet: String(feet(result.input_data.ramp_height || 0)),
                      landingHeightFeet: String(feet(result.input_data.landing_height || 0)),
                    });
                    setShowResultsPage(false);
                  }}
                  style={styles.ghostArButton}
                >
                  <Ionicons name="camera-outline" size={19} color="#07111E" />
                  <Text style={styles.ghostArButtonText}>Ghost Trajectory</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isPacingActive ? 'Stop speed guidance' : 'Start speed guidance'}
                  accessibilityHint="Compares your live GPS speed with this calculation."
                  onPress={() => {
                    if (isPacingActive) {
                      stopPacing();
                    } else {
                      void startPacing();
                    }
                  }}
                  style={styles.pacingButton}
                >
                  <Ionicons
                    name={isPacingActive ? 'volume-mute' : 'volume-high'}
                    size={22}
                    color="#07111E"
                  />
                  <Text style={styles.pacingButtonText}>Speed Guidance</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pacingSection}>
                {!!pacingStatus && (
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

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: showBreakdown }}
                onPress={() => setShowBreakdown((visible) => !visible)}
                style={styles.breakdownButton}
              >
                <Ionicons name={showBreakdown ? 'chevron-up' : 'analytics'} size={20} color="#07111E" />
                <Text style={styles.breakdownButtonText}>
                  {showBreakdown ? 'Hide Breakdown' : 'Break Down'}
                </Text>
              </TouchableOpacity>

              {showBreakdown && (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="speedometer" size={20} color="#D4F66E" />
                    <Text style={styles.statValue}>
                      {useMetric ? result.required_speed_kph : result.required_speed_mph} {speedUnit}
                    </Text>
                    <Text style={styles.statLabel}>Required Speed</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="shield-checkmark" size={20} color="#D4F66E" />
                    <Text style={styles.statValue}>
                      {useMetric ? result.safety_speed_kph : result.safety_speed_mph} {speedUnit}
                    </Text>
                    <Text style={styles.statLabel}>Recommended Speed</Text>
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
                  <View style={styles.statCard}>
                    <Ionicons name="time" size={20} color="#82B6FF" />
                    <Text style={styles.statValue}>{result.flight_time_seconds}s</Text>
                    <Text style={styles.statLabel}>Flight Time</Text>
                  </View>
                </View>
              )}

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

            </View>
                )}
              </ScrollView>
              <View style={styles.emergencyFooter}>
                <View style={styles.emergencyDisclaimer}>
                  <Ionicons name="alert-circle-outline" size={16} color="#E8B86D" />
                  <Text style={styles.emergencyDisclaimerText}>
                    This feature is NOT a substitute for calling 911. In emergencies, call 911 directly.
                  </Text>
                </View>
                <View style={styles.emergencyActionsRow}>
                  <TouchableOpacity
                    style={styles.callHelpButton}
                    onPress={openCallHelpModal}
                    accessibilityRole="button"
                    accessibilityLabel="Call for Help. Opens your phone dialer pre-filled with 911."
                  >
                    <Ionicons name="alert-circle" size={24} color="#F5FAF8" />
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
                        <Ionicons name="heart" size={24} color="#07111E" />
                        <Text style={styles.alertRidersButtonText}>Alert Nearby Riders</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </Modal>
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
        <View style={styles.disclaimerFooter}>
          <Ionicons name="information-circle" size={16} color="#A6D608" />
          <Text style={styles.disclaimerText}>
            Physics estimates assume ideal conditions. Wind, terrain, setup, and rider technique affect real jumps. Always ride within your limits.
          </Text>
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
    backgroundColor: '#07111E',
  },
  keyboardView: {
    flex: 1,
  },
  sloganHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 5,
    paddingHorizontal: 16,
    backgroundColor: '#101D2B',
    borderBottomWidth: 1,
    borderBottomColor: '#26384B',
  },
  sloganCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  instructionsButton: {
    width: 36,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#344357',
    borderRadius: 10,
    backgroundColor: '#111E2D',
  },
  sloganFirstLine: {
    color: '#F5FAF8',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'left',
  },
  brandName: {
    color: '#A6D608',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  wideControlsRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  inputMethodTabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#26384B',
    backgroundColor: '#0B1828',
  },
  inputMethodTab: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 9,
  },
  inputMethodTabActive: {
    backgroundColor: '#A6D608',
  },
  inputMethodTitle: {
    color: '#A8B5C4',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputMethodTextActive: {
    color: '#07111E',
  },
  inputMethodContent: {
    flex: 1,
  },
  wideInputMethodContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  measureContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },
  wideScrollView: {
    flex: 1,
  },
  wideScrollContent: {
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 8,
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
    opacity: 0.06,
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
    backgroundColor: '#0D1A29',
    borderColor: '#26384B',
    borderWidth: 1,
    borderRadius: 20,
    padding: 3,
    marginBottom: 0,
    gap: 2,
  },
  unitLabel: {
    color: '#A8B5C4',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 5,
  },
  toggleButton: {
    flex: 0,
    minWidth: 42,
    minHeight: 28,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  toggleActive: {
    backgroundColor: '#A6D608',
  },
  toggleText: {
    color: '#A8B5C4',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#07111E',
  },
  formContainer: {
    gap: 10,
    marginBottom: 6,
  },
  inputWizard: {
    flex: 1,
    gap: 14,
    paddingTop: 10,
    paddingBottom: 16,
  },
  inputWizardProgress: {
    gap: 8,
  },
  inputWizardStepText: {
    color: '#A8B5C4',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputWizardProgressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#26384B',
  },
  inputWizardProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#A6D608',
  },
  inputWizardCard: {
    flex: 1,
    minHeight: 270,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1D2D',
    borderColor: '#26384B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
  },
  inputWizardTitle: {
    marginTop: 10,
    color: '#F5FAF8',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  inputWizardDescription: {
    marginTop: 5,
    marginBottom: 26,
    color: '#9AADB0',
    fontSize: 13,
  },
  inputWizardLabel: {
    alignSelf: 'stretch',
    marginBottom: 8,
    color: '#D5DDE6',
    fontSize: 15,
    fontWeight: '700',
  },
  inputWizardInput: {
    alignSelf: 'stretch',
    minHeight: 60,
    backgroundColor: '#0A1522',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    color: '#F3F6F9',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#A6D608',
  },
  inputWizardHelper: {
    alignSelf: 'stretch',
    marginTop: 10,
    color: '#9AADB0',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  inputWizardSecondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
  },
  inputWizardBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingRight: 12,
  },
  inputWizardBackText: {
    color: '#C2D0CE',
    fontSize: 16,
    fontWeight: '700',
  },
  inputWizardResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  inputWizardResetText: {
    color: '#A8B5C4',
    fontSize: 15,
    fontWeight: '700',
  },
  inputWizardNextButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#A6D608',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 8,
  },
  inputWizardNextText: {
    color: '#07111E',
    fontSize: 20,
    fontWeight: '900',
  },
  wideFormContainer: {
    gap: 6,
  },
  detailsCard: {
    backgroundColor: '#0F1D2D',
    borderColor: '#26384B',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    paddingTop: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  wideDetailsCard: {
    padding: 8,
    paddingTop: 7,
    borderRadius: 10,
  },
  wideInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E8EDF2',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#293849',
  },
  wideSectionTitle: {
    fontSize: 10,
    letterSpacing: 0.4,
    marginBottom: 6,
    paddingBottom: 4,
  },
  inputGroup: {
    marginBottom: 13,
  },
  wideInputGroup: {
    flex: 1,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#D5DDE6',
    fontWeight: '600',
    marginBottom: 7,
  },
  wideLabel: {
    fontSize: 9,
    marginBottom: 3,
  },
  required: {
    color: '#A6D608',
  },
  optional: {
    color: '#9AADB0',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#0A1522',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    color: '#F3F6F9',
    borderWidth: 1,
    borderColor: '#344357',
  },
  wideInput: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  inputFocused: {
    borderColor: '#A6D608',
    shadowColor: '#A6D608',
    shadowOpacity: 0.42,
    shadowRadius: 7,
    elevation: 3,
  },
  requiredInput: {
    borderColor: '#A6D608',
    shadowColor: '#A6D608',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  helperText: {
    color: '#8D9BAD',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  wideHelperText: {
    fontSize: 8,
    lineHeight: 10,
    marginBottom: 3,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  wideButtonContainer: {
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  wideCalculateButton: {
    minHeight: 36,
    padding: 6,
    borderRadius: 16,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  wideClearButton: {
    minHeight: 36,
    padding: 6,
    borderRadius: 16,
    gap: 4,
  },
  wideButtonText: {
    fontSize: 14,
    letterSpacing: 0,
  },
  calculateButton: {
    flex: 1.65,
    minHeight: 54,
    backgroundColor: '#A6D608',
    borderRadius: 7,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#A6D608',
    shadowOpacity: 0.48,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  calculateButtonText: {
    color: '#07111E',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
    flexShrink: 1,
    textAlign: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#182331',
    borderRadius: 7,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#354254',
  },
  clearButtonText: {
    color: '#A8B5C4',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  resultsContainer: {
    backgroundColor: 'rgba(20, 37, 44, 0.76)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  resultsPage: {
    flex: 1,
    backgroundColor: '#07111E',
  },
  resultsPageHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0B1828',
    borderBottomWidth: 1,
    borderBottomColor: '#35515A',
  },
  resultsBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  resultsBackButtonPlaceholder: {
    width: 40,
  },
  resultsPageTitle: {
    color: '#F5FAF8',
    fontSize: 17,
    fontWeight: '800',
  },
  resultsPageScroll: {
    flex: 1,
  },
  resultsPageContent: {
    padding: 16,
    paddingBottom: 32,
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
    backgroundColor: 'rgba(14, 31, 38, 0.94)',
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
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
  simulationSpeedPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  simulationSpeedCard: {
    flex: 1,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#A6D608',
  },
  simulationSpeedLabel: {
    color: '#07111E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  simulationSpeedValue: {
    marginTop: 3,
    color: '#07111E',
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  simulationSpeedUnit: {
    color: '#07111E',
    fontSize: 13,
    fontWeight: '700',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replayText: {
    color: '#A6D608',
    fontSize: 12,
    fontWeight: '700',
  },
  svg: {
    alignSelf: 'center',
    borderRadius: 12,
  },
  simulationReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#193138',
  },
  simulationIndicator: {
    width: 7,
    height: 7,
    marginRight: 7,
    borderRadius: 4,
    backgroundColor: '#A6D608',
  },
  simulationReadoutText: {
    color: '#D4F66E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  simulationReadoutValue: {
    flex: 1,
    color: '#C2D0CE',
    fontSize: 11,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  simulationDisclaimer: {
    color: '#9AADB0',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  logSimulatedJumpButton: {
    minHeight: 46,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#A6D608',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logSimulatedJumpDisabled: {
    opacity: 0.6,
  },
  logSimulatedJumpButtonText: {
    color: '#07111E',
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  ghostArButtonText: {
    color: '#07111E',
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  resultsControlsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 4,
  },
  ghostArButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#A6D608',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logSimulatedJumpHint: {
    color: '#9AADB0',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
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
  pacingSection: {
    marginBottom: 16,
  },
  pacingButton: {
    flex: 1,
    minHeight: 56,
    minWidth: 0,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FF5A00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#FF5A00',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  pacingButtonText: {
    flexShrink: 1,
    color: '#07111E',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
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
  breakdownButton: {
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#A6D608',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  breakdownButtonText: {
    color: '#07111E',
    fontSize: 18,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: 'rgba(29, 51, 58, 0.78)',
    borderRadius: 12,
    padding: 12,
    width: '47%',
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
  disclaimerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1522',
    borderTopWidth: 1,
    borderTopColor: '#263649',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#9AA8B8',
    lineHeight: 14,
  },
  // Emergency alert styles
  emergencyContainer: {
    marginTop: 16,
  },
  emergencyFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#0B1828',
    borderTopWidth: 1,
    borderTopColor: '#35515A',
  },
  emergencyActionsRow: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: '#FF1744',
    borderWidth: 3,
    borderColor: '#FFD6DF',
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
    flex: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 96,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  callHelpButtonText: {
    color: '#FFFFFF',
    textShadowColor: '#8B001B',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
  alertRidersButton: {
    backgroundColor: '#B7FF00',
    borderWidth: 2,
    borderColor: '#E1FF8A',
    shadowColor: '#A6D608',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
    flex: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 96,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  alertRidersButtonText: {
    color: '#07111E',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
});
