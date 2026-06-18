import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';

export default function VideoCall() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Call</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.txt_primary },
  subtitle: { fontSize: 14, color: COLORS.txt_secondary, marginTop: 8 },
  btn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.logo, borderRadius: 8 },
  btnText: { color: COLORS.white, fontWeight: '600' },
});
