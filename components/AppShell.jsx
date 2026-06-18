import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, useSegments } from 'expo-router';
import AppHeader from './AppHeader';
import NavigationDrawer from './NavigationDrawer';

const MAIN_SEGMENTS = ['(tabs)', 'appointment', 'chat', 'patient', 'video-call'];

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const segments = useSegments();

  const firstSegment = segments?.[0];
  const showShell =
    firstSegment && MAIN_SEGMENTS.some((s) => firstSegment === s || firstSegment?.startsWith(s));

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  if (!showShell) {
    return <Slot />;
  }

  return (
    <View style={styles.container}>
      <AppHeader onMenuPress={openDrawer} />
      <View style={styles.content}>
        <Slot />
      </View>
      <NavigationDrawer open={drawerOpen} onClose={closeDrawer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
