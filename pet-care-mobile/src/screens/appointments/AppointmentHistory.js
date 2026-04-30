import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';

export default function AppointmentHistory({ navigation }) {
  useLayoutEffect(() => {
    if (navigation) navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.greenHeader}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.greeting}>History</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.upcomingCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>📅 Past Visit</Text>
            <View style={[styles.badge, { backgroundColor: '#F0F0F0' }]}>
              <Text style={[styles.badgeText, { color: '#666' }]}>Completed</Text>
            </View>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.iconBox}>
               <Text style={{fontSize: 28}}>🏥</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>Dr. Williams</Text>
              <Text style={styles.sub}>General Checkout & Vaccines</Text>
              <Text style={[styles.date, { color: '#888' }]}>Oct 12, 2023</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.bookButton} activeOpacity={0.8} onPress={() => navigation && navigation.goBack()}>
          <Text style={styles.bookButtonText}>Back to Appointments</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F6F8' },
  greenHeader: {
    backgroundColor: '#60B66C',
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 50,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  backButton: { padding: 5 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  container: { paddingHorizontal: 20, paddingBottom: 60 },
  
  upcomingCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 24,
    marginTop: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, marginBottom: 20,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  badge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' },
  
  detailsRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#F0F4F8',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sub: { fontSize: 13, color: '#666', marginBottom: 6 },
  date: { fontSize: 13, fontWeight: 'bold' },

  bookButton: {
    backgroundColor: '#60B66C', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bookButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
