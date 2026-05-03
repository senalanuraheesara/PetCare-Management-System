import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Linking, RefreshControl
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import api, { getBackendOrigin } from '../../services/api';

const MEAL_ICONS = {
  Morning: '☀️',
  Afternoon: '⛅',
  Evening: '🌙'
};

export default function DietScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };

  const [pets, setPets] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const baseFileUrl = getBackendOrigin();

  useEffect(() => { fetchPets(); }, []);
  useEffect(() => { if (selectedPet) fetchRecords(selectedPet._id); }, [selectedPet]);

  const fetchPets = async () => {
    try {
      const { data } = await api.get('/pets', authHeader);
      setPets(data);
      if (data.length > 0 && !selectedPet) setSelectedPet(data[0]);
    } catch (e) { console.error(e); }
  };

  const fetchRecords = async (petId) => {
    if (!refreshing) setLoading(true);
    try {
      const { data } = await api.get(`/diet/records?petId=${petId}`, authHeader);
      setRecords(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPets();
    if (selectedPet) fetchRecords(selectedPet._id);
  }, [selectedPet]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}><FontAwesome5 name="bone" size={20} color="#FFF" /> Diet & Nutrition</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petBar} contentContainerStyle={styles.petBarContent}>
        {pets.map(p => (
          <TouchableOpacity
            key={p._id}
            style={[styles.petChip, selectedPet?._id === p._id && styles.petChipActive]}
            onPress={() => setSelectedPet(p)}
          >
            <Text style={[styles.petChipText, selectedPet?._id === p._id && styles.petChipTextActive]}><FontAwesome5 name="paw" size={12} color={selectedPet?._id === p._id ? "#FFF" : "#888"} /> {p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#5EBFA4" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5EBFA4']} />}
        >
          {records.length === 0 && (
            <View style={styles.emptyCard}>
              <FontAwesome5 name="bone" size={48} color="#CCC" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No diet plans yet</Text>
              <Text style={styles.emptySub}>Your vet will create a diet plan after your appointment.</Text>
            </View>
          )}

          {records.map(r => (
            <View key={r._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}><FontAwesome5 name="bone" size={24} color="#FF9800" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{r.categoryName}</Text>
                  <Text style={styles.cardSub}><FontAwesome5 name="calendar-alt" size={12} color="#888" /> Started: {formatDate(r.startDate)}</Text>
                </View>
                <View style={[styles.badge, r.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={styles.badgeText}>{r.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>

              {r.schedule && r.schedule.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Meal Schedule</Text>
                  <View style={styles.mealsRow}>
                    {r.schedule.map((entry, i) => (
                      <View key={i} style={styles.mealBox}>
                        <Text style={styles.mealIcon}>{MEAL_ICONS[entry.time] || '🍛'}</Text>
                        <Text style={styles.mealTime}>{entry.time}</Text>
                        <Text style={styles.mealPortion}>{entry.portion}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(r.portionSize || r.feedingFrequency || r.waterIntake) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Feeding Details</Text>
                  {r.portionSize ? <Text style={styles.detailRow}>Portion: <Text style={styles.detailVal}>{r.portionSize}</Text></Text> : null}
                  {r.feedingFrequency ? <Text style={styles.detailRow}>Frequency: <Text style={styles.detailVal}>{r.feedingFrequency}</Text></Text> : null}
                  {r.waterIntake ? <Text style={styles.detailRow}>Water: <Text style={styles.detailVal}>{r.waterIntake}</Text></Text> : null}
                </View>
              )}

              {(r.allergies || r.avoidFoods) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
                  {r.allergies ? <Text style={styles.detailRow}>Allergies: <Text style={[styles.detailVal, { color: '#D32F2F' }]}>{r.allergies}</Text></Text> : null}
                  {r.avoidFoods ? <Text style={styles.detailRow}>Avoid: <Text style={styles.detailVal}>{r.avoidFoods}</Text></Text> : null}
                </View>
              )}

              {r.vetInstructions ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Vet Instructions</Text>
                  <Text style={styles.noteText}>{r.vetInstructions}</Text>
                </View>
              ) : null}

              {r.dietChartUrl ? (
                <TouchableOpacity style={styles.viewDocBtn} onPress={() => Linking.openURL(`${baseFileUrl}${r.dietChartUrl}`)}>
                  <Text style={styles.viewDocText}><FontAwesome5 name="file-alt" size={14} color="#2E7D32" /> View Diet Chart</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#5EBFA4', height: 115, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 35 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  petBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', maxHeight: 60 },
  petBarContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  petChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDD' },
  petChipActive: { backgroundColor: '#5EBFA4', borderColor: '#5EBFA4' },
  petChipText: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  petChipTextActive: { color: '#FFF' },
  list: { padding: 20, paddingBottom: 60 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20, elevation: 2 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  iconBox: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#E8F5E9' },
  badgeInactive: { backgroundColor: '#F5F5F5' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#555' },
  section: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, marginTop: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 8 },
  mealsRow: { flexDirection: 'row', gap: 8 },
  mealBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, alignItems: 'center' },
  mealIcon: { fontSize: 20, marginBottom: 4 },
  mealTime: { fontSize: 10, color: '#888', fontWeight: 'bold', marginBottom: 2 },
  mealPortion: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '600' },
  detailRow: { fontSize: 13, color: '#666', marginBottom: 4 },
  detailVal: { color: '#333', fontWeight: '600' },
  noteText: { fontSize: 13, color: '#666', lineHeight: 20, fontStyle: 'italic' },
  viewDocBtn: { marginTop: 12, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, alignItems: 'center' },
  viewDocText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 13 },
});