import { Platform, Alert } from 'react-native';

export const confirm = (message, onConfirm) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(message)) onConfirm?.();
  } else {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => onConfirm?.() },
    ]);
  }
};

export const info = (title, message, onDismiss = () => {}) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => onDismiss?.() }]);
  }
};
