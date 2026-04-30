import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const ROOM_EMOJIS = { suite: '🏨', standard: '🏠', kennel: '🐕', playpen: '🎮', default: '🏡' };
const roomEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('suite')) return ROOM_EMOJIS.suite;
  if (n.includes('standard')) return ROOM_EMOJIS.standard;
  if (n.includes('kennel')) return ROOM_EMOJIS.kennel;
  if (n.includes('play')) return ROOM_EMOJIS.playpen;
  return ROOM_EMOJIS.default;
};

export default function AdminBoardingManagementScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [amenities, setAmenities] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/boarding/rooms/all', authHeader);
      setRooms(data);
    } catch (e) { Alert.alert('Error', 'Could not load rooms'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingId(null);
    setName(''); setDailyRate(''); setAmenities(''); setCapacity('1'); setImageUri(null);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id);
    setName(r.name); setDailyRate(r.dailyRate.toString());
    setAmenities(r.amenities); setCapacity(r.capacity.toString());
    setImageUri(r.image || null);
    setShowModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim() || !dailyRate.trim() || !amenities.trim()) {
      Alert.alert('Error', 'Name, daily rate, and amenities are required'); return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('dailyRate', dailyRate);
    formData.append('amenities', amenities);
    formData.append('capacity', capacity || 1);

    if (imageUri && !imageUri.startsWith('http')) {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('image', { uri: imageUri, name: filename, type });
    }

    try {
      const config = {
        headers: {
          ...authHeader.headers,
          'Content-Type': 'multipart/form-data',
        }
      };

      if (editingId) {
        await api.put(`/boarding/rooms/${editingId}`, formData, config);
        Alert.alert('Success', 'Room type updated');
      } else {
        await api.post('/boarding/rooms', formData, config);
        Alert.alert('Success', 'Room type added');
      }
      setShowModal(false); fetchRooms();
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Could not save'); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Room', 'Remove this room type?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/boarding/rooms/${id}`, authHeader); fetchRooms(); }
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
            <Text style={styles.headerTitle}>Boarding & Day Care</Text>
            <TouchableOpacity onPress={openAdd}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {rooms.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏡</Text>
              <Text style={styles.emptyText}>No room types yet.</Text>
              <Text style={styles.emptySub}>Tap "+ Add" to create the first room type.</Text>
            </View>
          )}
          {rooms.map(r => (
            <View key={r._id} style={[styles.card, !r.isActive && { opacity: 0.55 }]}>
              {r.image ? (
                <Image source={{ uri: r.image }} style={styles.cardImageIcon} />
              ) : (
                <View style={styles.cardIconBox}>
                  <Text style={{ fontSize: 26 }}>{roomEmoji(r.name)}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.cardName}>{r.name}</Text>
                  {!r.isActive && <View style={styles.inactiveBadge}><Text style={styles.inactiveText}>Inactive</Text></View>}
                </View>
                <View style={styles.pillRow}>
                  <View style={styles.pillGreen}><Text style={styles.pillGreenText}>💰 Rs. {r.dailyRate}/night</Text></View>
                  <View style={styles.pillBlue}><Text style={styles.pillBlueText}>🛏 Cap: {r.capacity}</Text></View>
                </View>
                <Text style={styles.cardAmenities} numberOfLines={2}>{r.amenities}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(r)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(r._id)}>
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
            <Text style={styles.modalTitle}>{editingId ? 'Edit Room Type' : 'New Room Type'}</Text>
            <TextInput style={styles.input} placeholder="Room Name (e.g. Suite, Standard Kennel)" value={name} onChangeText={setName} />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Daily Rate (Rs.)"
                value={dailyRate} onChangeText={setDailyRate}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Capacity"
                value={capacity} onChangeText={setCapacity}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder={"Amenities & Description\ne.g. Includes 2 walks, AC room, cozy bedding"}
              value={amenities} onChangeText={setAmenities}
              multiline
            />
            
            <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
              <Text style={styles.imageUploadText}>{imageUri ? 'Change Image' : 'Upload Image'}</Text>
            </TouchableOpacity>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
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
  headerTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFF' },
  addText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  list: { padding: 20, paddingBottom: 60 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20, elevation: 3 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', elevation: 3 },
  cardIconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1 },
  inactiveBadge: { backgroundColor: '#EEE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  inactiveText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  pillGreen: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillGreenText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  pillBlue: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillBlueText: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },
  cardAmenities: { fontSize: 12, color: '#666', lineHeight: 18 },
  actions: { gap: 6, marginLeft: 8 },
  editBtn: { backgroundColor: '#EDE7F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editText: { color: '#5E35B1', fontWeight: 'bold', fontSize: 12 },
  delBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12, fontSize: 14, color: '#333', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#F4F6F8', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#5EBFA4', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
  imageUploadBtn: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  imageUploadText: { color: '#1565C0', fontWeight: 'bold' },
  previewImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12 },
  cardImageIcon: { width: 50, height: 50, borderRadius: 12, marginRight: 12 },
});
