import React, { useState, useRef, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Loader } from './ui/Loader';
import { FileTree } from './FileTree';
import { FileUpload } from './FileUpload';
import { Modal } from './ui/Modal';

interface AIInteractionProps {
  extractPath: string;
  selectedFiles: string[];
  onDocumentoGenerado: (doc: any) => void;
  onError: (error: string) => void;
  userName?: string;
  files: string[];
  onFilesChange: (files: string[]) => void;
  onExtractPathChange: (path: string) => void;
  onSelectedFilesChange: (files: string[]) => void;
  user: any;
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
    .replace(/\s*\[[^\]]+\]$/, '')
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
  userName = "Usuario",
  files,
  onFilesChange,
  onExtractPathChange,
  onSelectedFilesChange,
  user,
}) => {
  const aiFetcher = useFetcher<{ message: string, error?: string, id?: string }>();
  const reposFetcher = useFetcher<any[]>();
  const analyzeRepoFetcher = useFetcher<{ files: string[], extractPath: string, error?: string }>();
  const [prompt, setPrompt] = useState("");
  const instruccionesPendientes = useRef<InstruccionPendiente[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cola, setCola] = useState<InstruccionPendiente[]>([]);
  const [procesando, setProcesando] = useState(0);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repos, setRepos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [showFileTreeModal, setShowFileTreeModal] = useState(false);
  const [localSelectedFiles, setLocalSelectedFiles] = useState<string[]>(selectedFiles);
  // Estado para el modal de selector de repositorios
  const [showRepoModal, setShowRepoModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isGenerating || cola.length === 0) return;
    const siguiente = cola[0];
    setIsGenerating(true);
    aiFetcher.submit(
      { prompt: siguiente.texto, extractPath, selectedFiles },
      { method: 'post', action: '/api/ai', encType: 'application/json' }
    );
    setProcesando(cola.length);
  }, [cola, isMounted]);

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
  }, [aiFetcher.data]);

  useEffect(() => {
    if (reposFetcher.data) {
      setRepos(reposFetcher.data);
    }
  }, [reposFetcher.data]);

  useEffect(() => {
    if (analyzeRepoFetcher.data && 'files' in analyzeRepoFetcher.data) {
      setShowRepoSelector(false);
      setSelectedRepo("");
    }
  }, [analyzeRepoFetcher.data]);

  const promptFullstack = `Genera un README general del proyecto [markdown]\nGenera un diagrama de arquitectura [mermaid]\nGenera una guía de QA [word]`;
  const promptBackend = `Genera la documentación técnica del backend [markdown]\nGenera un diagrama ERD [mermaid]`;
  const promptFrontend = `Genera la documentación técnica del frontend [markdown]\nGenera una guía de QA para frontend [word]`;

  const handleDocs = (prompt: string) => {
    setPrompt(prompt);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setZip(file);
    if (file && e.currentTarget.form) {
      const formData = new FormData(e.currentTarget.form);
      aiFetcher.submit(formData, {
        method: "post",
        action: "/api/upload",
        encType: "multipart/form-data"
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const fetchRepos = () => {
    setShowRepoSelector(true);
    reposFetcher.load("/api/github-repos");
  };

  const handleRepoSelect = (repo: string) => {
    setSelectedRepo(repo);
    onError("");
    if (!repo) return;
    analyzeRepoFetcher.submit(
      { repo },
      { method: 'post', action: '/api/analyze-github-repo', encType: 'application/json' }
    );
  };

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

  // Handler para guardar selección del modal
  const handleSaveSelectedFiles = () => {
    onSelectedFilesChange(localSelectedFiles);
    setShowFileTreeModal(false);
  };

  // Handler para abrir modal solo si hay archivos
  const handleBannerClick = () => {
    if (files.length > 0) setShowFileTreeModal(true);
  };

  const handleOpenRepoModal = () => {
    setShowRepoModal(true);
    reposFetcher.load("/api/github-repos");
  };

  return (
    <div className="w-full flex flex-col min-h-[60vh] bg-transparent">

      {/* Caja de interacción */}
      <div className="w-full flex flex-col items-center justify-center max-w-3xl">
              {/* Saludo */}
      <div className="mb-6 w-full ">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Hola {userName},</h2>
        <h3 className="text-xl font-semibold text-gray-600">¿Cómo te podemos ayudar?</h3>
      </div>
        <form onSubmit={handleSubmit} className="relative w-full">
          {/* Banner del archivo/proyecto seleccionado */}
          {files.length > 0 && (
            <div className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg shadow-sm px-4 py-2 mb-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleBannerClick} tabIndex={0} role="button" aria-label="Ver archivos del proyecto">
                <span className="inline-block w-4 h-4 rounded-full bg-gray-400" />
                <span className="font-medium text-gray-800 truncate max-w-[220px]">{files[0]}</span>
              </div>
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-700 text-lg font-bold rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-accent"
                onClick={e => { e.stopPropagation(); onFilesChange([]); onExtractPathChange(''); onSelectedFilesChange([]); }}
                aria-label="Eliminar archivo"
              >
                &times;
              </button>
            </div>
          )}
          <div className="relative">
            <textarea
              name="prompt"
              className="w-full bg-gray-100 border border-gray-300 rounded-xl p-4 pb-12 text-base h-28 resize-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition mt-2"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              required
              rows={5}
              placeholder="Realiza tu instrucción..."
              style={{ minHeight: 112 }}
            />
            {/* Contenedor flotante de botones dentro del textarea */}
            <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between pointer-events-none z-10">
              <div className="flex gap-2 pointer-events-auto items-center">
                <FileUpload
                  user={user}
                  files={files}
                  extractPath={extractPath}
                  selectedFiles={selectedFiles}
                  onFilesChange={onFilesChange}
                  onExtractPathChange={onExtractPathChange}
                  onSelectedFilesChange={onSelectedFilesChange}
                  onError={onError}
                  minimal={true}
                  buttonComponent={Button}
                  buttonProps={{ variant: 'input', size: 'sm', icon: 'settings', className: 'whitespace-nowrap flex items-center' }}
                  onBannerClick={() => setShowFileTreeModal(true)}
                />
                <Button
                  type="button"
                  variant="input"
                  size="sm"
                  icon="settings"
                  onClick={handleOpenRepoModal}
                  className="whitespace-nowrap flex items-center"
                >
                  Subir desde Github
                </Button>
              </div>
              <button
                type="submit"
                disabled={isGenerating || !extractPath || !prompt}
                className="pointer-events-auto bg-gray-200 text-gray-700 rounded-full p-1 font-bold hover:bg-gray-300 transition flex items-center justify-center shadow-none h-8 w-8"
                aria-label="Enviar a IA"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 20l18-8-18-8v7l15 1-15 1v7z" fill="#6c6f80"/></svg>
              </button>
            </div>
          </div>
        </form>
        {/* Botones de documentación automática debajo del input */}
        <div className="w-full flex flex-col gap-2 mt-3">
          <button
            type="button"
            className="text-start w-full border border-gray-300 bg-white text-gray-700 rounded px-3 py-2 text-sm font-medium hover:bg-gray-100 transition"
            onClick={() => handleDocs(promptFullstack)}
            disabled={isGenerating || !extractPath}
          >
            Realizar documentación por defecto
          </button>
          <button
            type="button"
            className="text-start w-full border border-gray-300 bg-white text-gray-700 rounded px-3 py-2 text-sm font-medium hover:bg-gray-100 transition"
            onClick={() => handleDocs(promptFrontend)}
            disabled={isGenerating || !extractPath}
          >
            Realizar documentación por defecto solo para front end
          </button>
          <button
            type="button"
            className="text-start w-full border border-gray-300 bg-white text-gray-700 rounded px-3 py-2 text-sm font-medium hover:bg-gray-100 transition"
            onClick={() => handleDocs(promptBackend)}
            disabled={isGenerating || !extractPath}
          >
            Realizar documentación por defecto solo para back end
          </button>
        </div>
        {/* Modal del árbol de archivos */}
        <Modal open={showFileTreeModal} onClose={() => setShowFileTreeModal(false)} title="Selecciona archivos">
          <div className="max-h-72 overflow-y-auto border rounded p-2 mb-4">
            <FileTree files={files} selectedFiles={localSelectedFiles} onFileSelect={file => {
              setLocalSelectedFiles(prev => prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]);
            }} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-100" onClick={()=>setShowFileTreeModal(false)}>Cancelar</button>
            <button className="px-4 py-2 rounded bg-accent text-white font-bold hover:bg-blue-700" onClick={handleSaveSelectedFiles}>Guardar seleccionados</button>
          </div>
        </Modal>
        {/* Modal del selector de repositorios de GitHub */}
        <Modal open={showRepoModal} onClose={() => setShowRepoModal(false)} title="Selecciona un repositorio de GitHub">
          <div className="flex flex-col gap-3">
            <label className="font-medium text-base">Selecciona un repositorio:</label>
            <select
              value={selectedRepo}
              onChange={e => handleRepoSelect(e.target.value)}
              className="w-full bg-white text-gray-800 border border-gray-300 rounded-md p-2"
            >
              <option value="">-- Selecciona --</option>
              {Array.isArray(repos) && repos.map((repo: any) => (
                <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                className="border border-gray-300 bg-white text-gray-800 rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-100 transition"
                onClick={() => setShowRepoModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
        {aiFetcher.data?.error && (
          <Alert type="error" message={aiFetcher.data.error} />
        )}
        {isGenerating && (
          <div className="mt-4">
            <Loader />
            {cola.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Procesando archivos: {procesando} de {cola.length + procesando}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 