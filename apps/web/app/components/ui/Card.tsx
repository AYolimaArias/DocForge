import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
}) => {
  return (
    <div className={`bg-background-secondary p-6 rounded-lg shadow-lg ${className}`}>
      {title && (
        <div className="mb-4.5">
          <h2 className="mt-0 text-accent text-2xl mb-2">
            {title}
            {subtitle && <span className="text-text font-normal"> {subtitle}</span>}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}; 