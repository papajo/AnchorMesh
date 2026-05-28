import React, { useState } from "react";
import { ToggleLeft, ToggleRight, Info, Play, Plus, Trash2, Key } from "lucide-react";
import { TriggerRule, TagVariable } from "../types";

interface TriggersAndVariablesProps {
  triggers: TriggerRule[];
  variables: TagVariable[];
  onToggleTrigger: (id: string) => void;
  onUpdateVariable: (id: string, newValue: string) => void;
  onAddTrigger: (trigger: TriggerRule) => void;
  onAddVariable: (variable: TagVariable) => void;
}

export default function TriggersAndVariables({
  triggers,
  variables,
  onToggleTrigger,
  onUpdateVariable,
  onAddTrigger,
  onAddVariable,
}: TriggersAndVariablesProps) {
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);

  // New trigger form states
  const [trName, setTrName] = useState("");
  const [trEvent, setTrEvent] = useState<TriggerRule["event"]>("git-commit");
  const [trDesc, setTrDesc] = useState("");

  // New variable form states
  const [vaName, setVaName] = useState("");
  const [vaType, setVaType] = useState<TagVariable["type"]>("string");
  const [vaValue, setVaValue] = useState("");
  const [vaDesc, setVaDesc] = useState("");

  const submitTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trName.trim()) return;

    onAddTrigger({
      id: "TRIG-" + Math.floor(Math.random() * 1000),
      name: trName,
      event: trEvent,
      description: trDesc || "Declared custom execution trigger rules condition.",
      isActive: true,
    });

    setTrName("");
    setTrDesc("");
    setShowAddTrigger(false);
  };

  const submitVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaName.trim()) return;

    onAddVariable({
      id: "VAR-" + Math.floor(Math.random() * 1000),
      name: vaName,
      type: vaType,
      value: vaValue,
      description: vaDesc,
    });

    setVaName("");
    setVaValue("");
    setVaDesc("");
    setShowAddVariable(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full text-left" id="triggers-variables-layout">
      {/* 1. GTM triggers */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-full space-y-4 shadow-lg min-h-[400px]">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-sans font-semibold text-white tracking-wide text-sm flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              TRIGGERS (GIT CARD HOOKS)
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 font-sans">
              Define validation hooks that parse tags during developer workflows.
            </p>
          </div>
          <button
            onClick={() => setShowAddTrigger(true)}
            className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-800/50 px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Declare
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5">
          {triggers.map((tr) => (
            <div
              key={tr.id}
              className={`p-3.5 rounded-xl border transition-all ${
                tr.isActive
                  ? "bg-neutral-950 border-neutral-800/80 hover:border-neutral-700"
                  : "bg-neutral-950/40 border-neutral-900 text-neutral-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider font-bold bg-neutral-900 text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded">
                    {tr.event}
                  </span>
                  <p className={`text-xs font-semibold mt-1.5 ${tr.isActive ? "text-white" : "text-neutral-500"}`}>
                    {tr.name}
                  </p>
                </div>
                <button
                  onClick={() => onToggleTrigger(tr.id)}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {tr.isActive ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium font-sans">
                      Active
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-neutral-600 font-sans">
                      Inactive
                      <ToggleLeft className="w-6 h-6 text-neutral-700" />
                    </span>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 font-sans leading-relaxed">{tr.description}</p>
            </div>
          ))}
        </div>

        {/* Modal for adding trigger */}
        {showAddTrigger && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
            <form
              onSubmit={submitTrigger}
              className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl overflow-hidden p-5 space-y-4"
            >
              <h4 className="text-sm font-semibold text-white font-sans border-b border-neutral-800 pb-2">
                Declare Custom Tag Pipeline Trigger
              </h4>
              <div className="space-y-3 text-xs text-sans">
                <div>
                  <label className="block text-neutral-300 mb-1">Trigger Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit Compliance Build Pass Tracker"
                    value={trName}
                    onChange={(e) => setTrName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Trigger Event</label>
                  <select
                    value={trEvent}
                    onChange={(e) => setTrEvent(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="git-commit">Git Commit Hook</option>
                    <option value="ci-build">Sandbox CI/CD Builder</option>
                    <option value="weekly-cron">Weekly Compliance Cron</option>
                    <option value="manual-run">Manual Audit trigger</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Description / Matching Rule Criteria</label>
                  <textarea
                    rows={3}
                    placeholder="Describe when trigger executes..."
                    value={trDesc}
                    onChange={(e) => setTrDesc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrigger(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium cursor-pointer"
                >
                  Deploy Trigger
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 2. GTM variables */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col h-full space-y-4 shadow-lg min-h-[400px]">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-sans font-semibold text-white tracking-wide text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              VARIABLES (GOVERNANCE PARAMS)
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 font-sans">
              Declare global variables referenced dynamically across anchor policies.
            </p>
          </div>
          <button
            onClick={() => setShowAddVariable(true)}
            className="text-xs bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-800/50 px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Declare
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5">
          {variables.map((v) => (
            <div
              key={v.id}
              className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-neutral-700 transition-all font-sans"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider font-bold bg-neutral-900 text-indigo-400 border border-neutral-800 px-1.5 py-0.5 rounded">
                    Type: {v.type}
                  </span>
                  <p className="text-xs font-semibold text-white mt-1.5">{v.name}</p>
                </div>
                {v.type === "boolean" ? (
                  <button
                    onClick={() => onUpdateVariable(v.id, v.value === "true" ? "false" : "true")}
                    className="p-1 text-xs font-bold rounded cursor-pointer bg-neutral-900 border border-neutral-800 px-2"
                  >
                    {v.value === "true" ? (
                      <span className="text-emerald-400">TRUE</span>
                    ) : (
                      <span className="text-red-400">FALSE</span>
                    )}
                  </button>
                ) : (
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) => onUpdateVariable(v.id, e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs font-mono text-neutral-300 text-right focus:ring-1 focus:ring-indigo-500 max-w-[120px]"
                  />
                )}
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>

        {/* Modal for adding variable */}
        {showAddVariable && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
            <form
              onSubmit={submitVariable}
              className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl overflow-hidden p-5 space-y-4"
            >
              <h4 className="text-sm font-semibold text-white font-sans border-b border-neutral-800 pb-2">
                Declare Custom Policy Variable
              </h4>
              <div className="space-y-3 text-xs text-sans">
                <div>
                  <label className="block text-neutral-300 mb-1">Variable Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mandatory audit categories"
                    value={vaName}
                    onChange={(e) => setVaName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-neutral-300 mb-1">Variable Type</label>
                    <select
                      value={vaType}
                      onChange={(e) => setVaType(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white outline-none cursor-pointer"
                    >
                      <option value="string">String Parameter</option>
                      <option value="boolean">Boolean Switch</option>
                      <option value="list">Comma List</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-300 mb-1">Initial Value</label>
                    <input
                      type="text"
                      required
                      placeholder={vaType === "boolean" ? "true" : "e.g. auth, security"}
                      value={vaValue}
                      onChange={(e) => setVaValue(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Downstream Description / Function</label>
                  <textarea
                    rows={3}
                    placeholder="Describe how tags references this variable context..."
                    value={vaDesc}
                    onChange={(e) => setVaDesc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVariable(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium cursor-pointer"
                >
                  Deploy Variable
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
