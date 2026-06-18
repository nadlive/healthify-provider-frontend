import createApiInstance from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const gateWayApi = createApiInstance();

class AppointmentService {
  async getUserAppointments() {
    const practitionerId = await AsyncStorage.getItem('practitionerId');
    const response = await gateWayApi.get(
      `/appointments/practitioner/${practitionerId}`,
    );
    return { data: response };
  }

  async declineAppointment(appointmentId, reason) {
    const response = await gateWayApi.put(
      `/appointments/${appointmentId}/decline`,
      { reason },
    );
    return { data: response };
  }

  async confirmAppointment(appointmentId, reason) {
    const response = await gateWayApi.put(
      `/appointments/${appointmentId}/confirm`,
      { reason },
    );
    return { data: response };
  }

  async acceptChatAppointment(appointmentId) {
    const response = await gateWayApi.put(
      `/appointments/chat/${appointmentId}/accept`,
    );
    return { data: response };
  }

  async rejectChatAppointment(appointmentId) {
    const response = await gateWayApi.put(
      `/appointments/chat/${appointmentId}/reject`,
    );
    return { data: response };
  }

  async completeChatAppointment(appointmentId) {
    const response = await gateWayApi.put(
      `/appointments/chat/${appointmentId}/complete`,
    );
    return { data: response };
  }

  async createTimeSlot(startTime, endTime) {
    const response = await gateWayApi.post(`/appointments/timeslots`, {
      start_time: startTime,
      end_time: endTime,
    });
    return { data: response };
  }

  async deleteTimeSlot(timeSlotId) {
    const response = await gateWayApi.delete(
      `/appointments/timeslots/${timeSlotId}`,
    );
    return { data: response };
  }

  async getTimeSlots(fromDate, toDate) {
    const response = await gateWayApi.get(`/appointments/timeslots`, {
      params: { fromDate, toDate },
    });
    return { data: response };
  }

  async updateAppointmentStatus(appointmentId, status) {
    const response = await gateWayApi.patch(
      `/appointments/${appointmentId}/status`,
      { status },
    );
    return { data: response };
  }
}

export default new AppointmentService();
