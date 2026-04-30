import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const CATEGORY_ICONS = ['🥩', '🐾', '🥗', '🦴', '🐟', '🥚', '🌾', '🥕'];

export default function AdminDietManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [nutritionalBenefits, setNutritionalBenefits] = useState('');
  const [suitableFor, setSuitableFor] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/diet/categories/all', authHeader);
      setCategories(data);
    } catch (e) { Alert.alert('Error', 'Could not load categories'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingId(null);
    setName(''); setNutritionalBenefits(''); setSuitableFor('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setName(c.name); setNutritionalBenefits(c.nutritionalBenefits); setSuitableFor(c.suitableFor || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !nutritionalBenefits.trim()) {
      Alert.alert('Error', 'Name and nutritional benefits are required'); return;
    }
    const payload = { name, nutritionalBenefits, suitableFor };
    try {
      if (editingId) {
        await api.put(`/diet/categories/${editingId}`, payload, authHeader);
        Alert.alert('Success', 'Category updated');
      } else {
        await api.post('/diet/categories', payload, authHeader);
        Alert.alert('Success', 'Category added');
      }
      setShowModal(false); fetchCategories();
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Could not save'); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Category', 'Remove this food category?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/diet/categories/${id}`, authHeader); fetchCategories(); }
        catch (e) { Alert.alert('Error', e.response?.data?.message || 'Could not delete'); }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diet & Feeding Plans</Text>
            <TouchableOpacity onPress={openAdd}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {categories.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🥗</Text>
              <Text style={styles.emptyText}>No food categories yet.</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to create the first category.</Text>
            </View>
          )}
          {categories.map((c, i) => (
            <View key={c._id} style={[styles.card, !c.isActive && { opacity: 0.55 }]}>
              <View style={styles.cardIcon}>
                <Text style={{ fontSize: 26 }}>{CATEGORY_ICONS[i % CATEGORY_ICONS.length]}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  {!c.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveText}>Inactive</Text></View>}
                </View>
                {c.suitableFor ? (
                  <View style={styles.suitablePill}>
                    <Text style={styles.suitableText}>🐾 {c.suitableFor}</Text>
                  </View>
                ) : null}
                <Text style={styles.cardDesc} numberOfLines={3}>{c.nutritionalBenefits}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(c)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(c._id)}>
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
            <Text style={styles.modalTitle}>{editingId ? 'Edit Food Category' : 'New Food Category'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Category Name (e.g. High Protein, Puppy Formula)"
              value={name} onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Suitable For (e.g. Adult dogs, senior cats)"
              value={suitableFor} onChangeText={setSuitableFor}
            />
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Nutritional Benefits – describe what this diet provides"
              value={nutritionalBenefits} onChangeText={setNutritionalBenefits}
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
  header: { backgroundColor: '#5EBFA4', height: 120, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 50 },
  backBtn: { width: 40 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  addText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  list: { padding: 20, paddingBottom: 60 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20, elevation: 3 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', elevation: 3 },
  cardIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1 },
  inactiveBadge: { backgroundColor: '#EEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  inactiveText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  suitablePill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 6 },
  suitableText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  cardDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
  actions: { gap: 6, marginLeft: 8 },
  editBtn: { backgroundColor: '#EDE7F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#5E35B1', fontWeight: 'bold', fontSize: 12 },
  delBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12, fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#F4F6F8', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#5EBFA4', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});
