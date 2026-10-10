import createApiInstance from './api';

const gateWayApi = createApiInstance();

class ChatService {
  async readyForChat(chatId) {
    return gateWayApi.post(`/chat/${chatId}/ready`);
  }

  async fetchChatById(chatId) {
    const response = await gateWayApi.get(`/chat/${chatId}`);
    return response;
  }
}

export default new ChatService();
