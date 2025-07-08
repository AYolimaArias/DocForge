import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, children, title }) => {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg relative animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-bold text-gray-900">{title}</h4>
            <button
              className="text-gray-400 hover:text-gray-700 text-2xl font-bold absolute top-4 right-4"
              onClick={onClose}
              aria-label="Cerrar modal"
              type="button"
            >
              &times;
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}; 