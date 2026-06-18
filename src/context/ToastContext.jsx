import React, { createContext, useContext, useState } from 'react';
import Toast from '../../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    type: 'success',
    text1: '',
    text2: '',
    onPress: null,
    duration: 3000,
  });

  const showToast = ({
    type = 'success',
    text1,
    text2,
    onPress,
    duration = 3000,
  }) => {
    setToast({
      visible: true,
      type,
      text1,
      text2,
      onPress,
      duration,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        visible={toast.visible}
        type={toast.type}
        text1={toast.text1}
        text2={toast.text2}
        onHide={hideToast}
        onPress={toast.onPress}
        duration={toast.duration}
      />
    </ToastContext.Provider>
  );
};
