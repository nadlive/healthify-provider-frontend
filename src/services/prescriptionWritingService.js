import createApiInstance from './api';

const gateWayApi = createApiInstance();

class PrescriptionWritingService {
  async uploadPrescriptionDocument(payload) {
    const response = await gateWayApi.post(
      '/prescriptions/write-prescriptions',
      payload
    );
    return response?.data ?? response;
  }
}

export default new PrescriptionWritingService();
