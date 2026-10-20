import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MOTORCYCLE_BRANDS,
  getMotorcyclesByBrand,
  MotorcycleModel,
} from '@/lib/motorcycleData';
import { getSelectedMotorcycle, saveSelectedMotorcycle } from '@/lib/appSupport';

export default function Profile() {
  const [brands] = useState<string[]>(MOTORCYCLE_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [models, setModels] = useState<MotorcycleModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedMotorcycle, setSelectedMotorcycleState] = useState<MotorcycleModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getSelectedMotorcycle();
        if (saved) {
          setSelectedMotorcycleState(saved);
          setSelectedBrand(saved.brand);
          setSelectedModelId(saved.id);
          setModels(getMotorcyclesByBrand(saved.brand));
        }
      } catch (err) {
        console.log('Error loading selected motorcycle:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChooseBrand = (brand: string) => {
    setSelectedBrand(brand);
    setModels(getMotorcyclesByBrand(brand));
    setShowBrandModal(false);
    setSelectedModelId(null);
    setSelectedMotorcycleState(null);
  };

  const onChooseModel = (model: MotorcycleModel) => {
    setSelectedModelId(model.id);
    setSelectedMotorcycleState(model);
    setShowModelModal(false);
  };

  const handleSave = async () => {
    try {
      await saveSelectedMotorcycle(selectedMotorcycle);
      Alert.alert('Saved', 'Motorcycle profile saved locally. It will be used by the calculator.');
    } catch (err: any) {
      console.log('Error saving motorcycle:', err);
      Alert.alert('Error', err?.message || 'Failed to save motorcycle selection');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bicycle" size={36} color="#FF6B35" />
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Selected Brand</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowBrandModal(true)}>
          <Text style={styles.selectText}>{selectedBrand ?? 'Choose a brand'}</Text>
          <Ionicons name="chevron-down" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>Selected Model</Text>
        <TouchableOpacity
          style={[styles.selectButton, !selectedBrand && styles.disabledButton]}
          onPress={() => {
            if (!selectedBrand) return Alert.alert('Select a brand first');
            setShowModelModal(true);
          }}
          disabled={!selectedBrand}
        >
          <Text style={styles.selectText}>
            {selectedMotorcycle ? `${selectedMotorcycle.brand} ${selectedMotorcycle.model}` : 'Choose a model'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#fff" />
        </TouchableOpacity>

        {selectedMotorcycle && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailTitle}>{`${selectedMotorcycle.brand} ${selectedMotorcycle.model}`}</Text>
            <Text style={styles.detailText}>Year: {selectedMotorcycle.year}</Text>
            <Text style={styles.detailText}>Engine: {selectedMotorcycle.engineCC} cc</Text>
            <Text style={styles.detailText}>Torque: {selectedMotorcycle.torque_ft_lbs} ft-lbs</Text>
            <Text style={styles.detailText}>Dry Weight: {selectedMotorcycle.weight_lbs} lbs</Text>
            <Text style={styles.detailText}>Horsepower: {selectedMotorcycle.horsepower} hp</Text>
            <Text style={styles.detailText}>Type: {selectedMotorcycle.type}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, !selectedMotorcycle && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!selectedMotorcycle}
        >
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={styles.saveText}>Save Motorcycle</Text>
        </TouchableOpacity>
      </View>

      {/* Brand Modal */}
      <Modal visible={showBrandModal} animationType="slide" onRequestClose={() => setShowBrandModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Brand</Text>
            <TouchableOpacity onPress={() => setShowBrandModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={brands}
            keyExtractor={(b) => b}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => onChooseBrand(item)}>
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Model Modal */}
      <Modal visible={showModelModal} animationType="slide" onRequestClose={() => setShowModelModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Model</Text>
            <TouchableOpacity onPress={() => setShowModelModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={models}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => onChooseModel(item)}>
                <View>
                  <Text style={styles.modalItemText}>{`${item.brand} ${item.model} (${item.year})`}</Text>
                  <Text style={styles.modalItemSubtitle}>{`${item.engineCC}cc • ${item.torque_ft_lbs} ft-lb • ${item.weight_lbs} lb`}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  section: { padding: 20 },
  label: { color: '#888', marginBottom: 8, fontSize: 14 },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  selectText: { color: '#fff', fontSize: 16 },
  disabledButton: { opacity: 0.5 },
  detailsCard: { backgroundColor: '#2A2A2A', padding: 16, borderRadius: 12, marginTop: 16 },
  detailTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailText: { color: '#ccc', marginTop: 6 },
  saveButton: { marginTop: 20, backgroundColor: '#FF6B35', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  modalItemText: { color: '#fff', fontSize: 16 },
  modalItemSubtitle: { color: '#888', fontSize: 12, marginTop: 4 },
});
