import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchAppointments } from '../../src/store/slices/appointmentSlice';
import { COLORS } from '../../constants/colors';
import { MainStyles } from '../../assets/styles/main.styles';

const Patients = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { appointments, loading } = useSelector((state) => state.appointment);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uniquePatients, setUniquePatients] = useState([]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (appointments) {
      const patientsMap = new Map();
      appointments.forEach((appointment) => {
        if (appointment.patient) {
          const patientId =
            appointment.patient.patient_id || appointment.patient.id;
          if (!patientsMap.has(patientId)) {
            patientsMap.set(patientId, {
              ...appointment.patient,
              appointmentCount: 1,
              lastAppointment: appointment.scheduled_time,
            });
          } else {
            const existing = patientsMap.get(patientId);
            existing.appointmentCount += 1;
            if (
              new Date(appointment.scheduled_time) >
              new Date(existing.lastAppointment)
            ) {
              existing.lastAppointment = appointment.scheduled_time;
            }
          }
        }
      });
      setUniquePatients(Array.from(patientsMap.values()));
    }
  }, [appointments]);

  const loadPatients = async () => {
    try {
      await dispatch(fetchAppointments());
    } catch (error) {
      console.error('Error loading patients:', error);
      Alert.alert('Error', 'Failed to load patients. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filteredPatients = uniquePatients.filter(
    (patient) =>
      patient.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading && !refreshing) {
    return (
      <View style={MainStyles.loading_container}>
        <ActivityIndicator size="large" color={COLORS.logo} />
        <Text style={MainStyles.loading_text}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <View style={MainStyles.Primary_screen_container}>
      <View style={MainStyles.Secondary_screen_container}>
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.white,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: COLORS.bg_dark,
            }}
          >
            <Ionicons name="search" size={20} color={COLORS.txt_secondary} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: COLORS.txt_primary,
              }}
              placeholder="Search patients..."
              placeholderTextColor={COLORS.txt_secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'web' ? 80 : 30,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.logo]}
            />
          }
        >
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.patient_id || patient.id}
                style={MainStyles.card}
                onPress={() =>
                  router.push(`/patient/${patient.patient_id || patient.id}`)
                }
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: COLORS.logo,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 15,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontSize: 18,
                        fontWeight: '600',
                      }}
                    >
                      {patient.firstName?.charAt(0)}
                      {patient.lastName?.charAt(0)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[MainStyles.header_2, { marginBottom: 4 }]}>
                      {patient.firstName} {patient.lastName}
                    </Text>
                    <Text
                      style={[
                        MainStyles.paragraph_text,
                        { color: COLORS.txt_secondary, marginBottom: 2 },
                      ]}
                    >
                      {patient.email}
                    </Text>
                    <Text
                      style={[
                        MainStyles.paragraph_text,
                        { color: COLORS.txt_secondary, fontSize: 14 },
                      ]}
                    >
                      {patient.appointmentCount} appointment
                      {patient.appointmentCount !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={COLORS.txt_secondary}
                    />
                    <Text
                      style={[
                        MainStyles.paragraph_text,
                        {
                          color: COLORS.txt_secondary,
                          fontSize: 12,
                          marginTop: 4,
                        },
                      ]}
                    >
                      Last:{' '}
                      {new Date(patient.lastAppointment).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons
                name="people-outline"
                size={64}
                color={COLORS.txt_secondary}
              />
              <Text
                style={[
                  MainStyles.header_2,
                  { color: COLORS.txt_secondary, marginTop: 16 },
                ]}
              >
                {searchQuery ? 'No patients found' : 'No patients yet'}
              </Text>
              <Text
                style={[
                  MainStyles.paragraph_text,
                  { color: COLORS.txt_secondary, textAlign: 'center' },
                ]}
              >
                {searchQuery
                  ? 'Try adjusting your search criteria.'
                  : 'Patients will appear here once they book appointments with you.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default Patients;
