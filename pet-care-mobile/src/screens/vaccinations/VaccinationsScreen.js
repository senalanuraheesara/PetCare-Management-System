import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Modal, ActivityIndicator, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function VaccinationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [pets, setPets] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedPet, setSelectedPet] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [dateAdministered, setDateAdministered] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPets();
    fetchVaccines();
  }, []);

  useEffect(() => {
    if (selectedPet) fetchRecords(selectedPet._id);
  }, [selectedPet]);

  const fetchPets = async () => {
    try {
      const { data } = await api.get('/pets', authHeader);
      setPets(data);
      if (data.length > 0) setSelectedPet(data[0]);
    } catch (e) {
      console.error('fetchPets error', e);
    }
  };

  const fetchVaccines = async () => {
    try {
      const { data } = await api.get('/vaccines', authHeader);
      setVaccines(data);
    } catch (e) {
      console.error('fetchVaccines error', e);
    }
  };

  const fetchRecords = async (petId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vaccines/records?petId=${petId}`, authHeader);
      setRecords(data);
    } catch (e) {
      console.error('fetchRecords error', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddRecord = () => {
    setSelectedVaccine(null);
    setDateAdministered(new Date());
    setNotes('');
    setShowModal(true);
  };

  const handleAddRecord = async () => {
    if (!selectedVaccine) {
      Alert.alert('Error', 'Please select a vaccine');
      return;
    }
    if (!selectedPet) {
      Alert.alert('Error', 'Please select a pet first');
      return;
    }
    try {
      await api.post('/vaccines/records', {
        petId: selectedPet._id,
        vaccineId: selectedVaccine._id,
        dateAdministered: dateAdministered.toISOString(),
        notes
      }, authHeader);
      Alert.alert('Success', 'Vaccine record added!');
      setShowModal(false);
      fetchRecords(selectedPet._id);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not add record');
    }
  };

  const handleDeleteRecord = (id) => {
    Alert.alert('Delete Record', 'Remove this vaccine record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/vaccines/records/${id}`, authHeader);
          fetchRecords(selectedPet._id);
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Could not delete');
        }
      }}
    ]);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vaccinations</Text>
            <TouchableOpacity onPress={openAddRecord}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Pet Selector */}
      <View style={styles.petSelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petSelector}>
          {pets.map(p => (
            <TouchableOpacity
              key={p._id}
              style={[styles.petChip, selectedPet?._id === p._id && styles.petChipActive]}
              onPress={() => setSelectedPet(p)}
            >
              <Text style={[styles.petChipText, selectedPet?._id === p._id && styles.petChipTextActive]}>
                🐾 {p.name}
              </Text>
            </TouchableOpacity>
          ))}
          {pets.length === 0 && <Text style={styles.noPetsText}>No pets found. Add a pet first.</Text>}
        </ScrollView>
      </View>

      {/* Records */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 20 }} />}

        {!loading && records.length === 0 && selectedPet && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💉</Text>
            <Text style={styles.emptyText}>No vaccine records for {selectedPet.name}</Text>
            <Text style={styles.emptySub}>Tap "+ Add" to track the first vaccination.</Text>
          </View>
        )}

        {records.map(r => (
          <View key={r._id} style={styles.recordCard}>
            <View style={styles.recordLeft}>
              <View style={styles.recordIcon}>
                <Text style={{ fontSize: 22 }}>💉</Text>
              </View>
            </View>
            <View style={styles.recordBody}>
              <Text style={styles.recordVaccineName}>{r.vaccine?.name}</Text>
              <View style={styles.recordPillRow}>
                <View style={styles.pill}><Text style={styles.pillText}>💊 {r.vaccine?.dosage}</Text></View>
                <View style={[styles.pill, styles.pillFreq]}>
                  <Text style={styles.pillFreqText}>🔁 {r.vaccine?.frequency}x/mo</Text>
                </View>
              </View>
              <Text style={styles.recordDate}>📅 Given: {formatDate(r.dateAdministered)}</Text>
              {r.notes ? <Text style={styles.recordNotes}>📝 {r.notes}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDeleteRecord(r._id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Vaccination</Text>
            <Text style={styles.modalSub}>for {selectedPet?.name || '—'}</Text>

            <Text style={styles.fieldLabel}>Select Vaccine</Text>
            <ScrollView style={styles.vaccineList} nestedScrollEnabled>
              {vaccines.map(v => (
                <TouchableOpacity
                  key={v._id}
                  style={[styles.vaccineOption, selectedVaccine?._id === v._id && styles.vaccineOptionActive]}
                  onPress={() => setSelectedVaccine(v)}
                >
                  <Text style={[styles.vaccineOptionName, selectedVaccine?._id === v._id && { color: '#FFF' }]}>{v.name}</Text>
                  <Text style={[styles.vaccineOptionSub, selectedVaccine?._id === v._id && { color: '#C8E6C9' }]}>
                    {v.dosage} · {v.frequency}x/month
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Date Administered</Text>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateFieldText}>📅  {dateAdministered.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateAdministered}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(e, d) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setDateAdministered(d);
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddRecord}>
                <Text style={styles.saveBtnText}>Save Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#5EBFA4',
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 50,
  },
  backBtn: { width: 40 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  addText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },

  petSelectorWrapper: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  petSelector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  petChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDD'
  },
  petChipActive: { backgroundColor: '#5EBFA4', borderColor: '#5EBFA4' },
  petChipText: { fontSize: 13, color: '#555', fontWeight: 'bold' },
  petChipTextActive: { color: '#FFF' },
  noPetsText: { color: '#999', fontSize: 13 },

  list: { padding: 20, paddingBottom: 60 },

  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 30,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },

  recordCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  recordLeft: { marginRight: 12 },
  recordIcon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  recordBody: { flex: 1 },
  recordVaccineName: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  recordPillRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  pill: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillText: { color: '#E65100', fontSize: 11, fontWeight: 'bold' },
  pillFreq: { backgroundColor: '#E3F2FD' },
  pillFreqText: { color: '#1565C0', fontSize: 11, fontWeight: 'bold' },
  recordDate: { fontSize: 12, color: '#888', marginBottom: 2 },
  recordNotes: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFEBEE',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  deleteBtnText: { color: '#C62828', fontWeight: 'bold', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 4 },
  vaccineList: { maxHeight: 180, marginBottom: 12 },
  vaccineOption: {
    backgroundColor: '#F4F6F8', padding: 12, borderRadius: 10, marginBottom: 6,
    borderWidth: 1.5, borderColor: 'transparent'
  },
  vaccineOptionActive: { backgroundColor: '#5EBFA4', borderColor: '#5EBFA4' },
  vaccineOptionName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  vaccineOptionSub: { fontSize: 12, color: '#666', marginTop: 2 },
  dateField: {
    backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12, marginBottom: 16,
  },
  dateFieldText: { fontSize: 14, color: '#333' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#F4F6F8', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#5EBFA4', borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});
