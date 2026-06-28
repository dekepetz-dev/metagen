import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  LayoutDashboard, 
  Layers, 
  FolderOpen, 
  Bookmark, 
  Settings, 
  HelpCircle,
  Menu,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck
} from "lucide-react";

import { 
  QueueItem, 
  AppSettings, 
  MarketplaceTemplate, 
  DEFAULT_TEMPLATES, 
  ProviderType,
  SUPPORTED_MARKETPLACES
} from "./types";

import {
  getQueueItems,
  saveQueueItem,
  deleteQueueItem,
  clearAllQueueItems,
  getAppSettings,
  saveAppSettings,
  getTemplates,
  saveTemplates
} from "./lib/db";

import DashboardView from "./components/DashboardView";
import GenerateView from "./components/GenerateView";
import HistoryView from "./components/HistoryView";
import TemplatesView from "./components/TemplatesView";
import SettingsView from "./components/SettingsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Database State
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Status logs
  const [serverHealth, setServerHealth] = useState(false);
  const [apiStatus, setApiStatus] = useState({ ok: false, message: "", testing: false });
  const [isProcessing, setIsProcessing] = useState(false);

  // Stop token for the generation loop
  const stopSignalRef = useRef(false);

  // Initialize and load everything from DB on startup
  useEffect(() => {
    async function loadData() {
      try {
        // Ping our server health endpoint
        const healthRes = await fetch("/api/health").catch(() => null);
        if (healthRes && healthRes.ok) {
          setServerHealth(true);
        }

        // Load IndexedDB states
        const savedQueue = await getQueueItems();
        setQueueItems(savedQueue);

        const savedTemplates = await getTemplates();
        setTemplates(savedTemplates);

        const savedSettings = await getAppSettings();
        setSettings(savedSettings);

        // Perform initial credential check if API Key or Gemini default setup is present
        if (savedSettings) {
          await verifyApiConnection(savedSettings);
        }
      } catch (err) {
        console.error("IndexedDB startup load error:", err);
      }
    }
    loadData();
  }, []);

  // API connection test
  const verifyApiConnection = async (configToTest: AppSettings) => {
    setApiStatus((prev) => ({ ...prev, testing: true }));
    try {
      const activeMps = configToTest.activeMarketplaces && configToTest.activeMarketplaces.length > 0
        ? configToTest.activeMarketplaces
        : [configToTest.activeMarketplace || "shutterstock"];

      const payload = {
        // Send a tiny sample image payload (1x1 transparent pixel) to trigger a dry-run test
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        mimeType: "image/png",
        provider: configToTest.providerConfig.provider,
        apiKey: configToTest.providerConfig.apiKey,
        baseUrl: configToTest.providerConfig.baseUrl,
        model: configToTest.providerConfig.model,
        customFormat: configToTest.providerConfig.customFormat,
        preset: "fast",
        marketplace: activeMps,
        customPrompt: "Verify connection only."
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.title) {
        setApiStatus({
          ok: true,
          message: `API connection verified successfully using model: ${configToTest.providerConfig.model}. Ready for metadata batch processing.`,
          testing: false,
        });
      } else {
        setApiStatus({
          ok: false,
          message: data.error || "Handshake rejected. Please verify your API credentials in settings.",
          testing: false,
        });
      }
    } catch (error: any) {
      setApiStatus({
        ok: false,
        message: error?.message || "Failed to establish a gateway handshake with the AI provider.",
        testing: false,
      });
    }
  };

  // Files processor (Converts added files to Base64 & measures resolutions)
  const handleAddFiles = async (files: FileList) => {
    const newItems: QueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Calculate file size string
      const kb = file.size / 1024;
      const sizeStr = kb > 1024 
        ? `${(kb / 1024).toFixed(2)} MB` 
        : `${kb.toFixed(1)} KB`;

      // Read file data URL and measure visual resolution
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;

          // Create dynamic image to probe dimensions
          const img = new Image();
          img.onload = async () => {
            const resolution = `${img.width} x ${img.height}`;
            
            const newItem: QueueItem = {
              id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              filename: file.name,
              fileSizeStr: sizeStr,
              resolution,
              mimeType: file.type,
              dataUrl,
              status: "waiting",
              progress: 0,
              createdAt: new Date().toISOString()
            };

            // Save inside state & IndexedDB
            newItems.push(newItem);
            await saveQueueItem(newItem);
            resolve();
          };
          img.onerror = async () => {
            // Fallback if not an image rendering format directly
            const newItem: QueueItem = {
              id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              filename: file.name,
              fileSizeStr: sizeStr,
              resolution: "Vector format",
              mimeType: file.type || "image/jpeg",
              dataUrl,
              status: "waiting",
              progress: 0,
              createdAt: new Date().toISOString()
            };
            newItems.push(newItem);
            await saveQueueItem(newItem);
            resolve();
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    setQueueItems((prev) => [...newItems, ...prev]);
  };

  const handleRemoveItem = async (id: string) => {
    await deleteQueueItem(id);
    setQueueItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearQueue = async () => {
    // Only delete waiting or generating items from list
    const itemsToDelete = queueItems.filter(i => i.status !== "completed");
    for (const item of itemsToDelete) {
      await deleteQueueItem(item.id);
    }
    setQueueItems((prev) => prev.filter((item) => item.status === "completed"));
  };

  const handleClearHistory = async () => {
    // Deletes completed history entries
    const itemsToDelete = queueItems.filter(i => i.status === "completed");
    for (const item of itemsToDelete) {
      await deleteQueueItem(item.id);
    }
    setQueueItems((prev) => prev.filter((item) => item.status !== "completed"));
  };

  const handleUpdateMetadata = async (id: string, updatedResult: any) => {
    setQueueItems((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, result: updatedResult };
          saveQueueItem(updated); // Update background IndexedDB
          return updated;
        }
        return item;
      });
    });
  };

  // Core Queue Processing Execution Loop
  const handleStartGenerating = async (singleItemId?: string) => {
    if (isProcessing) return;
    if (!settings) return;

    setIsProcessing(true);
    stopSignalRef.current = false;

    // Determine sequence of items to process
    let targets: QueueItem[] = [];
    if (singleItemId) {
      const match = queueItems.find((i) => i.id === singleItemId);
      if (match) targets = [match];
    } else {
      targets = queueItems.filter((i) => i.status === "waiting" || i.status === "failed");
    }

    if (targets.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Process using sequential concurrency configured
    const limit = settings.providerConfig.concurrentRequests || 3;
    
    // We process sequentially but respect stop tokens
    for (let i = 0; i < targets.length; i++) {
      if (stopSignalRef.current) break;

      const target = targets[i];

      // Mark status as Generating
      setQueueItems((prev) => {
        return prev.map((item) => {
          if (item.id === target.id) {
            const updated: QueueItem = { ...item, status: "generating", progress: 20 };
            saveQueueItem(updated);
            return updated;
          }
          return item;
        });
      });

      try {
        // Fetch matching template modifiers for all active marketplaces
        const activeMarketplaces = settings.activeMarketplaces && settings.activeMarketplaces.length > 0 
          ? settings.activeMarketplaces 
          : [settings.activeMarketplace || "shutterstock"];

        const customPrompts: string[] = [];
        activeMarketplaces.forEach((mId) => {
          const matchedTemplate = templates.find((t) => t.marketplaceId === mId);
          if (matchedTemplate && matchedTemplate.promptModifier) {
            customPrompts.push(`[${mId.toUpperCase()}] Rules: ${matchedTemplate.promptModifier}`);
          }
        });
        const combinedPromptModifier = customPrompts.join("\n");

        const payload = {
          image: target.dataUrl,
          mimeType: target.mimeType,
          provider: settings.providerConfig.provider,
          apiKey: settings.providerConfig.apiKey,
          baseUrl: settings.providerConfig.baseUrl,
          model: settings.providerConfig.model,
          customFormat: settings.providerConfig.customFormat,
          preset: settings.preset,
          marketplace: activeMarketplaces,
          customPrompt: combinedPromptModifier,
        };

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.title) {
          setQueueItems((prev) => {
            return prev.map((item) => {
              if (item.id === target.id) {
                const updated: QueueItem = {
                  ...item,
                  status: "completed",
                  progress: 100,
                  result: data
                };
                saveQueueItem(updated);
                return updated;
              }
              return item;
            });
          });
        } else {
          throw new Error(data.error || "Malformed model response. Expected JSON metadata layout.");
        }

      } catch (err: any) {
        console.error("Single image generation failed:", err);
        setQueueItems((prev) => {
          return prev.map((item) => {
            if (item.id === target.id) {
              const updated: QueueItem = {
                ...item,
                status: "failed",
                progress: 0,
                error: err?.message || "Failed to process image."
              };
              saveQueueItem(updated);
              return updated;
            }
            return item;
          });
        });
      }
    }

    setIsProcessing(false);
  };

  const handleStopGenerating = () => {
    stopSignalRef.current = true;
    setIsProcessing(false);
  };

  const handleSaveSettings = async (updatedSettings: AppSettings) => {
    setSettings(updatedSettings);
    await saveAppSettings(updatedSettings);
  };

  const handleSaveTemplates = async (updatedTemplates: MarketplaceTemplate[]) => {
    setTemplates(updatedTemplates);
    await saveTemplates(updatedTemplates);
  };

  const handleOpenHistoryItem = (id: string) => {
    // Navigate directly to generator screen & set focus
    setActiveTab("generate");
    // Wait a brief tick for render
    setTimeout(() => {
      const tabElement = document.getElementById("generate-view");
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Navigations tabs specs
  const navTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "generate", label: "Generate Metadata", icon: Layers },
    { id: "history", label: "History Log", icon: FolderOpen },
    { id: "templates", label: "Prompt Library", icon: Bookmark },
    { id: "settings", label: "API & Settings", icon: Settings },
  ];

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="space-y-4">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-neutral-600">Initializing sandboxed workspace databases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 flex flex-col md:flex-row">
      
      {/* SIDEBAR: Desktop Nav */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-neutral-100 p-6 justify-between">
        <div className="space-y-8">
          {/* Branded Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="font-display font-bold text-lg tracking-tight text-neutral-950">
                Microstock AI
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider pl-1">
              Metadata Studio v1.0
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                  id={`nav-tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Local Sandboxed status badge */}
        <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-100 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase">
            <span>Gateway Handshake</span>
            <span className={`h-1.5 w-1.5 rounded-full ${apiStatus.ok ? "bg-green-500" : "bg-red-500"}`}></span>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-neutral-800 leading-none">
              {SUPPORTED_MARKETPLACES.find(m => m.id === settings.activeMarketplace)?.name}
            </p>
            <p className="text-[9px] text-neutral-400 font-mono leading-none capitalize">
              {settings.providerConfig.provider} ({settings.providerConfig.model})
            </p>
          </div>

          <div className="flex gap-2 items-center text-[10px] text-neutral-500 pt-2 border-t border-neutral-200/60 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <span>Local Database Active</span>
          </div>
        </div>
      </aside>

      {/* MOBILE BAR */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-neutral-100 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 p-1.5 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display font-bold text-sm tracking-tight text-neutral-950">
            Microstock AI
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-neutral-600 rounded-lg hover:bg-neutral-100 transition"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-100 p-4 space-y-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && (
          <DashboardView
            queueItems={queueItems}
            apiStatus={apiStatus}
            onNavigate={(tab) => setActiveTab(tab)}
            activeMarketplaces={settings.activeMarketplaces || [settings.activeMarketplace || "shutterstock"]}
            provider={settings.providerConfig.provider}
          />
        )}

        {activeTab === "generate" && (
          <GenerateView
            queueItems={queueItems}
            templates={templates}
            onAddFiles={handleAddFiles}
            onRemoveItem={handleRemoveItem}
            onClearQueue={handleClearQueue}
            onStartGenerating={handleStartGenerating}
            onStopGenerating={handleStopGenerating}
            onUpdateMetadata={handleUpdateMetadata}
            activeMarketplaces={settings.activeMarketplaces || [settings.activeMarketplace || "shutterstock"]}
            onChangeMarketplaces={(ids) => handleSaveSettings({ ...settings, activeMarketplaces: ids, activeMarketplace: ids[0] || "shutterstock" })}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === "history" && (
          <HistoryView
            queueItems={queueItems}
            onRemoveItem={handleRemoveItem}
            onClearHistory={handleClearHistory}
            onOpenItem={handleOpenHistoryItem}
          />
        )}

        {activeTab === "templates" && (
          <TemplatesView
            templates={templates}
            onSaveTemplates={handleSaveTemplates}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            apiStatus={apiStatus}
            onTestConnection={verifyApiConnection}
          />
        )}
      </main>
    </div>
  );
}
