"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
// @ts-expect-error
import htmlDocx from "html-docx-js/dist/html-docx";
import TreeView from 'react-treeview';
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { useSession, signIn, signOut } from "next-auth/react";
import { FiUpload, FiGithub, FiRefreshCw, FiFolder, FiInfo } from 'react-icons/fi';
import Image from "next/image";

const accent = "#2563eb"; // azul
const bg = "#181a20";
const panel = "#23262f";
const text = "#f3f4f6";
const border = "#313442";
const shadow = "0 2px 16px 0 rgba(0,0,0,0.15)";
const radius = "12px";
const font = "'Inter', 'Segoe UI', Arial, sans-serif";

type DocumentoGenerado = {
  id: string;
  tipo: "markdown" | "html" | "word" | "pdf";
  nombre: string;
  contenido: string | Blob;
  fecha: Date;
};

export default function Home() {
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
  const { data: session } = useSession();
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
  const handleDownloadWord = () => {
    const html = `<h1>Documentación</h1>${markdownWithoutMermaid.replace(/\n/g, '<br>')}`;
    const docx = htmlDocx.asBlob(html);
    saveAs(docx, "documentacion.docx");
    agregarDocumento({
      id: Date.now() + "-word",
      tipo: "word",
      nombre: "documentacion.docx",
      contenido: html,
      fecha: new Date(),
    });
  };

  // Función para descargar como PDF (usando print-to-pdf del navegador)
  const handleDownloadPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Documentación</title></head><body>${markdownWithoutMermaid}</body></html>`;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    agregarDocumento({
      id: Date.now() + "-pdf",
      tipo: "pdf",
      nombre: "documentacion.pdf",
      contenido: html,
      fecha: new Date(),
    });
  };

  // Función para construir la estructura de árbol a partir de la lista de archivos
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

  // Nueva función: obtener la documentación de un archivo/section
  function getSectionDoc(section: string): string {
    // Por ahora, toda la documentación es la misma (iaResult), pero en el futuro puedes guardar por archivo
    return iaResult;
  }

  // Obtener lista de repositorios del usuario autenticado
  const fetchRepos = async () => {
    setShowRepoSelector(true);
    const res = await fetch("/api/github-repos");
    const data = await res.json();
    if (!Array.isArray(data)) {
      setError(data.error || "No se pudieron obtener los repositorios");
      setRepos([]);
    } else {
      setRepos(data);
    }
  };

  // Analizar el repo seleccionado (enviar al backend para descargar y analizar)
  const handleRepoSelect = async (repo: string) => {
    setSelectedRepo(repo);
    setError("");
    if (!repo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-github-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      if (!res.ok) {
        throw new Error("Error al analizar el repositorio");
      }
      const data = await res.json();
      setFiles(data.files);
      setExtractPath(data.extractPath);
      setShowFileExplorer(true);
    } catch (error) {
      setError("Error al analizar el repositorio");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función recursiva para renderizar el árbol de archivos con icono de carpeta y todos los archivos seleccionables
  function renderFileTreeWithFolderIcon(node: any) {
    if (!node.children) {
      // Es un archivo
      return (
        <div key={node.value} style={{ marginLeft: 16 }}>
          <label style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedFiles.includes(node.value)}
              onChange={() => handleFileSelect(node.value)}
              style={{ accentColor: accent, marginRight: 6 }}
            />
            <span style={{ fontSize: 15 }}>{node.label}</span>
          </label>
        </div>
      );
    } else {
      // Es una carpeta
      return (
        <TreeView key={node.value} nodeLabel={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FiFolder size={18} color="var(--accent)" /> {node.label}</span>} defaultCollapsed={false}>
          {node.children.map((child: any) => renderFileTreeWithFolderIcon(child))}
        </TreeView>
      );
    }
  }

  function agregarDocumento(doc: DocumentoGenerado) {
    setDocumentos(prev => [doc, ...prev]);
    setDocSeleccionado(doc);
  }

  // Función para limpiar todo y reiniciar la app
  function handleNuevoProyecto() {
    setFiles([]);
    setExtractPath("");
    setZip(null);
    setPrompt("");
    setSelectedFiles([]);
    setIaResult("");
    setMermaidBlocks([]);
    setSelectedSection(null);
    setRepos([]);
    setShowRepoSelector(false);
    setSelectedRepo("");
    setShowFileExplorer(false);
    setError("");
    setDocumentos([]);
    setDocSeleccionado(null);
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Sidebar */}
      <div style={{
        width: 300,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        padding: '32px 24px',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* Contenido principal del sidebar */}
        <div>
          <button
            className="btn btn-primary"
            style={{
              width: '100%',
              marginBottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              fontSize: 15
            }}
            onClick={() => setShowNewProjectModal(true)}
          >
            <FiRefreshCw size={20} />
            Nuevo proyecto
          </button>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: 'var(--text)' }}>
              Documentos generados
            </h2>
            {documentos.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Aún no has generado documentos.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documentos.map((doc, index) => (
                  <button
                    key={index}
                    className="doc-button"
                    style={{
                      padding: '8px 12px',
                      background: docSeleccionado === doc ? 'var(--accent-light)' : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: docSeleccionado === doc ? 'var(--accent)' : 'var(--text)',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
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
        <div style={{ 
          marginTop: 'auto',
          borderTop: '1px solid var(--border)',
          paddingTop: '16px'
        }}>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  width={32}
                  height={32}
                  alt={session.user.name || 'Avatar de usuario'}
                  style={{ borderRadius: '50%' }}
                  unoptimized
                />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text)', fontSize: 14, margin: 0 }}>{session.user?.name}</p>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={() => signOut()}
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
                fontSize: 15
              }}
              onClick={() => signIn('github')}
            >
              <FiGithub size={20} />
              Iniciar sesión con GitHub
            </button>
          )}
        </div>
      </div>

      {/* Panel principal */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 48px',
        marginLeft: '300px',
        background: 'linear-gradient(135deg, #000000 0%, #000000 60%, rgba(37, 99, 235, 0.15) 100%)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '900px'
        }}>
          <h1 style={{ 
            color: 'var(--accent)', 
            fontWeight: 800, 
            fontSize: 36, 
            letterSpacing: -1, 
            marginBottom: 8
          }}>docForge</h1>

          {/* Panel superior: subir ZIP o analizar repo GitHub */}
          <div className="panel">
            <h2 style={{ marginTop: 0, color: 'var(--accent)', fontSize: 22, marginBottom: 18 }}>
              Sube tu proyecto <span style={{ color: 'var(--text)', fontWeight: 400 }}>(ZIP)</span> o analiza un repositorio de GitHub
            </h2>
            <form onSubmit={handleUpload} style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="file"
                accept=".zip"
                id="file-upload"
                style={{ display: "none" }}
                onChange={e => setZip(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="file-btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiUpload size={20} />
                {zip ? zip.name : "Seleccionar archivo ZIP"}
              </label>
              {zip && (
                <button className="btn" type="submit">Subir y analizar</button>
              )}
            </form>
            {session && (
              <div style={{ marginBottom: 16 }}>
                <button className="file-btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={fetchRepos}>
                  <FiGithub size={20} />
                  Analizar repositorio de GitHub
                </button>
              </div>
            )}
            {showRepoSelector && (
              <div className="panel" style={{ margin: '16px 0', padding: 18, borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <label style={{ fontWeight: 500, fontSize: 16 }}>Selecciona un repositorio:</label>
                  <select value={selectedRepo} onChange={e => handleRepoSelect(e.target.value)} style={{ width: 340 }}>
                    <option value="">-- Selecciona --</option>
                    {Array.isArray(repos) && repos.map((repo: any) => (
                      <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
                    ))}
                  </select>
                  <button className="file-btn" style={{ minWidth: 'unset', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowRepoSelector(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="alert-error">{error}</div>
            )}
            {loading && (
              <div className="loader" />
            )}
            {files.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--accent)', marginBottom: 18 }}>Archivos extraídos:</h3>
                <div className="panel" style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: `1px solid var(--border)`, maxHeight: 320, overflowY: 'auto', marginBottom: 0 }}>
                  {buildTree(files).length > 0 ? (
                    buildTree(files).map((node, i) => renderFileTreeWithFolderIcon(node))
                  ) : (
                    <span style={{ color: '#b3b8c5' }}>No se encontraron archivos.</span>
                  )}
                </div>
                <small style={{ color: "#b3b8c5" }}>Selecciona archivos si quieres limitar la consulta. Si no seleccionas nada, la IA analizará todo el proyecto.</small>
              </div>
            )}
          </div>

          {/* Panel de interacción con IA */}
          <div className="panel">
            <h2 style={{ marginTop: 0, color: 'var(--accent)', fontSize: 22, marginBottom: 18 }}>Interactúa con la IA</h2>
            <form onSubmit={handleAskIA} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontWeight: 500, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                Instrucción
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span
                    style={{
                      cursor: 'pointer',
                      color: 'var(--accent)',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#23262f',
                    }}
                    tabIndex={0}
                  >
                    <FiInfo size={18} />
                  </span>
                  <span
                    style={{
                      visibility: 'hidden',
                      opacity: 0,
                      width: 400,
                      height: 300,
                      overflowY: 'auto',
                      background: 'linear-gradient(135deg, #23262f 80%, #2563eb22 100%)',
                      color: '#fff',
                      textAlign: 'left',
                      borderRadius: 12,
                      padding: '18px 22px',
                      position: 'absolute',
                      zIndex: 1000,
                      left: '50%',
                      bottom: 38,
                      transform: 'translateX(-50%)',
                      boxShadow: '0 2px 16px 0 rgba(0,0,0,0.18)',
                      fontSize: 15,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    className="tooltip-instruccion"
                  >
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 17, display: 'block', marginBottom: 8 }}>¿Cómo usar? 🤖</span>
                    <span style={{ color: '#b3b8c5', fontSize: 15, marginBottom: 10 }}>
                      Escribe una o varias instrucciones, <b>una por línea</b>. Puedes indicar el formato al final entre corchetes:
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}> [markdown]</span>, <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[pdf]</span>, <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[word]</span>, <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[html]</span>, <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[zip]</span>.
                    </span>
                    <div style={{ borderLeft: `4px solid var(--accent)`, background: '#23262f', padding: '10px 16px', margin: '8px 0 12px 0', borderRadius: 8 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Ejemplo:</span><br/>
                      <span style={{ color: '#fff' }}>Genera un README general <b>[markdown]</b></span><br/>
                      <span style={{ color: '#fff' }}>Guía de instalación <b>[pdf]</b></span><br/>
                      <span style={{ color: '#fff' }}>Resumen técnico <b>[word]</b></span><br/>
                      <span style={{ color: '#fff' }}>Diagrama de arquitectura <b>[markdown]</b></span><br/>
                      <span style={{ color: '#fff' }}>Manual de usuario <b>[zip]</b></span>
                    </div>
                    <div style={{ borderTop: '1px solid #31344255', margin: '8px 0 8px 0' }} />
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>💡 Sobre los diagramas:</span><br/>
                    <span style={{ color: '#b3b8c5' }}>Si pides un diagrama (por ejemplo, <b>"Diagrama de arquitectura [markdown]"</b>), la IA generará el código Mermaid y podrás descargar el diagrama como <b>SVG</b> o como <b>bloque markdown</b>.</span>
                    <div style={{ borderTop: '1px solid #31344255', margin: '8px 0 8px 0' }} />
                    <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>ℹ️ Nota:</span><br/>
                    <span style={{ color: '#b3b8c5' }}>Si tu instrucción es muy larga y se ve en varias líneas, la IA la tomará como una sola instrucción mientras no presiones <b>Enter</b>.</span>
                  </span>
                  <style>{`
                    .tooltip-instruccion {
                      pointer-events: none;
                    }
                    span[tabindex="0"]:hover + .tooltip-instruccion,
                    span[tabindex="0"]:focus + .tooltip-instruccion {
                      visibility: visible !important;
                      opacity: 1 !important;
                      pointer-events: auto;
                    }
                  `}</style>
                </span>
              </label>
              <textarea
                style={{
                  width: "100%",
                  marginTop: 6,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 16,
                  marginBottom: 0,
                  height: 120,
                  resize: "none",
                  overflowY: "auto"
                }}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                required
                rows={5}
                placeholder={"Escribe tus instrucciones aquí. Haz clic en el ícono de información para ver ejemplos y formatos."}
              />
              <button className="btn btn-primary" type="submit" disabled={loading || !extractPath || !prompt}>Enviar a IA</button>
            </form>
            {loading && <div className="loader" />}
          </div>

          {/* Vista previa del documento */}
          {docSeleccionado && (
            <div className="panel">
              <h3 style={{ color: 'var(--accent)', fontSize: 20, marginTop: 0, marginBottom: 18, textAlign: 'center' }}>
                Vista previa: {docSeleccionado.nombre}
              </h3>
              <div 
                className="panel" 
                style={{ 
                  background: 'var(--bg)', 
                  borderRadius: 8, 
                  padding: '32px 48px',
                  border: '1px solid var(--border)', 
                  marginBottom: 18,
                  maxWidth: '850px',
                  margin: '0 auto',
                  maxHeight: 'calc(100vh - 300px)',
                  overflowY: 'auto',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative' }}>
                  {docSeleccionado.tipo === 'markdown' && (
                    <div className="ia-markdown">
                      <ReactMarkdown>{docSeleccionado.contenido as string}</ReactMarkdown>
                    </div>
                  )}
                  {docSeleccionado.tipo === 'html' && (
                    <div dangerouslySetInnerHTML={{ __html: docSeleccionado.contenido as string }} />
                  )}
                  {docSeleccionado.tipo === 'word' && (
                    <div dangerouslySetInnerHTML={{ __html: docSeleccionado.contenido as string }} />
                  )}
                  {docSeleccionado.tipo === 'pdf' && (
                    <iframe
                      srcDoc={docSeleccionado.contenido as string}
                      style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}
                      title="Vista previa PDF"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}