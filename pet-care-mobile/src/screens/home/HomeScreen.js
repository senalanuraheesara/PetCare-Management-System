import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import api from '../../services/api';

const DashboardCard = ({ title, emoji, color, onPress, checkText }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.iconContainer}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.checkText}>Check {checkText} &gt;</Text>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const { logout, userToken } = useContext(AuthContext);
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);

  useEffect(() => {
    const fetchPets = async () => {
      setLoadingPets(true);
      try {
        const { data } = await api.get('/pets', {
          headers: {
            Authorization: userToken ? `Bearer ${userToken}` : undefined,
          },
        });
        setPets(data);
      } catch (error) {
        console.error('Unable to load pets:', error);
      } finally {
        setLoadingPets(false);
      }
    };

    fetchPets();
  }, [userToken]);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.greenHeader}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>Hey Pet Parent!</Text>
            <View style={styles.avatarContainer}>
              <Image style={styles.avatarImage} source={require('../../../assets/1.png')} />
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* My Pets Section */}
        <TouchableOpacity style={styles.myPetsCard} activeOpacity={0.8} onPress={() => navigation.navigate('AddPet')}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>🐾 My Pets</Text>
            <Text style={{ color: '#5EBFA4', fontWeight: 'bold' }}>+ Add</Text>
          </View>

          {loadingPets ? (
            <ActivityIndicator size="small" color="#5EBFA4" />
          ) : pets.length > 0 ? (
            <View style={styles.petsRow}>
              {pets.slice(0, 4).map((pet) => (
                <View key={pet._id} style={styles.petBox}>
                  {pet.profileImage ? (
                    <Image source={{ uri: pet.profileImage }} style={styles.petImage} />
                  ) : (
                    <View style={styles.petImagePlaceholder}>
                      <Text style={styles.petImagePlaceholderText}>{pet.name?.charAt(0) || 'P'}</Text>
                    </View>
                  )}
                </View>
              ))}
              {pets.length > 4 && (
                <View style={styles.morePetsBox}>
                  <Text style={styles.morePetsText}>+{pets.length - 4}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.petsRow}>
              <View style={styles.petBox} />
              <View style={styles.petBox} />
              <View style={styles.petBox} />
              <View style={styles.petBox} />
            </View>
          )}
        </TouchableOpacity>

        {/* Categories Grid */}
        <View style={styles.grid}>
          <DashboardCard title="Appointment" emoji="🏥" checkText="Appointments" onPress={() => navigation.navigate('Appointments')} />
          <DashboardCard title="Vaccines" emoji="💉" checkText="Vaccines" onPress={() => navigation.navigate('Vaccinations')} />
          <DashboardCard title="Medication" emoji="💊" checkText="Medication" onPress={() => navigation.navigate('Medications')} />
          <DashboardCard title="Diet & Food" emoji="🦴" checkText="Diet & Food" onPress={() => navigation.navigate('Diet')} />
          <DashboardCard title="Grooming" emoji="✂️" checkText="Grooming" onPress={() => navigation.navigate('Grooming')} />
          <DashboardCard title="Boarding" emoji="🏡" checkText="Boarding" onPress={() => navigation.navigate('Boarding')} />
        </View>

        <View style={styles.actionWrapper}>
          <CustomButton title="Log Out" outline onPress={logout} />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F4F6F8' },
  greenHeader: {
    backgroundColor: '#5EBFA4', // Green from mockup
    height: 120,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50, // For notch and status bar
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  avatarContainer: {
    backgroundColor: '#FFF',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  container: { paddingHorizontal: 20, paddingBottom: 60 },
  myPetsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginTop: 3, // overlap green header
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  petsRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  petBox: {
    width: 65, height: 65,
    backgroundColor: '#EEF2F5',
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  petImage: {
    width: 62,
    height: 62,
    borderRadius: 14,
  },
  petImagePlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#D9E9F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  petImagePlaceholderText: {
    color: '#5EBFA4',
    fontWeight: 'bold',
    fontSize: 18,
  },
  morePetsBox: {
    width: 65,
    height: 65,
    backgroundColor: '#5EBFA4',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  morePetsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'
  },
  card: {
    width: '48%', backgroundColor: '#FFF', paddingVertical: 20, paddingHorizontal: 12,
    borderRadius: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50', marginBottom: 12, textAlign: 'center' },
  iconContainer: {
    height: 60, justifyContent: 'center', alignItems: 'center'
  },
  cardEmoji: { fontSize: 36 },
  checkText: { fontSize: 11, color: '#7F8C8D', marginTop: 12 },
  vetsSection: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
    marginBottom: 20,
  },
  vetCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
  },
  vetDetailsRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  vetImage: {
    width: 70, height: 70, borderRadius: 12, marginRight: 16,
    backgroundColor: '#F0F0F0'
  },
  vetInfo: { flex: 1, justifyContent: 'center' },
  vetName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  vetSub: { fontSize: 12, color: '#888', marginBottom: 4 },
  vetRating: { fontSize: 12, color: '#FFA000', marginBottom: 8 },
  distanceBadge: {
    backgroundColor: '#F0F4F8', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
  },
  badgeText: { fontSize: 10, color: '#666' },
  vetFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12
  },
  lastVisit: { fontSize: 12, color: '#888', fontWeight: '500' },
  bookText: { fontSize: 12, color: '#4A90E2', fontWeight: 'bold' },
  actionWrapper: { marginTop: 10, alignItems: 'center' }
});
