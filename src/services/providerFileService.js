import { Platform } from 'react-native';
import createApiInstance from './api';

const gateWayApi = createApiInstance();

class ProviderFileService {
  async uploadProviderDocument({ appointment_id, practitioner_id, file, comment }) {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const webFile = new File([blob], file.name, {
        type: file.type || 'application/octet-stream',
      });
      formData.append('file', webFile);
    } else {
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      });
    }
    formData.append('appointment_id', appointment_id);
    formData.append('practitioner_id', practitioner_id);
    if (comment) formData.append('notes', comment);

    const response = await gateWayApi.post('/practitionerFiles/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response?.data ?? response;
  }

  async getAppointmentFiles(appointment_id) {
    const response = await gateWayApi.get(
      `/practitionerFiles/appointments/${appointment_id}/files`
    );
    return response;
  }

  async downloadFile(file_id) {
    const response = await gateWayApi.get(
      `/practitionerFiles/files/${file_id}/download`
    );
    return response?.download_url ?? response;
  }
}

export default new ProviderFileService();
