import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function MedicationsScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'catalogue'
  const [medications, setMedications] = useState([]);
  const [petRecords, setPetRecords] = useState([]);
  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [loading, setLoading] = useState(false);

  // New Record Form
  const [showModal, setShowModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPetId) {
      fetchRecords(selectedPetId);
    }
  }, [selectedPetId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, petsRes] = await Promise.all([
        api.get('/medications/catalogue', authHeader),
        api.get('/pets', authHeader)
      ]);
      setMedications(catsRes.data);
      setPets(petsRes.data);
      if (petsRes.data.length > 0) {
        setSelectedPetId(petsRes.data[0]._id);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (petId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/medications/records?petId=${petId}`, authHeader);
      setPetRecords(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openRecordModal = (med) => {
    setSelectedMedication(med);
    setDosage('');
    setFrequency('');
    setStartDate(new Date());
    setNotes('');
    setShowModal(true);
  };

  const handleAddRecord = async () => {
    if (!selectedPetId || !selectedMedication || !dosage || !frequency) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await api.post('/medications/records', {
        petId: selectedPetId,
        medicationId: selectedMedication._id,
        dosage,
        frequency,
        startDate: startDate.toISOString(),
        notes
      }, authHeader);
      Alert.alert('Success', 'Medication record added');
      setShowModal(false);
      setActiveTab('history');
      fetchRecords(selectedPetId);
    } catch (error) {
      Alert.alert('Error', 'Could not add record');
    }
  };

  const markCompleted = async (recordId) => {
    try {
      await api.put(`/medications/records/${recordId}`, { status: 'Completed' }, authHeader);
      fetchRecords(selectedPetId);
    } catch (error) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTitle}>{item.medication?.name || 'Unknown Medication'}</Text>
        <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.completedBadge]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.recordInfo}>Dosage: <Text style={styles.infoValue}>{item.dosage}</Text></Text>
      <Text style={styles.recordInfo}>Frequency: <Text style={styles.infoValue}>{item.frequency}</Text></Text>
      <Text style={styles.recordInfo}>Started: <Text style={styles.infoValue}>{new Date(item.startDate).toLocaleDateString()}</Text></Text>
      {item.notes ? <Text style={styles.recordInfo}>Notes: <Text style={styles.infoValue}>{item.notes}</Text></Text> : null}
      
      {item.status === 'Active' && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => markCompleted(item._id)}>
          <Text style={styles.completeBtnText}>Mark Completed</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCatalogueItem = ({ item }) => (
    <View style={styles.medCard}>
      <View style={styles.medIconBox}>
        <Text style={{ fontSize: 24 }}>💊</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.medName}>{item.name}</Text>
        <Text style={styles.medDosage}>Std: {item.standardDosage}</Text>
        <Text style={styles.medDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      <TouchableOpacity style={styles.addRecordBtn} onPress={() => openRecordModal(item)}>
        <Text style={styles.addRecordBtnText}>Select</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Medication & Prescriptions</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.petSelectorContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petScroll}>
              {pets.map(pet => (
                <TouchableOpacity
                  key={pet._id}
                  style={[styles.petChip, selectedPetId === pet._id && styles.activePetChip]}
                  onPress={() => setSelectedPetId(pet._id)}
                >
                  <Text style={[styles.petChipText, selectedPetId === pet._id && styles.activePetChipText]}>🐾 {pet.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'catalogue' && styles.activeTab]}
          onPress={() => setActiveTab('catalogue')}
        >
          <Text style={[styles.tabText, activeTab === 'catalogue' && styles.activeTabText]}>Catalogue</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 20 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'history' ? (
            <FlatList
              data={petRecords}
              keyExtractor={(item) => item._id}
              renderItem={renderHistoryItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No medications found</Text>
                  <Text style={styles.emptySub}>Select a medication from the catalogue to start tracking.</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={medications}
              keyExtractor={(item) => item._id}
              renderItem={renderCatalogueItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Catalogue is empty.</Text>
              }
            />
          )}
        </View>
      )}

      {/* New Record Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Prescription</Text>
            <Text style={styles.selectedMedLabel}>Selected: <Text style={{ color: '#5EBFA4' }}>{selectedMedication?.name}</Text></Text>
            
            <Text style={styles.inputLabel}>Specific Dosage *</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 1 tablet"
            />

            <Text style={styles.inputLabel}>Frequency *</Text>
            <TextInput
              style={styles.input}
              value={frequency}
              onChangeText={setFrequency}
              placeholder="e.g. Twice a day"
            />

            <Text style={styles.inputLabel}>Start Date *</Text>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.inputLabel}>Clinical Notes</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other details..."
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddRecord} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Record Treatment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#5EBFA4',
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  petSelectorContainer: { marginTop: 20 },
  petScroll: { paddingHorizontal: 20 },
  petChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  activePetChip: { backgroundColor: '#FFF' },
  petChipText: { color: '#FFF', fontWeight: '600' },
  activePetChipText: { color: '#5EBFA4' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#5EBFA4' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#5EBFA4' },
  list: { padding: 20 },
  recordCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  recordTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  activeBadge: { backgroundColor: '#E8F5E9' },
  completedBadge: { backgroundColor: '#F5F5F5' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  recordInfo: { fontSize: 14, color: '#777', marginBottom: 5 },
  infoValue: { color: '#333', fontWeight: '500' },
  completeBtn: {
    marginTop: 15,
    backgroundColor: '#5EBFA4',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeBtnText: { color: '#FFF', fontWeight: 'bold' },
  medCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  medIconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F0F9F6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  medName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  medDosage: { fontSize: 12, color: '#5EBFA4', fontWeight: '600', marginBottom: 2 },
  medDesc: { fontSize: 13, color: '#888' },
  addRecordBtn: { backgroundColor: '#F0F9F6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  addRecordBtnText: { color: '#5EBFA4', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#444' },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  selectedMedLabel: { fontSize: 14, color: '#666', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  datePickerBtn: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  dateText: { fontSize: 16, color: '#333' },
  modalButtons: { flexDirection: 'row', gap: 15, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 15, backgroundColor: '#F8F9FA' },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 15, backgroundColor: '#5EBFA4' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});
