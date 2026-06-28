import React, { useRef, useState, useMemo } from "react";
import { 
  Upload, 
  Play, 
  Trash2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Clipboard, 
  Check, 
  RefreshCw, 
  Pause, 
  HelpCircle,
  Copy,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { 
  QueueItem, 
  SUPPORTED_MARKETPLACES, 
  MarketplaceConfig, 
  MarketplaceTemplate 
} from "../types";

interface GenerateViewProps {
  queueItems: QueueItem[];
  templates: MarketplaceTemplate[];
  onAddFiles: (files: FileList) => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onStartGenerating: (id?: string) => Promise<void>;
  onStopGenerating: () => void;
  onUpdateMetadata: (id: string, updatedFields: any) => void;
  activeMarketplaces: string[];
  onChangeMarketplaces: (ids: string[]) => void;
  isProcessing: boolean;
}

export default function GenerateView({
  queueItems,
  templates,
  onAddFiles,
  onRemoveItem,
  onClearQueue,
  onStartGenerating,
  onStopGenerating,
  onUpdateMetadata,
  activeMarketplaces,
  onChangeMarketplaces,
  isProcessing,
}: GenerateViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Clipboard copied indicators
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Search queue filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const activeTemplates = useMemo(() => {
    return templates.filter((t) => activeMarketplaces.includes(t.marketplaceId));
  }, [templates, activeMarketplaces]);

  // Filtered queue items
  const filteredQueueItems = useMemo(() => {
    return queueItems.filter((item) => {
      const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.result?.keywords && item.result.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [queueItems, searchQuery, statusFilter]);

  // Selected item details
  const selectedItem = useMemo(() => {
    return queueItems.find((item) => item.id === selectedItemId) || null;
  }, [queueItems, selectedItemId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = (item: QueueItem) => {
    if (!item.result) return;
    const r = item.result;
    const text = `Title: ${r.title}\nDescription: ${r.description}\nKeywords: ${r.keywords.join(", ")}`;
    handleCopy(text, "all");
  };

  const handleExportCSVRow = (item: QueueItem) => {
    if (!item.result) return;
    const r = item.result;
    const row = `"${item.filename}","${r.title.replace(/"/g, '""')}","${r.description.replace(/"/g, '""')}","${r.keywords.join(", ")}","${(r.categories || []).join(", ")}"`;
    handleCopy(row, "csv");
  };

  // Build the CSV for all completed items based on specific marketplace rules
  const handleExportAllCSV = (mId: string) => {
    const completed = queueItems.filter((i) => i.status === "completed" && i.result);
    if (completed.length === 0) return;

    let headers = ["Filename", "Title", "Description", "Keywords", "Categories"];
    
    // Custom header per agency
    if (mId === "adobe-stock") {
      headers = ["Filename", "Title", "Keywords", "Category", "AI Generated Disclosure"];
    } else if (mId === "istock") {
      headers = ["Filename", "Headline", "Description", "Keywords", "Location", "Concept"];
    }

    const rows = completed.map((item) => {
      const r = item.result!;
      if (mId === "adobe-stock") {
        return [
          item.filename,
          r.title,
          r.keywords.join(", "),
          (r.categories || []).join(", "),
          r.aiGeneratedDisclosure ? "Yes" : "No"
        ];
      } else if (mId === "istock") {
        return [
          item.filename,
          r.title,
          r.description,
          r.keywords.join(", "),
          r.location || "",
          r.concept || ""
        ];
      }
      return [
        item.filename,
        r.title,
        r.description,
        r.keywords.join(", "),
        (r.categories || []).join(", ")
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${(val || "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `metadata_${mId}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 animate-fade-in" id="generate-view">
      
      {/* LEFT COLUMN: Queue & Upload Control (Span 7) */}
      <div className="lg:col-span-7 space-y-6 flex flex-col">
        {/* Upload Panel */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center min-h-[180px] bg-white ${
            dragActive 
              ? "border-indigo-600 bg-indigo-50/50" 
              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
          }`}
          id="dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/tiff,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="rounded-xl bg-neutral-100 p-3 text-neutral-600 mb-3 group-hover:scale-105 transition">
            <Upload className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-neutral-800">
            Drag & Drop photos, or <span className="text-indigo-600 underline">browse files</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5 max-w-sm leading-normal">
            Supports JPEG, PNG, WEBP, TIFF, and SVG files. Multiple uploads run through a prioritized background queue.
          </p>
        </div>

        {/* Configuration Selector */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Generator Guidelines
            </h3>
            <span className="text-[10px] text-neutral-400">Rules Auto-Injected</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Target Marketplaces (Select Multiple)
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
                        onChangeMarketplaces(newSelection);
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

            {activeTemplates.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Active Template Modifiers
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeTemplates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-neutral-200 bg-indigo-50/30 p-2.5 text-xs font-semibold text-neutral-700 flex flex-col justify-between">
                      <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wide">
                        {SUPPORTED_MARKETPLACES.find(m => m.id === t.marketplaceId)?.name || t.marketplaceId}
                      </span>
                      <p className="text-[10px] text-neutral-500 font-medium italic mt-1 leading-normal">
                        "{t.promptModifier}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Queue Items Table */}
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-neutral-900">
                Generation Queue ({queueItems.length})
              </h2>
              <p className="text-[11px] text-neutral-500">
                Select an item in the list to review generated tags.
              </p>
            </div>

            <div className="flex gap-2">
              {queueItems.length > 0 && (
                <>
                  <button
                    onClick={onClearQueue}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3 py-1.5 text-xs font-semibold transition"
                    id="btn-clear-queue"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear List
                  </button>

                  {isProcessing ? (
                    <button
                      onClick={onStopGenerating}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-semibold transition animate-pulse"
                      id="btn-stop-queue"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause Queue
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartGenerating()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-semibold transition shadow-sm"
                      id="btn-start-queue"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Process Queue
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          {queueItems.length > 0 && (
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/30 flex flex-wrap gap-3 items-center justify-between">
              <input
                type="text"
                placeholder="Search file name, status, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-1 text-xs focus:border-indigo-500 focus:outline-none min-w-[200px]"
                id="search-queue-input"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-neutral-200 p-1 text-xs bg-white text-neutral-600 font-medium"
                >
                  <option value="all">All statuses</option>
                  <option value="waiting">Waiting</option>
                  <option value="generating">Generating</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          )}

          {/* Queue List Content */}
          <div className="overflow-y-auto max-h-[350px] divide-y divide-neutral-100 flex-1">
            {filteredQueueItems.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <Upload className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-xs">No files matching the current queue filter.</p>
              </div>
            ) : (
              filteredQueueItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition ${
                      isSelected ? "bg-indigo-50/40 border-l-4 border-indigo-600" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      <div className="relative h-11 w-11 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                        <img 
                          src={item.dataUrl} 
                          alt={item.filename} 
                          className="h-full w-full object-cover" 
                        />
                      </div>

                      {/* File Details */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-800 truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        <div className="flex gap-2 items-center text-[10px] text-neutral-400 mt-0.5">
                          <span>{item.fileSizeStr}</span>
                          <span>&bull;</span>
                          <span>{item.resolution || "Unknown res"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge & Individual Trigger */}
                    <div className="flex items-center gap-3">
                      {item.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-700">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                      {item.status === "generating" && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 anim-pulse-custom">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          AI Processing {item.progress}%
                        </div>
                      )}
                      {item.status === "waiting" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                          Waiting
                        </span>
                      )}

                      {/* Item Actions */}
                      <div className="flex gap-1">
                        {item.status !== "generating" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartGenerating(item.id);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 rounded-lg transition"
                            title="Regenerate single"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.id);
                            if (isSelected) setSelectedItemId(null);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-lg transition"
                          title="Delete from list"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: AI Generation Metadata Details & Action Box (Span 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Bulk Actions Card */}
        {queueItems.length > 0 && queueItems.some((i) => i.status === "completed") && (
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Bulk Export Controls
            </h3>
            <p className="text-[11px] text-neutral-500">
              Download the metadata generated in this queue in perfectly structured agency-specific formats.
            </p>
            <div className="grid gap-2">
              {activeMarketplaces.map((mId) => {
                const config = SUPPORTED_MARKETPLACES.find((m) => m.id === mId);
                if (!config) return null;
                return (
                  <button
                    key={mId}
                    onClick={() => handleExportAllCSV(mId)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export CSV for {config.name}
                  </button>
                );
              })}
              {activeMarketplaces.length === 0 && (
                <p className="text-xs text-neutral-400 italic text-center">
                  Select at least one marketplace to enable bulk CSV exports.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Selected Item Detail / Empty state */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm min-h-[400px] flex flex-col">
          {!selectedItem ? (
            <div className="my-auto text-center text-neutral-400 p-6 space-y-3">
              <Layers className="h-10 w-10 text-neutral-300 mx-auto" />
              <p className="text-xs font-semibold text-neutral-700">No Item Selected</p>
              <p className="text-[11px] text-neutral-400 leading-normal max-w-xs mx-auto">
                Click on any item in the generation queue list on the left to review its detailed keywords, quality score, and copy individual metadata records.
              </p>
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              
              {/* Item Overview Panel */}
              <div className="space-y-4">
                <div className="flex gap-3 items-start border-b border-neutral-100 pb-3">
                  <div className="h-16 w-16 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                    <img 
                      src={selectedItem.dataUrl} 
                      alt={selectedItem.filename} 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-neutral-800 truncate" title={selectedItem.filename}>
                      {selectedItem.filename}
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {selectedItem.fileSizeStr} &bull; {selectedItem.resolution}
                    </p>
                    {selectedItem.result?.qualityScore !== undefined && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-700 mt-1.5 border border-indigo-100">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI Quality Score: {selectedItem.result.qualityScore}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                {selectedItem.status === "generating" && (
                  <div className="rounded-xl bg-indigo-50 p-6 border border-indigo-100 text-center space-y-3">
                    <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-indigo-950">Generating Metadata...</p>
                    <p className="text-[11px] text-indigo-800/80 leading-normal">
                      The AI analyzer is indexing the colors, concepts, shapes, objects, and emotional composition of the image.
                    </p>
                  </div>
                )}

                {selectedItem.status === "failed" && (
                  <div className="rounded-xl bg-red-50 p-6 border border-red-100 text-center space-y-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 mx-auto" />
                    <p className="text-xs font-bold text-red-950">Generation Failed</p>
                    <p className="text-[11px] text-red-800/80 leading-normal">
                      {selectedItem.error || "An unexpected error occurred during processing."}
                    </p>
                    <button
                      onClick={() => onStartGenerating(selectedItem.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry Generation
                    </button>
                  </div>
                )}

                {selectedItem.status === "waiting" && (
                  <div className="rounded-xl bg-neutral-50 p-6 border border-neutral-100 text-center space-y-3">
                    <Clock className="h-6 w-6 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-neutral-700">Waiting in Queue</p>
                    <p className="text-[11px] text-neutral-500 leading-normal">
                      This item will be processed as soon as the queue processing is started.
                    </p>
                    <button
                      onClick={() => onStartGenerating(selectedItem.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Generate Now
                    </button>
                  </div>
                )}

                {/* Successful Generation Metadata Review */}
                {selectedItem.status === "completed" && selectedItem.result && (
                  <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Title</span>
                        <button
                          onClick={() => handleCopy(selectedItem.result!.title, "title")}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {copiedField === "title" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Copy Title
                        </button>
                      </div>
                      <input
                        type="text"
                        value={selectedItem.result.title}
                        onChange={(e) => onUpdateMetadata(selectedItem.id, { ...selectedItem.result, title: e.target.value })}
                        className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs font-semibold text-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        id="metadata-title-input"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</span>
                        <button
                          onClick={() => handleCopy(selectedItem.result!.description, "description")}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {copiedField === "description" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Copy Description
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={selectedItem.result.description}
                        onChange={(e) => onUpdateMetadata(selectedItem.id, { ...selectedItem.result, description: e.target.value })}
                        className="w-full rounded-xl border border-neutral-200 p-2.5 text-xs font-medium text-neutral-700 leading-normal focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                        id="metadata-description-input"
                      />
                    </div>

                    {/* Categories */}
                    {selectedItem.result.categories && selectedItem.result.categories.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Recommended Categories</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.result.categories.map((cat, idx) => (
                            <span 
                              key={idx}
                              className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-700 border border-neutral-200/50"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Marketplace Specific details */}
                    <div className="border-t border-b border-neutral-100 py-3 grid gap-3 grid-cols-2">
                      {/* Copy space detection */}
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block">Copy Space</span>
                        <span className="text-xs font-medium text-neutral-700">
                          {selectedItem.result.copySpace || "None"}
                        </span>
                      </div>

                      {/* People Details */}
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block">People (Age/Gender)</span>
                        <span className="text-xs font-medium text-neutral-700">
                          {selectedItem.result.peopleCount ? `${selectedItem.result.peopleCount} (${selectedItem.result.peopleDetails})` : "None"}
                        </span>
                      </div>

                      {/* AI generated disclosure */}
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block">AI Generated Art</span>
                        <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${selectedItem.result.aiGeneratedDisclosure ? "bg-amber-500" : "bg-neutral-300"}`}></span>
                          {selectedItem.result.aiGeneratedDisclosure ? "Yes (Adobe Tag Req.)" : "No"}
                        </span>
                      </div>

                      {/* Copyright warning alert */}
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block">Trademarks / Logos</span>
                        <span className="text-xs font-medium text-neutral-700">
                          {selectedItem.result.brandWarning && selectedItem.result.brandWarning !== "None" ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Brand Spotted
                            </span>
                          ) : (
                            "None spotted"
                          )}
                        </span>
                      </div>

                      {/* Conceptual Mood tags */}
                      {selectedItem.result.concept && (
                        <div className="col-span-2">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">Underlying Theme / Concept</span>
                          <span className="text-xs font-medium text-indigo-950">
                            {selectedItem.result.concept}
                          </span>
                        </div>
                      )}

                      {/* Editorial Captions */}
                      {selectedItem.result.editorialCaption && selectedItem.result.editorialCaption !== "None" && (
                        <div className="col-span-2 space-y-1">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">iStock Editorial Caption</span>
                          <p className="text-[11px] leading-normal text-neutral-600 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                            {selectedItem.result.editorialCaption}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Keywords tags array */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Keywords ({selectedItem.result.keywords.length})
                        </span>
                        <button
                          onClick={() => handleCopy(selectedItem.result!.keywords.join(", "), "keywords")}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {copiedField === "keywords" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          Copy Keywords
                        </button>
                      </div>

                      <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-2.5 max-h-[160px] overflow-y-auto flex flex-wrap gap-1.5">
                        {selectedItem.result.keywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-medium border flex items-center gap-1 ${
                              idx < 10 
                                ? "bg-indigo-50 border-indigo-100 text-indigo-700 font-semibold" 
                                : "bg-white border-neutral-200 text-neutral-600"
                            }`}
                            title={idx < 10 ? "Top 10 High Importance Keyword (Adobe)" : `Keyword #${idx + 1}`}
                          >
                            {kw}
                            {idx < 10 && <span className="text-[8px] bg-indigo-200 text-indigo-800 rounded-full px-1">#{idx + 1}</span>}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-neutral-400">
                        * High priority keywords (1-10) are highlighted with numbers for Getty & Adobe Stock optimization.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail Action box */}
              {selectedItem.status === "completed" && selectedItem.result && (
                <div className="pt-4 border-t border-neutral-100 mt-6 grid gap-2 grid-cols-2">
                  <button
                    onClick={() => handleExportCSVRow(selectedItem)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-700 transition"
                  >
                    {copiedField === "csv" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                    Copy CSV Row
                  </button>

                  <button
                    onClick={() => handleCopyAll(selectedItem)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-bold transition shadow-sm"
                  >
                    {copiedField === "all" ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                    Copy All Tags
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
