import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminAppointmentApprovalScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Could not load appointments.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert('Success', `Appointment ${status}`);
      fetchAppointments();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not update status');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.greenHeader}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.greeting}>Approve Appointments</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>All Appointments</Text>
        {appointments.map(app => (
          <View key={app._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{app.pet?.name || 'Unknown Pet'} - {app.reason}</Text>
              <View style={[styles.badge, app.status === 'Approved' ? styles.badgeApproved : app.status === 'Pending' ? styles.badgePending : app.status === 'Rejected' ? styles.badgeRejected : null]}>
                <Text style={[styles.badgeText, app.status === 'Approved' ? styles.badgeTextApproved : app.status === 'Pending' ? styles.badgeTextPending : app.status === 'Rejected' ? styles.badgeTextRejected : null]}>{app.status}</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>Owner: {app.owner?.name}</Text>
            <Text style={styles.cardSub}>Vet: {app.vet?.name}</Text>
            <Text style={styles.cardSub}>Date: {new Date(app.date).toLocaleDateString()} at {app.time}</Text>

            {app.status === 'Pending' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleUpdateStatus(app._id, 'Rejected')}>
                  <Text style={styles.btnTextReject}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleUpdateStatus(app._id, 'Approved')}>
                  <Text style={styles.btnTextApprove}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {appointments.length === 0 && <Text style={styles.emptyText}>No appointments found.</Text>}
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
    paddingHorizontal: 24, paddingTop: 50,
  },
  backButton: { width: 40 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  container: { padding: 20 },
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
  badgeApproved: { backgroundColor: '#E8F5E9' },
  badgeTextApproved: { color: '#4CAF50' },
  badgeRejected: { backgroundColor: '#FFEBEE' },
  badgeTextRejected: { color: '#F44336' },
  
  cardSub: { fontSize: 14, color: '#666', marginBottom: 4 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#FFEBEE' },
  approveBtn: { backgroundColor: '#E8F5E9', marginLeft: 10 },
  btnTextReject: { color: '#F44336', fontWeight: 'bold' },
  btnTextApprove: { color: '#4CAF50', fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
});
