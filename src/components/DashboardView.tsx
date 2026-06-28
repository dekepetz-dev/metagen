import React, { useMemo } from "react";
import { 
  Image, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity, 
  Globe, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Database,
  FileSpreadsheet
} from "lucide-react";
import { QueueItem, SUPPORTED_MARKETPLACES } from "../types";

interface DashboardViewProps {
  queueItems: QueueItem[];
  apiStatus: { ok: boolean; message: string; testing: boolean };
  onNavigate: (tab: string) => void;
  activeMarketplaces: string[];
  provider: string;
}

export default function DashboardView({
  queueItems,
  apiStatus,
  onNavigate,
  activeMarketplaces,
  provider,
}: DashboardViewProps) {
  const stats = useMemo(() => {
    const total = queueItems.length;
    const completed = queueItems.filter((i) => i.status === "completed").length;
    const failed = queueItems.filter((i) => i.status === "failed").length;
    const pending = queueItems.filter((i) => i.status === "waiting" || i.status === "generating").length;

    // Calculate average quality score
    const completedItemsWithScore = queueItems.filter(
      (i) => i.status === "completed" && i.result?.qualityScore !== undefined
    );
    const avgQuality = completedItemsWithScore.length > 0
      ? Math.round(
          completedItemsWithScore.reduce((acc, curr) => acc + (curr.result?.qualityScore || 0), 0) /
            completedItemsWithScore.length
        )
      : 0;

    // Keywords count
    const totalKeywordsGenerated = queueItems.reduce((acc, curr) => {
      if (curr.status === "completed" && curr.result?.keywords) {
        return acc + curr.result.keywords.length;
      }
      return acc;
    }, 0);

    return { total, completed, failed, pending, avgQuality, totalKeywordsGenerated };
  }, [queueItems]);

  const activeMarketplacesNames = useMemo(() => {
    return activeMarketplaces.map(id => SUPPORTED_MARKETPLACES.find((m) => m.id === id)?.name || id).join(", ");
  }, [activeMarketplaces]);

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-view">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 p-8 text-white md:p-10 shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-3 w-3" />
            AI-Powered Metadata Generation
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Streamline Your Microstock Workflow
          </h1>
          <p className="text-sm text-neutral-400 sm:text-base leading-relaxed">
            Generate and export highly relevant, SEO-optimized descriptions, titles, categories, and keyword listings custom-tailored for 11+ microstock agencies simultaneously.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onNavigate("generate")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-100 transition duration-200"
              id="btn-quick-generate"
            >
              Start Generating
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-white transition duration-200"
              id="btn-quick-settings"
            >
              Configure API
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Files */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200" id="stat-total-files">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Uploads</span>
            <div className="rounded-xl bg-neutral-50 p-2.5 text-neutral-600">
              <Image className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-900">{stats.total}</span>
            <span className="text-xs font-medium text-neutral-400">files loaded</span>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200" id="stat-completed-files">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Successful</span>
            <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 text-green-600">{stats.completed}</span>
            <span className="text-xs font-medium text-neutral-400">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
            </span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200" id="stat-pending-queue">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">In Queue</span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 text-amber-600">{stats.pending}</span>
            <span className="text-xs font-medium text-neutral-400">processing/waiting</span>
          </div>
        </div>

        {/* Avg Quality */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition duration-200" id="stat-avg-quality">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Commercial viability</span>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-neutral-900 text-indigo-600">{stats.avgQuality}%</span>
            <span className="text-xs font-medium text-neutral-400">avg quality score</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Status & Active Specs */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* API Health & Engine Status */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-neutral-500" />
              Service Status
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your server processes queries with strict privacy. No assets are ever uploaded or retained in any secondary servers.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-xs font-medium text-neutral-600">Active AI Model</span>
                <span className="rounded-md bg-neutral-200 px-2.5 py-1 text-[10px] font-mono text-neutral-700 capitalize">
                  {provider} model
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-xs font-medium text-neutral-600">API Handshake</span>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${apiStatus.ok ? "bg-green-500" : "bg-red-500"}`}></span>
                  <span className={`text-xs font-semibold ${apiStatus.ok ? "text-green-600" : "text-red-500"}`}>
                    {apiStatus.ok ? "Healthy" : "Needs Key"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-xs font-medium text-neutral-600">Active Agency Format</span>
                <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 max-w-[150px] truncate text-right" title={activeMarketplacesNames}>
                  {activeMarketplacesNames}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-100 mt-6 flex justify-between items-center">
            <span className="text-xs text-neutral-400">Configured locally</span>
            <button
              onClick={() => onNavigate("settings")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Manage Credentials &rarr;
            </button>
          </div>
        </div>

        {/* Dashboard Insights */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:col-span-2 space-y-4">
          <h3 className="font-display text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-neutral-500" />
            Microstock Distribution Ecosystem
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Generate metadata compliant with core marketplace guidelines simultaneously. Select any item in your History or Generation Queue to export instantly.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="rounded-xl border border-neutral-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-neutral-700">CSV Export Compatibility</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Exports perfectly structured CSV files matching individual column standards for <strong>Shutterstock, Adobe Stock, Getty/iStock, and Pond5</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-neutral-700">Keyword & Tag Cache</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Generates a massive <strong>{stats.totalKeywordsGenerated} keywords</strong> catalogued locally inside IndexedDB. Fully indexable, editable, and copyable.
              </p>
            </div>
          </div>

          {/* Guidelines Mini checklist */}
          <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100/50 space-y-2">
            <span className="text-xs font-bold text-indigo-950 block">Success Tip for Microstock Contributor:</span>
            <ul className="text-[11px] text-indigo-900/90 list-disc pl-4 space-y-1">
              <li>Keep titles literal, descriptive, and free of spammy buzzwords like "beautiful", "high-quality".</li>
              <li>Ensure Adobe Stock submissions declare the <strong>AI Generated Disclosure</strong> when relevant.</li>
              <li>Always check Getty/iStock caption guidelines requiring precise geographical contexts.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
