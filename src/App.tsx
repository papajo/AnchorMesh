import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  ShieldCheck,
  Zap,
  RefreshCw,
  Cpu,
  AlertTriangle,
  Play,
  Settings,
  HelpCircle,
  FileCode,
  Gauge,
  Variable,
  Layers,
  Terminal,
  Clock,
  Sparkles,
  Database,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FolderArchive
} from "lucide-react";
import JSZip from "jszip";

import { CodeFile, AnchorTag, AnchorTagType, TriggerRule, TagVariable } from "./types";
import { INITIAL_FILES, INITIAL_AN_TAGS, INITIAL_TRIGGERS, INITIAL_VARIABLES } from "./initialData";
import Explorer from "./components/Explorer";
import Editor from "./components/Editor";
import ManifestLedger from "./components/ManifestLedger";
import TriggersAndVariables from "./components/TriggersAndVariables";

export default function App() {
  // Core state arrays
  const [files, setFiles] = useState<CodeFile[]>(INITIAL_FILES);
  const [tags, setTags] = useState<AnchorTag[]>(INITIAL_AN_TAGS);
  const [triggers, setTriggers] = useState<TriggerRule[]>(INITIAL_TRIGGERS);
  const [variables, setVariables] = useState<TagVariable[]>(INITIAL_VARIABLES);

  // Active UI views
  const [selectedFileName, setSelectedFileName] = useState<string>("api-gateway.ts");
  const [activeTab, setActiveTab] = useState<"code" | "meta">("code"); // toggles details workspace pane
  const [panelTab, setPanelTab] = useState<"simulator" | "manifest" | "cursorrules" | "skills">("simulator");
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);
  const [copiedSkills, setCopiedSkills] = useState<boolean>(false);
  
  // Agent simulator state
  const [agentPrompt, setAgentPrompt] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResults, setSimResults] = useState<{
    naiveOutput: string;
    anchorOutput: string;
    naiveTokenCalc: number;
    anchorTokenCalc: number;
    relevantTags: string[];
    errorMessage?: string;
  } | null>(null);

  // Compile manifest metadata dynamically in standard schema
  const compiledManifestJson = useMemo(() => {
    return JSON.stringify({
      $schema: "https://anchormesh.io/schemas/v1/anchor-tag-manifest.json",
      version: "1.2.0",
      generatedAt: new Date().toISOString(),
      governance: {
        enforceStrictCompliance: variables.find(v => v.id === "VAR-02")?.value === "true",
        permittedPrefixes: variables.find(v => v.id === "VAR-03")?.value?.split(",").map(p => p.trim()) || []
      },
      anchors: tags,
      triggers: triggers,
      variables: variables
    }, null, 2);
  }, [tags, triggers, variables]);

  const handleDownloadManifestFile = () => {
    const blob = new Blob([compiledManifestJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anchor-tag-manifest.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyManifestToClipboard = () => {
    navigator.clipboard.writeText(compiledManifestJson);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  // Compile highly-optimized .cursorrules text based on live register anchors
  const compiledCursorRulesText = useMemo(() => {
    return `# AnchorMesh Governance Configuration for Cursor IDE & AI Agents
# Generated: ${new Date().toISOString()}

You are an expert AI software agent integrated with AnchorMesh registry mapping.
By loading this instructions map, you gain deterministic coordinates to target edits with 0% token waste.

## Active Code Anchors Registry
${tags.length > 0 
  ? tags.map(t => `- **@anchor[${t.id}]** in file \`${t.file}\` (${t.type}): ${t.purpose}`).join("\n")
  : "- No active code anchors are currently registered in this workspace."
}

## Agent Directives & Enforcement
1. **Targeted Retrieval Checkpoints**: Before executing edits on features associated with the anchors listed above, you MUST locate that specific \`@anchor[ID]\` comment line to inspect the surrounding context block.
2. **Comment Preservation**: Do NOT modify, delete, or obstruct any existing \`@anchor[...]\` annotations in comments. Doing so damages synchronization with our central environment manifest.
3. **Registry Compliance**: Keep your action plans strictly centered within the anchoring coordinates to avoid sprawling codebase token consumption.
4. If asked to modify gateways, write matching annotations and log them in \`anchor-tag-manifest.json\` schema.`;
  }, [tags]);

  const handleCopyCursorRules = () => {
    navigator.clipboard.writeText(compiledCursorRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleDownloadCursorRules = () => {
    const blob = new Blob([compiledCursorRulesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ".cursorrules";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Compile Claude Projects/Custom Prompt Skill Instruction manual mapping
  const compiledClaudeSkillsText = useMemo(() => {
    return `# Dynamic Codebase Ingestion Manual: Claude Project Custom Skills
# Generated: ${new Date().toISOString()}

Add this markdown manual to your Claude Project Custom Instructions or Project Knowledge files to enable deterministic skill actions.

---

## 🛠️ INGESTION LAYER SKILLS: deterministically query code anchor-mesh

You are equipped with the AnchorMesh map of this repository. When asked to audit, secure, or refactor, skip blind file searches. Route focus directly to these coordinates:

${tags.length > 0
  ? tags.map(t => `### Skill Action: Operate on ${t.name} (Code Anchor: @anchor[${t.id}])
- **Associated File Location**: \`${t.file}\`
- **Functional Target Purpose**: ${t.purpose} (Category: \`${t.type}\`)
- **Severity Classification**: \`${t.severity.toUpperCase()}\`
- **Execution Recipe**: Open the associated file \`${t.file}\`, find the comment \`@anchor[${t.id}]\`, inspect the target block, and complete edits there.
`).join("\n")
  : "### [Warning] No Active Anchors Configured in Workspace!\nMap anchors in the AnchorMesh interface first to register skills."
}

## ⚖️ Governance Policy
- Do not touch, comment out, or alter comment anchor structures. Keep code, manifest records, and instructions perfectly locked.`;
  }, [tags]);

  const handleCopyClaudeSkills = () => {
    navigator.clipboard.writeText(compiledClaudeSkillsText);
    setCopiedSkills(true);
    setTimeout(() => setCopiedSkills(false), 2000);
  };

  const handleDownloadClaudeSkills = () => {
    const blob = new Blob([compiledClaudeSkillsText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "anchormesh-claude-skills.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Client-side ZIP packager of the fully annotated codebase
  const handleDownloadAnnotatedCodebaseZip = async () => {
    try {
      const zip = new JSZip();
      
      // Pack codebase files
      files.forEach((f) => {
        zip.file(f.name, f.content);
      });
      
      // Pack metadata files
      zip.file("anchor-tag-manifest.json", compiledManifestJson);
      zip.file(".cursorrules", compiledCursorRulesText);
      zip.file("claude-project-instructions.md", compiledClaudeSkillsText);
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anchormesh-annotated-project-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("ZIP Packer failed to compile folder: " + err.message);
    }
  };

  // Active interactive selections
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Current active file object helper
  const selectedFile = useMemo(() => {
    return files.find((f) => f.name === selectedFileName) || files[0];
  }, [files, selectedFileName]);

  // -------------------------------------------------------------
  // Real-time Policy Validation Engine (Static Code Scanner)
  // Ensures policy enforcement, tag density check, and manifest drift.
  // -------------------------------------------------------------
  const validationAlerts = useMemo(() => {
    const alerts: { id: string; type: "DENSITY" | "DRIFT_ORPHAN" | "DRIFT_UNREGISTERED" | "PREFIX_ERR"; severity: "warning" | "critical"; message: string }[] = [];

    // 1. Tag Density Enforcement
    // Check if configuration variable limits are present
    const maxDensityVar = variables.find(v => v.id === "VAR-02");
    const isStrict = maxDensityVar ? maxDensityVar.value === "true" : true;
    const densityThreshold = 3; // Trigger warning at 3+ tags per file to keep code "un-cluttered"

    files.forEach(file => {
      // Find comment-based anchors in source text
      const anchorsInCode = (file.content.match(/@anchor\[[A-Za-z0-9-_]+\]/g) || []);
      if (anchorsInCode.length > densityThreshold) {
        alerts.push({
          id: `DENSITY-${file.name}`,
          type: "DENSITY",
          severity: isStrict ? "critical" : "warning",
          message: `File "${file.name}" exceeds tag density limit. Found ${anchorsInCode.length} embedded anchors (Threshold: max ${densityThreshold} for optimal readability).`
        });
      }
    });

    // 2. Unregistered Anchors (In code comments but missing in manifest ledger)
    files.forEach(file => {
      const tagRegex = /@anchor\[([A-Za-z0-9-_]+)\]/g;
      let match;
      while ((match = tagRegex.exec(file.content)) !== null) {
        const tagId = match[1];
        const registered = tags.some(t => t.id.toLowerCase() === tagId.toLowerCase());
        if (!registered) {
          alerts.push({
            id: `UNREG-${tagId}`,
            type: "DRIFT_UNREGISTERED",
            severity: "critical",
            message: `Desynchronization: Anchor "@anchor[${tagId}]" is in code of "${file.name}" but has not been registered in the Central Ledger manifest.`
          });
        }
      }
    });

    // 3. Orphaned Anchors (Registered in manifest ledger but actual comment was deleted/omitted in file)
    tags.forEach(tag => {
      const file = files.find(f => f.name === tag.file);
      if (!file) {
        alerts.push({
          id: `ORPHAN-${tag.id}`,
          type: "DRIFT_ORPHAN",
          severity: "warning",
          message: `Orphaned Tag: Register "${tag.id}" references file "${tag.file}" which is missing from the directory.`
        });
      } else {
        const identifierRegex = new RegExp(`@anchor\\[${tag.id}\\]`, "i");
        const hasMatch = identifierRegex.test(file.content);
        if (!hasMatch) {
          alerts.push({
            id: `ORPHAN-${tag.id}`,
            type: "DRIFT_ORPHAN",
            severity: "critical",
            message: `Orphaned Tag Manifest Drift: Active registration "${tag.id}" for "${tag.file}" has no matching comment string inside the file. Did a developer delete the code context block?`
          });
        }
      }
    });

    // 4. Prefix Compliance Validator
    const prefixesVar = variables.find(v => v.id === "VAR-03");
    if (prefixesVar) {
      const allowedPrefixes = prefixesVar.value.split(",").map(p => p.trim().toUpperCase());
      tags.forEach(tag => {
        const hasValidPrefix = allowedPrefixes.some(pref => tag.id.toUpperCase().startsWith(pref));
        if (!hasValidPrefix) {
          alerts.push({
            id: `PREFIX-${tag.id}`,
            type: "PREFIX_ERR",
            severity: "warning",
            message: `Policy Violation: Anchor ID "${tag.id}" uses an unregistered category prefix code. Compliance mandates: [${allowedPrefixes.join(", ")}].`
          });
        }
      });
    }

    return alerts;
  }, [files, tags, variables]);

  // Compute overall statistics
  const metrics = useMemo(() => {
    // Tag coverage % of simulated codebase files (percentage of active files that contain at least 1 anchor)
    const filesWithAnchors = files.filter(f => /@anchor\[[A-Za-z0-9-_]+\]/g.test(f.content)).length;
    const tagCoverage = files.length > 0 ? Math.round((filesWithAnchors / files.length) * 100) : 0;

    // Severity distribution count
    const highAlerts = validationAlerts.filter(a => a.severity === "critical").length;
    const warningAlerts = validationAlerts.filter(a => a.severity === "warning").length;

    return {
      tagCoverage,
      highAlerts,
      warningAlerts,
      totalTags: tags.length,
      driftPercentage: tags.length > 0 ? Math.round((validationAlerts.filter(a => a.type.startsWith("DRIFT")).length / tags.length) * 100) : 0
    };
  }, [files, tags, validationAlerts]);

  // -------------------------------------------------------------
  // Operations & Dispatch Action Handlers
  // -------------------------------------------------------------
  const handleUpdateFileContent = (fileName: string, newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === fileName ? { ...f, content: newContent } : f))
    );
  };

  const handleCreateFile = (name: string, content: string, description: string) => {
    const newFile: CodeFile = {
      name,
      language: "typescript",
      description,
      content,
    };
    setFiles((prev) => [...prev, newFile]);
    setSelectedFileName(name);
  };

  const handleDeleteFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (selectedFileName === name) {
      const remaining = files.filter((f) => f.name !== name);
      if (remaining.length > 0) {
        setSelectedFileName(remaining[0].name);
      }
    }
    // Also mark associated tags for audit desynchronization alerts rather than auto deleting, so you see GTM alerts!
  };

  const handleAddTag = (newTag: AnchorTag) => {
    setTags((prev) => [newTag, ...prev]);
  };

  const handleDeleteTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleIngestCodebase = (newFiles: CodeFile[], newTags: AnchorTag[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      setSelectedFileName(newFiles[0].name);
    }
    setTags(newTags || []);
  };

  const handleToggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleUpdateVariable = (id: string, newValue: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.id === id ? { ...v, value: newValue } : v))
    );
  };

  const handleDeployManifest = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      alert(`Manifest compilation successful! Combined ${tags.length} active tag anchors deployed to CI pipelines, saving roughly ~${tags.length * 480} simulated cognitive tokens for AI agents.`);
    }, 800);
  };

  // Run the API simulation querying the actual server
  const triggerSimulation = async () => {
    if (!agentPrompt.trim()) return;
    setIsSimulating(true);
    setSimResults(null);

    try {
      const response = await fetch("/api/query-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: agentPrompt,
          files,
          manifest: tags,
          selectedTags: [] // Server auto resolves references
        }),
      });

      if (!response.ok) {
        throw new Error("Query service returned error code status " + response.status);
      }

      const resJson = await response.json();
      setSimResults({
        naiveOutput: resJson.naiveOutput,
        anchorOutput: resJson.anchorOutput,
        naiveTokenCalc: resJson.naiveTokenCalc,
        anchorTokenCalc: resJson.anchorTokenCalc,
        relevantTags: resJson.relevantTags,
        errorMessage: resJson.errorMessage
      });
    } catch (e: any) {
      console.error(e);
      setSimResults({
        naiveOutput: `Error processing query: ${e.message}`,
        anchorOutput: `Fallback Mock Simulator: Unable to access standard APIs.`,
        naiveTokenCalc: 1400,
        anchorTokenCalc: 320,
        relevantTags: ["ERR-1"],
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070708] text-slate-300 font-sans p-4 md:p-6 lg:p-8 flex flex-col gap-4 overflow-x-hidden selection:bg-indigo-900/40">
      {/* Top Header / Global Actions */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/30 border border-slate-900 rounded-2xl px-6 py-4 gap-4" id="app-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Layers className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-extrabold tracking-tight text-lg">AnchorMesh</h1>
              <span className="bg-indigo-950 text-indigo-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-900/30">
                v1.2.0-Enterprise
              </span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Deterministic Software Agent Registry & Environment Governance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Registry Sync Status</span>
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Pipeline Sync
            </span>
          </div>
          <button
            onClick={handleDeployManifest}
            disabled={isRefreshing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15 active:scale-98 flex items-center gap-1.5"
            id="btn-deploy-global"
          >
            {isRefreshing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Deploy Manifest
          </button>
        </div>
      </header>

      {/* Bento Grid layout container */}
      <main className="flex-1 grid grid-cols-12 gap-4" id="bento-grid">
        
        {/* Row 1: Left column - File Navigator and Microcode editor (Cols span 8) */}
        <section className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[500px]" id="bento-code-workspace">
          {/* File Trees List Panel (col-span-4) */}
          <div className="md:col-span-4 h-full">
            <Explorer
              files={files}
              selectedFileName={selectedFileName}
              onSelectFile={setSelectedFileName}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onIngestCodebase={handleIngestCodebase}
              tags={tags}
            />
          </div>

          {/* Interactive Code Editor Pane with inline comments embedding (col-span-8) */}
          <div className="md:col-span-8 h-full">
            <Editor
              file={selectedFile}
              onUpdateContent={handleUpdateFileContent}
              onAddTag={handleAddTag}
              tags={tags}
            />
          </div>
        </section>

        {/* Dynamic Health Stats Card (col-span-4) */}
        <section className="col-span-12 lg:col-span-4 bg-slate-900/35 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden" id="card-metrics">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full"></div>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-400" />
                Repository Agent Health
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Real-time stats</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-400">Registry Anchor Coverage</span>
                  <span className="text-white font-mono">{metrics.tagCoverage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500" 
                    style={{ width: `${metrics.tagCoverage}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Ratio of codebase files with at least one validated anchor identifier string.</p>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-400">Spec Desync Drift</span>
                  <span className={`font-mono ${metrics.driftPercentage > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                    {metrics.driftPercentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${metrics.driftPercentage > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(4, metrics.driftPercentage)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">Measures mismatch between comments in code and registered entries in manifest ledger.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mt-6">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-900">
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Critical Drifts</div>
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-xl font-black font-mono ${metrics.highAlerts > 0 ? "text-rose-500" : "text-slate-300"}`}>
                    {String(metrics.highAlerts).padStart(2, "0")}
                  </div>
                  <span className="text-[9px] text-slate-600 font-medium">Failures</span>
                </div>
              </div>
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-900">
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Policy Warnings</div>
                <div className="flex items-baseline gap-1.5">
                  <div className={`text-xl font-black font-mono ${metrics.warningAlerts > 0 ? "text-amber-500" : "text-slate-300"}`}>
                    {String(metrics.warningAlerts).padStart(2, "0")}
                  </div>
                  <span className="text-[9px] text-slate-600 font-medium">Alerts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-900/85">
            <div className="flex items-center gap-2 text-xs bg-indigo-950/15 border border-indigo-900/20 rounded-xl p-3 text-indigo-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
              <p className="text-[10px] leading-relaxed">
                Pre-commit git configuration is blocking non-annotated secure variables. Active anchors act as continuous verification endpoints.
              </p>
            </div>
          </div>
        </section>

        {/* Row 2: Manifest Ledger Component (Full central column - span 4) */}
        <section className="col-span-12 lg:col-span-4 h-full" id="bento-ledger-pane">
          <ManifestLedger
            tags={tags}
            onDeleteTag={handleDeleteTag}
            onSelectFile={(name) => {
              setSelectedFileName(name);
              setActiveTab("code");
            }}
            files={files.map(f => f.name)}
          />
        </section>

        {/* Row 2 Middle: Dynamic Agent Workspace AI Simulator and Manifest Exporter Term (Col span 5) */}
        <section className="col-span-12 lg:col-span-5 bg-[#0b0c0d] border border-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-xl" id="bento-query-agent">
          <div className="p-4 border-b border-slate-900 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-900/10 gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">AGENT INTEGRATION REGISTRY</h2>
            </div>
            
            {/* Elegant Tab Switchers */}
            <div className="flex flex-wrap lg:flex-nowrap bg-slate-950 p-1 rounded-xl border border-slate-850 gap-1">
              <button
                onClick={() => setPanelTab("simulator")}
                className={`px-2 py-1 text-[9px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                  panelTab === "simulator"
                    ? "bg-indigo-600/80 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Simulator
              </button>
              <button
                onClick={() => setPanelTab("manifest")}
                className={`px-2 py-1 text-[9px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                  panelTab === "manifest"
                    ? "bg-indigo-600/80 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                JSON Manifest
              </button>
              <button
                onClick={() => setPanelTab("cursorrules")}
                className={`px-2 py-1 text-[9px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                  panelTab === "cursorrules"
                    ? "bg-indigo-600/80 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                .cursorrules
              </button>
              <button
                onClick={() => setPanelTab("skills")}
                className={`px-2 py-1 text-[9px] uppercase font-bold rounded-lg cursor-pointer transition-all ${
                  panelTab === "skills"
                    ? "bg-indigo-600/80 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Claude Skills
              </button>
            </div>
          </div>

          {/* Tab Content A: Agent Simulator */}
          {panelTab === "simulator" && (
            <div className="p-5 flex-1 flex flex-col space-y-4 font-mono text-xs">
              <div className="text-slate-500 leading-relaxed">
                // Enter a request context. Observe how the anchor tag manifest resolves exact code blocks for LLMs instantly.
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Agent Action / Prompt</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Audit checkout security guards or find deprecated hooks"
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-neutral-600"
                  />
                  <button
                    onClick={triggerSimulation}
                    disabled={isSimulating || !agentPrompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-sans font-bold text-xs px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isSimulating ? "Scouring..." : <><Play className="w-3 h-3 fill-white" /> Run</>}
                  </button>
                </div>
              </div>

              {/* Simulated Comparison Terminal Output */}
              {simResults ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Simulation A: Naive approach */}
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-neutral-400 border-b border-slate-900 pb-1.5 mb-2">
                        <span className="font-bold text-[10px]">A: NAIVE REP SEARCH</span>
                        <span className="text-rose-400 text-[9px] bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/30 font-bold">BLIND SCAN</span>
                      </div>
                      <div className="text-[10px] text-slate-400 h-40 overflow-y-auto font-mono leading-5 whitespace-pre-wrap select-text scrollbar-thin">
                        {simResults.naiveOutput}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-900 mt-2 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                      <span>Est. Context Load:</span>
                      <span className="text-rose-400">{simResults.naiveTokenCalc} tokens</span>
                    </div>
                  </div>

                  {/* Simulation B: Anchor Approach */}
                  <div className="bg-slate-950 border border-indigo-950 rounded-xl p-3 flex flex-col justify-between ring-1 ring-indigo-500/10">
                    <div>
                      <div className="flex items-center justify-between text-indigo-400 border-b border-indigo-950 pb-1.5 mb-2">
                        <span className="font-bold text-[10px]">B: ANCHOR-ISO CODES</span>
                        <span className="text-indigo-400 text-[9px] bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-700/30 font-bold">100% RELIABLE</span>
                      </div>
                      <div className="text-[10px] text-slate-200 h-40 overflow-y-auto font-mono leading-5 whitespace-pre-wrap select-text scrollbar-thin">
                        {simResults.anchorOutput}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-indigo-950 mt-2 flex justify-between items-center text-[10px] text-indigo-400 font-bold">
                      <span>Targeted Context Load:</span>
                      <span className="text-emerald-400">{simResults.anchorTokenCalc} tokens (reduced!)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <Cpu className={`w-8 h-8 text-slate-800 mb-2 ${isSimulating ? "animate-spin text-indigo-400" : ""}`} />
                  <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">
                    {isSimulating 
                      ? "Assembling context tokens, performing deterministic manifests query & executing client API pipeline..."
                      : "Wait for task submit. Simulated agent scans the ledger manifest to target exact file lines and prevent token waste."
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab Content B: Live anchor-tag-manifest.json Exporter */}
          {panelTab === "manifest" && (
            <div className="p-5 flex-1 flex flex-col space-y-4 font-sans text-xs">
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl text-[11px] text-indigo-200 leading-relaxed">
                <span className="font-bold text-indigo-400 block mb-0.5">🚀 Direct Ingestion Manifest ready!</span>
                Feed this compiled <code className="bg-indigo-950 px-1 py-0.5 rounded border border-indigo-900 text-white">anchor-tag-manifest.json</code> into any AI system.
              </div>

              {/* Dynamic JSON Viewport */}
              <div className="relative group flex-1 min-h-[180px] flex flex-col bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-inner">
                <div className="p-2.5 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>LIVE COMPILED SCHEMA OUTPUT</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyManifestToClipboard}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 cursor-pointer flex items-center gap-1.5 transition-colors"
                      title="Copy JSON representation"
                    >
                      {copiedManifest ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold font-sans">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="font-sans">Copy Payload</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDownloadManifestFile}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded border border-indigo-700 cursor-pointer flex items-center gap-1.5 transition-colors font-sans font-semibold"
                      title="Generate local download"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-indigo-300 leading-relaxed max-h-[220px] select-text scrollbar-thin">
                  <pre>{compiledManifestJson}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content C: .cursorrules Exporter */}
          {panelTab === "cursorrules" && (
            <div className="p-5 flex-1 flex flex-col space-y-4 font-sans text-xs">
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl text-[11px] text-indigo-200 leading-relaxed">
                <span className="font-bold text-indigo-400 block mb-0.5">📂 Cursor Rules Configuration</span>
                Place this `.cursorrules` file at the root of your local workspace. It forces any LLM running locally in Cursor to strictly detect and obey registered anchor files.
              </div>

              {/* Rules Viewport */}
              <div className="relative group flex-1 min-h-[180px] flex flex-col bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-inner">
                <div className="p-2.5 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>LIVE GENERATED .CURSORRULES</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCursorRules}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      {copiedRules ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold font-sans">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="font-sans">Copy Rules</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDownloadCursorRules}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded border border-indigo-700 cursor-pointer flex items-center gap-1.5 transition-colors font-sans font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-indigo-200 leading-relaxed max-h-[220px] select-text scrollbar-thin">
                  <pre className="whitespace-pre-wrap">{compiledCursorRulesText}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content D: Claude Project Skills */}
          {panelTab === "skills" && (
            <div className="p-5 flex-1 flex flex-col space-y-4 font-sans text-xs">
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl text-[11px] text-indigo-200 leading-relaxed">
                <span className="font-bold text-indigo-400 block mb-0.5">🧠 Claude Projects & Custom Instructions</span>
                Upload this instructions manual as a Project Knowledge source. Claude will act as a specialized operator with pre-baked recipes targeting specific files.
              </div>

              {/* Skills Viewport */}
              <div className="relative group flex-1 min-h-[180px] flex flex-col bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-inner">
                <div className="p-2.5 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>LIVE GENERATED CLAUDE SKILLS</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyClaudeSkills}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      {copiedSkills ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold font-sans">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span className="font-sans">Copy Skills</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDownloadClaudeSkills}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded border border-indigo-700 cursor-pointer flex items-center gap-1.5 transition-colors font-sans font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-indigo-200 leading-relaxed max-h-[220px] select-text scrollbar-thin">
                  <pre className="whitespace-pre-wrap">{compiledClaudeSkillsText}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Controls Footer */}
          <div className="p-3 bg-indigo-950/20 border-t border-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-400 animate-ping rounded-full"></div>
              <span className="text-[10px] text-slate-400 font-sans font-medium">
                {panelTab === "simulator" ? "Ready for AI refactoring simulations." : "Registry configuration generated live."}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadAnnotatedCodebaseZip}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-extrabold text-[10px] tracking-wide uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-950 transition-colors cursor-pointer"
                title="Download entire codebase annotated with anchors + manifest + rules in a ZIP file!"
              >
                <FolderArchive className="w-3.5 h-3.5 text-indigo-200" />
                <span>Bundle ZIP Export</span>
              </button>
              
              {panelTab === "simulator" && (
                <button 
                  onClick={() => {
                    setAgentPrompt("Verify all cryptographic hash signatures inside our billing ledger or secure router gates");
                  }}
                  className="text-[9px] underline text-indigo-400 hover:text-indigo-300 font-sans cursor-pointer font-bold uppercase"
                >
                  Fill Sample Task
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Row 2 Right: Active Pipes Triggers and parameters (Col span 3) */}
        <section className="col-span-12 lg:col-span-3 bg-slate-900/25 border border-slate-900 rounded-2xl flex flex-col overflow-hidden shadow-xl" id="bento-hooks-variables">
          <div className="p-4 border-b border-slate-900 bg-slate-900/10 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">ACTIVE ENV RAILS</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <TriggersAndVariables
              triggers={triggers}
              variables={variables}
              onToggleTrigger={handleToggleTrigger}
              onUpdateVariable={handleUpdateVariable}
              onAddTrigger={(tr) => setTriggers((prev) => [tr, ...prev])}
              onAddVariable={(va) => setVariables((prev) => [va, ...prev])}
            />
          </div>
        </section>

        {/* Row 3 Middle and Policy Enforcement Container (Col span 12) */}
        <section className="col-span-12 bg-slate-900/20 border border-slate-900 rounded-2xl p-5 flex flex-col gap-3.5 shadow-xl" id="bento-policies-alerts">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Policy-As-Code Enforcement Board
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Securing System Consistency
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[220px]">
            {validationAlerts.length > 0 ? (
              validationAlerts.map((alertItem) => (
                <div
                  key={alertItem.id}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                    alertItem.severity === "critical"
                      ? "bg-red-950/10 border-red-900/40 text-red-100 hover:border-red-800"
                      : "bg-amber-950/10 border-amber-900/40 text-amber-100 hover:border-amber-800"
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alertItem.severity === "critical" ? "text-red-400" : "text-amber-500"}`} />
                  <div className="text-left font-sans">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        alertItem.severity === "critical"
                          ? "bg-red-950/60 text-red-400 border-red-900/30"
                          : "bg-amber-950/60 text-amber-400 border-amber-900/30"
                      }`}>
                        {alertItem.type}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wide">
                        {alertItem.severity}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed mt-1.5 text-slate-300">
                      {alertItem.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-6 flex flex-col items-center justify-center text-slate-500">
                <ShieldCheck className="w-8 h-8 text-emerald-500/80 mb-2" />
                <p className="text-xs font-semibold text-slate-300">All Security Policies Are Passing Fully</p>
                <p className="text-[10px] text-slate-500 mt-1">Zero register drift or tag density errors found across microservices.</p>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer / System Info */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-500 px-2 py-2 border-t border-slate-900/60 uppercase tracking-[0.2em] font-medium gap-2 mt-2" id="app-footer-info">
        <span>Active User: <strong className="text-slate-400 lowercase">joshipv2@gmail.com</strong></span>
        <span>Registry Checksum: <strong className="text-slate-400 font-mono">0x2da81f..bb76</strong></span>
        <span>Environment Node: <strong className="text-indigo-400 font-semibold">aistudio-main-container-3000</strong></span>
        <span className="text-indigo-500 tracking-widest">Stable Architecture Enforced 🛡️</span>
      </footer>
    </div>
  );
}
