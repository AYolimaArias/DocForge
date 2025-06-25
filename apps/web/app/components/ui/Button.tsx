import React from 'react';
import { FiRefreshCw, FiGithub, FiUpload, FiInfo } from 'react-icons/fi';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: 'refresh' | 'github' | 'upload' | 'info' | React.ReactNode;
  children: React.ReactNode;
}

const iconMap = {
  refresh: FiRefreshCw,
  github: FiGithub,
  upload: FiUpload,
  info: FiInfo,
};

const variantStyles = {
  primary: 'bg-accent text-white shadow-btn hover:bg-[#1746b0] hover:shadow-btn-hover',
  secondary: 'bg-bg text-accent border border-accent font-bold rounded-md transition-colors hover:bg-accent hover:text-white',
  outline: 'border border-border text-text hover:bg-background-secondary',
  ghost: 'text-text hover:bg-white/10',
};

const sizeStyles = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-6 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const IconComponent = typeof icon === 'string' ? iconMap[icon as keyof typeof iconMap] : null;
  
  return (
    <button
      className={`
        flex items-center gap-2 justify-center font-bold rounded-md transition-all
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {IconComponent && <IconComponent size={size === 'sm' ? 16 : 20} />}
      {typeof icon === 'object' && icon}
      {children}
    </button>
  );
}; 