import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import JSZip from "jszip";
import pkg from "file-saver";
const { saveAs } = pkg;
// import htmlDocx from "html-docx-js/dist/html-docx";
import TreeView from 'react-treeview';
import { FiUpload, FiGithub, FiRefreshCw, FiFolder, FiInfo } from 'react-icons/fi';
import { Document, Packer, Paragraph, TextRun } from 'docx';

type DocumentoGenerado = {
  id: string;
  tipo: "markdown" | "html" | "word" | "pdf";
  nombre: string;
  contenido: string | Blob;
  fecha: Date;
};

export default function Index() {
  const [files, setFiles] = useState<string[]>([]);
  const [extractPath, setExtractPath] = useState<string>("");
  const [zip, setZip] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [iaResult, setIaResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [mermaidBlocks, setMermaidBlocks] = useState<{id: string, code: string}[]>([]);
  const mermaidRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [error, setError] = useState<string>("");
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoGenerado | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  useEffect(() => {
    // Detectar y renderizar bloques Mermaid en la respuesta de la IA
    if (iaResult) {
      const regex = /```mermaid\\n([\s\S]*?)```/g;
      let match;
      const blocks: {id: string, code: string}[] = [];
      let i = 0;
      while ((match = regex.exec(iaResult)) !== null) {
        blocks.push({ id: `mermaid-block-${i++}`, code: match[1] });
      }
      setMermaidBlocks(blocks);
    } else {
      setMermaidBlocks([]);
    }
  }, [iaResult]);

  useEffect(() => {
    // Renderizar los diagramas Mermaid
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zip) return;
    const formData = new FormData();
    formData.append("file", zip);
    setLoading(true);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);
    if (data.files) {
      setFiles(data.files);
      setExtractPath(data.extractPath);
    }
  };

  const handleAskIA = async (e: React.FormEvent) => {
    e.preventDefault();
    // Dividir el prompt en instrucciones (una por línea, ignorar vacías)
    const instrucciones = prompt.split('\n').map(s => s.trim()).filter(Boolean);
    if (instrucciones.length === 0) return;
    setLoading(true);
    setError("");
    for (let i = 0; i < instrucciones.length; i++) {
      let instruccion = instrucciones[i];
      // Detectar formato entre corchetes al final
      let formato = 'markdown';
      const formatoMatch = instruccion.match(/\[(markdown|pdf|word|html|zip)\]$/i);
      if (formatoMatch) {
        formato = formatoMatch[1].toLowerCase();
        instruccion = instruccion.replace(/\s*\[(markdown|pdf|word|html|zip)\]$/i, '').trim();
      }
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: instruccion, extractPath, selectedFiles }),
        });
        const data = await res.json();
        if (data.result) {
          // Generar el documento en el formato indicado
          let nombre = instruccion.substring(0, 30) || 'documento';
          let extension = formato === 'markdown' ? '.md' : formato === 'pdf' ? '.pdf' : formato === 'word' ? '.docx' : formato === 'html' ? '.html' : formato === 'zip' ? '.zip' : '.md';
          let tipoDoc: DocumentoGenerado['tipo'] = formato === 'markdown' ? 'markdown' : formato === 'pdf' ? 'pdf' : formato === 'word' ? 'word' : formato === 'html' ? 'html' : formato === 'zip' ? 'markdown' : 'markdown';
          let contenido: string | Blob = data.result;
          // Procesar según formato
          if (formato === 'pdf') {
            // PDF: abrir print-to-pdf y guardar HTML como contenido
            const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${nombre}</title></head><body>${data.result}</body></html>`;
            contenido = html;
          } else if (formato === 'word') {
            // Word: convertir a HTML y guardar
            const html = `<h1>${nombre}</h1>${data.result.replace(/\n/g, '<br>')}`;
            contenido = html;
          } else if (formato === 'html') {
            // HTML: guardar como HTML
            const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${nombre}</title></head><body>${data.result}</body></html>`;
            contenido = html;
          } else if (formato === 'zip') {
            // ZIP: guardar el markdown comprimido
            const zip = new JSZip();
            zip.file(nombre + '.md', data.result);
            contenido = await zip.generateAsync({ type: 'blob' });
            tipoDoc = 'markdown';
          }
          agregarDocumento({
            id: Date.now() + '-' + i,
            tipo: tipoDoc,
            nombre: nombre + extension,
            contenido,
            fecha: new Date(),
          });
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        setError("Error al generar documentación");
      }
    }
    setLoading(false);
    setPrompt("");
  };

  const handleFileSelect = (file: string) => {
    setSelectedFiles(prev =>
      prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
    );
  };

  // Eliminar bloques Mermaid del Markdown para evitar doble render
  const markdownWithoutMermaid = iaResult.replace(/```mermaid[\s\S]*?```/g, "");

  // Función para descargar como Markdown ZIP
  const handleDownloadMarkdownZip = async () => {
    const zip = new JSZip();
    zip.file("documentacion.md", iaResult);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "documentacion.zip");
    agregarDocumento({
      id: Date.now() + "-md",
      tipo: "markdown",
      nombre: "documentacion.md",
      contenido: iaResult,
      fecha: new Date(),
    });
  };

  // Función para descargar como HTML
  const handleDownloadHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Documentación</title></head><body>${markdownWithoutMermaid}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    saveAs(blob, "documentacion.html");
    agregarDocumento({
      id: Date.now() + "-html",
      tipo: "html",
      nombre: "documentacion.html",
      contenido: html,
      fecha: new Date(),
    });
  };

  // Función para descargar como Word
  const handleDownloadWord = async () => {
    // TODO: Implementar descarga Word sin html-docx-js
    console.log("Función de descarga Word temporalmente deshabilitada");
    /*
    const html = `<h1>Documentación</h1>${markdownWithoutMermaid.replace(/\n/g, '<br>')}`;
    const blob = htmlDocx.asBlob(html);
    saveAs(blob, "documentacion.docx");
    */
  };

  // Función para descargar como PDF
  const handleDownloadPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Documentación</title></head><body>${markdownWithoutMermaid}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    saveAs(blob, "documentacion.html");
    // Abrir en nueva ventana para imprimir como PDF
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (win) {
      win.print();
    }
    agregarDocumento({
      id: Date.now() + "-pdf",
      tipo: "pdf",
      nombre: "documentacion.html",
      contenido: html,
      fecha: new Date(),
    });
  };

  function buildTree(files: string[]): any[] {
    const tree: any = {};
    files.forEach(file => {
      const parts = file.split('/');
      let current = tree;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = null; // Archivo
        } else {
          current[part] = current[part] || {};
        }
        current = current[part];
      });
    });
    return toTree(tree);
  }

  function toTree(obj: any, prefix = ''): any[] {
    return Object.keys(obj).map(key => ({
      label: key,
      value: prefix + key,
      children: obj[key] ? toTree(obj[key], prefix + key + '/') : null
    }));
  }

  function getSectionDoc(section: string): string {
    return `Genera documentación para la sección: ${section}`;
  }

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/github-repos");
      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
        setShowRepoSelector(true);
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
    }
  };

  const handleRepoSelect = async (repo: string) => {
    setSelectedRepo(repo);
    setShowRepoSelector(false);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-github-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        setExtractPath(data.extractPath);
      }
    } catch (error) {
      console.error("Error analyzing repo:", error);
    }
    setLoading(false);
  };

  function renderFileTreeWithFolderIcon(node: any) {
    return (
      <div className="flex items-center gap-2">
        {node.children ? (
          <FiFolder className="text-accent" />
        ) : (
          <div className="w-4 h-4" />
        )}
        <span className="text-sm">{node.label}</span>
      </div>
    );
  }

  function agregarDocumento(doc: DocumentoGenerado) {
    setDocumentos(prev => [doc, ...prev]);
  }

  const handleNuevoProyecto = () => {
    setFiles([]);
    setExtractPath("");
    setZip(null);
    setPrompt("");
    setSelectedFiles([]);
    setIaResult("");
    setError("");
    setDocumentos([]);
    setDocSeleccionado(null);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="bg-panel border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">DocForge</h1>
          <div className="flex gap-4">
            <button
              onClick={handleNuevoProyecto}
              className="btn-secondary"
            >
              Nuevo Proyecto
            </button>
            <button
              onClick={fetchRepos}
              className="btn-primary flex items-center gap-2"
            >
              <FiGithub />
              GitHub
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo - Upload y archivos */}
          <div className="space-y-6">
            {/* Upload de archivos */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiUpload />
                Subir Archivos
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Archivo ZIP del proyecto
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZip(e.target.files?.[0] || null)}
                    className="input-field w-full"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !zip}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Subir y Extraer"}
                </button>
              </form>
            </div>

            {/* Explorador de archivos */}
            {files.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FiFolder />
                  Archivos del Proyecto
                </h2>
                <div className="max-h-96 overflow-y-auto">
                  {/* TODO: Implementar TreeView compatible con Remix */}
                  <div className="text-sm text-gray-400">
                    Lista de archivos temporalmente deshabilitada
                  </div>
                  {/*
                  <TreeView
                    data={buildTree(files)}
                    nodeLabel={renderFileTreeWithFolderIcon}
                    onClick={(node: any) => handleFileSelect(node.value)}
                    className="text-sm"
                  />
                  */}
                </div>
              </div>
            )}
          </div>

          {/* Panel central - Prompt y resultados */}
          <div className="space-y-6">
            {/* Prompt de IA */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Generar Documentación</h2>
              <form onSubmit={handleAskIA} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Instrucciones para la IA
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Genera documentación técnica del proyecto [markdown]"
                    className="input-field w-full h-32 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !extractPath}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? "Generando..." : "Generar Documentación"}
                </button>
              </form>
            </div>

            {/* Resultados de IA */}
            {iaResult && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Documentación Generada</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadMarkdownZip}
                      className="btn-secondary text-sm"
                    >
                      ZIP
                    </button>
                    <button
                      onClick={handleDownloadHTML}
                      className="btn-secondary text-sm"
                    >
                      HTML
                    </button>
                    <button
                      onClick={handleDownloadWord}
                      className="btn-secondary text-sm"
                    >
                      Word
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="btn-secondary text-sm"
                    >
                      PDF
                    </button>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{markdownWithoutMermaid}</ReactMarkdown>
                  {mermaidBlocks.map(block => (
                    <div
                      key={block.id}
                      ref={el => mermaidRefs.current[block.id] = el}
                      className="my-4"
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="card bg-red-900/20 border-red-500">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Panel derecho - Documentos generados */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Documentos Generados</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documentos.map(doc => (
                  <div
                    key={doc.id}
                    className="p-3 bg-panel/50 border border-border rounded-lg cursor-pointer hover:bg-panel/70 transition-colors"
                    onClick={() => setDocSeleccionado(doc)}
                  >
                    <div className="font-medium text-sm">{doc.nombre}</div>
                    <div className="text-xs text-gray-400">
                      {doc.fecha.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de selección de repositorio */}
      {showRepoSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Seleccionar Repositorio</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {repos.map(repo => (
                <button
                  key={repo.full_name}
                  onClick={() => handleRepoSelect(repo.full_name)}
                  className="w-full text-left p-3 bg-panel/50 border border-border rounded-lg hover:bg-panel/70 transition-colors"
                >
                  <div className="font-medium">{repo.name}</div>
                  <div className="text-sm text-gray-400">{repo.full_name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRepoSelector(false)}
              className="btn-secondary w-full mt-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 