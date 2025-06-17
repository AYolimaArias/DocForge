"use client";
import React, { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<string[]>([]);
  const [extractPath, setExtractPath] = useState<string>("");
  const [zip, setZip] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [iaResult, setIaResult] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <main style={{ maxWidth: 700, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>docForge</h1>
      <h2>Sube tu proyecto (ZIP)</h2>
      <form onSubmit={handleUpload} style={{ marginBottom: 20 }}>
        <input type="file" accept=".zip" onChange={e => setZip(e.target.files?.[0] || null)} />
        <button type="submit" disabled={loading || !zip}>Subir y analizar</button>
      </form>
      {files.length > 0 && (
        <div>
          <h3>Archivos extraídos:</h3>
          <ul>
            {files.map(f => (
              <li key={f}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(f)}
                    onChange={() => handleFileSelect(f)}
                  />
                  {f}
                </label>
              </li>
            ))}
          </ul>
          <small>Selecciona archivos si quieres limitar la consulta. Si no seleccionas nada, la IA analizará todo el proyecto.</small>
        </div>
      )}
      <hr style={{ margin: "2rem 0" }} />
      <h2>Interactúa con la IA</h2>
      <form onSubmit={handleAskIA}>
        <label>
          Instrucción (ej: "Genera un README general", "Documenta todos los endpoints", "Explica la estructura del proyecto"):<br />
          <input style={{ width: "100%" }} value={prompt} onChange={e => setPrompt(e.target.value)} required />
        </label>
        <br />
        <button type="submit" disabled={loading || !extractPath || !prompt}>Enviar a IA</button>
      </form>
      {loading && <p>Procesando...</p>}
      {iaResult && (
        <div style={{ marginTop: 20 }}>
          <h3>Respuesta de la IA:</h3>
          <pre style={{ background: "#f4f4f4", padding: 10 }}>{iaResult}</pre>
        </div>
      )}
    </main>
  );
}
