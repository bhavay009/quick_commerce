import React, { useState, useRef, useCallback } from "react";
import {
    Upload, FileSpreadsheet, CheckCircle, AlertCircle, X,
    Table, Clock, Trash2, ArrowRight, FileText, Info
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useData, REQUIRED_COLUMNS } from "../context/DataContext";
import { SectionHeader, Btn } from "../components/ui";

// ═══════════════════════════════════════════════════════════════
// DATA UPLOAD — CSV / Excel ingestion
// ═══════════════════════════════════════════════════════════════

const DataUpload = ({ onSwitchMode, toast }) => {
    const { ingestData, hasData, uploadHistory, error, clearData, setError, data, kpis, snapshotCount, hasComparison } = useData();
    const [dragOver, setDragOver] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [preview, setPreview] = useState(null); // { headers, rows, filename, allRows }
    const fileRef = useRef(null);

    // ── Parse file ──────────────────────────────────────────────
    const handleFile = useCallback(async (file) => {
        if (!file) return;
        setParsing(true);
        setError(null);
        setPreview(null);

        const ext = file.name.split(".").pop().toLowerCase();

        try {
            if (ext === "csv") {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (result) => {
                        if (result.errors.length > 0 && result.data.length === 0) {
                            setError(`CSV parse error: ${result.errors[0].message}`);
                            setParsing(false);
                            return;
                        }
                        const headers = result.meta.fields || [];
                        setPreview({
                            headers,
                            rows: result.data.slice(0, 5),
                            allRows: result.data,
                            filename: file.name,
                            totalRows: result.data.length,
                        });
                        setParsing(false);
                    },
                    error: (err) => {
                        setError(`CSV parse error: ${err.message}`);
                        setParsing(false);
                    },
                });
            } else if (["xlsx", "xls"].includes(ext)) {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });
                if (jsonData.length === 0) {
                    setError("Excel file appears to be empty.");
                    setParsing(false);
                    return;
                }
                const headers = Object.keys(jsonData[0]);
                setPreview({
                    headers,
                    rows: jsonData.slice(0, 5),
                    allRows: jsonData,
                    filename: file.name,
                    totalRows: jsonData.length,
                });
                setParsing(false);
            } else {
                setError(`Unsupported file type: .${ext}. Please upload .csv, .xlsx, or .xls`);
                setParsing(false);
            }
        } catch (e) {
            setError(`File read error: ${e.message}`);
            setParsing(false);
        }
    }, [setError]);

    // ── Confirm upload ──────────────────────────────────────────
    const confirmUpload = () => {
        if (!preview) return;
        const success = ingestData(preview.allRows, preview.headers, preview.filename);
        if (success) {
            toast(`✅ ${preview.totalRows} rows ingested from ${preview.filename}`);
            setPreview(null);
        }
    };

    // ── Drag handlers ───────────────────────────────────────────
    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        handleFile(file);
    }, [handleFile]);

    const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);

    return (
        <div className="space-y-6 anim-fade">
            {/* ─── Header ────────────────────────────────────────── */}
            <div className="glass-light rounded-xl px-5 py-4 flex items-center gap-3">
                <Info size={16} className="text-violet-400" />
                <span className="text-sm text-gray-300">Manual upload (API sync coming soon)</span>
                <span className="text-xs text-gray-500 ml-auto">Supports CSV, XLSX, XLS from any quick-commerce ad platform</span>
            </div>

            {/* ─── Upload Zone ───────────────────────────────────── */}
            {!preview && (
                <div
                    className={`upload-zone rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragOver ? "upload-zone-active" : ""}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileRef.current?.click()}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${dragOver ? "scale-110" : ""}`}
                        style={{ background: "linear-gradient(135deg,#7C3AED,#a78bfa)", boxShadow: dragOver ? "0 0 40px rgba(124,58,237,0.5)" : "0 0 20px rgba(124,58,237,0.3)" }}>
                        <Upload size={28} className="text-white" />
                    </div>
                    <div className="text-lg font-semibold text-white mb-1">
                        {parsing ? "Parsing file..." : "Drop your file here"}
                    </div>
                    <div className="text-sm text-gray-400 mb-4">or click to browse</div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> CSV</span>
                        <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> XLSX</span>
                        <span className="flex items-center gap-1"><FileSpreadsheet size={12} /> XLS</span>
                    </div>

                    {/* Required columns hint */}
                    <div className="mt-6 glass rounded-xl px-5 py-3 max-w-md">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Required Columns</div>
                        <div className="flex flex-wrap gap-2">
                            {REQUIRED_COLUMNS.map(c => (
                                <span key={c} className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize">{c}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Error State ───────────────────────────────────── */}
            {error && (
                <div className="rounded-xl p-5 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="text-sm text-red-300 font-semibold mb-1">Upload Error</div>
                        <div className="text-xs text-gray-400 leading-relaxed">{error}</div>
                    </div>
                    <button onClick={() => setError(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                </div>
            )}

            {/* ─── Preview State ─────────────────────────────────── */}
            {preview && (
                <div className="glass rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                                <FileText size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-sm text-white font-semibold">{preview.filename}</div>
                                <div className="text-xs text-gray-500">{preview.totalRows.toLocaleString()} rows · {preview.headers.length} columns</div>
                            </div>
                        </div>
                        <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-red-400 transition-all"><X size={16} /></button>
                    </div>

                    {/* Column check */}
                    <div className="glass-light rounded-xl p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Column Mapping</div>
                        <div className="flex flex-wrap gap-2">
                            {REQUIRED_COLUMNS.map(col => {
                                const found = preview.headers.some(h => {
                                    const n = h.trim().toLowerCase();
                                    return n === col || n === col + "_name" || n === col + " name";
                                });
                                return (
                                    <span key={col} className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 ${found ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                                        {found ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                        <span className="capitalize">{col}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-500">
                                    {preview.headers.slice(0, 8).map(h => (
                                        <th key={h} className="text-left pb-2 pr-4 uppercase tracking-wider text-[10px] font-semibold">{h}</th>
                                    ))}
                                    {preview.headers.length > 8 && <th className="text-left pb-2 pr-4 text-[10px] text-gray-600">+{preview.headers.length - 8} more</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row, i) => (
                                    <tr key={i} className="border-b border-white/3">
                                        {preview.headers.slice(0, 8).map(h => (
                                            <td key={h} className="py-2 pr-4 text-gray-300 truncate max-w-[150px]">{String(row[h] ?? "")}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="text-[10px] text-gray-600 mt-1">Showing first 5 of {preview.totalRows.toLocaleString()} rows</div>
                    </div>

                    {/* Confirm */}
                    <div className="flex items-center gap-3 pt-2">
                        <button onClick={confirmUpload} className="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2">
                            <CheckCircle size={14} /> Confirm & Ingest Data
                        </button>
                        <button onClick={() => setPreview(null)} className="text-sm text-gray-500 hover:text-gray-300 transition-all px-4 py-2">Cancel</button>
                    </div>
                </div>
            )}

            {/* ─── Active Data Summary ───────────────────────────── */}
            {hasData && !preview && (
                <div className="glass rounded-2xl p-6">
                    <SectionHeader title="Active Dataset" subtitle={`Currently powering all dashboards`} />
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        {[
                            { l: "Rows Ingested", v: data?.rowCount?.toLocaleString() || "—", c: "#7C3AED" },
                            { l: "Campaigns", v: kpis.activeCampaigns, c: "#10B981" },
                            { l: "Blended ROAS", v: `${kpis.blendedRoas}x`, c: kpis.blendedRoas >= 2 ? "#10B981" : "#F59E0B" },
                            { l: "Health Score", v: kpis.healthScore, c: kpis.healthScore >= 70 ? "#10B981" : "#F59E0B" },
                        ].map(s => (
                            <div key={s.l} className="glass rounded-xl p-4">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{s.l}</div>
                                <div className="mono text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onSwitchMode("command")} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium transition-all">
                            View Command Center <ArrowRight size={11} />
                        </button>
                        <button onClick={clearData} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 font-medium transition-all ml-auto">
                            <Trash2 size={11} /> Clear all data
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Snapshot Status ─────────────────────────────── */}
            {snapshotCount > 0 && !preview && (
                <div className="glass-light rounded-xl px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs text-gray-400">
                            <span className="text-cyan-300 font-semibold">{snapshotCount} snapshot{snapshotCount > 1 ? "s" : ""}</span> stored
                            {hasComparison
                                ? " · Comparison available"
                                : " · Upload another CSV to enable comparison"}
                        </span>
                    </div>
                    {hasComparison && (
                        <button onClick={() => onSwitchMode("compare")}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-all">
                            View Comparison <ArrowRight size={11} />
                        </button>
                    )}
                </div>
            )}

            {/* ─── Upload History ────────────────────────────────── */}
            {uploadHistory.length > 0 && (
                <div className="glass rounded-xl p-5">
                    <SectionHeader title="Upload History" subtitle={`${uploadHistory.length} upload${uploadHistory.length > 1 ? "s" : ""}`} />
                    <div className="space-y-2">
                        {uploadHistory.map((h, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet size={14} className="text-violet-400" />
                                    <span className="text-gray-300 font-medium">{h.filename}</span>
                                </div>
                                <span className="text-gray-500">{h.rows.toLocaleString()} rows · {h.cols} cols</span>
                                {h.snapshotId && <span className="text-[10px] text-cyan-400/60 bg-cyan-400/10 px-1.5 py-0.5 rounded">Snapshot</span>}
                                <span className="text-gray-500">{h.dateRange}</span>
                                <span className="flex items-center gap-1 text-gray-600"><Clock size={10} />{h.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Empty State Guidance ──────────────────────────── */}
            {!hasData && !preview && (
                <div className="glass rounded-xl p-6">
                    <SectionHeader title="Getting Started" subtitle="Follow these steps to activate your dashboards" />
                    <div className="space-y-3">
                        {[
                            { n: "1", t: "Export your ad report", d: "Download a CSV from Zepto, Blinkit, Instamart, or any marketplace" },
                            { n: "2", t: "Ensure required columns exist", d: "Date, Platform, Campaign, SKU, Spend, Revenue, Clicks, Impressions" },
                            { n: "3", t: "Upload above", d: "Drag-and-drop or click to browse. We'll parse and validate automatically." },
                            { n: "4", t: "Dashboards activate", d: "Command Center, Optimize, and Analyze will render your real data" },
                        ].map(s => (
                            <div key={s.n} className="flex items-start gap-3 py-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#a78bfa)" }}>{s.n}</div>
                                <div>
                                    <div className="text-sm text-white font-medium">{s.t}</div>
                                    <div className="text-xs text-gray-500">{s.d}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataUpload;
