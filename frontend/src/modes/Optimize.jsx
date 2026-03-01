import React, { useState, useMemo } from "react";
import {
    Check, RefreshCw, X, TrendingUp, Zap, Eye, Upload,
    Clock, ArrowUpRight, ArrowDownRight, Minus, CheckCircle
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from "recharts";
import { Btn, Badge, SectionHeader } from "../components/ui";
import { useData } from "../context/DataContext";
import { fmt, roasColor, prioColor, darkTooltip } from "../data/mockData";

// ═══════════════════════════════════════════════════════════════
// MODE 2: ACTIONS — "Decision intelligence — track what you log"
// Actions are recommendations tracked over time, not real-time changes.
// Impact is evaluated only after new data uploads.
// ═══════════════════════════════════════════════════════════════

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const OUTCOME_CONFIG = {
    improved: { label: "Improved", icon: ArrowUpRight, color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
    declined: { label: "Declined", icon: ArrowDownRight, color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" },
    neutral: { label: "Neutral", icon: Minus, color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
};

const Optimize = ({ toast }) => {
    const {
        recommendations: ctxRecs, campaigns: ctxCampaigns, skus: ctxSkus,
        hasData, kpis, appliedActions, applyAction, dismissAction
    } = useData();
    const [filter, setFilter] = useState("All");

    // ─── Empty State ──────────────────────────────────────────
    if (!hasData) {
        return (
            <div className="anim-fade flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Upload size={32} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Data Yet</h2>
                <p className="text-gray-500 text-sm max-w-md">Upload your first CSV from the Data Upload tab to see recommended actions based on your real performance data.</p>
            </div>
        );
    }

    const totalImpact = ctxRecs.reduce((a, r) => a + (r.isAtoms ? (r.payload?.impact?.loss24h || 0) : (r.impact || 0)), 0);
    const hasAtomsActions = ctxRecs.some(r => r.isAtoms);

    const handleApply = (rec) => {
        applyAction(rec);
        toast("✅ Action logged. Upload new data to measure impact.");
    };

    const handleDismiss = (rec) => {
        dismissAction(rec.id);
        toast("Recommendation dismissed.");
    };

    const shown = ctxRecs.filter(r => filter === "All" || r.priority === filter);

    // Applied actions (non-dismissed only)
    const activeApplied = appliedActions.filter(a => a.state === "applied" || a.state === "evaluated");
    const pendingCount = activeApplied.filter(a => a.state === "applied").length;
    const evaluatedCount = activeApplied.filter(a => a.state === "evaluated").length;

    // Generate bid data from actual SKU data
    const bidData = useMemo(() => {
        if (!ctxSkus || ctxSkus.length === 0) return [];
        return ctxSkus
            .filter(s => s.cpc > 0)
            .slice(0, 5)
            .map(s => ({
                name: s.name.length > 18 ? s.name.slice(0, 18) + "…" : s.name,
                current: +(s.cpc || 0).toFixed(1),
                suggested: +(s.roas >= 2.5 ? (s.cpc * 1.15) : s.roas >= 1.5 ? s.cpc : s.cpc * 0.7).toFixed(1),
                benchmark: +(s.cpc * 1.3 + Math.random() * 2).toFixed(1),
            }));
    }, [ctxSkus]);

    // Generate hour heatmap from ROAS data (simulated from blended ROAS)
    const hourHeatmap = useMemo(() => {
        const base = kpis.blendedRoas || 1.5;
        return Array.from({ length: 7 }, (_, d) =>
            Array.from({ length: 24 }, (_, h) => {
                let mult = 0.6;
                if (h >= 12 && h <= 14) mult = 1.2;
                if (h >= 19 && h <= 22) mult = 1.0;
                if (h < 7 || h > 23) mult = 0.35;
                if (d >= 5) mult *= 1.15;
                return +((base * mult) + (Math.random() * 0.3 - 0.15)).toFixed(1);
            })
        );
    }, [kpis.blendedRoas]);

    // Budget pacing data for active campaigns
    const activeCampaigns = ctxCampaigns.filter(c => c.status === "Active");
    const budgetPacing = activeCampaigns.map(c => {
        const daysElapsed = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const idealPace = (daysElapsed / daysInMonth) * 100;
        const actualPace = Math.min(100, c.budget > 0 ? (c.spend / (c.budget * daysInMonth)) * 100 : 50);
        const status = actualPace > idealPace * 1.1 ? "overpacing" : actualPace < idealPace * 0.8 ? "underpacing" : "on-track";
        return { ...c, idealPace, actualPace, status };
    });

    // Find highest-risk campaign for budget warning
    const overpacingCamp = budgetPacing.find(c => c.status === "overpacing");

    // Keyword data from SKUs
    const kwData = useMemo(() => {
        if (!ctxSkus || ctxSkus.length === 0) return [];
        return ctxSkus.slice(0, 6).map(s => ({
            kw: s.name.length > 24 ? s.name.slice(0, 24) + "…" : s.name,
            curr: +(s.cpc || 0).toFixed(1),
            sug: +(s.roas >= 2.5 ? (s.cpc * 1.15) : s.roas < 1.0 ? 0 : (s.cpc * 0.85)).toFixed(1),
            roas: +(s.roas || 0).toFixed(1),
            projRoas: +(s.roas >= 2.5 ? s.roas * 1.1 : s.roas < 1.0 ? 0 : s.roas * 1.2).toFixed(1),
            ishare: `${Math.round(30 + Math.random() * 40)}%`,
            isLost: `${Math.round(10 + Math.random() * 50)}%`,
        }));
    }, [ctxSkus]);

    // Lunch-hour ROAS insight
    const lunchRoas = hourHeatmap.length > 0
        ? (hourHeatmap.slice(0, 5).reduce((a, day) => a + (day[12] + day[13]) / 2, 0) / 5).toFixed(1)
        : "—";
    const restRoas = hourHeatmap.length > 0
        ? (hourHeatmap.slice(0, 5).reduce((a, day) => a + day.filter((_, h) => h < 12 || h > 14).reduce((s, v) => s + v, 0) / 21, 0) / 5).toFixed(1)
        : "—";

    return (
        <div className="space-y-6 anim-fade">

            {/* ═══ SECTION 1: AVAILABLE ACTIONS ══════════════════════ */}
            <div>
                <div className="glass-light rounded-xl px-5 py-4 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7C3AED,#a78bfa)" }}>
                            <Zap size={18} className="text-white" />
                        </div>
                        <div>
                            <span className="text-violet-300 font-bold text-lg">{ctxRecs.length} Action{ctxRecs.length !== 1 ? 's' : ''} Available</span>
                            {totalImpact > 0 && (
                                <>
                                    <span className="text-gray-400 text-sm ml-3">·</span>
                                    <span className={`font-bold text-lg ml-3 ${hasAtomsActions ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {hasAtomsActions ? `~₹${totalImpact.toLocaleString()} at risk` : `+${fmt(totalImpact)} projected lift`}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {["All", "Critical", "High", "Medium"].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${filter === f ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white glass"}`}>{f}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    {shown.length === 0 && (
                        <div className="glass rounded-xl p-6 text-center text-gray-500 text-sm">
                            {ctxRecs.length === 0
                                ? activeApplied.length > 0
                                    ? "All recommendations applied! Check the Applied Actions section below."
                                    : "✅ No actions needed — your campaigns are performing well."
                                : "No recommendations match this filter."}
                        </div>
                    )}
                    {shown.map(r => (
                        <div key={r.id} className="glass rounded-xl overflow-hidden border border-white/5 transition-all duration-300 hover:border-white/10" style={{ borderLeft: `4px solid ${prioColor(r.priority)}` }}>
                            {r.isAtoms ? (
                                <div className="p-6 space-y-6">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <Badge text={r.priority} color={prioColor(r.priority)} />
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{r.cat}</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white">{r.title}</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApply(r)}
                                                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all btn-primary text-white shadow-lg shadow-violet-500/20">
                                                <Check size={14} />Apply & Track
                                            </button>
                                            <button onClick={() => handleDismiss(r)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all"><X size={18} /></button>
                                        </div>
                                    </div>

                                    {/* Body Grid */}
                                    <div className="grid grid-cols-12 gap-6">
                                        {/* Context & Impact */}
                                        <div className="col-span-12 lg:col-span-7 space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="glass-light rounded-xl p-4">
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">Context</div>
                                                    <div className="space-y-1.5 text-xs text-gray-300">
                                                        <div className="flex justify-between"><span>SKU:</span> <span className="text-white font-medium">{r.payload.sku}</span></div>
                                                        <div className="flex justify-between"><span>Location:</span> <span className="text-white font-medium">{r.payload.location}</span></div>
                                                        <div className="flex justify-between"><span>Analyzed:</span> <span className="text-white font-medium">{r.payload.timeWindow}</span></div>
                                                    </div>
                                                </div>
                                                <div className="glass-light rounded-xl p-4 border border-emerald-500/10">
                                                    <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-2 font-bold">Projected Impact</div>
                                                    <div className="space-y-1.5 text-xs">
                                                        <div className="flex justify-between"><span className="text-gray-400">GMV Recovered:</span> <span className="text-emerald-400 font-bold">₹{r.payload.impact.recovered.toLocaleString()}</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-400">ROAS Boost:</span> <span className="text-violet-300 font-bold">{r.payload.impact.roasBefore}x → {r.payload.impact.roasAfter}x</span></div>
                                                        <div className="flex justify-between"><span className="text-gray-400 italic">Potential Loss:</span> <span className="text-red-400 font-medium">~₹{r.payload.impact.loss24h.toLocaleString()} / 24h</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-bold">Deltas vs Yesterday</div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {r.payload.deltas.map((d, i) => (
                                                        <div key={i} className="glass-light rounded-lg p-3">
                                                            <div className="text-[9px] text-gray-600 uppercase mb-1">{d.label}</div>
                                                            <div className="text-sm text-white font-bold mb-0.5">{d.val}</div>
                                                            <div className={`text-[10px] font-medium ${d.delta.includes("-") ? "text-red-400" : "text-emerald-400"}`}>{d.delta}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Root Cause Analysis</div>
                                                <div className="space-y-2">
                                                    <div className="text-xs text-white leading-relaxed flex gap-2">
                                                        <span className="text-violet-400 font-bold flex-shrink-0">PRIMARY:</span>
                                                        <span>{r.payload.rootCause.primary}</span>
                                                    </div>
                                                    <div className="space-y-1 pl-4">
                                                        {r.payload.rootCause.secondary.map((s, i) => (
                                                            <div key={i} className="text-[11px] text-gray-500 flex gap-2">
                                                                <span className="text-gray-700">•</span> {s}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recommendations & Urgency */}
                                        <div className="col-span-12 lg:col-span-5 space-y-6">
                                            <div className="glass-light rounded-xl p-5 border border-violet-500/10">
                                                <div className="text-[10px] text-violet-400 uppercase tracking-wider mb-4 font-bold">Recommended Actions</div>
                                                <div className="space-y-4">
                                                    {r.payload.recommendations.map((step, i) => (
                                                        <div key={i} className="flex gap-3">
                                                            <div className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400 flex-shrink-0">{i + 1}</div>
                                                            <div className="text-xs text-gray-200 leading-snug">{step}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">Urgency</div>
                                                    <div className="text-sm text-amber-400 font-bold mb-1">{r.payload.urgency}</div>
                                                    <div className="text-[10px] text-gray-500 leading-tight">{r.payload.urgencyReason}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">Confidence</div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="text-sm text-white font-bold mono">{r.payload.confidence}%</div>
                                                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500" style={{ width: `${r.payload.confidence}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        {r.payload.evidence.map((ev, i) => (
                                                            <div key={i} className="text-[9px] text-gray-600 flex gap-1"><span>•</span> {ev}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge text={r.priority} color={prioColor(r.priority)} />
                                            <span className="text-xs text-gray-500">{r.cat}</span>
                                            {r.platform && r.platform !== "All Platforms" && (
                                                <><span className="text-xs text-gray-600">·</span>
                                                    <span className="text-xs text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">{r.platform}</span></>
                                            )}
                                            <span className="text-xs text-gray-600">·</span>
                                            <span className="text-xs text-gray-500">{r.campaign}</span>
                                        </div>
                                        <div className="text-white font-semibold text-sm mb-1">{r.title}</div>
                                        <div className="text-gray-400 text-xs leading-relaxed mb-3">{r.desc}</div>
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <span className="text-gray-500 text-xs">GMV Impact  </span>
                                                <span className="text-emerald-400 font-bold mono">+{fmt(r.impact)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs">ROAS Impact  </span>
                                                <span className="text-violet-300 font-bold mono">{r.roas_impact}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs">Confidence  </span>
                                                <span className="text-white font-bold mono">{r.confidence}%</span>
                                            </div>
                                            <div className="flex-1 max-w-[120px]">
                                                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${r.confidence}%`, background: "linear-gradient(90deg,#7C3AED,#10B981)" }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 ml-6">
                                        <button onClick={() => handleApply(r)}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all btn-primary text-white">
                                            <Check size={14} />Apply & Track
                                        </button>
                                        <button onClick={() => handleDismiss(r)}
                                            className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 transition-all text-center">Dismiss</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ SECTION 1.5: APPLIED ACTIONS ════════════════════════ */}
            {activeApplied.length > 0 && (
                <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <SectionHeader
                            title="Applied Actions"
                            subtitle={`${pendingCount > 0 ? `${pendingCount} awaiting evaluation` : ""}${pendingCount > 0 && evaluatedCount > 0 ? " · " : ""}${evaluatedCount > 0 ? `${evaluatedCount} evaluated` : ""}`}
                        />
                        {pendingCount > 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-300/80 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/15">
                                <Clock size={12} />
                                Upload new data to measure outcomes
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        {activeApplied.map(action => {
                            const isEvaluated = action.state === "evaluated";
                            const outcomeConf = isEvaluated && action.outcome ? OUTCOME_CONFIG[action.outcome] : null;
                            const OutcomeIcon = outcomeConf?.icon;

                            return (
                                <div key={action.id} className="rounded-xl p-4 transition-all"
                                    style={{
                                        background: isEvaluated ? outcomeConf?.bg || "rgba(255,255,255,0.02)" : "rgba(124,58,237,0.04)",
                                        border: `1px solid ${isEvaluated ? outcomeConf?.border || "rgba(255,255,255,0.05)" : "rgba(124,58,237,0.15)"}`,
                                    }}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {isEvaluated && outcomeConf ? (
                                                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1"
                                                        style={{ background: `${outcomeConf.color}18`, color: outcomeConf.color }}>
                                                        <OutcomeIcon size={10} />
                                                        {outcomeConf.label}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 bg-violet-500/15 text-violet-300">
                                                        <Clock size={10} />
                                                        Pending Evaluation
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-600">{action.type}</span>
                                                <span className="text-[10px] text-gray-700">·</span>
                                                <span className="text-[10px] text-gray-600">{action.campaign}</span>
                                            </div>
                                            <div className="text-sm text-white font-semibold mb-1">{action.title}</div>

                                            {/* Baseline vs After metrics */}
                                            {action.baselineMetrics && (
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="text-xs">
                                                        <span className="text-gray-600">ROAS at apply: </span>
                                                        <span className="text-gray-400 mono font-medium">{action.baselineMetrics.blendedRoas?.toFixed(1)}x</span>
                                                    </div>
                                                    {isEvaluated && action.afterMetrics && (
                                                        <>
                                                            <span className="text-gray-700">→</span>
                                                            <div className="text-xs">
                                                                <span className="text-gray-600">After: </span>
                                                                <span className="mono font-bold" style={{ color: outcomeConf?.color || "#fff" }}>
                                                                    {action.afterMetrics.blendedRoas?.toFixed(1)}x
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 ml-4">
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                                <CheckCircle size={10} className="text-violet-400" />
                                                Applied {new Date(action.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </div>
                                            {!isEvaluated && (
                                                <div className="text-[10px] text-gray-600 italic">
                                                    Awaiting next upload
                                                </div>
                                            )}
                                            {isEvaluated && action.evaluatedAt && (
                                                <div className="text-[10px]" style={{ color: outcomeConf?.color || "#888" }}>
                                                    Evaluated {new Date(action.evaluatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ SECTION 2: SPEND STRATEGY ═══════════════════════════ */}
            <div className="grid grid-cols-12 gap-5">
                {/* Spend Signal Chart */}
                <div className="col-span-7 glass rounded-xl p-5">
                    <SectionHeader title="Spend Strategy" subtitle="Current vs Suggested vs Market Spend Benchmark" />
                    {bidData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={bidData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" tick={{ fill: "#4b5563", fontSize: 9 }} tickLine={false} axisLine={false} angle={-15} textAnchor="end" />
                                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                                <Tooltip {...darkTooltip} formatter={(v, n) => [`₹${v}`, n]} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="current" name="Current Spend" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="suggested" name="Suggested" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="benchmark" name="Market Benchmark" fill="rgba(245,158,11,0.5)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">No spend data available</div>
                    )}
                </div>

                {/* SKU Spend Signals */}
                <div className="col-span-5 glass rounded-xl p-5">
                    <SectionHeader title="SKU Spend Signals" subtitle={`${kwData.length} SKUs analyzed`} />
                    <div className="space-y-2">
                        {kwData.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">No SKU data yet</div>
                        ) : kwData.map((k, i) => {
                            const change = k.sug === 0 ? "Remove" : `${k.sug > k.curr ? "+" : ""}${((k.sug - k.curr) / (k.curr || 1) * 100).toFixed(0)}%`;
                            const chColor = k.sug === 0 ? "#EF4444" : k.sug > k.curr ? "#10B981" : "#F59E0B";
                            return (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/[0.02] transition-all rounded px-2">
                                    <div>
                                        <div className="text-xs text-gray-300 font-medium">{k.kw}</div>
                                        <div className="text-[10px] text-gray-600">IS: {k.ishare} · Lost: {k.isLost}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500">₹{k.curr} → <span className="text-white font-bold">{k.sug === 0 ? "Remove" : `₹${k.sug}`}</span></div>
                                            <div className="mono text-xs font-bold" style={{ color: chColor }}>{change}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500">ROAS</div>
                                            <div className="mono text-xs font-bold" style={{ color: roasColor(k.projRoas) }}>{k.projRoas > 0 ? `${k.projRoas}x` : "—"}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══ SECTION 3: BUDGET PACING + HOUR HEATMAP ═══════════ */}
            <div className="grid grid-cols-12 gap-5">
                {/* Budget Pacing */}
                <div className="col-span-5 glass rounded-xl p-5">
                    <SectionHeader title="Budget Pacing" subtitle={`Daily budget consumption · Day ${new Date().getDate()} of ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`} />
                    <div className="space-y-3">
                        {budgetPacing.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">No active campaigns</div>
                        ) : budgetPacing.slice(0, 6).map(c => {
                            const statusColor = c.status === "overpacing" ? "#EF4444" : c.status === "underpacing" ? "#F59E0B" : "#10B981";
                            const statusLabel = c.status === "overpacing" ? "Over" : c.status === "underpacing" ? "Under" : "On Track";
                            return (
                                <div key={c.id} className="group">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-300 truncate max-w-[180px]" title={c.name}>{c.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="mono text-gray-400">{fmt(c.budget)}/day</span>
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${statusColor}20`, color: statusColor }}>{statusLabel}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden relative">
                                        {/* Ideal pace marker */}
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10" style={{ left: `${c.idealPace}%` }} />
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.actualPace}%`, background: statusColor }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {overpacingCamp && (
                        <div className="mt-3 text-xs text-amber-300 glass-light rounded-lg px-3 py-2">
                            ⚠️ {overpacingCamp.name} is overpacing. Consider raising daily cap.
                        </div>
                    )}
                </div>

                {/* Hour Heatmap */}
                <div className="col-span-7 glass rounded-xl p-5">
                    <SectionHeader title="Hour-of-Day ROAS Heatmap" subtitle="Darker = Higher ROAS · Apply spend rules for peak hours" />
                    <div className="overflow-x-auto">
                        <div className="flex gap-1 mb-1">
                            <div className="w-8" />
                            {Array.from({ length: 24 }, (_, h) => <div key={h} className="w-8 text-center text-[9px] text-gray-600">{h}</div>)}
                        </div>
                        {DAYS.map((day, d) => (
                            <div key={day} className="flex gap-1 mb-1">
                                <div className="w-8 text-[10px] text-gray-500 flex items-center">{day}</div>
                                {hourHeatmap[d].map((v, h) => {
                                    const maxV = Math.max(...hourHeatmap.flat(), 1);
                                    const intensity = Math.min(1, v / maxV);
                                    const bg = `rgba(124,58,237,${0.1 + intensity * 0.85})`;
                                    return <div key={h} className="w-8 h-6 rounded cursor-pointer hover:ring-1 hover:ring-violet-400 transition-all flex items-center justify-center" style={{ background: bg }} title={`${day} ${h}:00 — ROAS ${v}x`}>
                                        <span className="text-[8px] text-white/70 font-mono">{v}</span>
                                    </div>;
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-xs text-amber-300 glass-light rounded-lg px-3 py-2">
                        📌 Lunch rush 12–2PM weekdays averages {lunchRoas}x ROAS vs {restRoas}x rest of day.
                        <button onClick={() => toast("Spend rule logged: +35% Mon-Fri 12-2PM")} className="ml-2 text-violet-400 hover:text-violet-300 underline">Log Spend Rule →</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Optimize;
