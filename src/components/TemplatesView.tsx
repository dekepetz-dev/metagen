import React, { useState } from "react";
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Check, 
  Sliders, 
  Sparkles,
  RefreshCw,
  Info
} from "lucide-react";
import { MarketplaceTemplate, SUPPORTED_MARKETPLACES, DEFAULT_TEMPLATES } from "../types";

interface TemplatesViewProps {
  templates: MarketplaceTemplate[];
  onSaveTemplates: (templates: MarketplaceTemplate[]) => Promise<void>;
}

export default function TemplatesView({
  templates,
  onSaveTemplates,
}: TemplatesViewProps) {
  const [localTemplates, setLocalTemplates] = useState<MarketplaceTemplate[]>(templates);
  const [activeMarketplace, setActiveMarketplace] = useState(SUPPORTED_MARKETPLACES[0].id);
  const [templateName, setTemplateName] = useState("");
  const [promptModifier, setPromptModifier] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddTemplate = () => {
    if (!templateName || !promptModifier) return;

    const newTemplate: MarketplaceTemplate = {
      id: `t-${Date.now()}`,
      name: templateName,
      marketplaceId: activeMarketplace,
      promptModifier,
      isDefault: false,
    };

    const updated = [...localTemplates, newTemplate];
    setLocalTemplates(updated);
    setTemplateName("");
    setPromptModifier("");
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = localTemplates.filter((t) => t.id !== id);
    setLocalTemplates(updated);
  };

  const handleSave = async () => {
    await onSaveTemplates(localTemplates);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = async () => {
    setLocalTemplates(DEFAULT_TEMPLATES);
    await onSaveTemplates(DEFAULT_TEMPLATES);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in" id="templates-view">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-600" />
            Prompt Templates Library
          </h1>
          <p className="text-sm text-neutral-500">
            Customize the system instruction prefixes used to dictate style and structure during the generation process.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 px-3.5 py-2 text-xs font-semibold transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
            id="btn-save-templates"
          >
            {saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Templates Saved
              </>
            ) : (
              "Save Active Library"
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* LEFT COLUMN: Add template form */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-4 md:col-span-1 h-fit">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-indigo-600" />
            Create Custom Modifier
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                Template Label
              </label>
              <input
                type="text"
                placeholder="e.g. Corporate Stock, Moody Portrait"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="template-name-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                Target Marketplace rules
              </label>
              <select
                value={activeMarketplace}
                onChange={(e) => setActiveMarketplace(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                id="template-marketplace-select"
              >
                {SUPPORTED_MARKETPLACES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                Prompt Guideline Modifier
              </label>
              <textarea
                rows={4}
                placeholder="Instruct the AI. e.g.: 'Always format keywords targeting corporate teamwork. Prioritize tech words.'"
                value={promptModifier}
                onChange={(e) => setPromptModifier(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                id="template-modifier-input"
              />
            </div>

            <button
              onClick={handleAddTemplate}
              disabled={!templateName || !promptModifier}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
              id="btn-add-template"
            >
              <Plus className="h-4 w-4" />
              Add to Library
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Templates list */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 flex gap-3">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 leading-relaxed">
              When generating metadata for a specific agency, the system checks if a custom modifier exists for that platform. The modifier guidelines are merged into the system instructions automatically to shape content creation.
            </p>
          </div>

          <div className="space-y-3">
            {localTemplates.map((template) => {
              const marketplaceName = SUPPORTED_MARKETPLACES.find((m) => m.id === template.marketplaceId)?.name || template.marketplaceId;
              return (
                <div 
                  key={template.id}
                  className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm flex justify-between items-start gap-4 hover:border-neutral-200 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">{template.name}</span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                        {marketplaceName}
                      </span>
                      {template.isDefault && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-500">
                          System Preset
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed italic">
                      "{template.promptModifier}"
                    </p>
                  </div>

                  {!template.isDefault && (
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-lg transition shrink-0"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
