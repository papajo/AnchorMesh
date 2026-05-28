import React, { useState } from "react";
import { FileCode, Plus, Trash2, FolderCode, AlertTriangle, CheckCircle } from "lucide-react";
import { CodeFile, AnchorTag } from "../types";

interface ExplorerProps {
  files: CodeFile[];
  selectedFileName: string;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string, content: string, description: string) => void;
  onDeleteFile: (name: string) => void;
  tags: AnchorTag[];
}

export default function Explorer({
  files,
  selectedFileName,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  tags,
}: ExplorerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileDesc, setNewFileDesc] = useState("");
  const [newFileContent, setNewFileContent] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.endsWith(".ts") && !newFileName.endsWith(".js") && !newFileName.endsWith(".json")) {
      alert("File must end with .ts, .js, or .json extension");
      return;
    }
    if (files.some((f) => f.name.toLowerCase() === newFileName.toLowerCase())) {
      alert("A file with this name already exists.");
      return;
    }

    const baseContent = `// ${newFileName} - Simulated Service\n\n// Add code lines here...\n\nexport function run() {\n  console.log("Service starting...");\n}`;
    onCreateFile(newFileName, newFileContent || baseContent, newFileDesc || "User created simulated file module.");
    setNewFileName("");
    setNewFileDesc("");
    setNewFileContent("");
    setShowCreateModal(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-full shadow-lg" id="explorer-container">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <FolderCode className="w-5 h-5 text-indigo-400" />
          <h3 className="font-sans font-medium text-white tracking-wide text-sm uppercase">Simulated Codebase</h3>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs px-2.5 py-1.5 rounded-lg transition-transform hover:scale-102 active:scale-98 font-sans font-medium cursor-pointer"
          id="btn-new-file"
        >
          <Plus className="w-3.5 h-3.5" />
          New File
        </button>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {files.map((file) => {
          const fileTags = tags.filter((t) => t.file === file.name);
          const hasTags = fileTags.length > 0;
          const isSelected = selectedFileName === file.name;

          return (
            <div
              key={file.name}
              onClick={() => onSelectFile(file.name)}
              className={`group flex items-center justify-between p-3 rounded-xl transition-all border cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/10 border-indigo-500 text-white"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? "text-indigo-400" : "text-neutral-500 group-hover:text-neutral-300"}`} />
                <div className="text-left min-w-0">
                  <p className="font-mono text-sm truncate font-medium">{file.name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{file.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-1">
                {hasTags ? (
                  <span className="flex items-center gap-0.5 font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                    <CheckCircle className="w-2.5 h-2.5" />
                    {fileTags.length} tags
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-amber-950/40 text-amber-500 border border-amber-800/40">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    No tags
                  </span>
                )}

                {/* Don't allow deleting base configuration core files easily unless custom created */}
                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete ${file.name}?`)) {
                        onDeleteFile(file.name);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-opacity cursor-pointer duration-200"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Modal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreate}
            className="bg-neutral-900 border border-neutral-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4"
          >
            <div className="pb-2 border-b border-neutral-800">
              <h3 className="text-lg font-semibold text-white font-sans">Simulate New Code File</h3>
              <p className="text-xs text-neutral-400">Add custom microservice handlers or route modules.</p>
            </div>

            <div className="space-y-3 font-sans text-sm">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. users-model.ts"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Module Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Handles SQL queries parsing"
                  value={newFileDesc}
                  onChange={(e) => setNewFileDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Initial Code Body (Optional)</label>
                <textarea
                  rows={6}
                  placeholder="// Add custom template content..."
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
