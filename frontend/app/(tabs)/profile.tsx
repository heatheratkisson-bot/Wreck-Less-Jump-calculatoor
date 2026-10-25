import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import {
  MOTORCYCLE_BRANDS,
  getMotorcyclesByBrand,
  MotorcycleModel,
} from '@/lib/motorcycleData';
import {
  addRiderBikeProfile,
  deleteRiderBikeProfile,
  getRiderProfileData,
  recordRiderJump,
  RiderJumpLog,
  saveRiderBikeProfileImage,
  SavedBikeProfile,
  selectRiderBikeProfile,
} from '@/lib/appSupport';

const MAX_SAVED_PROFILES = 3;

export default function Profile() {
  const [profiles, setProfiles] = useState<SavedBikeProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [jumps, setJumps] = useState<RiderJumpLog[]>([]);
  const [brands] = useState<string[]>(MOTORCYCLE_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [models, setModels] = useState<MotorcycleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [speed, setSpeed] = useState('');
  const [gap, setGap] = useState('');
  const [jumpHeight, setJumpHeight] = useState('');

  const loadData = useCallback(async () => {
    const data = await getRiderProfileData();
    setProfiles(data.profiles);
    setActiveProfileId(data.activeProfileId);
    setJumps(data.jumps);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getRiderProfileData()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setProfiles(data.profiles);
        setActiveProfileId(data.activeProfileId);
        setJumps(data.jumps);
      })
      .catch((error: unknown) => {
        console.error('Error loading bike profiles:', error);
        if (isMounted) {
          Alert.alert('Could not load profiles', 'Please restart the app and try again.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const activeJumps = useMemo(
    () => jumps.filter((jump) => jump.profileId === activeProfileId),
    [activeProfileId, jumps]
  );
  const completedJumps = activeJumps.filter((jump) => jump.outcome === 'completed');
  const wreckCount = activeJumps.filter((jump) => jump.outcome === 'wreck').length;
  const topSpeed = completedJumps.reduce((top, jump) => Math.max(top, jump.speedMph), 0);
  const highestJump = completedJumps.reduce((top, jump) => Math.max(top, jump.jumpHeightFeet), 0);
  const farthestGap = completedJumps.reduce((top, jump) => Math.max(top, jump.gapFeet), 0);
  const modelsForBrand = (brand: string) => getMotorcyclesByBrand(brand);

  const chooseBrand = (brand: string) => {
    setSelectedBrand(brand);
    setModels(modelsForBrand(brand));
    setShowBrandModal(false);
    setShowModelModal(true);
  };

  const saveBike = async (motorcycle: MotorcycleModel) => {
    setSaving(true);
    try {
      const profile = await addRiderBikeProfile(motorcycle);
      await loadData();
      setActiveProfileId(profile.id);
      setShowModelModal(false);
      setSelectedBrand(null);
    } catch (error) {
      console.error('Error saving bike profile:', error);
      Alert.alert(
        'Could not save bike',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const chooseBikeProfile = async (profile: SavedBikeProfile) => {
    try {
      await selectRiderBikeProfile(profile.id);
      setActiveProfileId(profile.id);
    } catch (error) {
      console.error('Error selecting bike profile:', error);
      Alert.alert('Could not select bike', 'Please try again.');
    }
  };

  const chooseBikePhoto = async (profile: SavedBikeProfile) => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Photo access needed',
            'Allow access to your photos to add a picture to this bike profile.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        throw new Error('The selected photo could not be saved. Please try another image.');
      }
      const imageUri = `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
      await saveRiderBikeProfileImage(profile.id, imageUri);
      await loadData();
    } catch (error) {
      console.error('Could not set bike profile photo:', error);
      Alert.alert('Could not add photo', 'Please select another image and try again.');
    }
  };

  const confirmDeleteProfile = (profile: SavedBikeProfile) => {
    Alert.alert(
      'Remove bike profile?',
      `Removing ${profile.motorcycle.brand} ${profile.motorcycle.model} also deletes its jump history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRiderBikeProfile(profile.id);
              await loadData();
            } catch (error) {
              console.error('Error removing bike profile:', error);
              Alert.alert('Could not remove bike', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const submitJump = async (outcome: RiderJumpLog['outcome']) => {
    if (!activeProfile) {
      return;
    }

    const values = [speed.trim(), gap.trim(), jumpHeight.trim()].map(Number);
    if (
      [speed, gap, jumpHeight].some((value) => value.trim() === '') ||
      values.some((value) => !Number.isFinite(value) || value <= 0)
    ) {
      Alert.alert('Check jump details', 'Enter a speed, gap distance, and jump height greater than zero.');
      return;
    }

    try {
      await recordRiderJump({
        profileId: activeProfile.id,
        speedMph: values[0],
        gapFeet: values[1],
        jumpHeightFeet: values[2],
        outcome,
      });
      await loadData();
      setShowJumpModal(false);
      setSpeed('');
      setGap('');
      setJumpHeight('');
    } catch (error) {
      console.error('Error recording jump:', error);
      Alert.alert('Could not record jump', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A6D608" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="bicycle" size={28} color="#A6D608" />
          </View>
          <View>
            <Text style={styles.title}>Rider Profile</Text>
            <Text style={styles.subtitle}>Your bikes and jump history</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Saved bikes</Text>
            <Text style={styles.sectionHint}>{profiles.length} of {MAX_SAVED_PROFILES} free slots used</Text>
          </View>
          <Text style={styles.slotBadge}>{MAX_SAVED_PROFILES - profiles.length} slots left</Text>
        </View>

        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const profileCompletedCount = jumps.filter(
            (jump) => jump.profileId === profile.id && jump.outcome === 'completed'
          ).length;
          const profileWreckCount = jumps.filter(
            (jump) => jump.profileId === profile.id && jump.outcome === 'wreck'
          ).length;

          return (
            <View
              key={profile.id}
              style={[styles.profileCard, isActive && styles.profileCardActive]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Change photo for ${profile.motorcycle.brand} ${profile.motorcycle.model}`}
                onPress={() => void chooseBikePhoto(profile)}
                style={[styles.profileBikeIcon, isActive && styles.profileBikeIconActive]}
              >
                {profile.imageUri ? (
                  <Image source={{ uri: profile.imageUri }} style={styles.profilePhoto} />
                ) : (
                  <Ionicons name="bicycle" size={22} color={isActive ? '#A6D608' : '#C2D0CE'} />
                )}
                <View style={styles.photoBadge}>
                  <Ionicons name="camera" size={10} color="#000000" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => void chooseBikeProfile(profile)}
                style={styles.profileInfo}
              >
                <Text style={styles.profileName}>
                  {profile.motorcycle.brand} {profile.motorcycle.model}
                </Text>
                <Text style={styles.profileMeta}>
                  {profile.motorcycle.year} · {profile.motorcycle.engineCC} cc
                </Text>
                <Text style={styles.profileRecord}>
                  {profileCompletedCount} completed · {profileWreckCount} wrecks
                </Text>
              </TouchableOpacity>
              {isActive && <Ionicons name="checkmark-circle" size={22} color="#A6D608" />}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Remove ${profile.motorcycle.brand} ${profile.motorcycle.model} profile`}
                onPress={() => confirmDeleteProfile(profile)}
                style={styles.removeButton}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color="#FF7A86" />
              </TouchableOpacity>
            </View>
          );
        })}

        {profiles.length < MAX_SAVED_PROFILES && (
          <TouchableOpacity
            style={styles.addBikeButton}
            onPress={() => setShowBrandModal(true)}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={22} color="#A6D608" />
            <Text style={styles.addBikeText}>Add a bike profile</Text>
          </TouchableOpacity>
        )}

        {activeProfile ? (
          <>
            <View style={styles.activeBikeCard}>
              <View style={styles.activeBikeHeading}>
                <View style={styles.activeBikeIcon}>
                  {activeProfile.imageUri ? (
                    <Image source={{ uri: activeProfile.imageUri }} style={styles.activeBikePhoto} />
                  ) : (
                    <Ionicons name="bicycle" size={20} color="#A6D608" />
                  )}
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void chooseBikePhoto(activeProfile)}
                  style={styles.changePhotoButton}
                >
                  <Ionicons name="camera" size={14} color="#A6D608" />
                  <Text style={styles.changePhotoText}>
                    {activeProfile.imageUri ? 'Change photo' : 'Add photo'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.activeBikeInfo}>
                  <Text style={styles.activeBikeTitle}>
                    {activeProfile.motorcycle.brand} {activeProfile.motorcycle.model}
                  </Text>
                  <Text style={styles.activeBikeSubtitle}>Jump stats · completed jumps only</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <StatCard icon="flash" label="Top speed" value={topSpeed ? `${topSpeed.toFixed(1)} mph` : '—'} />
                <StatCard icon="resize" label="Highest jump" value={highestJump ? `${highestJump.toFixed(1)} ft` : '—'} />
                <StatCard icon="trending-up" label="Farthest gap" value={farthestGap ? `${farthestGap.toFixed(1)} ft` : '—'} />
                <StatCard icon="checkmark-circle" label="Completed" value={String(completedJumps.length)} positive />
                <StatCard icon="warning" label="Wrecks" value={String(wreckCount)} warning />
              </View>

              <TouchableOpacity
                style={styles.logJumpButton}
                onPress={() => setShowJumpModal(true)}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={20} color="#000000" />
                <Text style={styles.logJumpText}>Log a jump for this bike</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailTitle}>Bike details</Text>
              <Text style={styles.detailText}>
                {activeProfile.motorcycle.year} · {activeProfile.motorcycle.engineCC} cc · {activeProfile.motorcycle.type}
              </Text>
              <Text style={styles.detailText}>
                {activeProfile.motorcycle.torque_ft_lbs} ft-lb torque · {activeProfile.motorcycle.weight_lbs} lb dry weight
              </Text>
              <Text style={styles.detailText}>{activeProfile.motorcycle.horsepower} hp</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="bicycle-outline" size={36} color="#9AADB0" />
            <Text style={styles.emptyTitle}>Add your first bike</Text>
            <Text style={styles.emptyText}>
              Save up to three bikes, then log jumps to track each bike’s results.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showBrandModal} animationType="slide" onRequestClose={() => setShowBrandModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>NEW BIKE · STEP 1 OF 2</Text>
              <Text style={styles.modalTitle}>Choose a brand</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBrandModal(false)} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#F5FAF8" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={brands}
            keyExtractor={(brand) => brand}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => chooseBrand(item)}>
                <Text style={styles.modalItemText}>{item}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9AADB0" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showModelModal} animationType="slide" onRequestClose={() => setShowModelModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>NEW BIKE · STEP 2 OF 2</Text>
              <Text style={styles.modalTitle}>Choose a {selectedBrand} bike</Text>
            </View>
            <TouchableOpacity onPress={() => setShowModelModal(false)} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#F5FAF8" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={models}
            keyExtractor={(motorcycle) => motorcycle.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => void saveBike(item)}
                disabled={saving}
              >
                <View style={styles.modalBikeInfo}>
                  <Text style={styles.modalItemText}>{`${item.model} (${item.year})`}</Text>
                  <Text style={styles.modalItemSubtitle}>
                    {`${item.engineCC} cc · ${item.torque_ft_lbs} ft-lb · ${item.weight_lbs} lb`}
                  </Text>
                </View>
                {saving ? <ActivityIndicator color="#A6D608" /> : <Ionicons name="add-circle-outline" size={22} color="#A6D608" />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showJumpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJumpModal(false)}
      >
        <View style={styles.jumpModalOverlay}>
          <View style={styles.jumpModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.jumpModalHeaderText}>
                <Text style={styles.modalEyebrow}>JUMP LOG</Text>
                <Text style={styles.modalTitle}>Record this jump</Text>
              </View>
              <TouchableOpacity onPress={() => setShowJumpModal(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color="#F5FAF8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.jumpModalHint}>
              Enter your measured values in mph and feet, then record the outcome.
            </Text>
            <Text style={styles.inputLabel}>Speed (mph)</Text>
            <TextInput
              style={styles.input}
              value={speed}
              onChangeText={setSpeed}
              keyboardType="decimal-pad"
              placeholder="e.g. 32"
              placeholderTextColor="#9AADB0"
            />
            <Text style={styles.inputLabel}>Gap cleared (ft)</Text>
            <TextInput
              style={styles.input}
              value={gap}
              onChangeText={setGap}
              keyboardType="decimal-pad"
              placeholder="e.g. 45"
              placeholderTextColor="#9AADB0"
            />
            <Text style={styles.inputLabel}>Jump height (ft)</Text>
            <TextInput
              style={styles.input}
              value={jumpHeight}
              onChangeText={setJumpHeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 8"
              placeholderTextColor="#9AADB0"
            />
            <View style={styles.outcomeActions}>
              <TouchableOpacity
                style={styles.completedButton}
                onPress={() => void submitJump('completed')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#F5FAF8" />
                <Text style={styles.outcomeButtonText}>Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.wreckButton}
                onPress={() => void submitJump('wreck')}
              >
                <Ionicons name="warning" size={20} color="#F5FAF8" />
                <Text style={styles.outcomeButtonText}>Wreck</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  positive = false,
  warning = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  const color = warning ? '#FF7A86' : positive ? '#8BD6A7' : '#A6D608';

  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#081116' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#081116' },
  scrollContent: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  headerIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#1B3038' },
  title: { color: '#F5FAF8', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#C2D0CE', fontSize: 13, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#F5FAF8', fontSize: 19, fontWeight: '700' },
  sectionHint: { color: '#9AADB0', fontSize: 12, marginTop: 4 },
  slotBadge: { color: '#A6D608', backgroundColor: 'rgba(166, 214, 8, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, fontSize: 12, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#35515A', borderRadius: 16, backgroundColor: '#1B3038' },
  profileCardActive: { borderColor: '#A6D608', backgroundColor: '#172D33' },
  profileBikeIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderRadius: 13, backgroundColor: '#28434B' },
  profileBikeIconActive: { backgroundColor: 'rgba(166, 214, 8, 0.14)' },
  profilePhoto: { width: '100%', height: '100%', borderRadius: 13 },
  photoBadge: { position: 'absolute', right: -3, bottom: -3, width: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1B3038', borderRadius: 10, backgroundColor: '#A6D608' },
  profileInfo: { flex: 1 },
  profileName: { color: '#F5FAF8', fontSize: 15, fontWeight: '700' },
  profileMeta: { color: '#C2D0CE', fontSize: 12, marginTop: 3 },
  profileRecord: { color: '#9AADB0', fontSize: 11, marginTop: 5 },
  removeButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  addBikeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 50, marginBottom: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#405C65', borderRadius: 14 },
  addBikeText: { color: '#A6D608', fontSize: 14, fontWeight: '700' },
  activeBikeCard: { padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#35515A', borderRadius: 18, backgroundColor: '#14262D' },
  activeBikeHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activeBikeIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderRadius: 14, backgroundColor: 'rgba(166, 214, 8, 0.12)', overflow: 'hidden' },
  activeBikePhoto: { width: '100%', height: '100%' },
  changePhotoButton: { alignItems: 'center', justifyContent: 'center', gap: 2, marginRight: 10, paddingHorizontal: 5 },
  changePhotoText: { color: '#A6D608', fontSize: 9, fontWeight: '600' },
  activeBikeInfo: { flex: 1 },
  activeBikeTitle: { color: '#F5FAF8', fontSize: 16, fontWeight: '700' },
  activeBikeSubtitle: { color: '#C2D0CE', fontSize: 12, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 92, minHeight: 96, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 13, backgroundColor: '#28434B' },
  statValue: { color: '#F5FAF8', fontSize: 16, fontWeight: '800', marginTop: 7 },
  statLabel: { color: '#C2D0CE', fontSize: 11, textAlign: 'center', marginTop: 4 },
  logJumpButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 16, borderRadius: 12, backgroundColor: '#A6D608' },
  logJumpText: { color: '#000000', fontSize: 14, fontWeight: '700' },
  detailsCard: { padding: 16, marginTop: 14, borderRadius: 16, backgroundColor: '#1B3038' },
  detailTitle: { color: '#F5FAF8', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  detailText: { color: '#C2D0CE', fontSize: 13, lineHeight: 20, marginTop: 3 },
  emptyCard: { alignItems: 'center', padding: 28, marginTop: 12, borderRadius: 18, backgroundColor: '#1B3038' },
  emptyTitle: { color: '#F5FAF8', fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { color: '#C2D0CE', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  modalContainer: { flex: 1, backgroundColor: '#081116' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#35515A' },
  modalEyebrow: { color: '#A6D608', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { color: '#F5FAF8', fontSize: 20, fontWeight: '700', marginTop: 4 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#28434B' },
  modalBikeInfo: { flex: 1 },
  modalItemText: { color: '#F5FAF8', fontSize: 16, fontWeight: '600' },
  modalItemSubtitle: { color: '#C2D0CE', fontSize: 12, marginTop: 5 },
  jumpModalOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(3, 12, 16, 0.84)' },
  jumpModalCard: { paddingBottom: 20, borderWidth: 1, borderColor: '#405C65', borderRadius: 20, backgroundColor: '#14262D', overflow: 'hidden' },
  jumpModalHeaderText: { flex: 1 },
  jumpModalHint: { color: '#C2D0CE', fontSize: 13, lineHeight: 19, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  inputLabel: { color: '#CED9D6', fontSize: 12, fontWeight: '600', marginHorizontal: 18, marginTop: 10, marginBottom: 6 },
  input: { minHeight: 46, marginHorizontal: 18, paddingHorizontal: 12, borderWidth: 1, borderColor: '#405C65', borderRadius: 10, backgroundColor: '#28434B', color: '#F5FAF8', fontSize: 15 },
  outcomeActions: { flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 18 },
  completedButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: 12, backgroundColor: '#548F6C' },
  wreckButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderRadius: 12, backgroundColor: '#B94D5B' },
  outcomeButtonText: { color: '#F5FAF8', fontSize: 13, fontWeight: '700' },
});
