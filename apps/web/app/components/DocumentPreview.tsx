import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DocumentoGenerado, MermaidBlock } from './types';

interface DocumentPreviewProps {
  documento: DocumentoGenerado | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documento }) => {
  const [mermaidBlocks, setMermaidBlocks] = useState<MermaidBlock[]>([]);
  const mermaidRefs = useRef<{[id: string]: HTMLDivElement | null}>({});

  useEffect(() => {
    // Detectar y renderizar bloques Mermaid en el documento seleccionado
    const content = documento?.contenido;
    if (typeof content === 'string') {
      const regex = /```mermaid\n([\s\S]*?)```/g;
      let match;
      const blocks: MermaidBlock[] = [];
      let i = 0;
      while ((match = regex.exec(content)) !== null) {
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
    const { contenido, nombre } = documento;

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
  const renderContentWithMermaid = (content: string) => {
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
  };

  if (!documento) {
    return null;
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Vista Previa: {documento.nombre}</h2>
        <Button onClick={handleDownload}>
          Descargar
        </Button>
      </div>
      <div className="bg-background p-6 rounded-lg overflow-auto prose prose-invert max-w-none">
        {typeof documento.contenido === 'string' 
          ? renderContentWithMermaid(documento.contenido) 
          : <p className="text-muted-foreground">Contenido no textual no puede ser previsualizado.</p>
        }
      </div>
    </Card>
  );
}; 