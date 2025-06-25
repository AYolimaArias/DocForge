import React from 'react';
import TreeView from 'react-treeview';
import { FiFolder } from 'react-icons/fi';
import { FileNode } from './types';

interface FileTreeProps {
  files: string[];
  selectedFiles: string[];
  onFileSelect: (file: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFiles,
  onFileSelect,
}) => {
  const buildTree = (files: string[]): FileNode[] => {
    const root: any = {};
    files.forEach(file => {
      const parts = file.split('/');
      let current = root;
      parts.forEach((part, i) => {
        if (!current[part]) current[part] = (i === parts.length - 1) ? null : {};
        current = current[part];
      });
    });

    function toTree(obj: any, prefix = ''): FileNode[] {
      return Object.entries(obj).map(([key, value]) => {
        const path = prefix ? `${prefix}/${key}` : key;
        if (value === null) {
          return { label: key, value: path, children: null };
        } else {
          return { label: key, value: path, children: toTree(value, path) };
        }
      });
    }
    return toTree(root);
  };

  const renderFileTreeWithFolderIcon = (node: FileNode) => {
    if (!node.children) {
      // Es un archivo
      return (
        <div key={node.value} className="ml-4">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFiles.includes(node.value)}
              onChange={() => onFileSelect(node.value)}
              className="mr-1.5 accent-accent"
            />
            <span className="text-sm">{node.label}</span>
          </label>
        </div>
      );
    } else {
      // Es una carpeta
      return (
        <TreeView 
          key={node.value} 
          nodeLabel={
            <span className="flex items-center gap-1.5">
              <FiFolder size={18} className="text-accent" /> 
              {node.label}
            </span>
          } 
          defaultCollapsed={false}
        >
          {node.children.map((child: FileNode) => renderFileTreeWithFolderIcon(child))}
        </TreeView>
      );
    }
  };

  const treeData = buildTree(files);

  return (
    <div className="panel bg-bg rounded-lg p-3 border border-border max-h-80 overflow-y-auto mb-0">
      {treeData.length > 0 ? (
        treeData.map((node, i) => renderFileTreeWithFolderIcon(node))
      ) : (
        <span className="text-[#b3b8c5]">No se encontraron archivos.</span>
      )}
    </div>
  );
}; 