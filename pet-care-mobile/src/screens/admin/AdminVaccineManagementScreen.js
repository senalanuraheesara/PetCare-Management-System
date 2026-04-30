import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminVaccineManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [description, setDescription] = useState('');

  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  useEffect(() => { fetchVaccines(); }, []);

  const fetchVaccines = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vaccines', authHeader);
      setVaccines(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load vaccines');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setName(''); setDosage(''); setFrequency(''); setDescription('');
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditingId(v._id);
    setName(v.name); setDosage(v.dosage); setFrequency(v.frequency); setDescription(v.description || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim() || !frequency.trim()) {
      Alert.alert('Error', 'Name, dosage, and frequency are required');
      return;
    }
    const payload = { name, dosage, frequency, description };
    try {
      if (editingId) {
        await api.put(`/vaccines/${editingId}`, payload, authHeader);
        Alert.alert('Success', 'Vaccine updated');
      } else {
        await api.post('/vaccines', payload, authHeader);
        Alert.alert('Success', 'Vaccine added');
      }
      setShowModal(false);
      fetchVaccines();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not save vaccine');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Vaccine', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/vaccines/${id}`, authHeader);
          fetchVaccines();
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Could not delete');
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vaccine Management</Text>
            <TouchableOpacity onPress={openAdd}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {vaccines.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No vaccines added yet.</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to create the first vaccine.</Text>
            </View>
          )}
          {vaccines.map(v => (
            <View key={v._id} style={styles.card}>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>💉</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{v.name}</Text>
                <View style={styles.pillRow}>
                  <View style={styles.pill}><Text style={styles.pillText}>💊 {v.dosage}</Text></View>
                  <View style={[styles.pill, styles.pillFreq]}><Text style={styles.pillTextFreq}>🔁 {v.frequency}x/month</Text></View>
                </View>
                {v.description ? <Text style={styles.cardDesc}>{v.description}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(v)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(v._id)}>
                  <Text style={styles.delBtnText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Vaccine' : 'Add Vaccine'}</Text>

            <TextInput style={styles.input} placeholder="Vaccine Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Dosage (e.g. 1ml)" value={dosage} onChangeText={setDosage} />
            <TextInput
              style={styles.input}
              placeholder="Frequency (times per month)"
              value={frequency}
              onChangeText={setFrequency}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Save'}</Text>
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

  list: { padding: 20, paddingBottom: 60 },

  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 30,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardBadge: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardBadgeText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  pill: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { color: '#E65100', fontSize: 12, fontWeight: 'bold' },
  pillFreq: { backgroundColor: '#E3F2FD' },
  pillTextFreq: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
  cardActions: { alignItems: 'flex-end', justifyContent: 'flex-start', gap: 6, marginLeft: 8 },
  editBtn: { backgroundColor: '#EDE7F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#5E35B1', fontWeight: 'bold', fontSize: 12 },
  delBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delBtnText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12,
    fontSize: 14, color: '#333', marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 12, marginRight: 8 },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#5EBFA4', borderRadius: 12, marginLeft: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});
