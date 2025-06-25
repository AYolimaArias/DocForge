import React from "react";

interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
  height?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  className = "",
  width = "w-[400px]",
  height = "h-64",
}) => (
  <div
    className={`tooltip-instruccion invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${width} ${height} overflow-y-scroll bg-gradient-to-br from-panel to-panel/80 text-white text-left rounded-lg p-5 absolute z-50 left-1/2 bottom-9 -translate-x-1/2 shadow-lg text-sm transition-opacity pointer-events-none group-hover:pointer-events-auto ${className}`}
  >
    {children}
  </div>
); 