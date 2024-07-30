import React, { useState, useEffect } from 'react';
import "../styles/SuccessNotification.css"

interface SuccessNotificationProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  message,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className='notification-container'>
      {message}
    </div>
  );
};

export default SuccessNotification;