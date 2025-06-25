import React from "react";
import { Tooltip } from "./ui/Tooltip";

export const TooltipInfo: React.FC = () => (
  <Tooltip>
    <span className="text-accent font-bold text-base block mb-2">¿Cómo usar? 🤖</span>
    <span className="text-text-secondary text-sm mb-2.5 block">
      Escribe una o varias instrucciones, <b>una por línea</b>. Puedes indicar el formato al final entre corchetes:
      <span className="text-accent font-semibold"> [markdown]</span>, <span className="text-accent font-semibold">[pdf]</span>, <span className="text-accent font-semibold">[word]</span>, <span className="text-accent font-semibold">[html]</span>, <span className="text-accent font-semibold">[zip]</span>.
    </span>
    <div className="border-l-4 border-accent bg-bg p-4 my-3 rounded-lg">
      <span className="text-accent font-bold">Ejemplo:</span><br/>
      <span className="text-white">Genera un README general <b>[markdown]</b></span><br/>
      <span className="text-white">Guía de instalación <b>[pdf]</b></span><br/>
      <span className="text-white">Resumen técnico <b>[word]</b></span><br/>
      <span className="text-white">Diagrama de arquitectura <b>[markdown]</b></span><br/>
      <span className="text-white">Manual de usuario <b>[zip]</b></span>
    </div>
    <div className="border-t border-border my-2" />
    <span className="text-accent font-bold text-sm block mb-1">💡 Sobre los diagramas:</span><br/>
    <span className="text-text-secondary text-xs block mb-2">
      Si pides un diagrama (por ejemplo, <b>"Diagrama de arquitectura [markdown]"</b>), la IA generará el código Mermaid y podrás descargar el diagrama como <b>SVG</b> o como <b>bloque markdown</b>.
    </span>
    <div className="border-t border-border my-2" />
    <span className="text-accent font-bold text-sm block mb-1">ℹ️ Nota:</span><br/>
    <span className="text-text-secondary text-xs block">
      Si tu instrucción es muy larga y se ve en varias líneas, la IA la tomará como una sola instrucción mientras no presiones <b>Enter</b>.
    </span>
  </Tooltip>
); 