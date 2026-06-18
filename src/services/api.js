import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const applyInterceptors = (instance, onLogout) => {
  instance.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const user = await AsyncStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.id) {
          config.headers['x-user-id'] = userData.id;
        }
      } catch (e) {
        console.log('Failed to parse user data', e);
      }
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const baseUrl = process.env.EXPO_PUBLIC_API;
            const refreshResponse = await axios.post(
              `${baseUrl}/auth/refresh`,
              { refreshToken }
            );
            const { accessToken } = refreshResponse.data;
            await AsyncStorage.setItem('authToken', accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('refreshToken');
            await AsyncStorage.removeItem('user');
            if (typeof onLogout === 'function') onLogout();
          }
        } else {
          if (typeof onLogout === 'function') onLogout();
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const createApiInstance = (onLogout = () => {}) => {
  const baseURL = process.env.EXPO_PUBLIC_API;
  const instance = axios.create({
    baseURL,
    timeout: 30000,
  });
  return applyInterceptors(instance, onLogout);
};

export default createApiInstance;
