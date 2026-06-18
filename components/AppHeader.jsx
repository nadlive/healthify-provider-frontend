import React from "react"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../constants/colors"
import { IMG } from "../assets/images/images"

const HEADER_HEIGHT = 56

export default function AppHeader({ onMenuPress }) {
  return (
    <View style={[styles.header, Platform.OS === "web" && styles.headerWeb]}>
      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.menuButton}
        activeOpacity={0.7}
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu" size={26} color={COLORS.txt_primary} />
      </TouchableOpacity>
      <View style={styles.logoWrap}>
        <Image
          source={IMG.Healthify_logo}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Provider</Text>
      </View>
      <View style={styles.placeholder} />
    </View>
  )
}

export const APP_HEADER_HEIGHT = HEADER_HEIGHT

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: HEADER_HEIGHT,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg_dark,
  },
  headerWeb: {
    paddingHorizontal: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 130,
    height: 35,
  },
  tagline: {
    fontSize: 11,
    color: COLORS.txt_secondary,
    marginTop: 0,
    fontWeight: "600",
  },
  placeholder: {
    width: 44,
    height: 44,
  },
})
