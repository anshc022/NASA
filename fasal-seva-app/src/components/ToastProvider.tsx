import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { CustomToast, Toast } from './CustomToast';

interface ToastProviderRef {
  show: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const ToastProvider = forwardRef<ToastProviderRef>((props, ref) => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  useImperativeHandle(ref, () => ({
    show: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setToast({
        visible: true,
        message,
        type,
      });
    },
  }));

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <CustomToast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      onHide={hideToast}
    />
  );
});

// Initialize the toast manager
export const initializeToast = (ref: React.RefObject<ToastProviderRef>) => {
  if (ref.current) {
    Toast.setRef(ref.current);
  }
};