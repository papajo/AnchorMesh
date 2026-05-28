import React, { useState, useRef } from "react";
import { 
  FileCode, 
  Plus, 
  Trash2, 
  FolderCode, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  Github, 
  Sparkles, 
  RefreshCw, 
  FolderOpen,
  ArrowRight,
  Database
} from "lucide-react";
import { CodeFile, AnchorTag, AnchorTagType } from "../types";

interface ExplorerProps {
  files: CodeFile[];
  selectedFileName: string;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string, content: string, description: string) => void;
  onDeleteFile: (name: string) => void;
  onIngestCodebase: (files: CodeFile[], tags: AnchorTag[]) => void;
  tags: AnchorTag[];
}

export default function Explorer({
  files,
  selectedFileName,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onIngestCodebase,
  tags,
}: ExplorerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // File Creation States
  const [newFileName, setNewFileName] = useState("");
  const [newFileDesc, setNewFileDesc] = useState("");
  const [newFileContent, setNewFileContent] = useState("");

  // Ingest/Scan States
  const [githubUrl, setGithubUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.endsWith(".ts") && !newFileName.endsWith(".js") && !newFileName.endsWith(".json") && !newFileName.endsWith(".py") && !newFileName.endsWith(".go")) {
      alert("File must end with coding extensions (e.g. .ts, .js, .json, .py, .go)");
      return;
    }
    if (files.some((f) => f.name.toLowerCase() === newFileName.toLowerCase())) {
      alert("A file with this name already exists.");
      return;
    }

    const baseContent = `// ${newFileName} - Ingested Module\n\nexport function run() {\n  console.log("Starting task flow...");\n}`;
    onCreateFile(newFileName, newFileContent || baseContent, newFileDesc || "Manual simulated module.");
    setNewFileName("");
    setNewFileDesc("");
    setNewFileContent("");
    setShowCreateModal(false);
  };

  // 1. Point My Local Folder (Recursive Webkit directory scanner)
  const handleDirectoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setUploadProgress("Analyzing local project files...");
    const filesArray = Array.from(uploadedFiles) as any[];
    
    // Filter down to valid code text files
    const validSourceFiles = filesArray.filter((file) => {
      const path = file.webkitRelativePath || file.name;
      // Skip binary, assets, metadata, vendor files
      return (
        !path.includes("node_modules/") &&
        !path.includes(".git/") &&
        !path.includes("dist/") &&
        !path.includes("build/") &&
        !path.includes(".next/") &&
        !path.includes(".DS_Store") &&
        !path.includes("package-lock.json") &&
        !path.includes(".png") &&
        !path.includes(".jpg") &&
        !path.includes(".ico") &&
        !path.includes(".svg") &&
        (path.endsWith(".ts") ||
          path.endsWith(".tsx") ||
          path.endsWith(".js") ||
          path.endsWith(".jsx") ||
          path.endsWith(".py") ||
          path.endsWith(".go") ||
          path.endsWith(".rs") ||
          path.endsWith(".json") ||
          path.endsWith(".yaml") ||
          path.endsWith(".yml") ||
          path.endsWith(".md"))
      );
    });

    if (validSourceFiles.length === 0) {
      alert("No readable codebase text files found in the selected folder. Ensure your directory has source files (.ts, .jsx, .py, etc.)");
      setUploadProgress("");
      return;
    }

    setUploadProgress(`Loading ${validSourceFiles.length} source file modules...`);
    const loadedCodeFiles: CodeFile[] = [];
    let processedCount = 0;

    validSourceFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        loadedCodeFiles.push({
          name: file.name,
          language: file.name.split(".").pop() || "typescript",
          description: `Ingested local module: ${file.webkitRelativePath || file.name}`,
          content: textContent,
        });

        processedCount++;
        if (processedCount === validSourceFiles.length) {
          // Finish and trigger ingest
          onIngestCodebase(loadedCodeFiles, []);
          setUploadProgress("");
          setShowImportModal(false);
          alert(`Successfully ingested project directory! Imported ${loadedCodeFiles.length} file modules entirely in-browser.`);
        }
      };
      reader.onerror = () => {
        processedCount++;
      };
      reader.readAsText(file);
    });
  };

  // 2. Point GitHub Link (Crawls directories using public Raw & endpoints)
  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) return;

    setIsFetchingUrl(true);
    setUploadProgress("Extracting repo credentials...");

    try {
      // Regex parse github ownership structures
      const regex = /github\.com\/([^\/]+)\/([^\/]+)/i;
      const match = githubUrl.match(regex);
      if (!match) {
        throw new Error("Invalid GitHub address. Please enter a valid path, e.g., https://github.com/expressjs/express");
      }

      const owner = match[1];
      const repo = match[2].replace(/\.git$/i, "");
      
      setUploadProgress(`Querying structure of ${owner}/${repo}...`);
      
      // Let's attempt to fetch from default branch using Git Tree REST endpoint
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
      let data = await response.json();
      
      if (!response.ok) {
        // Fallback to "master" branch if main is missing
        const fallbackRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`);
        data = await fallbackRes.json();
        if (!fallbackRes.ok) {
          throw new Error(`GitHub registry returned: ${data.message || "Failed to download tree registry."}`);
        }
      }

      const tree = data.tree;
      if (!tree || !Array.isArray(tree)) {
        throw new Error("Empty or inaccessible repo codebase registry mapping.");
      }

      // Filter and limit to max 12 source files to prevent timeouts
      const sourceEntries = tree.filter((entry: any) => {
        const path = entry.path;
        return (
          entry.type === "blob" &&
          !path.includes("node_modules/") &&
          !path.includes(".git/") &&
          !path.includes("dist/") &&
          !path.includes("build/") &&
          !path.includes(".DS_Store") &&
          (path.endsWith(".ts") ||
            path.endsWith(".tsx") ||
            path.endsWith(".js") ||
            path.endsWith(".jsx") ||
            path.endsWith(".py") ||
            path.endsWith(".json") ||
            path.endsWith(".go"))
        );
      }).slice(0, 12); // Grab up to 12 modules for optimal UX scanning

      if (sourceEntries.length === 0) {
        throw new Error("No readable coding files found in root segments of repo branch.");
      }

      setUploadProgress(`Found ${sourceEntries.length} modules. Ingesting content...`);
      
      const loadedFiles: CodeFile[] = [];
      const branchName = githubUrl.includes("/tree/") ? githubUrl.split("/tree/")[1].split("/")[0] : (data.url.includes("/main/") ? "main" : "master");

      for (let i = 0; i < sourceEntries.length; i++) {
        const fileEntry = sourceEntries[i];
        setUploadProgress(`Ingesting [${i + 1}/${sourceEntries.length}] ${fileEntry.path}...`);
        
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchName}/${fileEntry.path}`;
          const rawRes = await fetch(rawUrl);
          if (rawRes.ok) {
            const rawContent = await rawRes.text();
            loadedFiles.push({
              name: fileEntry.path.split("/").pop() || fileEntry.path,
              language: fileEntry.path.split(".").pop() || "typescript",
              description: `Git Rep Ingested: ${fileEntry.path}`,
              content: rawContent
            });
          }
        } catch (e) {
          console.error("Failed to grab raw content of file: " + fileEntry.path);
        }
      }

      onIngestCodebase(loadedFiles, []);
      alert(`Import completed! Loaded ${loadedFiles.length} files from repository branch.`);
      setShowImportModal(false);

    } catch (e: any) {
      alert(`GitHub import: ${e.message || "Unknown retrieval error"}. Try pasting the source text fields as individual files.`);
    } finally {
      setIsFetchingUrl(false);
      setUploadProgress("");
    }
  };

  // 3. AI Autocomplete Mesh Engine (Spins up Gemini on backend routes to map comments!)
  const handleAutoMeshScan = async () => {
    if (files.length === 0) {
      alert("No active codebase files available for scanning. Ingest files first!");
      return;
    }

    setIsScanning(true);
    setUploadProgress("AI Model scanning file nodes...");

    try {
      const response = await fetch("/api/auto-generate-anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files })
      });

      if (!response.ok) {
        throw new Error("Scanning service failed with status code: " + response.status);
      }

      const resData = await response.json();
      if (resData.success) {
        onIngestCodebase(resData.files, resData.anchors);
        alert(`Mesh completed! Added ${resData.anchors.length} contextual anchor points. Your files have been automatically annotated!`);
        setShowImportModal(false);
      } else {
        throw new Error(resData.error || "Generation mismatch.");
      }
    } catch (err: any) {
      alert(`Scanning pipeline failed: ${err.message}.`);
    } finally {
      setIsScanning(false);
      setUploadProgress("");
    }
  };

  const triggerLocalDirectoryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-full shadow-lg" id="explorer-container">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <FolderCode className="w-5 h-5 text-indigo-400" />
          <h3 className="font-sans font-medium text-white tracking-wide text-sm uppercase">Active Workspace</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-2.5 py-1.5 rounded-lg transition-transform hover:scale-102 active:scale-98 font-sans font-bold cursor-pointer border border-neutral-700"
            id="btn-import-source"
            title="Ingest local codebase directory or GitHub project"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            Connect Repo
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs px-2.5 py-1.5 rounded-lg transition-transform hover:scale-102 active:scale-98 font-sans font-medium cursor-pointer"
            id="btn-new-file"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden Webkit Directory Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDirectoryUpload}
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        id="directory-upload-input"
      />

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

      {/* Codebase Connection Ingest Hub Drawer Model */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0b0c0d] border border-neutral-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-sans uppercase tracking-wide">Connect Ingest Workspace</h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1">Connect your active programming workspace recursively. Generates deterministic AI mesh metadata in seconds.</p>
            </div>

            {/* Ingestion Hub Options */}
            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              
              {/* Option A: Directory Picker */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-950 text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs">1</div>
                    <h4 className="text-white text-sm font-semibold">Point Local Folder Directory</h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 rounded-full border border-emerald-800/20">Client-Safe</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Scans directories locally in sandboxed iframe contexts. No server uploads of raw code occur; files load directly into virtual memory.
                </p>
                <button
                  type="button"
                  onClick={triggerLocalDirectoryClick}
                  disabled={isFetchingUrl || isScanning}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <FolderOpen className="w-4 h-4" />
                  Select Local Folder Directory
                </button>
              </div>

              {/* Option B: GitHub Branch Tree Fetcher */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-950 text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs">2</div>
                    <h4 className="text-white text-sm font-semibold">Fetch Public GitHub Repo</h4>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/20 px-2 rounded-full border border-indigo-800/20 animate-pulse">Live API</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Provide a public git repository branch path. The parser compiles raw code blocks into virtual models dynamically.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://github.com/expressjs/express"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    disabled={isFetchingUrl || isScanning}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGitHubImport}
                    disabled={isFetchingUrl || isScanning || !githubUrl.trim()}
                    className="bg-neutral-800 hover:bg-neutral-700 text-indigo-300 text-xs px-4 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer border border-neutral-700"
                  >
                    Fetch
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option C: AI Anchor Auto-Mesh */}
              <div className="bg-indigo-950/10 border border-indigo-900/35 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 blur-2xl rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-white text-sm font-semibold">Gemini Code Auto-Mesh Scanner</h4>
                </div>
                <p className="text-[11px] text-indigo-200 leading-relaxed">
                  Automatically parse your compiled codebase folder arrays. The model detects critical logical pivot checkpoints, dynamically inserts <code className="bg-neutral-950 text-white font-mono px-1 py-0.5 rounded border border-neutral-800">@anchor[...]</code> comments on target code lines, and adds them to your register manifest.
                </p>
                <button
                  type="button"
                  onClick={handleAutoMeshScan}
                  disabled={isFetchingUrl || isScanning || files.length === 0}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-950 cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40"
                >
                  {isScanning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isScanning ? "Processing Mesh Annotations..." : "Auto-Generate Mesh & Inject Anchors"}
                </button>
              </div>

              {/* Loader Overlay */}
              {uploadProgress && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-xs text-neutral-300 font-mono font-medium">{uploadProgress}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-900/40 border-t border-neutral-800 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Connection Panel
              </button>
            </div>
          </div>
        </div>
      )}

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

