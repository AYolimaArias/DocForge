import React from 'react';
import { Form } from '@remix-run/react';
import { Button } from './ui/Button';
import { DocumentoGenerado, User } from './types';

interface SidebarProps {
  user: User | null;
  documentos: DocumentoGenerado[];
  docSeleccionado: DocumentoGenerado | null;
  onNuevoProyecto: () => void;
  onDocumentoSelect: (doc: DocumentoGenerado) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  documentos,
  docSeleccionado,
  onNuevoProyecto,
  onDocumentoSelect,
}) => {
  return (
    <div className="min-h-screen w-72 bg-[#181a20] p-6 flex flex-col justify-between items-center">
      <div className="w-full flex flex-col items-center">
        {/* Logo */}
        <h1 className="text-white font-extrabold text-3xl tracking-tight mb-8 w-full text-left">Codeable</h1>
        {/* Botón nuevo proyecto */}
        <Button
          onClick={onNuevoProyecto}
          icon="refresh"
          className="w-full mb-8 bg-gray-200 text-gray-800 rounded-xl py-3 font-semibold text-base hover:bg-gray-300 transition border-0"
        >
          Nuevo Proyecto
        </Button>
        {/* Historial */}
        <div className="w-full">
          <h2 className="text-xs font-bold text-gray-300 uppercase mb-3 tracking-widest">Historial</h2>
          {documentos.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no has generado documentos.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {documentos.map((doc) => (
                <button
                  key={doc.id}
                  className={`w-full rounded-xl bg-gray-200 text-gray-800 py-3 px-4 text-base font-medium text-center transition-colors ${
                    docSeleccionado === doc
                      ? 'ring-2 ring-accent font-bold' : 'hover:bg-gray-300'
                  }`}
                  onClick={() => onDocumentoSelect(doc)}
                >
                  {doc.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Panel de inicio de sesión en la parte inferior */}
      <div className="mt-auto w-full pt-4 flex flex-col items-center">
        {user ? (
          <div className="flex items-center gap-3 w-full">
            <img
              src={user.avatar_url || ''}
              width={32}
              height={32}
              alt={user.name || 'Avatar de usuario'}
              className="rounded-full border border-[#23262f]"
            />
            <div className="flex-1">
              <p className="text-white text-sm m-0 font-semibold">{user.name}</p>
            </div>
            <Form action="/logout" method="post">
              <Button size="sm" className="bg-[#23262f] text-white border border-[#23262f] hover:bg-[#313442]">Salir</Button>
            </Form>
          </div>
        ) : (
          <Form action="/auth/github" method="post">
            <Button icon="github" className="w-full bg-accent text-white">Iniciar sesión con GitHub</Button>
          </Form>
        )}
      </div>
    </div>
  );
} 