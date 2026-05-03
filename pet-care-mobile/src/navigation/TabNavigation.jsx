import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import VaccinationsScreen from '../screens/vaccinations/VaccinationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#60B66C', // matching your green theme
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ 
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
             <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>🏠</Text>
          )
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={AppointmentsScreen}
        options={{ 
          tabBarLabel: 'Vets',
          tabBarIcon: ({ focused }) => (
             <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>🩺</Text>
          )
        }}
      />
      <Tab.Screen
        name="Records"
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
             <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>👤</Text>
          )
        }}
      />
    </Tab.Navigator>
  );
}
