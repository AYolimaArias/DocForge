import React, { useState } from 'react';
import { useFetcher } from '@remix-run/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Loader } from './ui/Loader';
import { FiInfo } from 'react-icons/fi';

interface AIInteractionProps {
  extractPath: string;
  selectedFiles: string[];
  onDocumentoGenerado: (doc: any) => void;
  onError: (error: string) => void;
}

export const AIInteraction: React.FC<AIInteractionProps> = ({
  extractPath,
  selectedFiles,
  onDocumentoGenerado,
  onError,
}) => {
  const aiFetcher = useFetcher<{ message: string, error?: string }>();
  const [prompt, setPrompt] = useState("");

  const isGenerating = aiFetcher.state !== 'idle';

  React.useEffect(() => {
    if (aiFetcher.data && 'message' in aiFetcher.data) {
      const result = aiFetcher.data.message;
      
      const instruccion = prompt;
      if (!instruccion) return;

      let formato = 'markdown';
      const formatoMatch = instruccion.match(/\[(markdown|pdf|word|html|zip)\]$/i);
      if (formatoMatch) {
        formato = formatoMatch[1].toLowerCase();
      }

      let nombre = instruccion.substring(0, 30) || 'documento';
      let extension = formato === 'markdown' ? '.md' : formato === 'pdf' ? '.pdf' : formato === 'word' ? '.docx' : formato === 'html' ? '.html' : '.md';
      let tipoDoc: 'markdown' | 'html' | 'word' | 'pdf' = 'markdown';
      if (formato === 'html' || formato === 'word' || formato === 'pdf') {
        tipoDoc = formato;
      }
      
      let contenido: string | Blob = result;

      onDocumentoGenerado({
        id: Date.now() + '-doc',
        tipo: tipoDoc,
        nombre: nombre + extension,
        contenido,
        fecha: new Date(),
      });
      setPrompt(""); // Limpiar prompt
    }
    if (aiFetcher.data && 'error' in aiFetcher.data) {
      onError(aiFetcher.data.error || "Error generando documento");
    }
  }, [aiFetcher.data, prompt, onDocumentoGenerado, onError]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const promptValue = formData.get("prompt") as string;
    
    aiFetcher.submit(
      { prompt: promptValue, extractPath, selectedFiles },
      { method: 'post', action: '/api/ai', encType: 'application/json' }
    );
  };

  return (
    <Card title="Interactúa con la IA">
      <aiFetcher.Form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="font-medium text-base flex items-center gap-2 relative group">
          Instrucción
          <span className="relative inline-block">
            <span
              className="cursor-pointer text-accent rounded-full w-5 h-5 flex items-center justify-center bg-panel"
              tabIndex={0}
            >
              <FiInfo size={18} />
            </span>
            <div className="tooltip-instruccion invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 w-[400px] h-auto overflow-y-auto bg-gradient-to-br from-panel to-panel/80 text-white text-left rounded-lg p-5 absolute z-50 left-1/2 bottom-9 -translate-x-1/2 shadow-lg text-sm transition-opacity pointer-events-none group-hover:pointer-events-auto">
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
              </div>
            </div>
          </span>
        </label>
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
      </aiFetcher.Form>
      
      {aiFetcher.data?.error && (
        <Alert type="error" message={aiFetcher.data.error} />
      )}
      
      {isGenerating && <Loader />}
    </Card>
  );
}; 