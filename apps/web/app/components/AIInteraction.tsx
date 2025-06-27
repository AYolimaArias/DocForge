import React, { useState, useRef, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Loader } from './ui/Loader';
import { FiInfo } from 'react-icons/fi';
import { TooltipInfo } from "./TooltipInfo";

interface AIInteractionProps {
  extractPath: string;
  selectedFiles: string[];
  onDocumentoGenerado: (doc: any) => void;
  onError: (error: string) => void;
}

interface InstruccionPendiente {
  id: string;
  texto: string;
  nombre: string;
  extension: string;
  tipo: string;
}

const FORMATO_EXTENSION: Record<string, { ext: string, tipo: string }> = {
  markdown: { ext: '.md', tipo: 'markdown' },
  md: { ext: '.md', tipo: 'markdown' },
  word: { ext: '.docx', tipo: 'word' },
  docx: { ext: '.docx', tipo: 'word' },
  pdf: { ext: '.pdf', tipo: 'pdf' },
  html: { ext: '.html', tipo: 'html' },
  mermaid: { ext: '.mmd', tipo: 'mermaid' },
  mmd: { ext: '.mmd', tipo: 'mermaid' },
  txt: { ext: '.txt', tipo: 'txt' },
};

function limpiarNombre(nombre: string) {
  return nombre
    .replace(/\s*\[[^\]]+\]$/, '') // quita [formato]
    .replace(/[^a-zA-Z0-9-_ ]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 40) || 'documento';
}

function extraerFormato(linea: string) {
  const match = linea.match(/\[([a-zA-Z0-9]+)\]$/);
  if (match) {
    const formato = match[1].toLowerCase();
    return FORMATO_EXTENSION[formato] || FORMATO_EXTENSION['markdown'];
  }
  return FORMATO_EXTENSION['markdown'];
}

export const AIInteraction: React.FC<AIInteractionProps> = ({
  extractPath,
  selectedFiles,
  onDocumentoGenerado,
  onError,
}) => {
  const aiFetcher = useFetcher<{ message: string, error?: string, id?: string }>();
  const [prompt, setPrompt] = useState("");
  const instruccionesPendientes = useRef<InstruccionPendiente[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cola, setCola] = useState<InstruccionPendiente[]>([]);
  const [procesando, setProcesando] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Procesa la siguiente instrucción en la cola
  useEffect(() => {
    if (!isMounted || isGenerating || cola.length === 0) return;
    const siguiente = cola[0];
    setIsGenerating(true);
    aiFetcher.submit(
      { prompt: siguiente.texto, extractPath, selectedFiles },
      { method: 'post', action: '/api/ai', encType: 'application/json' }
    );
    setProcesando(cola.length);
    // eslint-disable-next-line
  }, [cola, isMounted]);

  // Maneja la respuesta de la IA
  useEffect(() => {
    if (!isGenerating || !aiFetcher.data) return;
    const siguiente = cola[0];
    if (!siguiente) return;
    if (aiFetcher.data && 'message' in aiFetcher.data) {
      onDocumentoGenerado({
        id: `${Date.now()}-${siguiente.nombre}${siguiente.extension}`,
        tipo: siguiente.tipo,
        nombre: `${siguiente.nombre}${siguiente.extension}`,
        contenido: aiFetcher.data.message,
        fecha: new Date(),
      });
    }
    if (aiFetcher.data && 'error' in aiFetcher.data) {
      onError(aiFetcher.data.error || "Error generando documento");
    }
    setCola(prev => prev.slice(1));
    setIsGenerating(false);
    setProcesando(prev => prev - 1);
    // eslint-disable-next-line
  }, [aiFetcher.data]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isMounted) return;
    const lineas = prompt
      .split('\n')
      .map(linea => linea.trim())
      .filter(linea => linea.length > 0);
    const nuevasInstrucciones: InstruccionPendiente[] = lineas.map(linea => {
      const formato = extraerFormato(linea);
      const nombre = limpiarNombre(linea);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        texto: linea,
        nombre,
        extension: formato.ext,
        tipo: formato.tipo,
      };
    });
    instruccionesPendientes.current = nuevasInstrucciones;
    setCola(nuevasInstrucciones);
    setPrompt("");
  };

  // Prompts rápidos
  const promptFullstack = `Genera un README general del proyecto [markdown]\nGenera un diagrama de arquitectura [mermaid]\nGenera una guía de QA [word]`;
  const promptBackend = `Genera la documentación técnica del backend [markdown]\nGenera un diagrama ERD [mermaid]`;
  const promptFrontend = `Genera la documentación técnica del frontend [markdown]\nGenera una guía de QA para frontend [word]`;

  const handleDocs = (prompt: string) => {
    setPrompt(prompt);
  };

  return (
    <Card title="Interactúa con la IA">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="font-medium text-base flex items-center gap-2 relative group">
          Instrucción
          <span className="relative inline-block">
            <div className="relative inline-block">
              <span
                className="cursor-pointer text-accent rounded-full w-5 h-5 flex items-center justify-center bg-panel"
                tabIndex={0}
              >
                <FiInfo size={18} />
              </span>
              <TooltipInfo />
            </div>
          </span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <Button 
            type="button"
            className="btn btn-primary"
            onClick={() => handleDocs(promptFullstack)}
            disabled={isGenerating || !extractPath}
          >
            Documentación Backend y Frontend
          </Button>
          <Button 
            type="button"
            className="btn btn-primary"
            onClick={() => handleDocs(promptBackend)}
            disabled={isGenerating || !extractPath}
          >
            Documentación Solo Backend
          </Button>
          <Button 
            type="button"
            className="btn btn-primary"
            onClick={() => handleDocs(promptFrontend)}
            disabled={isGenerating || !extractPath}
          >
            Documentación Solo Frontend
          </Button>
        </div>
        <textarea
          name="prompt"
          className="w-full mt-1.5 bg-bg text-text border border-border rounded-md p-2.5 text-base mb-0 h-32 resize-none overflow-y-auto focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          required
          rows={5}
          placeholder="Escribe tus instrucciones aquí. Haz clic en el ícono de información para ver ejemplos y formatos."
        />
        <Button 
          type="submit" 
          disabled={isGenerating || !extractPath || !prompt}
          className="btn btn-primary"
        >
          {isGenerating ? 'Generando...' : 'Enviar a IA'}
        </Button>
      </form>
      {aiFetcher.data?.error && (
        <Alert type="error" message={aiFetcher.data.error} />
      )}
      {isGenerating && (
        <div className="mt-4">
          <Loader />
          {cola.length > 0 && (
            <div className="mt-2 text-sm text-text-secondary">
              Procesando archivos: {procesando} de {cola.length + procesando}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}; 