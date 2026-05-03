import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

function nightRangeCoveringToday() {
  const checkIn = new Date();
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn.getTime() + 86400000);
  return { checkIn, checkOut };
}

export default function AdminBoardingBookingApprovalScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [bookings, setBookings] = useState([]);
  const [todayRooms, setTodayRooms] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await api.get('/boarding/bookings/all', authHeader);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching boarding bookings:', error);
      Alert.alert('Error', 'Could not load boarding bookings.');
    }
  }, [userToken]);

  const fetchTodayAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const { checkIn, checkOut } = nightRangeCoveringToday();
      const q = `?checkIn=${encodeURIComponent(checkIn.toISOString())}&checkOut=${encodeURIComponent(checkOut.toISOString())}&includeFull=true`;
      const { data } = await api.get(`/boarding/rooms${q}`, authHeader);
      setTodayRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching today boarding availability:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [userToken]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchBookings(), fetchTodayAvailability()]);
  }, [fetchBookings, fetchTodayAvailability]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/boarding/bookings/${id}/status`, { status }, authHeader);
      Alert.alert('Success', `Booking ${status}`);
      loadAll();
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Could not update booking status.');
    }
  };

  const todayDisplay = nightRangeCoveringToday().checkIn.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const getBadgeStyle = (status) => {
    if (status === 'Confirmed') return { badge: styles.badgeConfirmed, text: styles.badgeTextConfirmed };
    if (status === 'Pending') return { badge: styles.badgePending, text: styles.badgeTextPending };
    if (status === 'Cancelled' || status === 'Rejected') return { badge: styles.badgeRejected, text: styles.badgeTextRejected };
    if (status === 'Checked In') return { badge: styles.badgeCheckedIn, text: styles.badgeTextCheckedIn };
    if (status === 'Checked Out') return { badge: styles.badgeCheckedOut, text: styles.badgeTextCheckedOut };
    return { badge: styles.badgeDefault, text: styles.badgeTextDefault };
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.greenHeader}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.greeting}>Boarding Approvals</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5EBFA4']} tintColor="#5EBFA4" />}
      >
        <View style={styles.availabilityCard}>
          <Text style={styles.availabilityTitle}>Cage spots left today</Text>
          <Text style={styles.availabilityDate}>{todayDisplay}</Text>
          <Text style={styles.availabilityHint}>
            Counts stays that overlap this night (Pending, Confirmed, Checked In). Pull down to refresh.
          </Text>
          {availabilityLoading ? (
            <ActivityIndicator style={{ alignSelf: 'flex-start', marginVertical: 8 }} color="#5EBFA4" />
          ) : todayRooms.length === 0 ? (
            <Text style={styles.availabilityRowMuted}>No active cage types — add types under Boarding management.</Text>
          ) : (
            todayRooms.map((r) => {
              const cap = Number(r.capacity) >= 1 ? Number(r.capacity) : 1;
              const left = typeof r.availableSpots === 'number' ? r.availableSpots : cap;
              return (
                <Text key={r._id} style={styles.availabilityRow}>
                  {r.name}: <Text style={left === 0 ? styles.availabilityZero : styles.availabilityStrong}>{left}</Text> free of {cap}
                </Text>
              );
            })
          )}
          {!availabilityLoading && todayRooms.length > 0 ? (
            <Text style={styles.availabilityTotal}>
              Total free spots: <Text style={styles.availabilityStrong}>{todayRooms.reduce((s, r) => s + (typeof r.availableSpots === 'number' ? r.availableSpots : (Number(r.capacity) >= 1 ? Number(r.capacity) : 1)), 0)}</Text>
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Pending Boarding Requests</Text>
        {bookings.map((booking) => {
          const statusStyles = getBadgeStyle(booking.status);
          return (
            <View key={booking._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{booking.pet?.name || 'Unknown Pet'} • {booking.room?.name || 'Boarding Room'}</Text>
                <View style={[styles.badge, statusStyles.badge]}>
                  <Text style={[styles.badgeText, statusStyles.text]}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>Owner: {booking.owner?.name || 'Unknown'}</Text>
              <Text style={styles.cardSub}>Email: {booking.owner?.email || '—'}</Text>
              <Text style={styles.cardSub}>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</Text>
              <Text style={styles.cardSub}>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</Text>
              <Text style={styles.cardSub}>Total: Rs. {booking.totalCost ?? '—'}</Text>
              {booking.notes ? <Text style={styles.cardSub}>Notes: {booking.notes}</Text> : null}

              {booking.status === 'Pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleUpdateStatus(booking._id, 'Rejected')}>
                    <Text style={styles.btnTextReject}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleUpdateStatus(booking._id, 'Confirmed')}>
                    <Text style={styles.btnTextApprove}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        {bookings.length === 0 && <Text style={styles.emptyText}>No boarding requests found.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F6F8' },
  greenHeader: {
    backgroundColor: '#5EBFA4',
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 35,
  },
  backButton: { width: 40 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  container: { padding: 20 },
  availabilityCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#5EBFA4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  availabilityTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  availabilityDate: { fontSize: 14, color: '#5EBFA4', fontWeight: '600', marginTop: 4 },
  availabilityHint: { fontSize: 12, color: '#888', marginTop: 8, marginBottom: 10, lineHeight: 17 },
  availabilityRow: { fontSize: 14, color: '#444', marginBottom: 6 },
  availabilityRowMuted: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  availabilityStrong: { fontWeight: 'bold', color: '#2E7D32' },
  availabilityZero: { fontWeight: 'bold', color: '#C62828' },
  availabilityTotal: { fontSize: 14, color: '#555', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  card: {
    backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EEE' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  badgePending: { backgroundColor: '#FFF3E0' },
  badgeTextPending: { color: '#FF9800' },
  badgeConfirmed: { backgroundColor: '#E8F5E9' },
  badgeTextConfirmed: { color: '#4CAF50' },
  badgeRejected: { backgroundColor: '#FFEBEE' },
  badgeTextRejected: { color: '#F44336' },
  badgeCheckedIn: { backgroundColor: '#E3F2FD' },
  badgeTextCheckedIn: { color: '#1565C0' },
  badgeCheckedOut: { backgroundColor: '#F3E5F5' },
  badgeTextCheckedOut: { color: '#6A1B9A' },
  badgeDefault: { backgroundColor: '#EEE' },
  badgeTextDefault: { color: '#666' },
  cardSub: { fontSize: 14, color: '#666', marginBottom: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#FFEBEE' },
  approveBtn: { backgroundColor: '#E8F5E9', marginLeft: 10 },
  btnTextReject: { color: '#F44336', fontWeight: 'bold' },
  btnTextApprove: { color: '#4CAF50', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
