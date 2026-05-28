import React, { useState } from "react";
import { Tag, Search, Filter, Trash2, Calendar, ShieldAlert, PlusCircle } from "lucide-react";
import { AnchorTag, AnchorTagType } from "../types";

interface ManifestLedgerProps {
  tags: AnchorTag[];
  onDeleteTag: (id: string) => void;
  onSelectFile: (name: string) => void;
  files: string[];
}

export default function ManifestLedger({ tags, onDeleteTag, onSelectFile, files }: ManifestLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");

  // Filtering logic
  const filteredTags = tags.filter((tag) => {
    const matchesSearch =
      tag.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.purpose.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "ALL" || tag.type === selectedType;
    const matchesSeverity = selectedSeverity === "ALL" || tag.severity === selectedSeverity;

    return matchesSearch && matchesType && matchesSeverity;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-full space-y-4 shadow-lg text-left" id="manifest-ledger-container">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h3 className="font-sans font-semibold text-white tracking-wide text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            CENTRAL LEDGER / MANIFEST
          </h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">The absolute source of truth container for anchor metadata registration.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-neutral-950 text-indigo-400 border border-neutral-800">
            Total Registrations: <strong className="text-white">{tags.length}</strong>
          </span>
        </div>
      </div>

      {/* GTM-Style Filter and Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            placeholder="Search tags, triggers, hashes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 pl-9 pr-3 py-2 rounded-lg text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="relative flex items-center">
          <Filter className="w-3 h-3 absolute left-3 text-neutral-500" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 pl-8 pr-2 py-2 rounded-lg text-[11px] text-neutral-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Classifications</option>
            {Object.values(AnchorTagType).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center">
          <Filter className="w-3 h-3 absolute left-3 text-neutral-500" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 pl-8 pr-2 py-2 rounded-lg text-[11px] text-neutral-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </div>
      </div>

      {/* Manifest Table */}
      <div className="flex-1 overflow-y-auto border border-neutral-850 rounded-lg bg-neutral-950">
        {filteredTags.length > 0 ? (
          <table className="w-full text-xs font-sans text-neutral-300 border-collapse table-auto">
            <thead>
              <tr className="bg-neutral-900 border-b border-neutral-850 text-neutral-400 font-medium">
                <th className="p-3 text-left font-mono">Anchor ID</th>
                <th className="p-3 text-left">Descriptive Label</th>
                <th className="p-3 text-left">Class Name</th>
                <th className="p-3 text-left">Target File</th>
                <th className="p-3 text-center">Impact</th>
                <th className="p-3 text-center">Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-neutral-900/60 transition-colors group">
                  <td className="p-3 font-mono font-bold text-indigo-400">
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => onSelectFile(tag.file)}
                      title={`Open tracking file: ${tag.file}`}
                    >
                      @{tag.id}
                    </span>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-white">{tag.name}</p>
                    <p className="text-[10px] text-neutral-500 truncate max-w-xs">{tag.purpose}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {tag.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-neutral-400">
                    <button 
                      onClick={() => onSelectFile(tag.file)}
                      className="hover:text-white underline cursor-pointer"
                    >
                      {tag.file}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                        tag.severity === "high"
                          ? "bg-red-950/40 text-red-400 border-red-900/30"
                          : tag.severity === "medium"
                          ? "bg-amber-950/40 text-amber-500 border-amber-900/30"
                          : "bg-blue-950/40 text-blue-400 border-blue-900/30"
                      }`}
                    >
                      {tag.severity}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`Do you want to de-register this tag '${tag.id}' from the manifest ledger? (Note: It must be cleaned up from the code manually as well).`)) {
                          onDeleteTag(tag.id);
                        }
                      }}
                      className="p-1 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer inline-block"
                      title="De-register Tag"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500 px-4">
            <ShieldAlert className="w-10 h-10 text-neutral-700 mb-2" />
            <p className="text-sm font-semibold">No registered anchor tags match filters.</p>
            <p className="text-[11px] text-neutral-600 mt-1 text-center">
              Try adjusting your query inputs, or click on a file line inside the editor to embed annotations.
            </p>
          </div>
        )}
      </div>

      {/* Methodology Rule Summary Card */}
      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-lg p-3 text-[11px] text-justify text-indigo-200">
        <p className="leading-relaxed">
          💡 <strong>Maintainability Insight:</strong> Keep anchor tags "boring" and standardized. Rather than introducing distinct tags for each line, recur on standard classifications (e.g. <code>Security Check</code>, <code>Database Query</code>) to let AI agents reliably map systemic dependencies during refactoring.
        </p>
      </div>
    </div>
  );
}
