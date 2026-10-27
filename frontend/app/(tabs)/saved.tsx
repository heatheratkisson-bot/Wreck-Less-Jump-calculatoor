import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Share,
  TextInput,
  Modal,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  deleteCalculationLocally,
  fetchJsonWithBackend,
  getDeviceId,
  isBackendConfigured,
  listSavedCalculationsLocally,
  lookupSharedCalculationLocally,
  getRiderProfileData,
  SavedCalculation,
  RiderProfileData,
} from '@/lib/appSupport';

const { width } = Dimensions.get('window');

export default function SavedScreen() {
  const router = useRouter();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState<SavedCalculation | null>(null);
  const [riderProfileData, setRiderProfileData] = useState<RiderProfileData | null>(null);
  const isMountedRef = useRef(true);

  const activeProfile =
    riderProfileData?.profiles.find((profile) => profile.id === riderProfileData.activeProfileId) ?? null;
  const activeBikeJumps = useMemo(
    () =>
      riderProfileData?.jumps.filter((jump) => jump.profileId === activeProfile?.id) ?? [],
    [activeProfile?.id, riderProfileData?.jumps]
  );
  const jumpStats = useMemo(() => {
    const completed = activeBikeJumps.filter((jump) => jump.outcome === 'completed');
    return {
      completed: completed.length,
      wrecks: activeBikeJumps.filter((jump) => jump.outcome === 'wreck').length,
      topSpeed: completed.reduce((top, jump) => Math.max(top, jump.speedMph), 0),
      highestJump: completed.reduce((top, jump) => Math.max(top, jump.jumpHeightFeet), 0),
      farthestGap: completed.reduce((top, jump) => Math.max(top, jump.gapFeet), 0),
    };
  }, [activeBikeJumps]);

  const fetchRiderData = useCallback(async () => {
    try {
      const data = await getRiderProfileData();
      if (isMountedRef.current) {
        setRiderProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching rider jump stats:', error);
    }
  }, []);

  const fetchCalculations = useCallback(async () => {
    try {
      let data: SavedCalculation[];
      const deviceId = await getDeviceId();

      if (isBackendConfigured) {
        try {
          data = await fetchJsonWithBackend<SavedCalculation[]>(
            `/api/saved-calculations?device_id=${encodeURIComponent(deviceId)}`
          );
        } catch {
          data = await listSavedCalculationsLocally();
        }
      } else {
        data = await listSavedCalculationsLocally();
      }

      if (!isMountedRef.current) {
        return;
      }

      setCalculations(data);
    } catch (error) {
      console.error('Error fetching calculations:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isMountedRef.current = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void fetchCalculations();
      void fetchRiderData();
    });

    return () => {
      task.cancel();
      isMountedRef.current = false;
    };
  }, [fetchCalculations, fetchRiderData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCalculations();
    void fetchRiderData();
  }, [fetchCalculations, fetchRiderData]);

  const filteredCalculations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return calculations;
    }
    return calculations.filter((calc) => {
      const { input_data: input } = calc.calculation;
      return [
        calc.name,
        calc.description ?? '',
        calc.share_code ?? '',
        String(input.gap_distance),
        String(input.ramp_angle),
        String(calc.calculation.required_speed_mph),
        String(calc.calculation.required_speed_kph),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [calculations, searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Delete Calculation',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deviceId = await getDeviceId();
              if (isBackendConfigured) {
                try {
                  await fetchJsonWithBackend(
                    `/api/saved-calculation/${id}?device_id=${encodeURIComponent(deviceId)}`,
                    {
                    method: 'DELETE',
                    }
                  );
                } catch {
                  await deleteCalculationLocally(id);
                }
              } else {
                await deleteCalculationLocally(id);
              }
              setCalculations(calculations.filter(c => c.id !== id));
            } catch {
              Alert.alert('Error', 'Failed to delete calculation');
            }
          },
        },
      ]
    );
  };

  const handleShare = async (calc: SavedCalculation) => {
    if (!isBackendConfigured) {
      await shareCalculationDetails(calc);
      return;
    }

    if (calc.share_code) {
      // Already shared, just share the code
      await shareCode(calc);
    } else {
      // Generate share code first
      try {
        const deviceId = await getDeviceId();
        const data = await fetchJsonWithBackend<{ share_code: string }>(
          `/api/share-calculation/${calc.id}?device_id=${encodeURIComponent(deviceId)}`,
          {
            method: 'POST',
          }
        );
        const sharedCalculation = {
          ...calc,
          share_code: data.share_code,
          is_shared: true,
        };

        calc.share_code = sharedCalculation.share_code;
        calc.is_shared = true;
        setCalculations([...calculations]);
        await shareCode(calc);
      } catch {
        Alert.alert('Error', 'Failed to generate share code');
      }
    }
  };

  const shareCalculationDetails = async (calc: SavedCalculation) => {
    const isMetric = calc.calculation.input_data.unit_system === 'metric';
    try {
      await Share.share({
        message: `Dirt bike jump: "${calc.name}"\n\nRequired Speed: ${isMetric ? calc.calculation.required_speed_kph : calc.calculation.required_speed_mph} ${isMetric ? 'km/h' : 'mph'}\nSafe Speed: ${isMetric ? calc.calculation.safety_speed_kph : calc.calculation.safety_speed_mph} ${isMetric ? 'km/h' : 'mph'}\nGap: ${calc.calculation.input_data.gap_distance} ${isMetric ? 'm' : 'ft'}\nRamp Height: ${calc.calculation.input_data.ramp_height} ${isMetric ? 'm' : 'ft'}\nLanding Height Diff: ${calc.calculation.input_data.landing_height} ${isMetric ? 'm' : 'ft'}\nAngle: ${calc.calculation.input_data.ramp_angle}°\n${calc.location?.address ? `Location: ${calc.location.address}` : ''}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const shareCode = async (calc: SavedCalculation) => {
    const isMetric = calc.calculation.input_data.unit_system === 'metric';
    try {
      await Share.share({
        message: `Check out my dirt bike jump: "${calc.name}"\n\nShare Code: ${calc.share_code}\n\nRequired Speed: ${isMetric ? calc.calculation.required_speed_kph : calc.calculation.required_speed_mph} ${isMetric ? 'km/h' : 'mph'}\nGap: ${calc.calculation.input_data.gap_distance} ${isMetric ? 'm' : 'ft'}\nAngle: ${calc.calculation.input_data.ramp_angle}°\n${calc.location?.address ? `Location: ${calc.location.address}` : ''}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) {
      Alert.alert('Error', 'Please enter a share code');
      return;
    }

    setIsLookingUp(true);
    try {
      let data: SavedCalculation | null;

      if (isBackendConfigured) {
        try {
          data = await fetchJsonWithBackend<SavedCalculation>(
            `/api/shared/${lookupCode.toUpperCase()}`
          );
        } catch {
          data = await lookupSharedCalculationLocally(lookupCode);
        }
      } else {
        data = await lookupSharedCalculationLocally(lookupCode);
      }

      if (!data) {
        throw new Error('Calculation not found');
      }

      setSelectedCalc(data);
      setShowLookupModal(false);
      setLookupCode('');
    } catch {
      Alert.alert('Not Found', 'No calculation found with that share code.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const openSavedJumpOnMap = (calc: SavedCalculation) => {
    const location = calc.location;
    if (
      !location ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude) > 90 ||
      Math.abs(location.longitude) > 180
    ) {
      return;
    }

    setSelectedCalc(null);
    router.navigate({
      pathname: '/(tabs)/map',
      params: {
        focusLat: String(location.latitude),
        focusLng: String(location.longitude),
        focusName: calc.name,
        focusId: calc.id,
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderCalculationCard = (calc: SavedCalculation) => {
    const isMetric = calc.calculation.input_data.unit_system === 'metric';
    
    return (
      <View key={calc.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{calc.name}</Text>
            {calc.is_shared && (
              <View style={styles.sharedBadge}>
                <Ionicons name="share-social" size={12} color="#F5FAF8" />
                <Text style={styles.sharedBadgeText}>{calc.share_code}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDate}>{formatDate(calc.created_at)}</Text>
        </View>

        {calc.description && (
          <Text style={styles.cardDescription}>{calc.description}</Text>
        )}

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={16} color="#A6D608" />
            <Text style={styles.statText}>
              {isMetric ? calc.calculation.required_speed_kph : calc.calculation.required_speed_mph} {isMetric ? 'km/h' : 'mph'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="resize" size={16} color="#D7DEE5" />
            <Text style={styles.statText}>
              {calc.calculation.input_data.gap_distance} {isMetric ? 'm' : 'ft'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color="#A6D608" />
            <Text style={styles.statText}>{calc.calculation.input_data.ramp_angle}°</Text>
          </View>
        </View>

        {calc.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#C2D0CE" />
            <Text style={styles.locationText}>
              {calc.location.address || `${calc.location.latitude.toFixed(4)}, ${calc.location.longitude.toFixed(4)}`}
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => setSelectedCalc(calc)}
          >
            <Ionicons name="eye" size={18} color="#D7DEE5" />
            <Text style={styles.cardActionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => handleShare(calc)}
          >
            <Ionicons name="share-social" size={18} color="#2E9C61" />
            <Text style={[styles.cardActionText, { color: '#2E9C61' }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => handleDelete(calc.id, calc.name)}
          >
            <Ionicons name="trash" size={18} color="#FF7A86" />
            <Text style={[styles.cardActionText, { color: '#FF7A86' }]}>Delete</Text>
          </TouchableOpacity>
          {calc.location &&
            Number.isFinite(calc.location.latitude) &&
            Number.isFinite(calc.location.longitude) &&
            Math.abs(calc.location.latitude) <= 90 &&
            Math.abs(calc.location.longitude) <= 180 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`View ${calc.name} on satellite map`}
                style={styles.cardActionButton}
                onPress={() => openSavedJumpOnMap(calc)}
              >
                <Ionicons name="map" size={18} color="#D7DEE5" />
                <Text style={styles.cardActionText}>Map</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedCalc) return null;
    const isMetric = selectedCalc.calculation.input_data.unit_system === 'metric';
    const hasValidMapLocation =
      selectedCalc.location &&
      Number.isFinite(selectedCalc.location.latitude) &&
      Number.isFinite(selectedCalc.location.longitude) &&
      Math.abs(selectedCalc.location.latitude) <= 90 &&
      Math.abs(selectedCalc.location.longitude) <= 180;

    return (
      <Modal
        visible={!!selectedCalc}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCalc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCalc.name}</Text>
              <TouchableOpacity onPress={() => setSelectedCalc(null)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedCalc.description && (
                <Text style={styles.modalDescription}>{selectedCalc.description}</Text>
              )}

              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Required Speed</Text>
                <Text style={styles.resultValue}>
                  {isMetric ? selectedCalc.calculation.required_speed_kph : selectedCalc.calculation.required_speed_mph}
                  <Text style={styles.resultUnit}> {isMetric ? 'km/h' : 'mph'}</Text>
                </Text>
              </View>

              <View style={styles.safetyCard}>
                <Ionicons name="shield-checkmark" size={20} color="#E8B86D" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.safetyLabel}>Safe Speed (+15%)</Text>
                  <Text style={styles.safetyValue}>
                    {isMetric ? selectedCalc.calculation.safety_speed_kph : selectedCalc.calculation.safety_speed_mph} {isMetric ? 'km/h' : 'mph'}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailsTitle}>Jump Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Gap Distance</Text>
                  <Text style={styles.detailValue}>
                    {selectedCalc.calculation.input_data.gap_distance} {isMetric ? 'm' : 'ft'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ramp Angle</Text>
                  <Text style={styles.detailValue}>{selectedCalc.calculation.input_data.ramp_angle}°</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Flight Time</Text>
                  <Text style={styles.detailValue}>{selectedCalc.calculation.flight_time_seconds}s</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Max Height</Text>
                  <Text style={styles.detailValue}>
                    {isMetric ? selectedCalc.calculation.max_height_meters : selectedCalc.calculation.max_height_feet} {isMetric ? 'm' : 'ft'}
                  </Text>
                </View>
              </View>

              {selectedCalc.location && (
                <View style={styles.locationSection}>
                  <Text style={styles.detailsTitle}>Location</Text>
                  <View style={styles.locationDetail}>
                    <Ionicons name="location" size={18} color="#A6D608" />
                    <Text style={styles.locationDetailText}>
                      {selectedCalc.location.address || `${selectedCalc.location.latitude.toFixed(6)}, ${selectedCalc.location.longitude.toFixed(6)}`}
                    </Text>
                  </View>
                  {hasValidMapLocation && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => openSavedJumpOnMap(selectedCalc)}
                      style={styles.viewOnMapButton}
                    >
                      <Ionicons name="map" size={18} color="#000000" />
                      <Text style={styles.viewOnMapButtonText}>View on satellite map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {!selectedCalc.location && (
                <Text style={styles.noLocationText}>
                  This jump has no saved location, so it cannot be shown on the map. Save jumps with location enabled to use this option.
                </Text>
              )}

              {selectedCalc.share_code && (
                <View style={styles.shareSection}>
                  <Text style={styles.detailsTitle}>Share Code</Text>
                  <View style={styles.shareCodeBox}>
                    <Text style={styles.shareCodeText}>{selectedCalc.share_code}</Text>
                    <TouchableOpacity onPress={() => shareCode(selectedCalc)}>
                      <Ionicons name="copy" size={20} color="#A6D608" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerEyebrow}>HRC // RIDE LOG</Text>
            <Text style={styles.title}>Saved Calculations</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.lookupButton, showSearch && styles.lookupButtonActive]}
              onPress={() => {
                setShowSearch((visible) => !visible);
                setSearchQuery('');
              }}
              accessibilityRole="button"
              accessibilityLabel={showSearch ? 'Close jump search' : 'Search saved calculations'}
            >
              <Ionicons name={showSearch ? 'close' : 'search'} size={19} color="#07111E" />
              <Text style={styles.lookupButtonText}>Lookup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.codeLookupButton}
              onPress={() => setShowLookupModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Look up a shared calculation by code"
            >
              <Ionicons name="qr-code-outline" size={20} color="#D7DEE5" />
            </TouchableOpacity>
          </View>
        </View>
        {showSearch && (
          <View style={styles.searchField}>
            <Ionicons name="search" size={18} color="#A6D608" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter saved jump math"
              placeholderTextColor="#7E8995"
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Filter saved calculations"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color="#7E8995" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {activeProfile && (
        <View style={styles.statsPanel}>
          <View style={styles.statsHeading}>
            <View>
              <Text style={styles.statsEyebrow}>ACTIVE BIKE // PERFORMANCE</Text>
              <Text style={styles.statsTitle}>{activeProfile.motorcycle.brand} {activeProfile.motorcycle.model}</Text>
            </View>
            <Ionicons name="podium-outline" size={21} color="#A6D608" />
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricLabelRow}>
                <Ionicons name="flash" size={14} color="#A6D608" />
                <Text style={styles.metricLabel}>TOP SPEED</Text>
              </View>
              <Text style={styles.metricValue}>{jumpStats.topSpeed ? jumpStats.topSpeed.toFixed(1) : '—'}<Text style={styles.metricUnit}> mph</Text></Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricLabelRow}>
                <Ionicons name="trending-up" size={14} color="#A6D608" />
                <Text style={styles.metricLabel}>HIGHEST JUMP</Text>
              </View>
              <Text style={styles.metricValue}>{jumpStats.highestJump ? jumpStats.highestJump.toFixed(1) : '—'}<Text style={styles.metricUnit}> ft</Text></Text>
            </View>
            <View style={styles.metricCard}>
              <View style={styles.metricLabelRow}>
                <Ionicons name="resize" size={14} color="#A6D608" />
                <Text style={styles.metricLabel}>FARTHEST GAP</Text>
              </View>
              <Text style={styles.metricValue}>{jumpStats.farthestGap ? jumpStats.farthestGap.toFixed(1) : '—'}<Text style={styles.metricUnit}> ft</Text></Text>
            </View>
          </View>
          <View style={styles.outcomesRow}>
            <View style={[styles.outcomeMetric, styles.completedMetric]}>
              <Ionicons name="checkmark-circle" size={17} color="#2E9C61" />
              <Text style={styles.outcomeValue}>{jumpStats.completed}</Text>
              <Text style={styles.outcomeLabel}>COMPLETED</Text>
            </View>
            <View style={[styles.outcomeMetric, styles.wreckMetric]}>
              <Ionicons name="warning" size={17} color="#E02020" />
              <Text style={styles.outcomeValue}>{jumpStats.wrecks}</Text>
              <Text style={styles.outcomeLabel}>WRECKS</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>Jump calculations</Text>
        <Text style={styles.listCount}>{calculations.length} SAVED</Text>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A6D608" />
          <Text style={styles.loadingText}>Loading calculations...</Text>
        </View>
      ) : calculations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconFrame}>
            <Ionicons name="bookmark-outline" size={36} color="#A6D608" />
          </View>
          <Text style={styles.emptySubtext}>
            No saved calculations — Calculate a jump and save it to see it here
          </Text>
        </View>
      ) : filteredCalculations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={38} color="#7E8995" />
          <Text style={styles.emptyText}>No matching calculations</Text>
          <Text style={styles.emptySubtext}>Try a different name, distance, angle, or speed.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A6D608"
            />
          }
        >
          {filteredCalculations.map(renderCalculationCard)}
        </ScrollView>
      )}
      <View style={styles.actionFooter}>
        <TouchableOpacity
          style={styles.logJumpButton}
          onPress={() =>
            router.navigate({
              pathname: '/(tabs)/profile',
              params: { openJumpLog: 'true' },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Log a jump for the active bike"
        >
          <Ionicons name="add-circle-outline" size={21} color="#07111E" />
          <Text style={styles.logJumpButtonText}>Log a Jump for This Bike</Text>
          <Ionicons name="arrow-forward" size={18} color="#07111E" />
        </TouchableOpacity>
      </View>

      {/* Lookup Modal */}
      <Modal
        visible={showLookupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLookupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '40%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lookup Share Code</Text>
              <TouchableOpacity onPress={() => setShowLookupModal(false)}>
                <Ionicons name="close" size={24} color="#F5FAF8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.lookupLabel}>Enter the 8-character share code:</Text>
              <TextInput
                style={styles.lookupInput}
                value={lookupCode}
                onChangeText={setLookupCode}
                placeholder="e.g., ABC12345"
                placeholderTextColor="#9AADB0"
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                style={[styles.lookupSubmitButton, isLookingUp && { opacity: 0.6 }]}
                onPress={handleLookup}
                disabled={isLookingUp}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#07111E" />
                    <Text style={styles.lookupSubmitText}>Find Calculation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      {renderDetailModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15191E',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 13,
    backgroundColor: '#1C2229',
    borderBottomWidth: 2,
    borderBottomColor: '#A6D608',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerEyebrow: {
    color: '#A6D608',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lookupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A6D608',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#55741B',
  },
  lookupButtonActive: {
    backgroundColor: '#303841',
    borderBottomColor: '#66717C',
  },
  lookupButtonText: {
    color: '#07111E',
    fontWeight: '800',
    fontSize: 12,
  },
  codeLookupButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: '#303841',
    borderWidth: 1,
    borderColor: '#505A64',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    marginTop: 12,
    paddingHorizontal: 12,
    backgroundColor: '#101419',
    borderWidth: 1,
    borderColor: '#A6D608',
    borderRadius: 5,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  statsPanel: {
    marginHorizontal: 16,
    marginTop: 13,
    padding: 12,
    backgroundColor: '#20262D',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#424A53',
    borderTopColor: '#858D94',
  },
  statsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 9,
    marginBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#3A424B',
  },
  statsEyebrow: {
    color: '#A6D608',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    backgroundColor: '#171C22',
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#A6D608',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  metricLabel: {
    flexShrink: 1,
    color: '#AEB6BE',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    color: '#AEB6BE',
    fontSize: 9,
    fontWeight: '600',
  },
  outcomesRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  outcomeMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: '#171C22',
    borderRadius: 4,
  },
  completedMetric: {
    borderLeftWidth: 2,
    borderLeftColor: '#2E9C61',
  },
  wreckMetric: {
    borderLeftWidth: 2,
    borderLeftColor: '#E02020',
  },
  outcomeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  outcomeLabel: {
    color: '#AEB6BE',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    marginHorizontal: 18,
    marginBottom: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#3B444D',
    borderLeftWidth: 3,
    borderLeftColor: '#A6D608',
    paddingLeft: 9,
  },
  listTitle: {
    color: '#F4F6F8',
    fontSize: 14,
    fontWeight: '800',
  },
  listCount: {
    color: '#9BA5AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  actionFooter: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 10,
    backgroundColor: '#1C2229',
    borderTopWidth: 1,
    borderTopColor: '#3B444D',
  },
  logJumpButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 14,
    backgroundColor: '#A6D608',
    borderRadius: 5,
    borderBottomWidth: 3,
    borderBottomColor: '#55741B',
  },
  logJumpButtonText: {
    color: '#07111E',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B8C0C8',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 28,
  },
  emptyIconFrame: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    backgroundColor: '#252B32',
    borderWidth: 1,
    borderColor: '#4C555F',
    borderRadius: 5,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 17,
    marginTop: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#AEB6BE',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
  },
  card: {
    backgroundColor: '#20262D',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#424A53',
    borderTopColor: '#858D94',
    padding: 14,
    marginBottom: 11,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#267A58',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sharedBadgeText: {
    color: '#F5FAF8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardDate: {
    color: '#AEB6BE',
    fontSize: 12,
  },
  cardDescription: {
    color: '#B8C0C8',
    fontSize: 14,
    marginBottom: 12,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#F4F6F8',
    fontSize: 14,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    color: '#B8C0C8',
    fontSize: 12,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#48515B',
    paddingTop: 12,
    marginTop: 4,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  cardActionText: {
    color: '#D7DEE5',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 12, 0.86)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#20262D',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '85%',
    borderTopWidth: 2,
    borderTopColor: '#A6D608',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#48515B',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    color: '#B8C0C8',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#171C22',
    borderRadius: 5,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A6D608',
  },
  resultLabel: {
    color: '#AEB6BE',
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  resultUnit: {
    fontSize: 20,
    fontWeight: 'normal',
  },
  safetyCard: {
    backgroundColor: '#29251F',
    borderRadius: 5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#746244',
  },
  safetyLabel: {
    color: '#E6C98F',
    fontSize: 12,
  },
  safetyValue: {
    color: '#E6C98F',
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    backgroundColor: '#171C22',
    borderRadius: 5,
    padding: 12,
    width: (width - 64) / 2,
  },
  detailLabel: {
    color: '#AEB6BE',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationSection: {
    marginBottom: 20,
  },
  locationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#171C22',
    borderRadius: 5,
    padding: 12,
  },
  locationDetailText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  viewOnMapButton: {
    backgroundColor: '#A6D608',
    borderRadius: 5,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewOnMapButtonText: {
    color: '#07111E',
    fontSize: 15,
    fontWeight: '700',
  },
  noLocationText: {
    color: '#AEB6BE',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  shareSection: {
    marginBottom: 20,
  },
  shareCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171C22',
    borderRadius: 5,
    padding: 16,
  },
  shareCodeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  lookupLabel: {
    color: '#B8C0C8',
    fontSize: 14,
    marginBottom: 12,
  },
  lookupInput: {
    backgroundColor: '#171C22',
    borderRadius: 5,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#A6D608',
    marginBottom: 16,
  },
  lookupSubmitButton: {
    backgroundColor: '#A6D608',
    borderRadius: 5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lookupSubmitText: {
    color: '#07111E',
    fontSize: 16,
    fontWeight: '600',
  },
});
