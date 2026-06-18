import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../../src/store/slices/authSlice';
import { COLORS } from '../../constants/colors';
import { MainStyles } from '../../assets/styles/main.styles';
import { confirm } from '../../components/PlatformAlert';

const Profile = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    confirm('Are you sure you want to logout?', () => {
      dispatch(logout());
      router.replace('/(auth)/provider-login');
    });
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () =>
        Alert.alert(
          'Coming Soon',
          'Edit profile feature will be available soon',
        ),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'SLMC Registration',
      subtitle: `Registration #: ${user?.slmcNumber || 'Not set'}`,
      onPress: () =>
        Alert.alert(
          'SLMC Registration',
          `Your SLMC registration number: ${user?.slmcNumber || 'Not set'}`,
        ),
    },
    {
      icon: 'document-text-outline',
      title: 'Qualifications',
      subtitle: user?.qualifications || 'Not specified',
      onPress: () =>
        Alert.alert(
          'Qualifications',
          user?.qualifications || 'No qualifications specified',
        ),
    },
    {
      icon: 'time-outline',
      title: 'Timezone',
      subtitle: 'Set your timezone for dates and times',
      onPress: () => router.push('/(tabs)/timezone'),
    },
  ];

  return (
    <View style={MainStyles.Primary_screen_container}>
      <ScrollView
        style={MainStyles.Secondary_screen_container}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 80 : 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View
          style={[MainStyles.card, { alignItems: 'center', marginBottom: 20 }]}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: COLORS.logo,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 15,
            }}
          >
            <Text
              style={{ color: COLORS.white, fontSize: 32, fontWeight: '600' }}
            >
              {user?.name?.charAt(0) || 'D'}
            </Text>
          </View>

          <Text style={[MainStyles.header_1, { marginBottom: 5 }]}>
            {user?.name || 'Dr. Provider'}
          </Text>
          <Text
            style={[
              MainStyles.paragraph_text,
              { color: COLORS.txt_secondary, marginBottom: 5 },
            ]}
          >
            {user?.email || 'provider@healthify.com'}
          </Text>
          <Text
            style={[
              MainStyles.paragraph_text,
              { color: COLORS.txt_secondary, fontSize: 14 },
            ]}
          >
            SLMC Registration: {user?.slmcNumber || 'Not set'}
          </Text>
        </View>

        {/* Menu Items */}
        <View style={MainStyles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 15,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.bg_dark,
              }}
              onPress={item.onPress}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.bg_dark,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 15,
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={COLORS.txt_primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    MainStyles.paragraph_text,
                    { fontWeight: '600', marginBottom: 2 },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    MainStyles.paragraph_text,
                    { color: COLORS.txt_secondary, fontSize: 14 },
                  ]}
                >
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.txt_secondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={{
            marginTop: 20,
            marginBottom: 30,
            paddingVertical: 15,
            backgroundColor: COLORS.error,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleLogout}
        >
          <Text
            style={{ color: COLORS.white, fontWeight: '600', fontSize: 16 }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default Profile;
