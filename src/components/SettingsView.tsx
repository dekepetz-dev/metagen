import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Key, 
  Server, 
  Sliders, 
  Activity, 
  ShieldAlert, 
  Check, 
  X,
  Info,
  RefreshCw,
  Globe
} from "lucide-react";
import { AppSettings, ProviderType, PresetType, SUPPORTED_MARKETPLACES } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  apiStatus: { ok: boolean; message: string; testing: boolean };
  onTestConnection: (settings: AppSettings) => Promise<void>;
}

export default function SettingsView({
  settings,
  onSaveSettings,
  apiStatus,
  onTestConnection,
}: SettingsViewProps) {
  // Local states
  const [provider, setProvider] = useState<ProviderType>(settings.providerConfig.provider);
  const [apiKey, setApiKey] = useState(settings.providerConfig.apiKey);
  const [baseUrl, setBaseUrl] = useState(settings.providerConfig.baseUrl);
  const [model, setModel] = useState(settings.providerConfig.model);
  const [temperature, setTemperature] = useState(settings.providerConfig.temperature);
  const [concurrentRequests, setConcurrentRequests] = useState(settings.providerConfig.concurrentRequests || 3);
  const [activeMarketplaces, setActiveMarketplaces] = useState<string[]>(settings.activeMarketplaces || [settings.activeMarketplace || "shutterstock"]);
  const [preset, setPreset] = useState<PresetType>(settings.preset || "balanced");
  const [customFormat, setCustomFormat] = useState<"openai" | "simple">(settings.providerConfig.customFormat || "openai");
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if settings changes from parent
  useEffect(() => {
    setProvider(settings.providerConfig.provider);
    setApiKey(settings.providerConfig.apiKey);
    setBaseUrl(settings.providerConfig.baseUrl);
    setModel(settings.providerConfig.model);
    setTemperature(settings.providerConfig.temperature);
    setConcurrentRequests(settings.providerConfig.concurrentRequests || 3);
    setActiveMarketplaces(settings.activeMarketplaces || [settings.activeMarketplace || "shutterstock"]);
    setPreset(settings.preset || "balanced");
    setCustomFormat(settings.providerConfig.customFormat || "openai");
  }, [settings]);

  // Set default model when provider changes
  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    if (newProvider === "gemini") {
      setBaseUrl("");
      setModel("gemini-3.5-flash");
    } else if (newProvider === "openai") {
      setBaseUrl("https://api.openai.com/v1");
      setModel("gpt-4o-mini");
    } else {
      setBaseUrl("https://openrouter.ai/api/v1");
      setModel("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: AppSettings = {
      theme: settings.theme,
      activeMarketplace: activeMarketplaces[0] || "shutterstock",
      activeMarketplaces,
      preset,
      providerConfig: {
        provider,
        apiKey,
        baseUrl,
        model: model || (provider === "gemini" ? "gemini-3.5-flash" : provider === "openai" ? "gpt-4o-mini" : "custom-model"),
        temperature,
        maxTokens: 2048,
        timeout: 30,
        retryCount: 2,
        concurrentRequests,
        customFormat,
      }
    };
    await onSaveSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTest = async () => {
    const updatedSettings: AppSettings = {
      theme: settings.theme,
      activeMarketplace: activeMarketplaces[0] || "shutterstock",
      activeMarketplaces,
      preset,
      providerConfig: {
        provider,
        apiKey,
        baseUrl,
        model: model || (provider === "gemini" ? "gemini-3.5-flash" : provider === "openai" ? "gpt-4o-mini" : "custom-model"),
        temperature,
        maxTokens: 2048,
        timeout: 30,
        retryCount: 2,
        concurrentRequests,
        customFormat,
      }
    };
    await onTestConnection(updatedSettings);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in" id="settings-view">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-600" />
            AI Provider & App Settings
          </h1>
          <p className="text-sm text-neutral-500">
            Configure your local connection credentials, concurrency limits, and default marketplace.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Connection Box */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <Server className="h-5 w-5 text-neutral-500" />
            AI Engine Configuration
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                API Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="select-provider"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="custom">Custom API (Free / Any Endpoint)</option>
              </select>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Model Name
              </label>
              {provider === "gemini" ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  id="select-model-gemini"
                >
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Standard & Free)</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Paid Key)</option>
                  <option value="gemini-2.5-flash-image">gemini-2.5-flash-image (Image Gen)</option>
                </select>
              ) : provider === "openai" ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  id="select-model-openai"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Highly Recommended)</option>
                  <option value="gpt-4o">gpt-4o (Premium Vision)</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g., deepseek-coder, llama3"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                  id="input-model-custom"
                />
              )}
            </div>

            {/* Default Preset */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                AIGen Quality Preset
              </label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as PresetType)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="select-preset"
              >
                <option value="fast">Fast (Lower Temperature, Deterministic)</option>
                <option value="balanced">Balanced (Optimal Metadata Relevance)</option>
                <option value="quality">High Quality (Rich Creative Descriptions)</option>
              </select>
            </div>
          </div>

          {/* Base URL (Custom Only) */}
          {(provider === "custom" || provider === "openai") && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                {provider === "custom" ? "API Endpoint / Base URL (Required)" : "Base URL (Optional)"}
              </label>
              <input
                type="text"
                placeholder={provider === "openai" ? "https://api.openai.com/v1" : "e.g., https://my-custom-endpoint.com/api/generate"}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="input-base-url"
              />
              {provider === "custom" && (
                <p className="mt-1 text-xs text-neutral-500">
                  Enter the exact endpoint URL of your custom API.
                </p>
              )}
            </div>
          )}

          {/* Custom Format (Custom Only) */}
          {provider === "custom" && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Custom API Payload Format
              </label>
              <select
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value as "openai" | "simple")}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="select-custom-format"
              >
                <option value="openai">OpenAI Chat Completions standard (Uses 'messages' array)</option>
                <option value="simple">Custom Simple JSON (Flat properties: image, prompt, etc.)</option>
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                {customFormat === "openai"
                  ? "Standard chat completions payload with 'messages'. Works with OpenRouter, LM Studio, Groq, local models, etc. Prevents 400 bad request errors because it doesn't send unknown fields."
                  : "Simple payload with systemPrompt, image base64, and user prompt at the root. Perfect for your custom, non-OpenAI endpoints."}
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                API Secret Key
              </label>
              {provider === "gemini" && !apiKey && (
                <span className="text-[11px] text-indigo-600 font-semibold">
                  * Optional. Fallbacks to server-side pre-configured GEMINI_API_KEY
                </span>
              )}
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Key className="h-4 w-4" />
              </div>
              <input
                type="password"
                placeholder={
                  provider === "gemini" && !apiKey
                    ? "Using server preconfigured key (Ready out-of-the-box)"
                    : `Enter your ${provider.toUpperCase()} API Key`
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 py-3 text-sm font-mono focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="input-api-key"
              />
            </div>
          </div>
        </div>

        {/* Hyperparameters & Concurrency */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-neutral-500" />
            Performance & Engine Parameters
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-neutral-700 uppercase tracking-wider">
                <span>Creativity (Temperature)</span>
                <span className="font-mono text-indigo-600">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
                id="input-temperature"
              />
              <p className="text-[10px] text-neutral-400 leading-normal">
                Lower values generate literal, highly objective descriptions. Higher values yield creative and conceptual phrasing.
              </p>
            </div>

            {/* Concurrent requests */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Max Concurrent Request Batching
              </label>
              <select
                value={concurrentRequests}
                onChange={(e) => setConcurrentRequests(parseInt(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                id="select-concurrency"
              >
                <option value="1">1 Request at a time (Safest, slow)</option>
                <option value="3">3 Requests in parallel (Recommended, balanced)</option>
                <option value="5">5 Requests in parallel (High performance)</option>
              </select>
              <p className="text-[10px] text-neutral-400 leading-normal">
                Avoid setting too high if your AI key is subject to strict RPM/TPM rate limits.
              </p>
            </div>
          </div>
        </div>

        {/* Default agency settings */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-neutral-500" />
            Default Target Marketplaces
          </h2>
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Select Active Agencies
            </label>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 max-h-[160px] overflow-y-auto p-2 border border-neutral-200 rounded-xl bg-neutral-50/50">
              {SUPPORTED_MARKETPLACES.map((m) => {
                const isChecked = activeMarketplaces.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const newSelection = isChecked
                        ? activeMarketplaces.filter((id) => id !== m.id)
                        : [...activeMarketplaces, m.id];
                      setActiveMarketplaces(newSelection);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs font-semibold transition ${
                      isChecked
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                    />
                    <span className="truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback Bar */}
        {apiStatus.message && (
          <div
            className={`rounded-xl p-4 flex gap-3 text-sm border ${
              apiStatus.ok
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
            id="api-status-banner"
          >
            <div className="mt-0.5">
              {apiStatus.ok ? (
                <Check className="h-5 w-5 text-green-600 bg-green-100 rounded-full p-0.5" />
              ) : (
                <X className="h-5 w-5 text-amber-600 bg-amber-100 rounded-full p-0.5" />
              )}
            </div>
            <div>
              <p className="font-bold">{apiStatus.ok ? "Handshake Completed!" : "Status Check"}</p>
              <p className="text-xs leading-relaxed mt-1">{apiStatus.message}</p>
            </div>
          </div>
        )}

        {/* Security Warning Notice */}
        <div className="rounded-xl bg-indigo-50 p-4 border border-indigo-100 flex gap-3">
          <ShieldAlert className="h-5 w-5 text-indigo-600 shrink-0" />
          <div className="text-xs text-indigo-900 leading-relaxed space-y-1">
            <p className="font-bold">Zero-Upload Privacy Policy</p>
            <p>
              All entered credentials and API Keys are encrypted locally inside your browser's sandboxed IndexedDB. Keys are used strictly to proxy requests directly to the respective model providers and are never sent to or cached on any central analytics server.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 items-center justify-end border-t border-neutral-100 pt-6">
          <button
            type="button"
            onClick={handleTest}
            disabled={apiStatus.testing}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-700 transition"
            id="btn-test-api"
          >
            {apiStatus.testing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                Testing Key...
              </>
            ) : (
              "Test Connection"
            )}
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition"
            id="btn-save-settings"
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Saved Changes
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
