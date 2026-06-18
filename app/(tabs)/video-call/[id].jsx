import { Platform } from 'react-native';
export default Platform.OS === 'web'
  ? require('./[id].web').default
  : require('./[id].native').default;
