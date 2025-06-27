import React from 'react';

export const TooltipInfo: React.FC = () => {
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
      <div className="text-xs">
        <p><strong>Ejemplos de formato:</strong></p>
        <p>• generar readme [markdown]</p>
        <p>• crear diagrama de arquitectura [mermaid]</p>
        <p>• documentar API [word]</p>
        <p>• guía de instalación [html]</p>
      </div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
    </div>
  );
}; 