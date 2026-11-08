import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'imperial' | 'metric';

const UNIT_SYSTEM_STORAGE_KEY = 'wreckless_unit_system_v1';

export async function getPreferredUnitSystem(): Promise<UnitSystem> {
  const storedValue = await AsyncStorage.getItem(UNIT_SYSTEM_STORAGE_KEY);
  return storedValue === 'metric' ? 'metric' : 'imperial';
}

export async function savePreferredUnitSystem(unitSystem: UnitSystem): Promise<void> {
  await AsyncStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem);
}
