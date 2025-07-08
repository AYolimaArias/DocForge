import React, { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "../services/auth.server";
import {
  Layout,
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
    <Layout
      user={user}
      documentos={documentos}
      docSeleccionado={docSeleccionado}
      onNuevoProyecto={handleNuevoProyecto}
      onDocumentoSelect={setDocSeleccionado}
    >
      <div className="w-full max-w-4xl mx-auto mt-24">
        <AIInteraction
          extractPath={extractPath}
          selectedFiles={selectedFiles}
          onDocumentoGenerado={handleDocumentoGenerado}
          onError={setError}
          userName={user.name || "Usuario"}
          files={files}
          onFilesChange={setFiles}
          onExtractPathChange={setExtractPath}
          onSelectedFilesChange={setSelectedFiles}
          user={user}
        />
        <DocumentPreview documento={docSeleccionado} />
      </div>
    </Layout>
  );
}


// ... El resto de las funciones (handleUpload, handleAskIA, etc.) irán aquí ... 