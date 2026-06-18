import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { setTimezone } from '../../src/store/slices/settingsSlice';
import { COLORS } from '../../constants/colors';
import { MainStyles } from '../../assets/styles/main.styles';
import { info } from '../../components/PlatformAlert';

const TIMEZONES = [
  { value: 'Asia/Colombo', label: 'Sri Lanka - Colombo' },
  { value: 'Europe/London', label: 'United Kingdom - London' },
  { value: 'Pacific/Auckland', label: 'New Zealand - Auckland' },
  { value: 'Australia/Sydney', label: 'Australia - Sydney' },
  { value: 'Australia/Melbourne', label: 'Australia - Melbourne' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const Timezone = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { timezone } = useSelector((state) => state.settings);
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const handleSave = () => {
    dispatch(setTimezone(selectedTimezone));
    info('Success', 'Timezone updated successfully');
    router.back();
  };

  return (
    <View style={MainStyles.Primary_screen_container}>
      <ScrollView
        style={MainStyles.Secondary_screen_container}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 80 : 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            MainStyles.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.txt_primary} />
          </TouchableOpacity>
          <Text style={[MainStyles.header_1, { flex: 1 }]}>Timezone</Text>
        </View>

        <View style={MainStyles.card}>
          <Text
            style={[
              MainStyles.header_2,
              { marginBottom: 8, color: COLORS.txt_primary },
            ]}
          >
            Timezone
          </Text>
          <Text
            style={[
              MainStyles.paragraph_text,
              { color: COLORS.txt_secondary, marginBottom: 20 },
            ]}
          >
            Select your preferred timezone for dates and times
          </Text>

          {TIMEZONES.map((tz) => {
            const isSelected = selectedTimezone === tz.value;
            return (
              <TouchableOpacity
                key={tz.value}
                style={[
                  styles.timezoneItem,
                  isSelected && styles.timezoneItemSelected,
                ]}
                onPress={() => setSelectedTimezone(tz.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.timezoneLabel,
                      isSelected && styles.timezoneLabelSelected,
                    ]}
                  >
                    {tz.label}
                  </Text>
                  <Text
                    style={[
                      styles.timezoneValue,
                      isSelected && styles.timezoneValueSelected,
                    ]}
                  >
                    {tz.value}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.logo}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            selectedTimezone === timezone && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={selectedTimezone === timezone}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: COLORS.bg_light,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timezoneItemSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.logo,
  },
  timezoneLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.txt_primary,
    marginBottom: 4,
  },
  timezoneLabelSelected: {
    color: COLORS.logo,
  },
  timezoneValue: {
    fontSize: 14,
    color: COLORS.txt_secondary,
  },
  timezoneValueSelected: {
    color: COLORS.txt_primary,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 15,
    backgroundColor: COLORS.logo,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.bg_dark,
    opacity: 0.5,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default Timezone;
