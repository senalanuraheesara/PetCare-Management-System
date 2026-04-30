import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminGroomingManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/grooming/services/all', authHeader);
      setServices(data);
    } catch (e) {
      Alert.alert('Error', 'Could not load services');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setName(''); setPrice(''); setDuration(''); setDescription('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setName(s.name); setPrice(s.price.toString()); setDuration(s.duration); setDescription(s.description);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !duration.trim() || !description.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    const payload = { name, price: parseFloat(price), duration, description };
    try {
      if (editingId) {
        await api.put(`/grooming/services/${editingId}`, payload, authHeader);
        Alert.alert('Success', 'Service updated');
      } else {
        await api.post('/grooming/services', payload, authHeader);
        Alert.alert('Success', 'Service added');
      }
      setShowModal(false);
      fetchServices();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not save');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Service', 'This will permanently remove this grooming service.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/grooming/services/${id}`, authHeader);
          fetchServices();
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Could not delete');
        }
      }}
    ]);
  };

  const serviceEmoji = (name) => {
    const n = name.toLowerCase();
    if (n.includes('bath')) return '🛁';
    if (n.includes('nail')) return '💅';
    if (n.includes('full')) return '✨';
    if (n.includes('hair') || n.includes('trim')) return '✂️';
    return '🐾';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Grooming Services</Text>
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
          {services.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✂️</Text>
              <Text style={styles.emptyText}>No grooming services yet.</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to create the first service.</Text>
            </View>
          )}
          {services.map(s => (
            <View key={s._id} style={[styles.card, !s.isActive && styles.cardInactive]}>
              <View style={styles.cardIcon}>
                <Text style={{ fontSize: 26 }}>{serviceEmoji(s.name)}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardName}>{s.name}</Text>
                  {!s.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>}
                </View>
                <View style={styles.pillRow}>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>💰 Rs. {s.price}</Text>
                  </View>
                  <View style={[styles.pill, styles.pillDuration]}>
                    <Text style={styles.pillDurationText}>⏱ {s.duration}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(s._id)}>
                  <Text style={styles.delText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Service' : 'New Grooming Service'}</Text>

            <TextInput style={styles.input} placeholder="Service Name (e.g. Full Groom)" value={name} onChangeText={setName} />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Price (Rs.)"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Duration (e.g. 90 mins)"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Description – what's included?"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>{editingId ? 'Update' : 'Save'}</Text>
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
    backgroundColor: '#5EBFA4', height: 120,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
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
    backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardInactive: { opacity: 0.6 },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1 },
  inactiveBadge: { backgroundColor: '#EEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  inactiveBadgeText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  pill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  pillDuration: { backgroundColor: '#FFF3E0' },
  pillDurationText: { color: '#E65100', fontSize: 12, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
  actions: { gap: 6, marginLeft: 8 },
  editBtn: { backgroundColor: '#EDE7F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#5E35B1', fontWeight: 'bold', fontSize: 12 },
  delBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12,
    fontSize: 14, color: '#333', marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#F4F6F8', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#5EBFA4', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});
