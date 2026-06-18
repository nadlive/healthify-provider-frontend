import {
  Tabs,
  useRouter,
  usePathname,
  useSegments,
  Redirect,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../src/context/AuthContext';

const TabLayout = () => {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated || user?.role !== 'practitioner') {
    return <Redirect href="/(auth)/provider-login" />;
  }

  const CustomTabBar = ({ embedded }) => {
    const tabs = [
      { name: 'index', title: 'Home', icon: 'home-outline', route: '/(tabs)/' },
      {
        name: 'appointments',
        title: 'Appointments',
        icon: 'calendar-outline',
        route: '/(tabs)/appointments',
      },
      {
        name: 'patients',
        title: 'Patients',
        icon: 'people-outline',
        route: '/(tabs)/patients',
      },
      {
        name: 'time-slot',
        title: 'Time Slot',
        icon: 'time-outline',
        route: '/(tabs)/time-slot',
      },
      {
        name: 'profile',
        title: 'Profile',
        icon: 'person-outline',
        route: '/(tabs)/profile',
      },
    ];

    const isActive = (tabName) => {
      const currentTab = segments?.[segments.length - 1] || segments?.[0];
      const currentTabStr = String(currentTab || '');
      if (tabName === 'index') {
        return (
          !currentTabStr ||
          currentTabStr === 'index' ||
          pathname === '/(tabs)' ||
          pathname === '/(tabs)/' ||
          pathname === '/' ||
          (segments?.length === 1 && segments[0] === '(tabs)')
        );
      }
      return (
        currentTabStr === tabName ||
        (pathname && pathname.includes(`/${tabName}`))
      );
    };

    return (
      <View
        style={[styles.customTabBar, embedded && styles.customTabBarEmbedded]}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.name);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => router.push(tab.route)}
            >
              <Ionicons
                name={tab.icon}
                size={active ? 26 : 24}
                color={active ? COLORS.logo : COLORS.txt_secondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? COLORS.logo : COLORS.txt_secondary,
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.containerWeb}>
        <View style={styles.tabsContentWeb}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="appointments" />
            <Tabs.Screen name="patients" />
            <Tabs.Screen name="ehr" />
            <Tabs.Screen name="time-slot" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="timezone" options={{ href: null }} />
            <Tabs.Screen name="video-call/[id]" options={{ href: null }} />
          </Tabs>
        </View>
        <View style={styles.customTabBarWeb}>
          <CustomTabBar embedded />
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.logo,
        tabBarInactiveTintColor: COLORS.txt_secondary,
        tabBarStyle: {
          backgroundColor: COLORS.bg_light,
          paddingTop: 6,
          paddingBottom: 8,
          height: 56,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ehr"
        options={{
          title: 'EHR',
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="time-slot"
        options={{
          title: 'Time Slot',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="timezone" options={{ href: null }} />
      <Tabs.Screen name="video-call/[id]" options={{ href: null }} />
    </Tabs>
  );
};

const TAB_BAR_HEIGHT = 52;
const styles = StyleSheet.create({
  containerWeb: { flex: 1, flexDirection: 'column', minHeight: 0 },
  tabsContentWeb: { flex: 1, flexDirection: 'column', minHeight: 0 },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg_light,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg_dark,
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  customTabBarEmbedded: {
    position: 'relative',
    bottom: undefined,
    left: undefined,
    right: undefined,
    zIndex: undefined,
    flex: 1,
  },
  customTabBarWeb: {
    height: TAB_BAR_HEIGHT,
    minHeight: TAB_BAR_HEIGHT,
    flexShrink: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.bg_light,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg_dark,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  tabItemActive: { backgroundColor: COLORS.bg_dark },
  tabText: { fontSize: 10, marginTop: 2 },
});

export default TabLayout;
