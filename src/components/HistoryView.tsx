import React, { useState, useMemo } from "react";
import { 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  Clipboard, 
  Check, 
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle,
  Copy,
  ChevronRight,
  Info
} from "lucide-react";
import { QueueItem, SUPPORTED_MARKETPLACES } from "../types";

interface HistoryViewProps {
  queueItems: QueueItem[];
  onRemoveItem: (id: string) => void;
  onClearHistory: () => void;
  onOpenItem: (id: string) => void;
}

export default function HistoryView({
  queueItems,
  onRemoveItem,
  onClearHistory,
  onOpenItem,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Filter only completed items that have results
  const historyItems = useMemo(() => {
    return queueItems.filter((i) => i.status === "completed" && i.result);
  }, [queueItems]);

  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      const titleMatch = item.result?.title.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const fileMatch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const keywordMatch = item.result?.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) || false;
      const matchesSearch = titleMatch || fileMatch || keywordMatch;

      return matchesSearch;
    });
  }, [historyItems, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleCopyAll = (item: QueueItem) => {
    if (!item.result) return;
    const r = item.result;
    const formatted = `Title: ${r.title}\nDescription: ${r.description}\nKeywords: ${r.keywords.join(", ")}`;
    handleCopy(formatted, item.id);
  };

  const handleExportAllCSV = () => {
    if (filteredHistory.length === 0) return;

    const headers = ["Filename", "Title", "Description", "Keywords", "Categories", "Quality Score"];
    const rows = filteredHistory.map((item) => {
      const r = item.result!;
      return [
        item.filename,
        r.title,
        r.description,
        r.keywords.join(", "),
        (r.categories || []).join(", "),
        r.qualityScore || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "microstock_history_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="history-view">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-indigo-600" />
            Local Generation History
          </h1>
          <p className="text-sm text-neutral-500">
            Search, preview, and re-export previous metadata sessions stored inside IndexedDB.
          </p>
        </div>

        {historyItems.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-xs font-bold transition"
              id="btn-clear-history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear History
            </button>
            <button
              onClick={handleExportAllCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
              id="btn-export-history-csv"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export History CSV
            </button>
          </div>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 bg-white py-16 text-center max-w-xl mx-auto space-y-4">
          <FolderOpen className="h-12 w-12 text-neutral-300 mx-auto" />
          <h3 className="font-display text-lg font-bold text-neutral-800">No Generated Metadata Sessions Yet</h3>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
            Uploaded pictures that undergo successful AI analysis will populate this tab automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by file name, keyword, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              id="history-search"
            />
          </div>

          {/* History Grid List */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredHistory.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-neutral-400">
                <p className="text-xs">No history sessions match the active search filter.</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const r = item.result!;
                return (
                  <div 
                    key={item.id}
                    className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm hover:shadow-md transition duration-200 flex gap-4"
                  >
                    {/* Left Thumbnail */}
                    <div className="h-24 w-24 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 shrink-0 relative">
                      <img 
                        src={item.dataUrl} 
                        alt={item.filename} 
                        className="h-full w-full object-cover" 
                      />
                    </div>

                    {/* Right Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[150px]">
                            {item.filename}
                          </span>
                          {r.qualityScore !== undefined && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                              QS: {r.qualityScore}%
                            </span>
                          )}
                        </div>

                        <h3 className="font-display text-sm font-bold text-neutral-900 truncate mt-1">
                          {r.title}
                        </h3>

                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                          {r.description}
                        </p>
                      </div>

                      {/* Footer tags & Actions */}
                      <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-neutral-50">
                        <span className="text-[10px] text-neutral-400 font-semibold truncate max-w-[120px]">
                          {r.keywords.length} keywords
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyAll(item)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-50 rounded-lg transition"
                            title="Copy entire tags block"
                          >
                            {copiedItemId === item.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            onClick={() => onOpenItem(item.id)}
                            className="inline-flex items-center gap-1 p-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                          >
                            Open Details
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
