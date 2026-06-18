import createApiInstance from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const gatewayApi = createApiInstance();

const authService = {
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch {
      return false;
    }
  },

  async getUser() {
    const user = await gatewayApi.get('/user/me');
    return user;
  },

  async verifyTotp(email, totpCode) {
    const response = await gatewayApi.post('/auth/verify-totp', {
      email,
      totpCode,
    });
    return { data: response };
  },
};

export default authService;
