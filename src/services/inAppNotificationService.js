import createApiInstance from './api';

const api = createApiInstance();

export async function fetchNotifications(limit = 50) {
  const response = await api.get('/notifications', { params: { limit } });
  return response?.data || [];
}

export async function markNotificationRead(id) {
  await api.patch(`/notifications/${id}/read`);
}
