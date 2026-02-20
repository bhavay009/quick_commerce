import React, { useState, useMemo } from "react";
import {
    GitCompareArrows, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
    Upload, Clock, FileSpreadsheet, Filter, ChevronDown, ChevronUp, AlertCircle,
    Sparkles, Plus, MinusCircle, Info
} from "lucide-react";
import { useData } from "../context/DataContext";
import { fmt } from "../data/mockData";

// ═══════════════════════════════════════════════════════════════
// SNAPSHOT COMPARE — before vs after analysis
// ═══════════════════════════════════════════════════════════════

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-4">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
);

const Badge = ({ text, color, outline }) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${outline ? "border" : ""}`}
        style={{ color, background: color + "18", borderColor: outline ? color + "40" : "transparent" }}>
        {text}
    </span>
);

// Outcome badge with icon
const OutcomeBadge = ({ outcome }) => {
    const config = {
        Improved: { color: "#10B981", icon: TrendingUp, bg: "rgba(16,185,129,0.1)" },
        Declined: { color: "#EF4444", icon: TrendingDown, bg: "rgba(239,68,68,0.1)" },
        Neutral: { color: "#6B7280", icon: Minus, bg: "rgba(107,114,128,0.1)" },
        New: { color: "#3B82F6", icon: Plus, bg: "rgba(59,130,246,0.1)" },
        Inactive: { color: "#F59E0B", icon: MinusCircle, bg: "rgba(245,158,11,0.1)" },
    }[outcome] || { color: "#6B7280", icon: Minus, bg: "rgba(107,114,128,0.1)" };

    const Icon = config.icon;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ color: config.color, background: config.bg }}>
            <Icon size={10} /> {outcome}
        </span>
    );
};

// Delta display with arrow and color
const DeltaValue = ({ value, pct, isRoas = false, invert = false }) => {
    if (value == null) return <span className="text-gray-600">—</span>;
    const positive = invert ? value < 0 : value > 0;
    const color = value === 0 ? "#6B7280" : positive ? "#10B981" : "#EF4444";
    const Arrow = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;

    return (
        <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color }}>
            <Arrow size={11} />
            {isRoas ? `${value > 0 ? "+" : ""}${value}x` : (value > 0 ? "+" : "") + fmt(value)}
            {pct != null && <span className="text-[10px] opacity-70">({pct > 0 ? "+" : ""}{pct}%)</span>}
        </span>
    );
};

const SnapshotCompare = ({ onSwitchMode, toast }) => {
    const { snapshots, comparisonResult, snapshotCount, hasComparison, selectedPlatform } = useData();
    const [sortField, setSortField] = useState("roas");
    const [sortDir, setSortDir] = useState("desc");
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedRow, setExpandedRow] = useState(null);

    // Filter comparisons by platform
    const filteredComparisons = useMemo(() => {
        if (!comparisonResult) return [];
        let items = comparisonResult.comparisons;
        if (selectedPlatform !== "All Platforms") {
            items = items.filter(c => c.platform === selectedPlatform);
        }
        if (statusFilter !== "all") {
            items = items.filter(c => c.status === statusFilter || c.outcome === statusFilter);
        }
        // Sort
        items = [...items].sort((a, b) => {
            if (a.status !== b.status) {
                const order = { matched: 0, new: 1, inactive: 2 };
                return order[a.status] - order[b.status];
            }
            if (!a.delta || !b.delta) return 0;
            const aVal = Math.abs(a.delta[sortField] || 0);
            const bVal = Math.abs(b.delta[sortField] || 0);
            return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        });
        return items;
    }, [comparisonResult, selectedPlatform, statusFilter, sortField, sortDir]);

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortField(field); setSortDir("desc"); }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />;
    };

    // ── EMPTY STATE ──────────────────────────────────────────
    if (snapshotCount === 0) {
        return (
            <div className="space-y-6 anim-fade">
                <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: "linear-gradient(135deg,#06B6D4,#22d3ee)", boxShadow: "0 0 30px rgba(6,182,212,0.3)" }}>
                        <GitCompareArrows size={28} className="text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Snapshots Yet</h2>
                    <p className="text-sm text-gray-400 max-w-md mb-6">
                        Upload your first CSV to create a snapshot. After uploading a second file, you'll see a detailed comparison of how your metrics changed.
                    </p>
                    <button onClick={() => onSwitchMode("upload")}
                        className="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Upload size={14} /> Upload First CSV
                    </button>
                </div>
            </div>
        );
    }

    if (snapshotCount === 1) {
        return (
            <div className="space-y-6 anim-fade">
                {/* Single snapshot info */}
                <div className="glass rounded-2xl p-8 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: "linear-gradient(135deg,#06B6D4,#22d3ee)", boxShadow: "0 0 30px rgba(6,182,212,0.3)" }}>
                        <GitCompareArrows size={24} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">1 Snapshot Stored</h2>
                    <p className="text-sm text-gray-400 max-w-md mb-2">
                        Upload another CSV to enable comparison. We'll match SKUs and campaigns to show exactly how performance changed.
                    </p>
                    <div className="glass-light rounded-xl px-4 py-3 mb-5 flex items-center gap-3 text-xs">
                        <FileSpreadsheet size={14} className="text-cyan-400" />
                        <span className="text-gray-300 font-medium">{snapshots[0].filename}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500">{snapshots[0].records.length} records</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500">{snapshots[0].date_range_label}</span>
                    </div>
                    <button onClick={() => onSwitchMode("upload")}
                        className="btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Upload size={14} /> Upload Second CSV
                    </button>
                </div>
            </div>
        );
    }

    // ── COMPARISON VIEW ──────────────────────────────────────
    const result = comparisonResult;
    const currentSnap = snapshots.find(s => s.snapshot_id === result.current_snapshot_id);
    const previousSnap = snapshots.find(s => s.snapshot_id === result.previous_snapshot_id);

    return (
        <div className="space-y-6 anim-fade">

            {/* ═══ SNAPSHOT TIMELINE ═════════════════════════════ */}
            <div className="glass rounded-xl p-5">
                <SectionHeader title="Snapshot Timeline" subtitle={`${snapshotCount} uploads stored · Comparing latest two`} />
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {snapshots.map((snap, i) => {
                        const isCurrent = snap.snapshot_id === result.current_snapshot_id;
                        const isPrevious = snap.snapshot_id === result.previous_snapshot_id;
                        const isActive = isCurrent || isPrevious;
                        return (
                            <React.Fragment key={snap.snapshot_id}>
                                {i > 0 && <div className="w-8 h-px bg-white/10 flex-shrink-0" />}
                                <div className={`flex-shrink-0 rounded-xl px-4 py-3 transition-all ${isActive ? "border" : "glass-light"}`}
                                    style={isActive ? {
                                        borderColor: isCurrent ? "#06B6D4" : "#7C3AED",
                                        background: isCurrent ? "rgba(6,182,212,0.08)" : "rgba(124,58,237,0.08)",
                                    } : {}}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-cyan-400" : isPrevious ? "bg-violet-400" : "bg-gray-600"}`} />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider"
                                            style={{ color: isCurrent ? "#06B6D4" : isPrevious ? "#7C3AED" : "#6B7280" }}>
                                            {isCurrent ? "Current" : isPrevious ? "Previous" : `#${i + 1}`}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-300 font-medium truncate max-w-[150px]">{snap.filename}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{snap.date_range_label}</div>
                                    <div className="text-[10px] text-gray-600 mt-0.5">{snap.records.length} records</div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* ═══ TIME GAP & SUMMARY BAR ═══════════════════════ */}
            <div className="glass-light rounded-xl px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={14} className="text-cyan-400" />
                    <span className="text-sm text-gray-300">Snapshots are <span className="text-white font-semibold">{result.time_gap}</span></span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400"><TrendingUp size={11} /> {result.summary.improved} improved</span>
                    <span className="flex items-center gap-1 text-red-400"><TrendingDown size={11} /> {result.summary.declined} declined</span>
                    <span className="flex items-center gap-1 text-gray-500"><Minus size={11} /> {result.summary.neutral} neutral</span>
                    {result.summary.new > 0 && <span className="flex items-center gap-1 text-blue-400"><Plus size={11} /> {result.summary.new} new</span>}
                    {result.summary.inactive > 0 && <span className="flex items-center gap-1 text-amber-400"><MinusCircle size={11} /> {result.summary.inactive} inactive</span>}
                </div>
            </div>

            {/* ═══ KPI DELTAS ═══════════════════════════════════ */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total Spend", prev: previousSnap?.totals.spend, curr: currentSnap?.totals.spend, delta: result.totalsDelta.spend, pct: result.totalsDelta.spendPct, invert: true },
                    { label: "Total Revenue", prev: previousSnap?.totals.revenue, curr: currentSnap?.totals.revenue, delta: result.totalsDelta.revenue, pct: result.totalsDelta.revenuePct },
                    { label: "Total Orders", prev: previousSnap?.totals.orders, curr: currentSnap?.totals.orders, delta: result.totalsDelta.orders, pct: result.totalsDelta.ordersPct },
                    { label: "Blended ROAS", prev: previousSnap?.totals.spend > 0 ? +(previousSnap.totals.revenue / previousSnap.totals.spend).toFixed(2) : 0, curr: currentSnap?.totals.spend > 0 ? +(currentSnap.totals.revenue / currentSnap.totals.spend).toFixed(2) : 0, delta: result.totalsDelta.roas, isRoas: true },
                ].map(kpi => (
                    <div key={kpi.label} className="glass rounded-xl p-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{kpi.label}</div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-xs text-gray-500 mb-0.5">Before</div>
                                <div className="mono text-sm text-gray-400">{kpi.isRoas ? `${kpi.prev}x` : `₹${fmt(kpi.prev)}`}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">After</div>
                                <div className="mono text-lg font-bold text-white">{kpi.isRoas ? `${kpi.curr}x` : `₹${fmt(kpi.curr)}`}</div>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                            <DeltaValue value={kpi.delta} pct={kpi.pct} isRoas={kpi.isRoas} invert={kpi.invert} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ═══ COMPARISON TABLE ═════════════════════════════ */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <SectionHeader title="SKU / Campaign Comparison" subtitle={`${filteredComparisons.length} records`} />
                    <div className="flex items-center gap-2">
                        <Filter size={12} className="text-gray-500" />
                        {["all", "Improved", "Declined", "New", "Inactive"].map(f => (
                            <button key={f} onClick={() => setStatusFilter(f === statusFilter ? "all" : f)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === f ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                                {f === "all" ? "All" : f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-white/5 text-gray-500">
                                <th className="text-left pb-2 pr-4 font-semibold">SKU / Campaign</th>
                                <th className="text-left pb-2 pr-3 font-semibold">Platform</th>
                                <th className="text-center pb-2 px-2 font-semibold">Status</th>
                                <th className="text-right pb-2 px-2 font-semibold cursor-pointer hover:text-gray-300 select-none" onClick={() => toggleSort("spend")}>
                                    <span className="inline-flex items-center gap-0.5">Spend Δ <SortIcon field="spend" /></span>
                                </th>
                                <th className="text-right pb-2 px-2 font-semibold cursor-pointer hover:text-gray-300 select-none" onClick={() => toggleSort("revenue")}>
                                    <span className="inline-flex items-center gap-0.5">Revenue Δ <SortIcon field="revenue" /></span>
                                </th>
                                <th className="text-right pb-2 px-2 font-semibold cursor-pointer hover:text-gray-300 select-none" onClick={() => toggleSort("orders")}>
                                    <span className="inline-flex items-center gap-0.5">Orders Δ <SortIcon field="orders" /></span>
                                </th>
                                <th className="text-right pb-2 pl-2 font-semibold cursor-pointer hover:text-gray-300 select-none" onClick={() => toggleSort("roas")}>
                                    <span className="inline-flex items-center gap-0.5">ROAS Δ <SortIcon field="roas" /></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredComparisons.map((c, i) => (
                                <React.Fragment key={c.key}>
                                    <tr className={`border-b border-white/3 hover:bg-white/[0.02] transition-all cursor-pointer ${expandedRow === c.key ? "bg-white/[0.03]" : ""}`}
                                        onClick={() => setExpandedRow(expandedRow === c.key ? null : c.key)}>
                                        <td className="py-2.5 pr-4">
                                            <div className="text-gray-200 font-medium">{c.sku !== "—" ? c.sku : c.campaign}</div>
                                            {c.sku !== "—" && c.campaign !== "—" && <div className="text-[10px] text-gray-600 mt-0.5">{c.campaign}</div>}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <Badge text={c.platform} color="#6366F1" outline />
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            <OutcomeBadge outcome={c.outcome} />
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            {c.delta ? <DeltaValue value={c.delta.spend} pct={c.delta.spendPct} invert /> : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            {c.delta ? <DeltaValue value={c.delta.revenue} pct={c.delta.revenuePct} /> : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            {c.delta ? <DeltaValue value={c.delta.orders} pct={c.delta.ordersPct} /> : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-2.5 pl-2 text-right">
                                            {c.delta ? <DeltaValue value={c.delta.roas} isRoas /> : <span className="text-gray-600">—</span>}
                                        </td>
                                    </tr>

                                    {/* Expanded detail row */}
                                    {expandedRow === c.key && (
                                        <tr className="bg-white/[0.02]">
                                            <td colSpan={7} className="px-4 py-4">
                                                <div className="grid grid-cols-2 gap-6">
                                                    {/* Before */}
                                                    <div className="glass-light rounded-lg p-3">
                                                        <div className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold mb-2">
                                                            ◀ Previous Snapshot
                                                        </div>
                                                        {c.prev ? (
                                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                                <div><span className="text-gray-500">Spend</span><div className="text-gray-300 mono">₹{fmt(c.prev.spend)}</div></div>
                                                                <div><span className="text-gray-500">Revenue</span><div className="text-gray-300 mono">₹{fmt(c.prev.revenue)}</div></div>
                                                                <div><span className="text-gray-500">Orders</span><div className="text-gray-300 mono">{c.prev.orders}</div></div>
                                                                <div><span className="text-gray-500">ROAS</span><div className="text-gray-300 mono">{c.prev.roas}x</div></div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-blue-400 flex items-center gap-1">
                                                                <Sparkles size={11} /> New since last upload — no previous data
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* After */}
                                                    <div className="glass-light rounded-lg p-3">
                                                        <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold mb-2">
                                                            ▶ Current Snapshot
                                                        </div>
                                                        {c.curr ? (
                                                            <div className="grid grid-cols-4 gap-2 text-xs">
                                                                <div><span className="text-gray-500">Spend</span><div className="text-white mono font-semibold">₹{fmt(c.curr.spend)}</div></div>
                                                                <div><span className="text-gray-500">Revenue</span><div className="text-white mono font-semibold">₹{fmt(c.curr.revenue)}</div></div>
                                                                <div><span className="text-gray-500">Orders</span><div className="text-white mono font-semibold">{c.curr.orders}</div></div>
                                                                <div><span className="text-gray-500">ROAS</span><div className="text-white mono font-semibold">{c.curr.roas}x</div></div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs text-amber-400 flex items-center gap-1">
                                                                <AlertCircle size={11} /> Inactive / Missing — not present in current upload
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {filteredComparisons.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No records match the current filter.
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ METHODOLOGY NOTE ═════════════════════════════ */}
            <div className="glass-light rounded-xl px-5 py-3 flex items-start gap-3">
                <Info size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-500 leading-relaxed">
                    <span className="text-gray-400 font-medium">How comparison works: </span>
                    Records are matched by <span className="text-gray-300">Platform + SKU + Campaign</span>.
                    Deltas show the difference between the most recent upload and the previous one.
                    Outcomes are based on ROAS movement (±5% threshold).
                    This is an honest, snapshot-based comparison — not a prediction.
                </div>
            </div>
        </div>
    );
};

export default SnapshotCompare;
