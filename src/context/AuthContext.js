import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../store/hooks';
import { rehydrateAuth, logout } from '../store/slices/authSlice';
import { rehydrateSettings } from '../store/slices/settingsSlice';
import { useRouter, usePathname } from 'expo-router';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth
  );

  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await dispatch(rehydrateAuth()).unwrap();
        await dispatch(rehydrateSettings()).unwrap();
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!bootstrapped || isLoading) return;
    // Don't redirect while on OAuth callback – let it complete the exchange and redirect
    if (pathname && String(pathname).includes('oauth-callback')) return;

    if (!isAuthenticated || user?.role !== 'practitioner') {
      dispatch(logout());
      router.replace('/(auth)/provider-login');
    }
  }, [bootstrapped, isLoading, isAuthenticated, user, dispatch, router, pathname]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading: isLoading || !bootstrapped,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
