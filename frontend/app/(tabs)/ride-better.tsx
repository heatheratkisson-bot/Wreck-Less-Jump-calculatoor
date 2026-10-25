import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SKILL_CATEGORIES, SKILL_SOURCES } from '@/lib/rideBetterSkills';
import type { SkillCategory } from '@/lib/rideBetterSkills';
import SkillHeroPhoto from '@/components/SkillHeroPhoto';

const RIDING_LOCATION_KEY = 'wreckless_ride_better_location_v1';
const CHP_MOTORCYCLE_SAFETY_URL =
  'https://www.chp.ca.gov/Programs-Services/Programs/California-Motorcyclist-Safety';
const NHTSA_MOTORCYCLE_SAFETY_URL = 'https://www.nhtsa.gov/road-safety/motorcycles';

type RideSection = 'safety' | 'skills';

const SAFETY_GUIDES = [
  {
    title: 'Before you ride on public roads',
    icon: 'clipboard-outline' as const,
    points: [
      'Confirm the motorcycle is approved and equipped for road use, and that your license or endorsement, registration, and insurance meet local requirements.',
      'Wear a properly fitted, legally compliant helmet and protective clothing. Check local helmet and equipment rules; they can differ by age and vehicle type.',
      'Check tires, brakes, lights, controls, mirrors, chain, and fuel before riding. Do not ride a bike with a safety-critical defect.',
      'Plan a route and weather check. Avoid riding when impaired, exhausted, or distracted.',
    ],
  },
  {
    title: 'Ride defensively',
    icon: 'eye' as const,
    points: [
      'Assume drivers may not see you. Stay visible, avoid lingering in blind spots, and use lights and signals as required.',
      'Scan intersections, driveways, turning vehicles, and road surfaces early. Keep space to slow or steer away from hazards.',
      'Leave a generous following distance and choose a speed that lets you stop within the visible, clear road.',
      'Be especially cautious around large vehicles, gravel, standing water, oil, uneven pavement, and sudden weather changes.',
    ],
  },
  {
    title: 'If you are stopped by police',
    icon: 'shield' as const,
    points: [
      'Signal and pull over at the first safe, lawful place. Switch off the engine, keep your hands visible, and avoid sudden movements.',
      'Stay calm and follow lawful instructions. Provide documents when legally required; rules vary by location.',
      'If you are unsure whether you may leave, calmly ask. Do not physically resist or escalate a roadside disagreement.',
      'Rights and requirements differ by jurisdiction and situation. For advice about a specific stop, contact a local licensed attorney or legal-aid organization.',
    ],
  },
  {
    title: 'If there is a crash or breakdown',
    icon: 'medkit' as const,
    points: [
      'Move out of traffic only if you can do so safely. Call the local emergency number for injuries, hazards, or a dangerous road location.',
      'Do not remove a seriously injured rider’s helmet unless necessary to protect their airway or safety; wait for trained responders when possible.',
      'Make yourself visible from a safe location, and do not stand in a travel lane or blind landing area.',
      'After a crash, get medical help and follow local reporting requirements. A delayed medical assessment can miss serious injuries.',
    ],
  },
];

