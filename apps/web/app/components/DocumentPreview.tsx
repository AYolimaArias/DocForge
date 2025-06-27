import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DocumentoGenerado as DocumentoGeneradoBase, MermaidBlock } from './types';

// Extiende el tipo para incluir 'mermaid'
type DocumentoGenerado = DocumentoGeneradoBase & { tipo: 'markdown' | 'html' | 'word' | 'pdf' | 'mermaid' | 'txt' };

interface DocumentPreviewProps {
  documento: DocumentoGenerado | null;
}

function isMermaid(doc: DocumentoGenerado | null): boolean {
  return !!doc && doc.tipo === 'mermaid';
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documento }) => {
  const [mermaidBlocks, setMermaidBlocks] = useState<MermaidBlock[]>([]);
  const mermaidRefs = useRef<{[id: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    // Detectar y renderizar bloques Mermaid en el documento seleccionado
    if (isMermaid(documento) && typeof documento.contenido === 'string') {
      setMermaidBlocks([{ id: 'mermaid-block-0', code: documento.contenido }]);
    } else if (typeof documento?.contenido === 'string') {
      const regex = /```mermaid\n([\s\S]*?)```/g;
      let match;
      const blocks: MermaidBlock[] = [];
      let i = 0;
      while ((match = regex.exec(documento.contenido)) !== null) {
        blocks.push({ id: `mermaid-block-${i++}`, code: match[1] });
      }
      setMermaidBlocks(blocks);
    } else {
      setMermaidBlocks([]);
    }
  }, [documento]);

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

  const handleDownload = async () => {
    if (!documento) return;
    const { default: saveAs } = await import("file-saver");
    const { contenido, nombre, tipo } = documento;
    if (typeof contenido === "string") {
      let mime = "text/plain;charset=utf-8";
      if (tipo === 'markdown') mime = "text/markdown";
      if (tipo === 'word') mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (tipo === 'pdf') mime = "application/pdf";
      if (tipo === 'html') mime = "text/html";
      if (tipo === 'mermaid') mime = "text/plain";
      saveAs(new Blob([contenido], { type: mime }), nombre);
    } else if (contenido instanceof Blob) {
      saveAs(contenido, nombre);
    } else {
      alert("El contenido de este tipo no se puede descargar.");
    }
  };

  // Renderizado según tipo de documento
  const renderPreview = () => {
    if (!documento) return null;
    if (documento.tipo === 'markdown') {
      return (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{documento.contenido as string}</ReactMarkdown>
        </div>
      );
    }
    if (isMermaid(documento) && mermaidBlocks.length > 0) {
      return mermaidBlocks.map(block => (
        <div key={block.id} ref={el => { mermaidRefs.current[block.id] = el; }} className="mermaid-diagram-container my-4" />
      ));
    }
    if (documento.tipo === 'word') {
      return (
        <div className="text-center text-lg text-blue-300 my-8">
          <span className="block mb-2">Este documento es de tipo <b>Word</b> (.docx).</span>
          <span className="block mb-2">Puedes descargarlo para abrirlo en Word o Google Docs.</span>
        </div>
      );
    }
    if (documento.tipo === 'pdf') {
      return (
        <div className="text-center text-lg text-red-300 my-8">
          <span className="block mb-2">Este documento es de tipo <b>PDF</b>.</span>
          <span className="block mb-2">Puedes descargarlo para abrirlo en tu lector de PDF favorito.</span>
        </div>
      );
    }
    if (documento.tipo === 'html') {
      return (
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: documento.contenido as string }} />
      );
    }
    // Fallback: texto plano
    return (
      <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
        {typeof documento.contenido === 'string' ? documento.contenido : 'No se puede previsualizar este contenido.'}
      </pre>
    );
  };

  if (!documento) {
    return null;
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold truncate">Vista Previa: {documento.nombre}</h2>
        <Button onClick={handleDownload}>
          Descargar
        </Button>
      </div>
      <div className="bg-background p-6 rounded-lg overflow-auto min-h-[200px]">
        {renderPreview()}
      </div>
    </Card>
  );
}; 