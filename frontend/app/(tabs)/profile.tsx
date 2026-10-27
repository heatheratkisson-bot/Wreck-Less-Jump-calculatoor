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
  MOTORCYCLE_YEARS,
  getMotorcyclesByBrandAndYear,
  MotorcycleModel,
} from '@/lib/motorcycleData';
import {
  addRiderBikeProfile,
  deleteRiderBikeProfile,
  getRiderProfileData,
  getSavedRiderWeight,
  recordRiderJump,
  RiderJumpLog,
  saveRiderWeight,
  saveRiderBikeProfileImage,
  SavedBikeProfile,
  selectRiderBikeProfile,
} from '@/lib/appSupport';
import { useLocalSearchParams, useRouter } from 'expo-router';

const MAX_SAVED_PROFILES = 3;
type BikePickerField = 'year' | 'brand' | 'model';

export default function Profile() {
  const router = useRouter();
  const { openJumpLog } = useLocalSearchParams<{ openJumpLog?: string }>();
  const [profiles, setProfiles] = useState<SavedBikeProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [jumps, setJumps] = useState<RiderJumpLog[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedModel, setSelectedModel] = useState<MotorcycleModel | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualBrand, setManualBrand] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const [riderWeight, setRiderWeight] = useState('');
  const [newBikeImageUri, setNewBikeImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRiderWeight, setSavingRiderWeight] = useState(false);
  const [showBikeModal, setShowBikeModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerField, setPickerField] = useState<BikePickerField>('year');
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [speed, setSpeed] = useState('');
  const [gap, setGap] = useState('');
  const [jumpHeight, setJumpHeight] = useState('');

  const closeJumpModal = useCallback(() => {
    setShowJumpModal(false);
    router.setParams({ openJumpLog: undefined });
  }, [router]);

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

    getSavedRiderWeight()
      .then((savedWeight) => {
        if (isMounted && savedWeight !== null) {
          setRiderWeight(String(savedWeight));
        }
      })
      .catch((error: unknown) => {
        console.error('Error loading saved rider weight:', error);
        if (isMounted) {
          Alert.alert('Could not load saved weight', 'You can enter and save it again.');
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
  const modelsForBrandYear =
    selectedBrand && selectedBrand !== 'Other'
      ? getMotorcyclesByBrandAndYear(selectedBrand, selectedYear)
      : [];

  const openBikePicker = (field: BikePickerField) => {
    setPickerField(field);
    setShowPickerModal(true);
  };

  const selectBikePickerOption = (value: string) => {
    if (pickerField === 'year') {
      setSelectedYear(Number(value));
      setSelectedModel(null);
    } else if (pickerField === 'brand') {
      setSelectedBrand(value);
      setSelectedModel(null);
      setManualBrand(value === 'Other' ? '' : value);
    } else {
      const motorcycle = modelsForBrandYear.find((item) => item.id === value);
      if (motorcycle) {
        setSelectedModel(motorcycle);
      }
    }
    setShowPickerModal(false);
  };

  const openAddBike = () => {
    setSelectedYear(2026);
    setSelectedBrand(null);
    setSelectedModel(null);
    setManualEntry(false);
    setManualBrand('');
    setManualWeight('');
    setNewBikeImageUri(null);
    setShowBikeModal(true);
  };

  const saveBike = async (motorcycle: MotorcycleModel) => {
    setSaving(true);
    try {
      const profile = await addRiderBikeProfile(motorcycle);
      if (newBikeImageUri) {
        try {
          await saveRiderBikeProfileImage(profile.id, newBikeImageUri);
        } catch (error) {
          console.error('Bike was saved, but its photo could not be saved:', error);
          await loadData();
          setActiveProfileId(profile.id);
          setShowBikeModal(false);
          setSelectedBrand(null);
          Alert.alert('Bike saved without photo', 'The bike profile was saved, but its picture could not be saved. You can add it from the profile.');
          return;
        }
      }
      await loadData();
      setActiveProfileId(profile.id);
      setShowBikeModal(false);
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

  const saveManualBike = async () => {
    const brand = (selectedBrand === 'Other' ? manualBrand : selectedBrand)?.trim() ?? '';
    const weight = Number(manualWeight);

    if (!brand) {
      Alert.alert('Add bike details', 'Enter the bike make.');
      return;
    }
    if (!Number.isFinite(weight) || weight < 40 || weight > 1000) {
      Alert.alert('Check bike weight', 'Enter a bike weight between 40 and 1,000 pounds.');
      return;
    }
    await saveBike({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      brand,
      model: 'Custom',
      year: selectedYear,
      engineCC: 0,
      torque_ft_lbs: 0,
      weight_lbs: weight,
      horsepower: 0,
      type: 'Custom',
      description: 'User-entered bike specifications',
    });
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

  const saveBodyWeight = async () => {
    const weightLbs = Number(riderWeight);
    if (!Number.isFinite(weightLbs) || weightLbs < 1 || weightLbs > 1000) {
      Alert.alert('Check rider weight', 'Enter a weight between 1 and 1,000 pounds.');
      return;
    }

    setSavingRiderWeight(true);
    try {
      await saveRiderWeight(weightLbs);
      setRiderWeight(String(weightLbs));
      Alert.alert('Weight saved', 'Your weight will be used for jump calculations.');
    } catch (error) {
      console.error('Error saving rider weight:', error);
      Alert.alert('Could not save weight', 'Please try again.');
    } finally {
      setSavingRiderWeight(false);
    }
  };

  const selectBikePhoto = async (): Promise<string | null> => {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow access to your photos to add a picture to this bike profile.'
        );
        return null;
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
      return null;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      throw new Error('The selected photo could not be saved. Please try another image.');
    }
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  };

  const chooseBikePhoto = async (profile: SavedBikeProfile) => {
    try {
      const imageUri = await selectBikePhoto();
      if (!imageUri) {
        return;
      }
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
      closeJumpModal();
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

        <View style={styles.detailsCard}>
          <Text style={styles.detailTitle}>Rider body weight</Text>
          <Text style={styles.detailText}>
            Save your weight once and it will be filled in automatically for jump calculations.
          </Text>
          <TextInput
            style={[styles.formInput, styles.riderWeightInput]}
            value={riderWeight}
            onChangeText={setRiderWeight}
            placeholder="Enter weight in pounds"
            placeholderTextColor="#9AADB0"
            keyboardType="decimal-pad"
            accessibilityLabel="Rider body weight in pounds"
          />
          <TouchableOpacity
            style={[styles.saveBikeButton, savingRiderWeight && styles.saveBikeButtonDisabled]}
            onPress={() => void saveBodyWeight()}
            disabled={savingRiderWeight}
            accessibilityRole="button"
          >
            {savingRiderWeight ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#000000" />
                <Text style={styles.saveBikeButtonText}>Save body weight</Text>
              </>
            )}
          </TouchableOpacity>
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
                  {profile.motorcycle.year}
                  {profile.motorcycle.engineCC > 0 ? ` · ${profile.motorcycle.engineCC} cc` : ''}
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
            onPress={openAddBike}
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
                {activeProfile.motorcycle.year}
                {activeProfile.motorcycle.engineCC > 0 ? ` · ${activeProfile.motorcycle.engineCC} cc` : ''}
                {activeProfile.motorcycle.type ? ` · ${activeProfile.motorcycle.type}` : ''}
              </Text>
              <Text style={styles.detailText}>
                {activeProfile.motorcycle.weight_lbs} lb dry weight
              </Text>
              {activeProfile.motorcycle.horsepower > 0 && (
                <Text style={styles.detailText}>{activeProfile.motorcycle.horsepower} hp</Text>
              )}
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

      <Modal visible={showBikeModal} animationType="slide" onRequestClose={() => setShowBikeModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>NEW BIKE</Text>
              <Text style={styles.modalTitle}>Select your bike</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBikeModal(false)} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#F5FAF8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.bikeFormContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={newBikeImageUri ? 'Change bike picture' : 'Add bike picture'}
              onPress={() => {
                void selectBikePhoto()
                  .then((imageUri) => {
                    if (imageUri) {
                      setNewBikeImageUri(imageUri);
                    }
                  })
                  .catch((error: unknown) => {
                    console.error('Could not select bike picture:', error);
                    Alert.alert('Could not add photo', 'Please select another image and try again.');
                  });
              }}
              style={styles.newBikePhotoButton}
            >
              <View style={styles.newBikePhotoFrame}>
                {newBikeImageUri ? (
                  <Image source={{ uri: newBikeImageUri }} style={styles.newBikePhoto} />
                ) : (
                  <Ionicons name="bicycle" size={32} color="#A6D608" />
                )}
                <View style={styles.newBikePhotoBadge}>
                  <Ionicons name="camera" size={12} color="#000000" />
                </View>
              </View>
              <Text style={styles.newBikePhotoTitle}>
                {newBikeImageUri ? 'Change bike picture' : 'Add a bike picture'}
              </Text>
              <Text style={styles.newBikePhotoHint}>Optional · shown in your bike profile</Text>
            </TouchableOpacity>

            <Text style={styles.pickerLabel}>Year</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openBikePicker('year')}>
              <Text style={styles.dropdownButtonText}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={18} color="#A6D608" />
            </TouchableOpacity>

            <Text style={styles.pickerLabel}>Make</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => openBikePicker('brand')}>
              <Text style={[styles.dropdownButtonText, !selectedBrand && styles.dropdownPlaceholder]}>
                {selectedBrand || 'Choose a make'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#A6D608" />
            </TouchableOpacity>

            {!manualEntry ? (
              <>
                <Text style={styles.pickerLabel}>Model</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, !selectedBrand && styles.dropdownDisabled]}
                  onPress={() => openBikePicker('model')}
                  disabled={!selectedBrand}
                >
                  <Text style={[styles.dropdownButtonText, !selectedModel && styles.dropdownPlaceholder]}>
                    {selectedModel?.model ?? (selectedBrand ? 'Choose a model' : 'Choose a make first')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#A6D608" />
                </TouchableOpacity>
                {selectedModel && (
                  <View style={styles.specPreview}>
                    <Text style={styles.specPreviewText}>
                      {selectedModel.engineCC > 0 ? `${selectedModel.engineCC} cc · ` : ''}
                      {selectedModel.weight_lbs} lb dry weight
                    </Text>
                  </View>
                )}
                <Text style={styles.catalogNote}>
                  The model list shows bikes with saved specifications for this exact year and make. The built-in catalog is limited; verify dry weight against your owner’s manual.
                </Text>
              </>
            ) : (
              <>
                {selectedBrand === 'Other' && (
                  <>
                    <Text style={styles.pickerLabel}>Make</Text>
                    <TextInput
                      style={styles.formInput}
                      value={manualBrand}
                      onChangeText={setManualBrand}
                      placeholder="Enter the bike make"
                      placeholderTextColor="#9AADB0"
                    />
                  </>
                )}
                <Text style={styles.pickerLabel}>Dry weight (lb)</Text>
                <TextInput
                  style={styles.formInput}
                  value={manualWeight}
                  onChangeText={setManualWeight}
                  placeholder="Check your owner's manual"
                  placeholderTextColor="#9AADB0"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.catalogNote}>
                  Enter the manufacturer’s dry weight when available. Bike weight is used in the jump calculation.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => {
                setManualEntry((current) => !current);
                setSelectedModel(null);
              }}
            >
              <Ionicons name={manualEntry ? 'list' : 'create-outline'} size={18} color="#A6D608" />
              <Text style={styles.manualEntryText}>
                {manualEntry ? 'Choose a catalog model instead' : 'Can’t find your bike? Enter it manually'}
              </Text>
            </TouchableOpacity>

            {!manualEntry && selectedModel && (
              <Text style={styles.calculationNote}>
                Bike weight will fill in on How Fast.
              </Text>
            )}

            {manualEntry ? (
              <TouchableOpacity
                style={[styles.saveBikeButton, saving && styles.saveBikeButtonDisabled]}
                onPress={() => void saveManualBike()}
                disabled={saving || !selectedBrand}
              >
                {saving ? <ActivityIndicator color="#000000" /> : <Ionicons name="checkmark" size={20} color="#000000" />}
                <Text style={styles.saveBikeButtonText}>Save bike</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.saveBikeButton, (!selectedModel || saving) && styles.saveBikeButtonDisabled]}
                onPress={() => selectedModel && void saveBike(selectedModel)}
                disabled={!selectedModel || saving}
              >
                {saving ? <ActivityIndicator color="#000000" /> : <Ionicons name="checkmark" size={20} color="#000000" />}
                <Text style={styles.saveBikeButtonText}>Save bike</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showPickerModal} animationType="slide" transparent onRequestClose={() => setShowPickerModal(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerField === 'year' ? 'Choose a year' : pickerField === 'brand' ? 'Choose a make' : 'Choose a model'}
              </Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)} accessibilityLabel="Close choices">
                <Ionicons name="close" size={24} color="#F5FAF8" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={
                pickerField === 'year'
                  ? MOTORCYCLE_YEARS.map((year) => ({ label: String(year), value: String(year) }))
                  : pickerField === 'brand'
                    ? MOTORCYCLE_BRANDS.map((brand) => ({ label: brand, value: brand }))
                    : modelsForBrandYear.map((motorcycle) => ({
                        label: `${motorcycle.model} · ${motorcycle.weight_lbs} lb dry weight`,
                        value: motorcycle.id,
                      }))
              }
              keyExtractor={(option) => option.value}
              ListEmptyComponent={
                pickerField === 'model' ? (
                  <View style={styles.emptyModelList}>
                    <Ionicons name="bicycle-outline" size={32} color="#9AADB0" />
                    <Text style={styles.emptyModelTitle}>No verified models listed</Text>
                    <Text style={styles.emptyModelText}>
                      There are no saved model specifications for {selectedYear} {selectedBrand}. Add your bike manually and enter its dry weight.
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.emptyModelButton}
                      onPress={() => {
                        setShowPickerModal(false);
                        setManualEntry(true);
                      }}
                    >
                      <Text style={styles.emptyModelButtonText}>Enter bike manually</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => selectBikePickerOption(item.value)}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9AADB0" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showJumpModal || openJumpLog === 'true'}
        transparent
        animationType="slide"
        onRequestClose={closeJumpModal}
      >
        <View style={styles.jumpModalOverlay}>
          <View style={styles.jumpModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.jumpModalHeaderText}>
                <Text style={styles.modalEyebrow}>JUMP LOG</Text>
                <Text style={styles.modalTitle}>Record this jump</Text>
              </View>
              <TouchableOpacity onPress={closeJumpModal} accessibilityLabel="Close">
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
  riderWeightInput: { marginTop: 12 },
  detailTitle: { color: '#F5FAF8', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  detailText: { color: '#C2D0CE', fontSize: 13, lineHeight: 20, marginTop: 3 },
  emptyCard: { alignItems: 'center', padding: 28, marginTop: 12, borderRadius: 18, backgroundColor: '#1B3038' },
  emptyTitle: { color: '#F5FAF8', fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptyText: { color: '#C2D0CE', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  modalContainer: { flex: 1, backgroundColor: '#081116' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#35515A' },
  modalEyebrow: { color: '#A6D608', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { color: '#F5FAF8', fontSize: 20, fontWeight: '700', marginTop: 4 },
  bikeFormContent: { padding: 18, paddingBottom: 32 },
  newBikePhotoButton: { alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  newBikePhotoFrame: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#49636A', borderRadius: 24, backgroundColor: '#1B3038', overflow: 'visible' },
  newBikePhoto: { width: '100%', height: '100%', borderRadius: 23 },
  newBikePhotoBadge: { position: 'absolute', right: -5, bottom: -4, width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#081116', borderRadius: 13, backgroundColor: '#A6D608' },
  newBikePhotoTitle: { color: '#A6D608', fontSize: 13, fontWeight: '700', marginTop: 10 },
  newBikePhotoHint: { color: '#9AADB0', fontSize: 11, marginTop: 3 },
  pickerLabel: { color: '#CED9D6', fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  dropdownButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderWidth: 1, borderColor: '#405C65', borderRadius: 10, backgroundColor: '#1B3038' },
  dropdownDisabled: { opacity: 0.65 },
  dropdownButtonText: { color: '#F5FAF8', fontSize: 15, fontWeight: '600' },
  dropdownPlaceholder: { color: '#9AADB0', fontWeight: '400' },
  specPreview: { padding: 12, marginTop: 8, borderRadius: 10, backgroundColor: '#1B3038' },
  specPreviewText: { color: '#8BD6A7', fontSize: 13, fontWeight: '600' },
  catalogNote: { color: '#C2D0CE', fontSize: 12, lineHeight: 18, marginTop: 12 },
  calculationNote: { color: '#E8B86D', fontSize: 12, lineHeight: 18, marginTop: 12 },
  formInput: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: '#405C65', borderRadius: 10, backgroundColor: '#1B3038', color: '#F5FAF8', fontSize: 15 },
  manualEntryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  manualEntryText: { color: '#A6D608', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  saveBikeButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, borderRadius: 12, backgroundColor: '#A6D608' },
  saveBikeButtonDisabled: { opacity: 0.55 },
  saveBikeButtonText: { color: '#000000', fontSize: 15, fontWeight: '800' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3, 12, 16, 0.75)' },
  pickerSheet: { maxHeight: '75%', backgroundColor: '#081116', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  emptyModelList: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emptyModelTitle: { color: '#F5FAF8', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyModelText: { color: '#C2D0CE', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  emptyModelButton: { paddingHorizontal: 18, paddingVertical: 12, marginTop: 18, borderRadius: 10, backgroundColor: '#A6D608' },
  emptyModelButtonText: { color: '#000000', fontSize: 14, fontWeight: '700' },
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
