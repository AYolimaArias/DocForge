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
    <div className="fixed top-0 left-0 h-full w-72 bg-background-secondary p-6 flex flex-col justify-between border-r border-border">
      <div>
        <h1 className="text-accent font-extrabold text-4xl tracking-tighter mb-8">
          docForge
        </h1>

        <Button
          onClick={onNuevoProyecto}
          icon="refresh"
          className="w-full mb-8"
        >
          Nuevo proyecto
        </Button>

        <div className="mb-8">
          <h2 className="text-xl mb-4 text-text">
            Documentos generados
          </h2>
          {documentos.length === 0 ? (
            <p className="text-text-secondary text-sm">
              Aún no has generado documentos.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {documentos.map((doc, index) => (
                <button
                  key={index}
                  className={`w-full text-left text-sm rounded-md py-2 px-3 transition-colors ${
                    docSeleccionado === doc 
                      ? 'bg-accent-light text-accent' 
                      : 'text-text hover:bg-white/10'
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
      <div className="mt-auto border-t border-border pt-4">
        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.avatar_url || ''}
              width={32}
              height={32}
              alt={user.name || 'Avatar de usuario'}
              className="rounded-full"
            />
            <div className="flex-1">
              <p className="text-text text-sm m-0">{user.name}</p>
            </div>
            <Form action="/logout" method="post">
              <Button size="sm">
                Salir
              </Button>
            </Form>
          </div>
        ) : (
          <Form action="/auth/github" method="post">
            <Button icon="github" className="w-full">
              Iniciar sesión con GitHub
            </Button>
          </Form>
        )}
      </div>
    </div>
  );
}; 