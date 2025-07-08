import React from 'react';
import { Sidebar } from './Sidebar';
import { DocumentoGenerado, User } from './types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  documentos: DocumentoGenerado[];
  docSeleccionado: DocumentoGenerado | null;
  onNuevoProyecto: () => void;
  onDocumentoSelect: (doc: DocumentoGenerado) => void;
}

export const Layout = ({
  children,
  user,
  documentos,
  docSeleccionado,
  onNuevoProyecto,
  onDocumentoSelect,
}: LayoutProps) => (
  <div className="flex min-h-screen w-full">
    <Sidebar
      user={user}
      documentos={documentos}
      docSeleccionado={docSeleccionado}
      onNuevoProyecto={onNuevoProyecto}
      onDocumentoSelect={onDocumentoSelect}
    />
    <main className="flex-1 bg-[#f7f8fa]">
      {children}
    </main>
  </div>
); 