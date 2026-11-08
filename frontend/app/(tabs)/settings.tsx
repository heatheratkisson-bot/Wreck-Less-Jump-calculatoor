import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPreferredUnitSystem, savePreferredUnitSystem, UnitSystem } from '@/lib/preferences';
import { useBeginnerGuide } from '@/lib/BeginnerGuideContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { startBeginnerGuide } = useBeginnerGuide();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPreferredUnitSystem()
      .then((preference) => {
        if (isMounted) {
          setUnitSystem(preference);
        }
      })
      .catch((error: unknown) => {
        console.error('Could not load unit preference:', error);
        Alert.alert('Could not load settings', 'Please reopen Settings and try again.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateUnitSystem = async (preference: UnitSystem) => {
    setIsSaving(true);
    try {
      await savePreferredUnitSystem(preference);
      setUnitSystem(preference);
    } catch (error) {
      console.error('Could not save unit preference:', error);
      Alert.alert('Could not save settings', 'Your unit preference was not changed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color="#F5FAF8" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionEyebrow}>RIDE YOUR WAY</Text>
        <View style={styles.card}>
          <View style={styles.rowHeading}>
            <View style={styles.rowIcon}>
              <Ionicons name="speedometer-outline" size={20} color="#E9C990" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Default units</Text>
              <Text style={styles.rowDescription}>Choose the units used by the jump calculator.</Text>
            </View>
            {isSaving && <ActivityIndicator color="#E9C990" />}
          </View>
          {isLoading ? (
            <ActivityIndicator style={styles.loading} color="#E9C990" />
          ) : (
            <View style={styles.unitOptions}>
              {([
                ['imperial', 'Feet & mph'],
                ['metric', 'Meters & km/h'],
              ] as const).map(([value, label]) => {
                const selected = unitSystem === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => void updateUnitSystem(value)}
                    disabled={isSaving}
                    style={[styles.unitOption, selected && styles.unitOptionSelected]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={19}
                      color={selected ? '#E9C990' : '#87949A'}
                    />
                    <Text style={[styles.unitOptionText, selected && styles.unitOptionTextSelected]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.sectionEyebrow}>YOUR RIDING</Text>
        <View style={styles.card}>
          <SettingsLink
            icon="bookmark-outline"
            title="Saved jumps"
            description="Review your saved jump calculations."
            onPress={() => router.push('/(tabs)/saved')}
          />
          <View style={styles.divider} />
          <SettingsLink
            icon="bicycle-outline"
            title="Bike profile"
            description="Manage your bike and rider details."
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>

        <Text style={styles.sectionEyebrow}>HELP</Text>
        <View style={styles.card}>
          <SettingsLink
            icon="trail-sign-outline"
            title="Replay the rider guide"
            description="Walk through the app’s main features again."
            onPress={startBeginnerGuide}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsLinkProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function SettingsLink({ icon, title, description, onPress }: SettingsLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#E9C990" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#87949A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#10171B',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#29363B',
  },
  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  sectionEyebrow: {
    marginTop: 18,
    marginBottom: 9,
    color: '#E9C990',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  card: {
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35434A',
    backgroundColor: '#1A252A',
  },
  rowHeading: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#2A3337',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: '#F5FAF8',
    fontSize: 15,
    fontWeight: '800',
  },
  rowDescription: {
    marginTop: 4,
    color: '#AEB9BE',
    fontSize: 12,
    lineHeight: 17,
  },
  unitOptions: {
    flexDirection: 'row',
    gap: 9,
    paddingBottom: 14,
  },
  unitOption: {
    minHeight: 43,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#46545A',
    borderRadius: 10,
    backgroundColor: '#111A1E',
  },
  unitOptionSelected: {
    borderColor: '#E9C990',
    backgroundColor: '#332D21',
  },
  unitOptionText: {
    color: '#AEB9BE',
    fontSize: 12,
    fontWeight: '700',
  },
  unitOptionTextSelected: {
    color: '#F5FAF8',
  },
  loading: {
    marginBottom: 16,
  },
  linkRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  linkPressed: {
    opacity: 0.65,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#35434A',
  },
});
