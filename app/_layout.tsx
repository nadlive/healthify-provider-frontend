import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import AuthProvider from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import AppShell from '../components/AppShell';
import './global.css';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      setViewportHeight();

      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
        );
      }

      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);

      const timeoutId = setTimeout(setViewportHeight, 100);

      return () => {
        window.removeEventListener('resize', setViewportHeight);
        window.removeEventListener('orientationchange', setViewportHeight);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <AppShell />
            </View>
          </GestureHandlerRootView>
        </ToastProvider>
      </AuthProvider>
    </Provider>
  );
}
