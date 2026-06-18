import createApiInstance from './api';

const gateWayApi = createApiInstance();

class ChatService {
  async fetchChatById(chatId) {
    const response = await gateWayApi.get(`/chat/${chatId}`);
    return response;
  }
}

export default new ChatService();
