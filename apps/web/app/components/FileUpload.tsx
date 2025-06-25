import React, { useState } from 'react';
import { useFetcher } from '@remix-run/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { Loader } from './ui/Loader';
import { FileTree } from './FileTree';
import { User } from './types';

interface FileUploadProps {
  user: User | null;
  files: string[];
  extractPath: string;
  selectedFiles: string[];
  onFilesChange: (files: string[]) => void;
  onExtractPathChange: (path: string) => void;
  onSelectedFilesChange: (files: string[]) => void;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  user,
  files,
  extractPath,
  selectedFiles,
  onFilesChange,
  onExtractPathChange,
  onSelectedFilesChange,
  onError,
}) => {
  const uploadFetcher = useFetcher<{ files: string[], extractPath: string, error?: string }>();
  const reposFetcher = useFetcher<any[]>();
  const analyzeRepoFetcher = useFetcher<{ files: string[], extractPath: string, error?: string }>();
  
  const [zip, setZip] = useState<File | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repos, setRepos] = useState<any[]>([]);

  const isUploading = uploadFetcher.state !== 'idle';
  const isAnalyzingRepo = analyzeRepoFetcher.state !== 'idle';

  // Efectos para manejar las respuestas de los fetchers
  React.useEffect(() => {
    if (uploadFetcher.data && 'files' in uploadFetcher.data) {
      onFilesChange(uploadFetcher.data.files);
      onExtractPathChange(uploadFetcher.data.extractPath);
    }
    if (uploadFetcher.data && 'error' in uploadFetcher.data) {
      onError(uploadFetcher.data.error || "Error en la subida");
    }
  }, [uploadFetcher.data, onFilesChange, onExtractPathChange, onError]);

  React.useEffect(() => {
    if (reposFetcher.data) {
      setRepos(reposFetcher.data);
    }
  }, [reposFetcher.data]);

  React.useEffect(() => {
    if (analyzeRepoFetcher.data && 'files' in analyzeRepoFetcher.data) {
      onFilesChange(analyzeRepoFetcher.data.files);
      onExtractPathChange(analyzeRepoFetcher.data.extractPath);
    }
  }, [analyzeRepoFetcher.data, onFilesChange, onExtractPathChange]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setZip(file);
    
    if (file && e.currentTarget.form) {
      const formData = new FormData(e.currentTarget.form);
      uploadFetcher.submit(formData, { 
        method: "post", 
        action: "/api/upload", 
        encType: "multipart/form-data" 
      });
    }
  };

  const fetchRepos = () => {
    setShowRepoSelector(true);
    reposFetcher.load("/api/github-repos");
  };

  const handleRepoSelect = (repo: string) => {
    setSelectedRepo(repo);
    onError("");
    if (!repo) return;
    
    analyzeRepoFetcher.submit(
      { repo },
      { method: 'post', action: '/api/analyze-github-repo', encType: 'application/json' }
    );
  };

  const handleFileSelect = (file: string) => {
    onSelectedFilesChange(
      selectedFiles.includes(file) 
        ? selectedFiles.filter(f => f !== file) 
        : [...selectedFiles, file]
    );
  };

  return (
    <Card title="Sube tu proyecto" subtitle="(ZIP) o analiza un repositorio de GitHub">
      <uploadFetcher.Form method="post" action="/api/upload" encType="multipart/form-data" className="mb-5 flex gap-3 items-center">
        <input
          type="file"
          accept=".zip"
          id="file-upload"
          name="file"
          className="hidden"
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer">
          <Button icon="upload" variant="secondary">
            {zip ? zip.name : "Seleccionar archivo ZIP"}
          </Button>
        </label>
      </uploadFetcher.Form>

      {user && (
        <div className="mb-4">
          <Button icon="github" variant="secondary" onClick={fetchRepos}>
            Analizar repositorio de GitHub
          </Button>
        </div>
      )}

      {showRepoSelector && (
        <div className="panel bg-bg rounded-lg p-4.5 my-4">
          <div className="flex items-center gap-5">
            <label className="font-medium text-base">Selecciona un repositorio:</label>
            <select 
              value={selectedRepo} 
              onChange={e => handleRepoSelect(e.target.value)} 
              className="w-[340px] bg-bg text-text border border-border rounded-md p-2"
            >
              <option value="">-- Selecciona --</option>
              {Array.isArray(repos) && repos.map((repo: any) => (
                <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
            <Button 
              variant="outline" 
              onClick={() => setShowRepoSelector(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {uploadFetcher.data?.error && (
        <Alert type="error" message={uploadFetcher.data.error} />
      )}

      {(isUploading || isAnalyzingRepo) && <Loader />}

      {files.length > 0 && !isUploading && !isAnalyzingRepo && (
        <div className="mt-4.5">
          <h3 className="m-0 text-lg text-accent mb-4.5">Archivos extraídos:</h3>
          <FileTree 
            files={files}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
          />
          <small className="text-[#b3b8c5]">
            Selecciona archivos si quieres limitar la consulta. Si no seleccionas nada, la IA analizará todo el proyecto.
          </small>
        </div>
      )}
    </Card>
  );
}; 