export default function RideBetterScreen() {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [section, setSection] = useState<RideSection>('safety');
  const [ridingLocation, setRidingLocation] = useState('Kern County, California');
  const [locationDraft, setLocationDraft] = useState('Kern County, California');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(RIDING_LOCATION_KEY)
      .then((savedLocation) => {
        if (isMounted && savedLocation?.trim()) {
          setRidingLocation(savedLocation);
          setLocationDraft(savedLocation);
        }
      })
      .catch((error: unknown) => {
        console.error('Could not load riding location:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveRidingLocation = async () => {
    const nextLocation = locationDraft.trim();
    if (!nextLocation) {
      Alert.alert('Enter a location', 'Add a city and state/province or country to find local guidance.');
      return;
    }

    try {
      await AsyncStorage.setItem(RIDING_LOCATION_KEY, nextLocation);
      setRidingLocation(nextLocation);
    } catch (error) {
      console.error('Could not save riding location:', error);
      Alert.alert('Could not save location', 'Please try again.');
    }
  };

  const openOfficialSearch = async () => {
    const searchLocation = locationDraft.trim() || ridingLocation;
    const query = `${searchLocation} official government motorcycle road laws license registration helmet off-highway vehicle requirements`;
    try {
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Could not open local law search:', error);
      Alert.alert('Could not open search', 'Please search for your local transport or motor-vehicle authority.');
    }
  };

  const openResource = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Could not open safety resource:', error);
      Alert.alert('Could not open resource', 'Please try again or open the official source in your browser.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="school" size={26} color="#A6D608" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Ride Better</Text>
            <Text style={styles.subtitle}>Skills and safety for every ride</Text>
          </View>
        </View>

        <View style={styles.sectionTabs} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === 'safety' }}
            onPress={() => setSection('safety')}
            style={[styles.sectionTab, section === 'safety' && styles.sectionTabActive]}
          >
            <Ionicons name="shield-checkmark" size={19} color={section === 'safety' ? '#000000' : '#C2D0CE'} />
            <Text style={[styles.sectionTabText, section === 'safety' && styles.sectionTabTextActive]}>Safety</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === 'skills' }}
            onPress={() => setSection('skills')}
            style={[styles.sectionTab, section === 'skills' && styles.sectionTabActive]}
          >
            <Ionicons name="school" size={19} color={section === 'skills' ? '#000000' : '#C2D0CE'} />
            <Text style={[styles.sectionTabText, section === 'skills' && styles.sectionTabTextActive]}>Skills</Text>
          </Pressable>
        </View>

        {section === 'safety' ? (
          <>
        <View style={styles.safetyNote}>
          <Ionicons name="information-circle" size={22} color="#E8B86D" />
          <Text style={styles.safetyText}>
            Riding has serious risks. These are general safety tips, not legal advice. Always check
            current rules with the official authority for where you ride.
          </Text>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeading}>
            <Ionicons name="location" size={20} color="#A6D608" />
            <View style={styles.locationHeadingCopy}>
              <Text style={styles.locationTitle}>Your riding location</Text>
              <Text style={styles.locationCurrent}>Current: {ridingLocation}</Text>
            </View>
          </View>
          <Text style={styles.locationHint}>
            Enter a city and state/province or country to find local road and off-highway rules.
          </Text>
          <TextInput
            accessibilityLabel="City and region for local riding laws"
            value={locationDraft}
            onChangeText={setLocationDraft}
            placeholder="City, state/province, country"
            placeholderTextColor="#9AADB0"
            style={styles.locationInput}
            returnKeyType="done"
            onSubmitEditing={() => void saveRidingLocation()}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void saveRidingLocation()}
            style={styles.saveLocationButton}
          >
            <Ionicons name="save-outline" size={18} color="#000000" />
            <Text style={styles.saveLocationText}>Save location</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void openOfficialSearch()}
            style={styles.localLawsButton}
          >
            <Ionicons name="open-outline" size={18} color="#A6D608" />
            <Text style={styles.localLawsText}>
              Find official laws for {locationDraft.trim() || ridingLocation}
            </Text>
          </Pressable>
          <Text style={styles.sourceCaveat}>
            Search results are not legal advice. Confirm requirements with the official transport,
            motor-vehicle, or law-enforcement agency for your location.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Road & rider safety</Text>
        <Text style={styles.sectionDescription}>
          Practical reminders for public roads, traffic stops, and unexpected situations.
        </Text>
        <View style={styles.safetyGuideList}>
          {SAFETY_GUIDES.map((guide) => (
            <View key={guide.title} style={styles.safetyGuideCard}>
              <View style={styles.safetyGuideHeading}>
                <View style={styles.safetyGuideIcon}>
                  <Ionicons name={guide.icon} size={19} color="#A6D608" />
                </View>
                <Text style={styles.safetyGuideTitle}>{guide.title}</Text>
              </View>
              {guide.points.map((point) => (
                <View key={point} style={styles.safetyPoint}>
                  <View style={styles.safetyPointDot} />
                  <Text style={styles.safetyPointText}>{point}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Official safety resources</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void openResource(CHP_MOTORCYCLE_SAFETY_URL)}
          style={styles.resourceLink}
        >
          <View style={styles.resourceIcon}><Ionicons name="business" size={19} color="#A6D608" /></View>
          <View style={styles.resourceCopy}>
            <Text style={styles.resourceTitle}>California Highway Patrol</Text>
            <Text style={styles.resourceSubtitle}>California motorcycle safety, training, helmet and lane-splitting guidance</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#C2D0CE" />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => void openResource(NHTSA_MOTORCYCLE_SAFETY_URL)}
          style={styles.resourceLink}
        >
          <View style={styles.resourceIcon}><Ionicons name="globe-outline" size={19} color="#A6D608" /></View>
          <View style={styles.resourceCopy}>
            <Text style={styles.resourceTitle}>NHTSA motorcycle safety</Text>
            <Text style={styles.resourceSubtitle}>U.S. federal motorcycle safety information</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#C2D0CE" />
        </Pressable>
          </>
        ) : (
          <>
        <View style={styles.safetyNote}>
          <Ionicons name="information-circle" size={22} color="#E8B86D" />
          <Text style={styles.safetyText}>
            Motocross has serious risks. These guides are general information, not a substitute for
            qualified, in-person coaching or track rules.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choose a skill</Text>
        <Text style={styles.sectionDescription}>
          Explore 20 riding topics, with practical learning cues and references from the Motorcycle
          Safety Foundation and Motocross Action Magazine.
        </Text>

        <View style={styles.categoryList}>
          {SKILL_CATEGORIES.map((category, index) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`Learn about ${category.title}`}
              onPress={() => setSelectedCategory(category)}
              style={({ pressed }) => [
                styles.categoryCard,
                pressed && styles.categoryCardPressed,
              ]}
            >
              <View style={[styles.categoryIcon, { borderColor: `${category.color}70` }]}>
                <Ionicons name={category.icon} size={24} color={category.color} />
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryEyebrow}>SKILL {String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C2D0CE" />
            </Pressable>
          ))}
        </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectedCategory !== null}
        animationType="slide"
        onRequestClose={() => setSelectedCategory(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to skill categories"
              onPress={() => setSelectedCategory(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color="#F5FAF8" />
            </Pressable>
            <Text style={styles.modalHeaderLabel}>RIDE BETTER</Text>
            <View style={styles.backButtonSpacer} />
          </View>

          {selectedCategory && (
            <ScrollView contentContainerStyle={styles.lessonContent}>
              <SkillHeroPhoto
                categoryId={selectedCategory.id}
                onOpenResource={openResource}
              />
              <View
                style={[
                  styles.lessonHeroIcon,
                  { borderColor: `${selectedCategory.color}70`, marginTop: 16 },
                ]}
              >
                <Ionicons name={selectedCategory.icon} size={32} color={selectedCategory.color} />
              </View>
              <Text style={styles.lessonTitle}>{selectedCategory.title}</Text>
              <Text style={styles.lessonSubtitle}>{selectedCategory.subtitle}</Text>
              <View style={styles.overviewCard}>
                <Text style={styles.cardEyebrow}>THE BASICS</Text>
                <Text style={styles.overviewText}>{selectedCategory.overview}</Text>
              </View>

              {selectedCategory.lessons.map((lesson, index) => (
                <View key={lesson.title} style={styles.lessonCard}>
                  <View style={styles.lessonNumber}>
                    <Text style={styles.lessonNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.lessonCopy}>
                    <Text style={styles.lessonCardTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonBody}>{lesson.body}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.sourcesCard}>
                <Text style={styles.cardEyebrow}>REFERENCES & RIDER FEATURES</Text>
                <Text style={styles.sourcesDescription}>
                  These guides are original summaries, not direct quotes or personal instruction.
                  Professional techniques are context-specific; use the links for further reading
                  and learn advanced skills with a qualified coach.
                </Text>
                {selectedCategory.sources.map((sourceId) => {
                  const source = SKILL_SOURCES[sourceId];
                  if (!source) return null;
                  return (
                    <Pressable
                      key={sourceId}
                      accessibilityRole="link"
                      onPress={() => void openResource(source.url)}
                      style={styles.sourceLink}
                    >
                      <Ionicons name="open-outline" size={17} color="#A6D608" />
                      <Text style={styles.sourceLinkText}>{source.title}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.coachingNote}>
                <Ionicons name="person" size={20} color="#A6D608" />
                <Text style={styles.coachingText}>
                  For hands-on technique, learn with a qualified motocross instructor at a
                  permitted training facility.
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081116',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  headerIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#F5FAF8',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#C2D0CE',
    fontSize: 13,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    marginBottom: 18,
    borderRadius: 14,
    backgroundColor: '#14262D',
  },
  sectionTab: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
  },
  sectionTabActive: {
    backgroundColor: '#A6D608',
  },
  sectionTabText: {
    color: '#C2D0CE',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: '#000000',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 14,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#80653B',
    borderRadius: 14,
    backgroundColor: '#14262D',
  },
  locationCard: {
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  locationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationHeadingCopy: {
    flex: 1,
  },
  locationTitle: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '700',
  },
  locationCurrent: {
    marginTop: 3,
    color: '#A6D608',
    fontSize: 13,
  },
  locationHint: {
    marginTop: 12,
    color: '#C2D0CE',
    fontSize: 13,
    lineHeight: 19,
  },
  locationInput: {
    minHeight: 48,
    paddingHorizontal: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#526E76',
    borderRadius: 11,
    backgroundColor: '#081116',
    color: '#F5FAF8',
    fontSize: 15,
  },
  saveLocationButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 9,
    borderRadius: 11,
    backgroundColor: '#A6D608',
  },
  saveLocationText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  localLawsButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  localLawsText: {
    flex: 1,
    color: '#A6D608',
    fontSize: 14,
    fontWeight: '700',
  },
  sourceCaveat: {
    color: '#C2D0CE',
    fontSize: 12,
    lineHeight: 18,
  },
  safetyText: {
    flex: 1,
    color: '#F2D39A',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: '#F5FAF8',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: 6,
    marginBottom: 16,
    color: '#C2D0CE',
    fontSize: 14,
    lineHeight: 20,
  },
  safetyGuideList: {
    gap: 11,
    marginBottom: 25,
  },
  safetyGuideCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  safetyGuideHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  safetyGuideIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#14262D',
  },
  safetyGuideTitle: {
    flex: 1,
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '700',
  },
  safetyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 8,
  },
  safetyPointDot: {
    width: 6,
    height: 6,
    marginTop: 7,
    borderRadius: 3,
    backgroundColor: '#A6D608',
  },
  safetyPointText: {
    flex: 1,
    color: '#E1EBE9',
    fontSize: 13,
    lineHeight: 20,
  },
  resourceLink: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 14,
    backgroundColor: '#1B3038',
  },
  resourceIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#14262D',
  },
  resourceCopy: {
    flex: 1,
  },
  resourceTitle: {
    color: '#F5FAF8',
    fontSize: 14,
    fontWeight: '700',
  },
  resourceSubtitle: {
    marginTop: 4,
    color: '#C2D0CE',
    fontSize: 12,
    lineHeight: 17,
  },
  categoryList: {
    gap: 11,
  },
  categoryCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  categoryCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  categoryIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: '#14262D',
  },
  categoryCopy: {
    flex: 1,
  },
  categoryEyebrow: {
    color: '#A6D608',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  categoryTitle: {
    marginTop: 3,
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '700',
  },
  categorySubtitle: {
    marginTop: 3,
    color: '#C2D0CE',
    fontSize: 12,
    lineHeight: 17,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#081116',
  },
  modalHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#35515A',
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1B3038',
  },
  backButtonSpacer: {
    width: 42,
    height: 42,
  },
  modalHeaderLabel: {
    color: '#A6D608',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  lessonContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lessonHeroIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#1B3038',
  },
  lessonTitle: {
    marginTop: 18,
    color: '#F5FAF8',
    fontSize: 27,
    fontWeight: '800',
  },
  lessonSubtitle: {
    marginTop: 5,
    marginBottom: 20,
    color: '#C2D0CE',
    fontSize: 14,
  },
  overviewCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  cardEyebrow: {
    color: '#A6D608',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  overviewText: {
    marginTop: 8,
    color: '#E1EBE9',
    fontSize: 14,
    lineHeight: 22,
  },
  sourcesCard: {
    padding: 16,
    marginTop: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 16,
    backgroundColor: '#1B3038',
  },
  sourcesDescription: {
    marginTop: 8,
    marginBottom: 4,
    color: '#C2D0CE',
    fontSize: 13,
    lineHeight: 19,
  },
  sourceLink: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#35515A',
  },
  sourceLinkText: {
    flex: 1,
    color: '#A6D608',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#35515A',
    borderRadius: 15,
    backgroundColor: '#14262D',
  },
  lessonNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#A6D608',
  },
  lessonNumberText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  lessonCopy: {
    flex: 1,
  },
  lessonCardTitle: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '700',
  },
  lessonBody: {
    marginTop: 6,
    color: '#C2D0CE',
    fontSize: 13,
    lineHeight: 20,
  },
  coachingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#405C65',
    borderRadius: 14,
    backgroundColor: '#1B3038',
  },
  coachingText: {
    flex: 1,
    color: '#E1EBE9',
    fontSize: 13,
    lineHeight: 19,
  },
});
