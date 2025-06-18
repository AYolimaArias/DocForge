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

const accent = "#2563eb"; // azul
const bg = "#181a20";
const panel = "#23262f";
const text = "#f3f4f6";
const border = "#313442";
const shadow = "0 2px 16px 0 rgba(0,0,0,0.15)";
const radius = "12px";
const font = "'Inter', 'Segoe UI', Arial, sans-serif";

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
    mermaidBlocks.forEach(block => {
      if (mermaidRefs.current[block.id]) {
        try {
          (mermaid.render(block.id + "-svg", block.code, (svgCode: any) => {
            if (mermaidRefs.current[block.id]) {
              mermaidRefs.current[block.id]!.innerHTML = svgCode;
            }
          }) as unknown) as void;
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
    setLoading(true);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, extractPath, selectedFiles }),
    });
    const data = await res.json();
    setLoading(false);
    setIaResult(data.result || data.error);
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
  };

  // Función para descargar como HTML
  const handleDownloadHTML = () => {
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Documentación</title></head><body>${markdownWithoutMermaid}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    saveAs(blob, "documentacion.html");
  };

  // Función para descargar como Word
  const handleDownloadWord = () => {
    const html = `<h1>Documentación</h1>${markdownWithoutMermaid.replace(/\n/g, '<br>')}`;
    const docx = htmlDocx.asBlob(html);
    saveAs(docx, "documentacion.docx");
  };

  // Función para descargar como PDF (usando print-to-pdf del navegador)
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><meta charset='utf-8'><title>Documentación</title></head><body>${markdownWithoutMermaid}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
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
        <TreeView key={node.value} nodeLabel={<span>📁 {node.label}</span>} defaultCollapsed={false}>
          {node.children.map((child: any) => renderFileTreeWithFolderIcon(child))}
        </TreeView>
      );
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: bg, color: text, fontFamily: font, padding: 0, margin: 0, display: 'flex' }}>
      {/* Panel de usuario arriba a la derecha */}
      <div style={{ position: "absolute", top: 20, right: 30, zIndex: 100 }}>
        {session ? (
          <div>
            <span style={{ marginRight: 10 }}>👤 {session.user?.name || session.user?.email}</span>
            <button onClick={() => signOut()} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}>Cerrar sesión</button>
          </div>
        ) : (
          <button onClick={() => signIn("github")}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}>
            Iniciar sesión con GitHub
          </button>
        )}
      </div>
      {/* Menú lateral tipo Docusaurus */}
      <aside style={{ width: 260, background: panel, borderRight: `1px solid ${border}`, padding: 24, minHeight: '100vh' }}>
        <h2 style={{ color: accent, fontSize: 22, marginTop: 0 }}>Documentación</h2>
        {files.length > 0 ? (
          <div>
            {buildTree(files).map((node, i) => (
              <TreeView key={i} nodeLabel={node.label} defaultCollapsed={false}>
                {node.children ? node.children.map((child: any, j: number) => (
                  <TreeView key={j} nodeLabel={child.label} defaultCollapsed={true}>
                    {child.children ? child.children.map((leaf: any, k: number) => (
                      <div key={k} style={{ marginLeft: 16 }}>
                        <span
                          style={{
                            cursor: "pointer",
                            color: selectedSection === leaf.value ? accent : text,
                            fontWeight: selectedSection === leaf.value ? 700 : 400,
                            textDecoration: selectedSection === leaf.value ? 'underline' : 'none',
                          }}
                          onClick={() => setSelectedSection(leaf.value)}
                        >
                          {leaf.label}
                        </span>
                      </div>
                    )) : null}
                  </TreeView>
                )) : null}
              </TreeView>
            ))}
          </div>
        ) : (
          <p style={{ color: '#b3b8c5' }}>Sube un proyecto para ver la estructura.</p>
        )}
      </aside>
      {/* Panel principal */}
      <div style={{ flex: 1, padding: 32, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: accent, fontWeight: 800, fontSize: 36, letterSpacing: -1, marginBottom: 8 }}>docForge</h1>
        {/* Panel superior: subir ZIP o analizar repo GitHub */}
        <div style={{ background: panel, borderRadius: radius, boxShadow: shadow, padding: 28, marginBottom: 32, border: `1px solid ${border}` }}>
          <h2 style={{ marginTop: 0, color: accent, fontSize: 22 }}>Sube tu proyecto <span style={{ color: text, fontWeight: 400 }}>(ZIP)</span> o analiza un repositorio de GitHub</h2>
          <form onSubmit={handleUpload} style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <input type="file" accept=".zip" onChange={e => setZip(e.target.files?.[0] || null)} style={{ color: text, background: panel, border: `1px solid ${border}`, borderRadius: 6, padding: 6 }} />
            <button type="submit" disabled={loading || !zip} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 600, fontSize: 16, cursor: loading || !zip ? "not-allowed" : "pointer", opacity: loading || !zip ? 0.6 : 1 }}>Subir y analizar</button>
          </form>
          {session && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={fetchRepos} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>
                Analizar repositorio de GitHub
              </button>
            </div>
          )}
          {showRepoSelector && (
            <div style={{ margin: '16px 0', background: panel, padding: 18, borderRadius: 8, border: `1px solid ${border}` }}>
              <label style={{ fontWeight: 500, fontSize: 16, marginRight: 10 }}>Selecciona un repositorio:</label>
              <select value={selectedRepo} onChange={e => handleRepoSelect(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${border}`, marginBottom: 16 }}>
                <option value="">-- Selecciona --</option>
                {Array.isArray(repos) && repos.map((repo: any) => (
                  <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
                ))}
              </select>
              <button onClick={() => setShowRepoSelector(false)} style={{ marginLeft: 10, background: "#444", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          )}
          {error && (
            <div style={{ color: "#ff4d4f", marginTop: 10, fontWeight: 600 }}>{error}</div>
          )}
          {loading && (
            <div style={{ color: accent, marginTop: 10, fontWeight: 600 }}>Procesando...</div>
          )}
          {files.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: accent }}>Archivos extraídos:</h3>
              <div style={{ background: bg, borderRadius: 8, padding: 12, border: `1px solid ${border}`, maxHeight: 320, overflowY: 'auto' }}>
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
        {/* Fin panel superior */}
        <div style={{ background: panel, borderRadius: radius, boxShadow: shadow, padding: 28, marginBottom: 32, border: `1px solid ${border}` }}>
          <h2 style={{ marginTop: 0, color: accent, fontSize: 22 }}>Interactúa con la IA</h2>
          <form onSubmit={handleAskIA} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontWeight: 500, fontSize: 16 }}>
              Instrucción <span style={{ color: "#b3b8c5", fontWeight: 400 }}>(ej: "Genera un README general", "Documenta todos los endpoints", "Explica la estructura del proyecto")</span>:
              <input style={{ width: "100%", marginTop: 6, background: bg, color: text, border: `1px solid ${border}`, borderRadius: 6, padding: 10, fontSize: 16, marginBottom: 0 }} value={prompt} onChange={e => setPrompt(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading || !extractPath || !prompt} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontWeight: 700, fontSize: 17, cursor: loading || !extractPath || !prompt ? "not-allowed" : "pointer", opacity: loading || !extractPath || !prompt ? 0.6 : 1 }}>Enviar a IA</button>
          </form>
          {loading && <p style={{ color: accent, marginTop: 18 }}>Procesando...</p>}
        </div>
        {iaResult && (
          <div style={{ background: panel, borderRadius: radius, boxShadow: shadow, padding: 28, marginBottom: 32, border: `1px solid ${border}` }}>
            <h3 style={{ color: accent, fontSize: 20, marginTop: 0 }}>Documentación generada:</h3>
            {/* Botones de exportación */}
            <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={handleDownloadMarkdownZip} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Descargar ZIP (Markdown)</button>
              <button onClick={handleDownloadHTML} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Descargar HTML</button>
              <button onClick={handleDownloadWord} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Descargar Word</button>
              <button onClick={handleDownloadPDF} style={{ background: accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>Descargar PDF</button>
            </div>
            {/* Renderizar Markdown (sin bloques Mermaid) */}
            <div style={{ background: bg, borderRadius: 8, padding: 18, marginBottom: 18, border: `1px solid ${border}` }}>
              <ReactMarkdown>{markdownWithoutMermaid}</ReactMarkdown>
            </div>
            {/* Renderizar diagramas Mermaid */}
            {mermaidBlocks.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h4 style={{ color: accent, fontSize: 17 }}>Diagramas generados:</h4>
                {mermaidBlocks.map(block => (
                  <div key={block.id} style={{ margin: '1rem 0', background: bg, padding: 10, borderRadius: 8, border: `1px solid ${border}` }}>
                    <div ref={el => { mermaidRefs.current[block.id] = el; }} />
                    <pre style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{block.code}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Mostrar la documentación de la sección seleccionada */}
        {selectedSection && iaResult && (
          <div style={{ background: panel, borderRadius: radius, boxShadow: shadow, padding: 28, marginBottom: 32, border: `1px solid ${border}` }}>
            <h3 style={{ color: accent, fontSize: 20, marginTop: 0 }}>Documentación: {selectedSection}</h3>
            <div style={{ background: bg, borderRadius: 8, padding: 18, marginBottom: 18, border: `1px solid ${border}` }}>
              <ReactMarkdown>{getSectionDoc(selectedSection)}</ReactMarkdown>
            </div>
            {/* Renderizar diagramas Mermaid si existen */}
            {mermaidBlocks.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h4 style={{ color: accent, fontSize: 17 }}>Diagramas generados:</h4>
                {mermaidBlocks.map(block => (
                  <div key={block.id} style={{ margin: '1rem 0', background: bg, padding: 10, borderRadius: 8, border: `1px solid ${border}` }}>
                    <div ref={el => { mermaidRefs.current[block.id] = el; }} />
                    <pre style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{block.code}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
