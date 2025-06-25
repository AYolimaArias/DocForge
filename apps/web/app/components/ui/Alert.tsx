import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
  className?: string;
}

const alertStyles = {
  error: 'bg-red-500/10 border-red-500/20 text-red-400',
  success: 'bg-green-500/10 border-green-500/20 text-green-400',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

const alertIcons = {
  error: FiAlertCircle,
  success: FiCheckCircle,
  info: FiInfo,
};

export const Alert: React.FC<AlertProps> = ({
  type = 'error',
  message,
  className = '',
}) => {
  const IconComponent = alertIcons[type];

  return (
    <div className={`flex items-center gap-2 p-3 rounded-md border ${alertStyles[type]} ${className}`}>
      <IconComponent size={16} />
      <span className="text-sm">{message}</span>
    </div>
  );
}; 