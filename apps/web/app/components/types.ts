export type DocumentoGenerado = {
  id: string;
  tipo: "markdown" | "html" | "word" | "pdf";
  nombre: string;
  contenido: string | Blob;
  fecha: Date;
};

export type User = {
  name?: string | null;
  avatar_url?: string | null;
  id?: string | null;
};

export type Session = {
  user?: User | null;
} | null;

export type FileNode = {
  label: string;
  value: string;
  children: FileNode[] | null;
};

export type MermaidBlock = {
  id: string;
  code: string;
}; 