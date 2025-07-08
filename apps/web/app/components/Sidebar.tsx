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
    <div className="min-h-screen w-72 bg-[#181a20] p-6 flex flex-col justify-between">
      <div>
        <h1 className="text-white font-extrabold text-3xl tracking-tight mb-8">Codeable</h1>
        <Button
          onClick={onNuevoProyecto}
          icon="refresh"
          className="w-full mb-8 bg-accent text-white rounded-md py-2 font-semibold text-base hover:bg-blue-700 transition"
        >
          Nuevo proyecto
        </Button>
        <div className="mb-8">
          <h2 className="text-lg mb-4 text-white font-semibold">Documentos generados</h2>
          {documentos.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no has generado documentos.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documentos.map((doc) => (
                <button
                  key={doc.id}
                  className={`w-full text-left text-sm rounded-md py-2 px-3 transition-colors ${
                    docSeleccionado === doc 
                      ? 'bg-accent text-white font-bold' 
                      : 'text-white hover:bg-[#23262f]'
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
      <div className="mt-auto border-t border-[#23262f] pt-4">
        {user ? (
          <div className="flex items-center gap-3">
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