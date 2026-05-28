import React, { useState, useEffect } from "react";
import { Edit2, Save, Sparkles, Tag, Plus, Check } from "lucide-react";
import { CodeFile, AnchorTag, AnchorTagType } from "../types";

interface EditorProps {
  file: CodeFile;
  onUpdateContent: (fileName: string, newContent: string) => void;
  onAddTag: (tag: AnchorTag) => void;
  tags: AnchorTag[];
}

export default function Editor({ file, onUpdateContent, onAddTag, tags }: EditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [codeValue, setCodeValue] = useState(file.content);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  
  // Tag insertion states
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTagId, setNewTagId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<AnchorTagType>(AnchorTagType.SECURITY_CHECK);
  const [newTagSeverity, setNewTagSeverity] = useState<"low" | "medium" | "high">("medium");
  const [newTagPurpose, setNewTagPurpose] = useState("");

  useEffect(() => {
    setCodeValue(file.content);
    setEditMode(false);
    setSelectedLine(null);
    setShowTagForm(false);
  }, [file]);

  const handleSave = () => {
    onUpdateContent(file.name, codeValue);
    setEditMode(false);
  };

  const handleLineClick = (idx: number) => {
    setSelectedLine(idx);
    
    // Auto generate a candidate ID based on filename prefix and timestamp or count
    const prefix = file.name.substring(0, 4).toUpperCase().replace(/[-.]/g, "");
    const count = tags.filter(t => t.file === file.name).length + 1;
    setNewTagId(`${prefix}-0${count}`);
    setNewTagName("");
    setNewTagPurpose("");
    setShowTagForm(true);
  };

  const submitTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagId.trim() || !newTagName.trim()) {
      alert("Tag ID and Name are required.");
      return;
    }

    if (tags.some(t => t.id.toUpperCase() === newTagId.toUpperCase())) {
      alert(`An anchor tag with ID '${newTagId}' already exists in the manifest.`);
      return;
    }

    // 1. Insert comment strings into the actual code content at the selected line
    const lines = codeValue.split("\n");
    const insertIndex = selectedLine !== null ? selectedLine : 0;
    
    const commentLines = [
      `// @anchor[${newTagId.toUpperCase()}]: ${newTagName}`,
      `// Severity: ${newTagSeverity} | Purpose: ${newTagPurpose || "Unspecified behavior verification point"}`
    ];

    lines.splice(insertIndex, 0, ...commentLines);
    const updatedCode = lines.join("\n");
    setCodeValue(updatedCode);
    onUpdateContent(file.name, updatedCode);

    // 2. Register tag in the Central Ledger (State)
    const newTag: AnchorTag = {
      id: newTagId.toUpperCase(),
      name: newTagName,
      type: newTagType,
      file: file.name,
      purpose: newTagPurpose || "Verify anchor consistency",
      severity: newTagSeverity,
      createdBy: "joshipv2@gmail.com",
      createdAt: new Date().toISOString(),
    };

    onAddTag(newTag);
    setShowTagForm(false);
    setSelectedLine(null);
  };

  const lines = codeValue.split("\n");

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col h-full shadow-2xl relative" id="editor-container">
      {/* Editor Header Bar */}
      <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span>
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span>
          </div>
          <span className="text-neutral-500 text-xs font-mono">VSCode-Web:</span>
          <span className="font-mono text-xs font-bold text-neutral-200 bg-neutral-950/70 py-1 px-2.5 rounded-md border border-neutral-800">{file.name}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {editMode ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium font-sans cursor-pointer"
              id="btn-save"
            >
              <Save className="w-3.5 h-3.5" />
              Save Code
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium font-sans cursor-pointer"
              id="btn-edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Manually
            </button>
          )}
        </div>
      </div>

      {/* Editor Code Container */}
      <div className="flex-1 flex overflow-hidden text-left relative font-mono text-sm leading-relaxed">
        {editMode ? (
          <textarea
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            className="w-full h-full bg-neutral-950 text-indigo-200 p-4 font-mono text-xs focus:ring-0 focus:outline-none resize-none overflow-y-auto selection:bg-indigo-900/40"
            style={{ tabSize: 2 }}
          />
        ) : (
          <div className="flex-1 flex overflow-y-auto w-full">
            {/* GTM-inspired Line numbers with tag insertion capabilities */}
            <div className="bg-neutral-900 text-neutral-600 select-none text-right px-3 py-4 space-y-0.5 text-xs shrink-0 select-none border-r border-neutral-900">
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                // Check if this line is an anchor comment line
                const isAnchorLine = lines[idx].trim().startsWith("// @anchor[");
                return (
                  <button
                    key={idx}
                    onClick={() => handleLineClick(idx)}
                    className={`block w-full text-right font-mono transition-all pr-1 hover:text-indigo-400 group relative cursor-pointer ${
                      isAnchorLine ? "text-indigo-400 font-bold bg-indigo-950/20" : "text-neutral-500"
                    }`}
                    title="Click to place dynamic code Anchor Tag here"
                  >
                    <span className="hidden group-hover:inline-block absolute left-0 text-indigo-400 text-[9px] -translate-x-2 font-sans font-bold">
                      TAG
                    </span>
                    {lineNum}
                  </button>
                );
              })}
            </div>

            {/* Read-only highlighted code display with clickable hover triggers */}
            <div className="flex-1 p-4 overflow-x-auto overflow-y-auto text-xs space-y-0.5 text-neutral-300 select-text">
              {lines.map((line, idx) => {
                const isAnchorLine = line.trim().startsWith("// @anchor");
                const isMetaLine = line.trim().startsWith("// Severity:") || line.trim().startsWith("// FIXME:") || line.trim().startsWith("// TODO:");
                const isImport = line.trim().startsWith("import ");
                const isExport = line.trim().startsWith("export ");
                
                let lineStyle = "text-neutral-300";
                if (isAnchorLine) {
                  lineStyle = "text-indigo-400 font-medium bg-indigo-950/30 border-l-2 border-indigo-500 px-1 py-0.5";
                } else if (isMetaLine) {
                  lineStyle = "text-neutral-500 italic bg-neutral-900/30 px-1";
                } else if (isImport) {
                  lineStyle = "text-pink-400";
                } else if (isExport) {
                  lineStyle = "text-blue-400";
                }

                return (
                  <div key={idx} className={`font-mono whitespace-pre hover:bg-neutral-900/35 px-1 rounded transition-colors ${lineStyle}`}>
                    {line || " "}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Informational overlay hint showing users how they can interact */}
        {!editMode && (
          <div className="absolute bottom-3 left-4 right-4 bg-neutral-900/95 border border-neutral-800 rounded-xl px-3 py-2.5 flex items-center justify-between text-[11px] text-neutral-400 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Click on any <strong className="text-white">line number</strong> to inject a GTM-like Code Anchor Tag dynamically.</span>
            </div>
            <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 font-mono">GTM Mode</span>
          </div>
        )}
      </div>

      {/* Floating Modal Tag Insertion Form */}
      {showTagForm && selectedLine !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={submitTag}
            className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 font-sans text-sm"
          >
            <div className="pb-2 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4.5 h-4.5 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">Embed Code Anchor (GTM style)</h4>
              </div>
              <span className="text-xs bg-neutral-800 text-neutral-400 font-mono px-2 py-0.5 rounded">
                Line {selectedLine + 1}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Unique Anchor ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AUTH-03"
                    value={newTagId}
                    onChange={(e) => setNewTagId(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-mono uppercase focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Anchor Category</label>
                  <select
                    value={newTagType}
                    onChange={(e) => setNewTagType(e.target.value as AnchorTagType)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-white font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(AnchorTagType).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">Descriptive Tag Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Token decryption key lock validation"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Impact Level</label>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map((sev) => {
                      const isSelected = newTagSeverity === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setNewTagSeverity(sev as any)}
                          className={`flex-1 py-1.5 rounded-lg border text-[10px] uppercase font-bold transition-all cursor-pointer ${
                            isSelected
                              ? sev === "high"
                                ? "bg-red-950 text-red-400 border-red-700"
                                : sev === "medium"
                                ? "bg-amber-950 text-amber-500 border-amber-800"
                                : "bg-blue-950 text-blue-400 border-blue-700"
                              : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                          }`}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-neutral-300 mb-1">Associated File</label>
                  <input
                    type="text"
                    disabled
                    value={file.name}
                    className="w-full bg-neutral-950 border border-neutral-800 cursor-not-allowed rounded-lg p-2 text-neutral-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-300 mb-1">Behavioral Purpose / Code Context</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe expected execution behaviors, trigger patterns, or downstream risks..."
                  value={newTagPurpose}
                  onChange={(e) => setNewTagPurpose(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setShowTagForm(false);
                  setSelectedLine(null);
                }}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Embed Annotation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
