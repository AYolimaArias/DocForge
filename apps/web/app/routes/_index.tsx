import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import JSZip from "jszip";
// import { saveAs } from "file-saver"; // Se importará dinámicamente
// @ts-expect-error
import htmlDocx from "html-docx-js/dist/html-docx";
import TreeView from 'react-treeview';
import { FiUpload, FiGithub, FiRefreshCw, FiFolder, FiInfo } from 'react-icons/fi';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator, type User } from "../services/auth.server";

// NOTA: La autenticación con next-auth y el componente Image de Next.js
// necesitarán una solución específica para Remix. Los dejaré por ahora
// para mantener la estructura, pero los abordaremos más adelante.

type DocumentoGenerado = {
  id: string;
  tipo: "markdown" | "html" | "word" | "pdf";
  nombre: string;
  contenido: string | Blob;
  fecha: Date;
};

// Placeholder para el tipo de sesión hasta que migremos la autenticación
type Session = {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
} | null;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request);
  return json({ user });
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  const uploadFetcher = useFetcher<{ files: string[], extractPath: string, error?: string }>();
  const aiFetcher = useFetcher<{ message: string, error?: string }>();
  const reposFetcher = useFetcher<any[]>();
  const analyzeRepoFetcher = useFetcher<{ files: string[], extractPath: string, error?: string }>();
  const [files, setFiles] = useState<string[]>([]);
  const [extractPath, setExtractPath] = useState<string>("");
  const [zip, setZip] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mermaidBlocks, setMermaidBlocks] = useState<{id: string, code: string}[]>([]);
  const mermaidRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
  const [repos, setRepos] = useState<any[]>([]);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [error, setError] = useState<string>("");
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoGenerado | null>(null);

  const isUploading = uploadFetcher.state !== 'idle';
  const isGenerating = aiFetcher.state !== 'idle';
  const isAnalyzingRepo = analyzeRepoFetcher.state !== 'idle';

  useEffect(() => {
    if (uploadFetcher.data && 'files' in uploadFetcher.data) {
      setFiles(uploadFetcher.data.files);
      setExtractPath(uploadFetcher.data.extractPath);
    }
    if (uploadFetcher.data && 'error' in uploadFetcher.data) {
        setError(uploadFetcher.data.error || "Error en la subida");
    }
  }, [uploadFetcher.data]);

  useEffect(() => {
    if (aiFetcher.data && 'message' in aiFetcher.data) {
      const result = aiFetcher.data.message;
      
      const instruccion = prompt;
      if (!instruccion) return;

      let formato = 'markdown';
      const formatoMatch = instruccion.match(/\\[(markdown|pdf|word|html|zip)\\]$/i);
      if (formatoMatch) {
        formato = formatoMatch[1].toLowerCase();
      }

      let nombre = instruccion.substring(0, 30) || 'documento';
      let extension = formato === 'markdown' ? '.md' : formato === 'pdf' ? '.pdf' : formato === 'word' ? '.docx' : formato === 'html' ? '.html' : '.md';
      let tipoDoc: DocumentoGenerado['tipo'] = 'markdown';
      if (formato === 'html' || formato === 'word' || formato === 'pdf') {
        tipoDoc = formato;
      }
      
      let contenido: string | Blob = result;

      agregarDocumento({
        id: Date.now() + '-doc',
        tipo: tipoDoc,
        nombre: nombre + extension,
        contenido,
        fecha: new Date(),
      });
      setPrompt(""); // Limpiar prompt
    }
    if (aiFetcher.data && 'error' in aiFetcher.data) {
        setError(aiFetcher.data.error || "Error generando documento");
    }
  }, [aiFetcher.data, prompt]);

  useEffect(() => {
    // Detectar y renderizar bloques Mermaid en el documento seleccionado
    const content = docSeleccionado?.contenido;
    if (typeof content === 'string') {
      const regex = /```mermaid\\n([\s\S]*?)```/g;
      let match;
      const blocks: {id: string, code: string}[] = [];
      let i = 0;
      while ((match = regex.exec(content)) !== null) {
        blocks.push({ id: `mermaid-block-${i++}`, code: match[1] });
      }
      setMermaidBlocks(blocks);
    } else {
      setMermaidBlocks([]);
    }
  }, [docSeleccionado]);

  useEffect(() => {
    // Renderizar los diagramas Mermaid
    mermaid.initialize({ startOnLoad: false });
    mermaidBlocks.forEach(async block => {
      if (mermaidRefs.current[block.id]) {
        try {
          const { svg } = await mermaid.render(block.id + "-svg", block.code);
          if (mermaidRefs.current[block.id]) {
            mermaidRefs.current[block.id]!.innerHTML = svg;
          }
        } catch {}
      }
    });
  }, [mermaidBlocks]);

  useEffect(() => {
    if (reposFetcher.data) {
      setRepos(reposFetcher.data);
    }
  }, [reposFetcher.data]);

  useEffect(() => {
    if (analyzeRepoFetcher.data && 'files' in analyzeRepoFetcher.data) {
      setFiles(analyzeRepoFetcher.data.files);
      setExtractPath(analyzeRepoFetcher.data.extractPath);
      setShowFileExplorer(true);
    }
  }, [analyzeRepoFetcher.data]);

  const handleNuevoProyecto = () => {
    setFiles([]);
    setExtractPath("");
    setZip(null);
    setPrompt("");
    setSelectedFiles([]);
    setMermaidBlocks([]);
    setRepos([]);
    setShowRepoSelector(false);
    setSelectedRepo("");
    setShowFileExplorer(false);
    setError("");
    setDocumentos([]);
    setDocSeleccionado(null);
    setLoading(false);
    uploadFetcher.data = undefined; // Limpiar datos del fetcher
  };

  const handleAskIaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const promptValue = formData.get("prompt") as string;
    
    // La action se encarga de las instrucciones.
    // Podríamos enviar todo el textarea y procesar en el backend
    // o procesar aquí y enviar una por una.
    // Por ahora, enviamos todo el prompt.
    aiFetcher.submit(
      { prompt: promptValue, extractPath, selectedFiles },
      { method: 'post', action: '/api/ai', encType: 'application/json' }
    );
  }

  const handleFileSelect = (file: string) => {
    setSelectedFiles(prev =>
      prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
    );
  };
  
  function buildTree(files: string[]): any[] {
    const root: any = {};
    files.forEach(file => {
      const parts = file.split('/');
      let current = root;
      parts.forEach((part, i) => {
        if (!current[part]) current[part] = (i === parts.length - 1) ? null : {};
        current = current[part];
      });
    });
    function toTree(obj: any, prefix = ''): any[] {
      return Object.entries(obj).map(([key, value]) => {
        const path = prefix ? `${prefix}/${key}` : key;
        if (value === null) {
          return { label: key, value: path, children: null };
        } else {
          return { label: key, value: path, children: toTree(value, path) };
        }
      });
    }
    return toTree(root);
  }

  const fetchRepos = () => {
    setShowRepoSelector(true);
    reposFetcher.load("/api/github-repos");
  };
  
  const handleRepoSelect = (repo: string) => {
    setSelectedRepo(repo);
    setError("");
    if (!repo) return;
    
    analyzeRepoFetcher.submit(
      { repo },
      { method: 'post', action: '/api/analyze-github-repo', encType: 'application/json' }
    );
  };

  function renderFileTreeWithFolderIcon(node: any) {
    if (!node.children) {
      // Es un archivo
      return (
        <div key={node.value} className="ml-4">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFiles.includes(node.value)}
              onChange={() => handleFileSelect(node.value)}
              className="mr-1.5 accent-accent"
            />
            <span className="text-sm">{node.label}</span>
          </label>
        </div>
      );
    } else {
      // Es una carpeta
      return (
        <TreeView key={node.value} nodeLabel={<span className="flex items-center gap-1.5"><FiFolder size={18} className="text-accent" /> {node.label}</span>} defaultCollapsed={false}>
          {node.children.map((child: any) => renderFileTreeWithFolderIcon(child))}
        </TreeView>
      );
    }
  }

  function agregarDocumento(doc: DocumentoGenerado) {
    setDocumentos(prev => [doc, ...prev]);
    setDocSeleccionado(doc);
  }

  const handleDownload = async () => {
    if (!docSeleccionado) return;

    const { default: saveAs } = await import("file-saver");
    const { contenido, nombre } = docSeleccionado;

    if (typeof contenido === "string") {
      const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      saveAs(blob, nombre);
    } else if (contenido instanceof Blob) {
      saveAs(contenido, nombre);
    } else {
      alert("El contenido de este tipo no se puede descargar.");
    }
  };

  // Función para renderizar el contenido del documento, incluyendo Mermaid
  function renderContentWithMermaid(content: string) {
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);
    let mermaidCounter = 0;

    return parts.map((part, index) => {
      if (part.startsWith('```mermaid')) {
        const block = mermaidBlocks[mermaidCounter++];
        if (block) {
          return (
            <div 
              key={block.id} 
              ref={el => { mermaidRefs.current[block.id] = el; }}
              className="mermaid-diagram-container"
            >
              {/* El SVG se renderizará aquí */}
            </div>
          );
        }
        return null;
      }
      return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
    });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Izquierda */}
      <div className="fixed top-0 left-0 h-full w-72 bg-background-secondary p-6 flex flex-col justify-between border-r border-border">
        <div>
          <h1 className="text-accent font-extrabold text-4xl tracking-tighter mb-8">
            docForge
          </h1>

          <button
            className="w-full mb-8 flex items-center gap-2 justify-center text-sm font-bold bg-accent text-white rounded-md py-2.5 px-4 shadow-btn hover:bg-[#1746b0] hover:shadow-btn-hover transition-all"
            onClick={handleNuevoProyecto}
          >
            <FiRefreshCw size={20} />
            Nuevo proyecto
          </button>

          <div className="mb-8">
            <h2 className="text-xl mb-4 text-text">
              Documentos generados
            </h2>
            {documentos.length === 0 ? (
              <p className="text-text-secondary text-sm">
                Aún no has generado documentos.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {documentos.map((doc, index) => (
                  <button
                    key={index}
                    className={`w-full text-left text-sm rounded-md py-2 px-3 transition-colors ${ docSeleccionado === doc ? 'bg-accent-light text-accent' : 'text-text hover:bg-white/10' }`}
                    onClick={() => setDocSeleccionado(doc)}
                  >
                    {doc.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel de inicio de sesión en la parte inferior */}
        <div className="mt-auto border-t border-border pt-4">
          {user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url}
                width={32}
                height={32}
                alt={user.name || 'Avatar de usuario'}
                className="rounded-full"
              />
              <div className="flex-1">
                <p className="text-text text-sm m-0">{user.name}</p>
              </div>
              <Form action="/logout" method="post">
                <button
                  className="py-1.5 px-3 text-xs font-bold bg-accent text-white rounded-md shadow-btn hover:bg-[#1746b0] hover:shadow-btn-hover transition-all"
                >
                  Salir
                </button>
              </Form>
            </div>
          ) : (
            <Form action="/auth/github" method="post">
              <button
                className="w-full flex items-center gap-2 justify-center text-sm font-bold bg-accent text-white rounded-md py-2.5 px-4 shadow-btn hover:bg-[#1746b0] hover:shadow-btn-hover transition-all"
              >
                <FiGithub size={20} />
                Iniciar sesión con GitHub
              </button>
            </Form>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="flex-1 ml-72 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Panel 1: Carga de Proyecto (ZIP o GitHub) */}
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="mt-0 text-accent text-2xl mb-4.5">
              Sube tu proyecto <span className="text-text font-normal">(ZIP)</span> o analiza un repositorio de GitHub
            </h2>
            <uploadFetcher.Form method="post" action="/api/upload" encType="multipart/form-data" className="mb-5 flex gap-3 items-center">
              <input
                type="file"
                accept=".zip"
                id="file-upload"
                name="file"
                className="hidden"
                onChange={e => {
                  setZip(e.target.files?.[0] || null);
                  // Submit a form with the file input
                  if (e.currentTarget.form) {
                      const formData = new FormData(e.currentTarget.form);
                      uploadFetcher.submit(formData, { method: "post", action: "/api/upload", encType: "multipart/form-data" });
                  }
                }}
              />
              <label htmlFor="file-upload" className="file-btn flex items-center gap-2">
                <FiUpload size={20} />
                {zip ? zip.name : "Seleccionar archivo ZIP"}
              </label>
            </uploadFetcher.Form>
            {user && (
              <div className="mb-4">
                <button className="file-btn flex items-center gap-2" onClick={fetchRepos}>
                  <FiGithub size={20} />
                  Analizar repositorio de GitHub
                </button>
              </div>
            )}
            {showRepoSelector && (
              <div className="panel bg-bg rounded-lg p-4.5 my-4">
                <div className="flex items-center gap-5">
                  <label className="font-medium text-base">Selecciona un repositorio:</label>
                  <select value={selectedRepo} onChange={e => handleRepoSelect(e.target.value)} className="w-[340px]">
                    <option value="">-- Selecciona --</option>
                    {Array.isArray(repos) && repos.map((repo: any) => (
                      <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
                    ))}
                  </select>
                  <button className="file-btn min-w-min px-4.5 flex items-center gap-2" onClick={() => setShowRepoSelector(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="alert-error">{error}</div>
            )}
            {isUploading || isAnalyzingRepo && (
              <div className="loader" />
            )}
            {files.length > 0 && !isUploading && !isAnalyzingRepo && (
              <div className="mt-4.5">
                <h3 className="m-0 text-lg text-accent mb-4.5">Archivos extraídos:</h3>
                <div className="panel bg-bg rounded-lg p-3 border border-border max-h-80 overflow-y-auto mb-0">
                  {buildTree(files).length > 0 ? (
                    buildTree(files).map((node, i) => renderFileTreeWithFolderIcon(node))
                  ) : (
                    <span className="text-[#b3b8c5]">No se encontraron archivos.</span>
                  )}
                </div>
                <small className="text-[#b3b8c5]">Selecciona archivos si quieres limitar la consulta. Si no seleccionas nada, la IA analizará todo el proyecto.</small>
              </div>
            )}
          </div>

          {/* Panel 2: Interacción con la IA */}
          <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
            <h2 className="mt-0 text-accent text-2xl mb-4.5">Interactúa con la IA</h2>
            <aiFetcher.Form onSubmit={handleAskIaSubmit} className="flex flex-col gap-3">
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
              <button className="btn btn-primary" type="submit" disabled={isUploading || isGenerating || !extractPath || !prompt}>
                {isGenerating ? 'Generando...' : 'Enviar a IA'}
              </button>
            </aiFetcher.Form>
            {isGenerating && <div className="loader" />}
          </div>
          
          {/* Panel 3: Vista Previa (aparece cuando hay un documento seleccionado) */}
          {docSeleccionado && (
            <div className="bg-background-secondary p-6 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Vista Previa: {docSeleccionado.nombre}</h2>
                <button onClick={handleDownload} className="bg-accent text-white hover:bg-accent/90 rounded-md text-sm px-4 py-2 transition-colors">
                  Descargar
                </button>
              </div>
              <div className="bg-background p-6 rounded-lg overflow-auto prose prose-invert max-w-none">
                {typeof docSeleccionado.contenido === 'string' 
                  ? renderContentWithMermaid(docSeleccionado.contenido) 
                  : <p className="text-muted-foreground">Contenido no textual no puede ser previsualizado.</p>
                }
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// TODO: Crear estilos CSS para las clases que no son de Tailwind como .file-btn, .alert-error, .loader, etc.
// en el archivo app/tailwind.css

// ... El resto de las funciones (handleUpload, handleAskIA, etc.) irán aquí ... 