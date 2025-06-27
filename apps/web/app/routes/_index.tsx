import React, { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "../services/auth.server";
import {
  Layout,
  Sidebar,
  FileUpload,
  AIInteraction,
  DocumentPreview,
  type DocumentoGenerado,
} from "../components";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request);
  if (!user) return redirect("/login");
  return json({ user });
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  if (!user) return null;
  
  // Estado local
  const [files, setFiles] = useState<string[]>([]);
  const [extractPath, setExtractPath] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoGenerado | null>(null);
  const [error, setError] = useState<string>("");

  const handleNuevoProyecto = () => {
    setFiles([]);
    setExtractPath("");
    setSelectedFiles([]);
    setError("");
    setDocumentos([]);
    setDocSeleccionado(null);
  };

  const handleDocumentoGenerado = (doc: DocumentoGenerado) => {
    setDocumentos(prev => {
      const nuevosDocs = [doc, ...prev];
      // Si es el primer documento o no hay ninguno seleccionado, seleccionarlo automáticamente
      if (nuevosDocs.length === 1 || !docSeleccionado) {
        setDocSeleccionado(doc);
      }
      return nuevosDocs;
    });
  };

  return (
    <Layout>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar
          user={user}
          documentos={documentos}
          docSeleccionado={docSeleccionado}
          onNuevoProyecto={handleNuevoProyecto}
          onDocumentoSelect={setDocSeleccionado}
        />

        {/* Contenido Principal */}
        <main className="flex-1 ml-72 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Panel 1: Carga de Proyecto */}
            <FileUpload
              user={user}
              files={files}
              extractPath={extractPath}
              selectedFiles={selectedFiles}
              onFilesChange={setFiles}
              onExtractPathChange={setExtractPath}
              onSelectedFilesChange={setSelectedFiles}
              onError={setError}
            />

            {/* Panel 2: Interacción con la IA */}
            <AIInteraction
              extractPath={extractPath}
              selectedFiles={selectedFiles}
              onDocumentoGenerado={handleDocumentoGenerado}
              onError={setError}
            />
            
            {/* Panel 3: Vista Previa */}
            <DocumentPreview documento={docSeleccionado} />

          </div>
        </main>
      </div>
    </Layout>
  );
}


// ... El resto de las funciones (handleUpload, handleAskIA, etc.) irán aquí ... 