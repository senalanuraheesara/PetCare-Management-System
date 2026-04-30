import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, FlatList
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminMedicationManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [standardDosage, setStandardDosage] = useState('');
  const [description, setDescription] = useState('');
  const [warnings, setWarnings] = useState('');

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/medications/catalogue/all', authHeader);
      setMedications(data);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch medications');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setStandardDosage('');
    setDescription('');
    setWarnings('');
    setShowModal(true);
  };

  const openEditModal = (med) => {
    setEditingId(med._id);
    setName(med.name);
    setStandardDosage(med.standardDosage);
    setDescription(med.description);
    setWarnings(med.warnings || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name || !standardDosage || !description) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const payload = { name, standardDosage, description, warnings };

    try {
      if (editingId) {
        await api.put(`/medications/catalogue/${editingId}`, payload, authHeader);
        Alert.alert('Success', 'Medication updated');
      } else {
        await api.post('/medications/catalogue', payload, authHeader);
        Alert.alert('Success', 'Medication added');
      }
      setShowModal(false);
      fetchMedications();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not save medication');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Medication', 'Are you sure you want to delete this medication?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/medications/catalogue/${id}`, authHeader);
            fetchMedications();
          } catch (error) {
            Alert.alert('Error', 'Could not delete medication');
          }
        }
      }
    ]);
  };

  const renderMedItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardLabel}>Dosage: <Text style={styles.cardValue}>{item.standardDosage}</Text></Text>
      <Text style={styles.cardLabel}>Description: <Text style={styles.cardValue}>{item.description}</Text></Text>
      {item.warnings ? (
        <Text style={styles.cardLabel}>Warnings: <Text style={[styles.cardValue, { color: '#E53935' }]}>{item.warnings}</Text></Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Medication Catalogue</Text>
            <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item._id}
          renderItem={renderMedItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No medications in the catalogue.</Text>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Medication' : 'Add New Medication'}</Text>
            
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Amoxicillin"
            />

            <Text style={styles.inputLabel}>Standard Dosage *</Text>
            <TextInput
              style={styles.input}
              value={standardDosage}
              onChangeText={setStandardDosage}
              placeholder="e.g. 5mg per kg body weight"
            />

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="General information about the medication"
              multiline
            />

            <Text style={styles.inputLabel}>Warnings (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={warnings}
              onChangeText={setWarnings}
              placeholder="Side effects or warnings"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
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
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backArrow: { fontSize: 24, color: '#FFF' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  list: { padding: 20 },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardActions: { flexDirection: 'row' },
  actionBtn: { marginLeft: 15 },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 5 },
  cardValue: { fontWeight: 'normal', color: '#444' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: {
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 10, backgroundColor: '#E9ECEF' },
  cancelBtnText: { color: '#495057', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10, backgroundColor: '#5EBFA4' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});
