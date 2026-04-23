import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  Alert, Modal, ActivityIndicator, TextInput, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const STATUS_COLORS = {
  Pending:      { bg: '#FFF8E1', text: '#F59E0B' },
  Confirmed:    { bg: '#E3F2FD', text: '#1565C0' },
  'Checked In': { bg: '#E8F5E9', text: '#2E7D32' },
  'Checked Out':{ bg: '#F3E5F5', text: '#6A1B9A' },
  Cancelled:    { bg: '#FFEBEE', text: '#C62828' },
};

const roomEmoji = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('suite')) return '🏨';
  if (n.includes('standard')) return '🏠';
  if (n.includes('kennel')) return '🐕';
  if (n.includes('play')) return '🎮';
  return '🏡';
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function BoardingScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [tab, setTab] = useState('rooms');
  const [rooms, setRooms] = useState([]);
  const [pets, setPets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);

  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000));
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchRooms();
    fetchPets();
    fetchBookings();
  }, []);

  const fetchRooms = async () => {
    try { const { data } = await api.get('/boarding/rooms', authHeader); setRooms(data); }
    catch (e) { console.error('fetchRooms', e); }
  };

  const fetchPets = async () => {
    try {
      const { data } = await api.get('/pets', authHeader);
      setPets(data);
      if (data.length > 0) setSelectedPet(data[0]);
    } catch (e) { console.error('fetchPets', e); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try { const { data } = await api.get('/boarding/bookings', authHeader); setBookings(data); }
    catch (e) { console.error('fetchBookings', e); }
    finally { setLoading(false); }
  };

  const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
  const estimatedCost = selectedRoom ? nights * selectedRoom.dailyRate : 0;

  const openBookModal = (room) => {
    setSelectedRoom(room);
    setCheckIn(new Date());
    setCheckOut(new Date(Date.now() + 86400000));
    setNotes('');
    setShowModal(true);
  };

  const handleBook = async () => {
    if (!selectedPet) { Alert.alert('Error', 'Please add a pet first'); return; }
    if (checkOut <= checkIn) { Alert.alert('Error', 'Check-out must be after check-in'); return; }
    try {
      await api.post('/boarding/bookings', {
        petId: selectedPet._id,
        roomId: selectedRoom._id,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        notes
      }, authHeader);
      Alert.alert('Booked! 🏡', `${selectedRoom.name} reserved for ${selectedPet.name}\n${nights} night(s) · Rs. ${estimatedCost}`);
      setShowModal(false);
      fetchBookings();
      setTab('history');
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Could not book'); }
  };

  const handleCancel = (id) => {
    Alert.alert('Cancel Booking', 'Cancel this boarding reservation?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await api.put(`/boarding/bookings/${id}/cancel`, {}, authHeader); fetchBookings(); }
        catch (e) { Alert.alert('Error', e.response?.data?.message || 'Could not cancel'); }
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
            <Text style={styles.headerTitle}>Boarding & Day Care</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'rooms' && styles.tabActive]} onPress={() => setTab('rooms')}>
          <Text style={[styles.tabText, tab === 'rooms' && styles.tabTextActive]}>Room Types</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* Pet selector bar */}
      {pets.length > 0 && (
        <View style={styles.petBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petBar}>
            {pets.map(p => (
              <TouchableOpacity
                key={p._id}
                style={[styles.petChip, selectedPet?._id === p._id && styles.petChipActive]}
                onPress={() => setSelectedPet(p)}
              >
                <Text style={[styles.petChipText, selectedPet?._id === p._id && styles.petChipTextActive]}>🐾 {p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Room Types Tab */}
      {tab === 'rooms' && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {rooms.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏡</Text>
              <Text style={styles.emptyText}>No room types available yet.</Text>
            </View>
          )}
          {rooms.map(r => (
            <View key={r._id} style={styles.roomCard}>
              <View style={styles.roomTop}>
                <View style={styles.roomIcon}><Text style={{ fontSize: 26 }}>{roomEmoji(r.name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomName}>{r.name}</Text>
                  <View style={styles.pillRow}>
                    <View style={styles.pillGreen}><Text style={styles.pillGreenText}>💰 Rs. {r.dailyRate}/night</Text></View>
                    <View style={styles.pillBlue}><Text style={styles.pillBlueText}>🛏 Cap: {r.capacity}</Text></View>
                  </View>
                </View>
              </View>
              <Text style={styles.roomAmenities}>{r.amenities}</Text>
              <TouchableOpacity
                style={[styles.bookBtn, !selectedPet && { opacity: 0.5 }]}
                onPress={() => openBookModal(r)}
                disabled={!selectedPet}
              >
                <Text style={styles.bookBtnText}>
                  {selectedPet ? `Reserve for ${selectedPet.name}` : 'Select a pet above'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Booking History Tab */}
      {tab === 'history' && (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {loading && <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 20 }} />}
          {!loading && bookings.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No boarding history yet.</Text>
              <Text style={styles.emptySub}>Switch to "Room Types" to make a reservation.</Text>
            </View>
          )}
          {bookings.map(b => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
            const bNights = Math.max(1, Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (1000 * 60 * 60 * 24)));
            return (
              <View key={b._id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.bookingIcon}><Text style={{ fontSize: 22 }}>{roomEmoji(b.room?.name)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingRoom}>{b.room?.name || '—'}</Text>
                    <Text style={styles.bookingPet}>🐾 {b.pet?.name} · {b.pet?.species}</Text>
                    <Text style={styles.bookingDates}>
                      📅 {formatDate(b.checkIn)}  →  {formatDate(b.checkOut)}
                    </Text>
                    <Text style={styles.bookingNights}>{bNights} night{bNights !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{b.status}</Text>
                  </View>
                </View>
                {b.notes ? <Text style={styles.noteText}>📝 {b.notes}</Text> : null}
                <View style={styles.bookingFooter}>
                  <Text style={styles.totalCost}>💰 Total: Rs. {b.totalCost ?? '—'}</Text>
                  {(b.status === 'Pending' || b.status === 'Confirmed') && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(b._id)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Booking Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reserve a Room</Text>
            {selectedRoom && (
              <View style={styles.confirmRoom}>
                <Text style={styles.confirmRoomName}>{roomEmoji(selectedRoom.name)} {selectedRoom.name}</Text>
                <Text style={styles.confirmRoomSub}>💰 Rs. {selectedRoom.dailyRate}/night</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Pet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {pets.map(p => (
                <TouchableOpacity
                  key={p._id}
                  style={[styles.petChip, { marginRight: 8 }, selectedPet?._id === p._id && styles.petChipActive]}
                  onPress={() => setSelectedPet(p)}
                >
                  <Text style={[styles.petChipText, selectedPet?._id === p._id && styles.petChipTextActive]}>🐾 {p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dateRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Check-In</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setShowCheckIn(true)}>
                  <Text style={styles.dateFieldText}>📅 {checkIn.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showCheckIn && (
                  <DateTimePicker value={checkIn} mode="date" display="default" minimumDate={new Date()}
                    onChange={(e, d) => { setShowCheckIn(Platform.OS === 'ios'); if (d) setCheckIn(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Check-Out</Text>
                <TouchableOpacity style={styles.dateField} onPress={() => setShowCheckOut(true)}>
                  <Text style={styles.dateFieldText}>📅 {checkOut.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showCheckOut && (
                  <DateTimePicker value={checkOut} mode="date" display="default" minimumDate={new Date(checkIn.getTime() + 86400000)}
                    onChange={(e, d) => { setShowCheckOut(Platform.OS === 'ios'); if (d) setCheckOut(d); }} />
                )}
              </View>
            </View>

            {selectedRoom && (
              <View style={styles.costPreview}>
                <Text style={styles.costPreviewText}>
                  {nights} night{nights !== 1 ? 's' : ''} × Rs. {selectedRoom.dailyRate} = <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>Rs. {estimatedCost}</Text>
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Special Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special requirements?"
              value={notes} onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.mCancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.mCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mConfirmBtn} onPress={handleBook}>
                <Text style={styles.mConfirmText}>Confirm</Text>
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
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#5EBFA4' },
  tabText: { fontSize: 14, color: '#999', fontWeight: '600' },
  tabTextActive: { color: '#5EBFA4', fontWeight: 'bold' },
  petBarWrap: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  petBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  petChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDD' },
  petChipActive: { backgroundColor: '#5EBFA4', borderColor: '#5EBFA4' },
  petChipText: { fontSize: 13, color: '#555', fontWeight: 'bold' },
  petChipTextActive: { color: '#FFF' },
  list: { padding: 20, paddingBottom: 60 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20, elevation: 3 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center' },
  roomCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16, elevation: 3 },
  roomTop: { flexDirection: 'row', marginBottom: 10 },
  roomIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  roomName: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 6 },
  pillGreen: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillGreenText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  pillBlue: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillBlueText: { color: '#1565C0', fontSize: 12, fontWeight: 'bold' },
  roomAmenities: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 14 },
  bookBtn: { backgroundColor: '#5EBFA4', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  bookBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  bookingCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 3 },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bookingIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  bookingRoom: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  bookingPet: { fontSize: 12, color: '#666', marginBottom: 2 },
  bookingDates: { fontSize: 12, color: '#555', fontWeight: '600', marginBottom: 2 },
  bookingNights: { fontSize: 11, color: '#888' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  noteText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 },
  totalCost: { fontSize: 13, fontWeight: 'bold', color: '#2E7D32' },
  cancelBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  cancelText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 16 },
  confirmRoom: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 16 },
  confirmRoomName: { fontSize: 16, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  confirmRoomSub: { fontSize: 13, color: '#555' },
  fieldLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6, marginTop: 4 },
  dateRow: { flexDirection: 'row', marginBottom: 4 },
  dateField: { backgroundColor: '#F4F6F8', padding: 12, borderRadius: 12, marginBottom: 12 },
  dateFieldText: { fontSize: 13, color: '#333' },
  costPreview: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  costPreviewText: { fontSize: 14, color: '#555' },
  notesInput: { backgroundColor: '#F4F6F8', padding: 14, borderRadius: 12, minHeight: 60, textAlignVertical: 'top', fontSize: 14, color: '#333', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  mCancelBtn: { flex: 1, padding: 14, backgroundColor: '#F4F6F8', borderRadius: 12, alignItems: 'center' },
  mCancelText: { color: '#666', fontWeight: 'bold' },
  mConfirmBtn: { flex: 1, padding: 14, backgroundColor: '#5EBFA4', borderRadius: 12, alignItems: 'center' },
  mConfirmText: { color: '#FFF', fontWeight: 'bold' },
});
