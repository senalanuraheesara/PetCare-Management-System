import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import api, { getBackendOrigin } from '../../services/api';

export default function AdminDietManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [dietRecords, setDietRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAppId, setSelectedAppId] = useState(null);

  const [dietName, setDietName] = useState('');
  const [feedingPlan, setFeedingPlan] = useState('');
  const [allergies, setAllergies] = useState('');
  const [dietChartUri, setDietChartUri] = useState(null);

  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };
  const baseFileUrl = getBackendOrigin();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchAppointments(), fetchRecords()]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments', authHeader);
      setAppointments(data.filter((app) => app.status === 'Completed'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    try {
      const { data } = await api.get('/diet/records/admin/all', authHeader);
      setDietRecords(data);
    } catch (e) {
      console.error(e);
    }
  };

  const resetFields = () => {
    setDietName('');
    setFeedingPlan('');
    setAllergies('');
    setDietChartUri(null);
  };

  /** Turn older multi-field records into one text block when editing */
  const hydratePlanFromRecord = (record) => {
    const parts = [];
    if (record.specialNotes?.trim()) parts.push(record.specialNotes.trim());
    if (record.vetInstructions?.trim()) parts.push(`Vet instructions: ${record.vetInstructions.trim()}`);
    const freqBits = [record.portionSize, record.feedingFrequency, record.waterIntake].filter(Boolean);
    if (freqBits.length) parts.push(freqBits.join(' · '));
    if (record.avoidFoods?.trim()) parts.push(`Foods to avoid: ${record.avoidFoods.trim()}`);
    const fromSchedule = (record.schedule || [])
      .filter((s) => s.portion?.trim() && s.portion !== '—')
      .map((s) => `${s.time}: ${s.portion}`)
      .join('\n');
    if (fromSchedule) parts.push(fromSchedule);
    return parts.join('\n\n').trim();
  };

  const openAdd = (app) => {
    setEditingId(null);
    setSelectedAppId(app._id);
    resetFields();
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setSelectedAppId(record.appointment?._id || record.appointment);
    setDietName(record.categoryName || '');
    setFeedingPlan(hydratePlanFromRecord(record));
    setAllergies(record.allergies || '');
    setDietChartUri(
      record.dietChartUrl
        ? record.dietChartUrl.startsWith('data:') || record.dietChartUrl.startsWith('http')
          ? record.dietChartUrl
          : `${baseFileUrl}${record.dietChartUrl}`
        : null
    );
    setShowModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setDietChartUri(result.assets[0].uri);
  };

  const buildFormData = () => {
    const plan = feedingPlan.trim();

    const formData = new FormData();
    formData.append('categoryName', dietName.trim());
    formData.append('startDate', new Date().toISOString());
    formData.append('schedule', JSON.stringify([]));
    formData.append('specialNotes', plan);
    formData.append('vetInstructions', '');
    formData.append('allergies', allergies.trim());
    formData.append('avoidFoods', '');
    formData.append('portionSize', '');
    formData.append('feedingFrequency', '');
    formData.append('waterIntake', '');

    if (dietChartUri && !dietChartUri.startsWith('http')) {
      const ext = dietChartUri.split('.').pop().split('?')[0] || 'jpg';
      formData.append('dietChart', {
        uri: dietChartUri,
        name: `diet.${ext}`,
        type: `image/${ext}`,
      });
    }
    return formData;
  };

  const handleSave = async () => {
    if (!dietName.trim()) {
      Alert.alert('Error', 'Diet name is required');
      return;
    }

    const multipartHeader = {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'multipart/form-data',
      }
    };

    try {
      const formData = buildFormData();
      if (editingId) {
        await api.put(`/diet/records/admin/${editingId}`, formData, multipartHeader);
      } else {
        await api.post(`/appointments/${selectedAppId}/diet`, formData, multipartHeader);
      }
      setShowModal(false);
      resetFields();
      fetchRecords();
      Alert.alert('Success', 'Diet plan saved');
    } catch (e) {
      console.error('Diet save error:', JSON.stringify(e.response?.data || e.message));
      Alert.alert('Error', e.response?.data?.message || e.message || 'Save failed');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this record?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/diet/records/${id}`, authHeader);
          fetchRecords();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diet Management</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Appointments</Text>
            {appointments.length === 0 && (
              <Text style={styles.emptyText}>No completed appointments.</Text>
            )}
            {appointments.map((app) => (
              <View key={app._id} style={styles.appCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appPetName}>{app.pet?.name || 'Unknown Pet'}</Text>
                  <Text style={styles.appSubText}>
                    {new Date(app.date).toLocaleDateString()} — {app.reason}
                  </Text>
                </View>
                <TouchableOpacity style={styles.planBtn} onPress={() => openAdd(app)}>
                  <Text style={styles.planBtnText}>+ Add plan</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diet history</Text>
            {dietRecords.length === 0 && <Text style={styles.emptyText}>No records yet.</Text>}
            {dietRecords.map((record) => (
              <View key={record._id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordPetName}>
                      {record.pet?.name || 'Unknown'}{' '}
                      <Text style={styles.recordCatName}>({record.categoryName})</Text>
                    </Text>
                    <Text style={styles.recordInfo}>
                      Started: {new Date(record.startDate).toLocaleDateString()}
                    </Text>
                    {record.allergies ? (
                      <Text style={styles.recordAllergy}>Allergies: {record.allergies}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      record.isActive ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text style={styles.statusText}>{record.isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <View style={styles.recordActions}>
                  <TouchableOpacity onPress={() => openEdit(record)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(record._id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit diet plan' : 'New diet plan'}</Text>

              <Text style={styles.label}>
                Diet name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name of food or diet type"
                value={dietName}
                onChangeText={setDietName}
              />

              <Text style={styles.label}>Feeding plan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="How much, how often, treats, water, and any other feeding notes"
                value={feedingPlan}
                onChangeText={setFeedingPlan}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>Allergies (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Known allergies or intolerances"
                value={allergies}
                onChangeText={setAllergies}
              />

              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Text style={styles.uploadText}>
                  {dietChartUri ? 'Change diet chart image' : 'Upload diet chart (optional)'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowModal(false);
                    resetFields();
                  }}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#5EBFA4',
    height: 110,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 35,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  appCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
  },
  appPetName: { fontSize: 16, fontWeight: 'bold', color: '#E65100' },
  appSubText: { fontSize: 12, color: '#F57C00' },
  planBtn: { backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  planBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  recordCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 2 },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recordPetName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  recordCatName: { color: '#666', fontWeight: 'normal' },
  recordInfo: { fontSize: 12, color: '#888', marginTop: 2 },
  recordAllergy: { fontSize: 11, color: '#E65100', marginTop: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusInactive: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  recordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
    marginTop: 5,
  },
  editText: { color: '#5EBFA4', fontWeight: 'bold', fontSize: 12 },
  deleteText: { color: '#FF5252', fontWeight: 'bold', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  required: { color: '#FF5252' },
  input: { backgroundColor: '#F0F2F5', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  textArea: { minHeight: 120, marginBottom: 12 },
  uploadBtn: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  uploadText: { color: '#2E7D32', fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 10 },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#5EBFA4', borderRadius: 10 },
});
