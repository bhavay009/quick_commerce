import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Zap, Calendar, Bell, ChevronDown, Circle, Shield, TrendingUp, BarChart2,
    X, Brain, AlertTriangle, Sparkles, ArrowRight, Check, ChevronRight, Upload, GitCompareArrows
} from "lucide-react";
import { FontImport, Toast } from "./ui";
import { sevColor, fmt } from "../data/mockData";
import { DataProvider, useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import CommandCenter from "../modes/CommandCenter";
import Optimize from "../modes/Optimize";
import Analyze from "../modes/Analyze";
import DataUpload from "../modes/DataUpload";
import SnapshotCompare from "../modes/SnapshotCompare";

// ─── MODE CONFIG ──────────────────────────────────────────────
const MODES = [
    {
        id: "command",
        label: "Command Center",
        short: "Diagnose",
        icon: Shield,
        color: "#EF4444",
        desc: "What's wrong right now?",
    },
    {
        id: "optimize",
        label: "Actions",
        short: "Actions",
        icon: TrendingUp,
        color: "#F59E0B",
        desc: "Decision tracking",
    },
    {
        id: "analyze",
        label: "Analyze",
        short: "Understand",
        icon: BarChart2,
        color: "#7C3AED",
        desc: "Patterns & drivers",
    },
];

const UPLOAD_MODE = {
    id: "upload",
    label: "Data Upload",
    short: "Upload",
    icon: Upload,
    color: "#6366F1",
    desc: "Import CSV / Excel data",
};

const COMPARE_MODE = {
    id: "compare",
    label: "Compare",
    short: "Compare",
    icon: GitCompareArrows,
    color: "#06B6D4",
    desc: "Snapshot comparison",
};

const ALL_MODES = [...MODES, COMPARE_MODE, UPLOAD_MODE];

// ─── ATOMS PULSE OVERLAY ──────────────────────────────────────
const AtomsPulse = ({ open, onClose, onGoOptimize, onApply }) => {
    const { anomalies, recommendations, skus, kpis, hasData, applyAction, appliedActions } = useData();
    const pendingEvalCount = appliedActions.filter(a => a.state === "applied").length;

    // Derive insights from real data
    const pulseInsights = React.useMemo(() => {
        if (!hasData) return [];
        const insights = [];
        // Generate insights from anomalies
        anomalies.filter(a => !a.resolved).slice(0, 2).forEach((a, i) => {
            insights.push({
                id: `anomaly-${a.id}`,
                severity: a.sev || "Warning",
                color: a.sev === "Critical" ? "#EF4444" : a.sev === "Warning" ? "#F59E0B" : "#10B981",
                title: a.title,
                why: a.desc,
                whatToDo: a.action || "Review in Optimize tab",
                impact: a.campaign || "Campaign affected",
                linkToOptimize: true,
                time: a.time || "Recently detected",
            });
        });
        // Add opportunity insight from ROAS data
        if (kpis.blendedRoas > 0) {
            insights.push({
                id: "roas-opportunity",
                severity: "Opportunity",
                color: "#10B981",
                title: `Current blended ROAS is ${kpis.blendedRoas.toFixed(1)}x — optimize underperformers`,
                why: `Your overall ROAS indicates room for improvement. Focus on low-performing SKUs to lift the blend higher.`,
                whatToDo: "Review zombie and drain SKUs in Analyze, then apply fixes in Optimize.",
                impact: `Blended ROAS: ${kpis.blendedRoas.toFixed(1)}x`,
                linkToOptimize: true,
                time: "From latest data",
            });
        }
        return insights.slice(0, 3);
    }, [anomalies, kpis, hasData]);

    // Derive most urgent from anomalies
    const mostUrgent = React.useMemo(() => {
        if (!hasData) return null;
        const critical = anomalies.find(a => a.sev === "Critical" && !a.resolved);
        if (critical) return {
            type: "Campaign",
            name: critical.campaign || critical.title,
            reason: critical.desc,
            atRisk: critical.impact || 0,
        };
        // Fallback: worst performing campaign
        const worstSku = skus.filter(s => s.roas < 1).sort((a, b) => b.spend - a.spend)[0];
        if (worstSku) return {
            type: "SKU",
            name: worstSku.name,
            reason: `ROAS at ${worstSku.roas}x with ${fmt(worstSku.spend)} spend. This SKU is consuming budget without adequate returns.`,
            atRisk: worstSku.spend,
        };
        return null;
    }, [anomalies, skus, hasData]);

    // Derive primary action from recommendations (already filtered by context)
    const primaryAction = React.useMemo(() => {
        if (!hasData) return null;
        const topRec = recommendations.sort((a, b) => (b.impact || 0) - (a.impact || 0))[0];
        if (topRec) return {
            rec: topRec,
            title: topRec.title,
            desc: topRec.desc,
            impact: `+${fmt(topRec.impact)} saved`,
            confidence: topRec.confidence || 85,
        };
        // Fallback: zombie SKU cleanup (only if not already applied)
        const zombies = skus.filter(s => s.quad === "zombie");
        if (zombies.length > 0) {
            const totalWaste = zombies.reduce((a, s) => a + (s.spend || 0), 0);
            return {
                rec: null,
                title: `Pause ${zombies.length} zombie SKU${zombies.length > 1 ? "s" : ""} with low ROAS`,
                desc: `${zombies.map(z => z.name).slice(0, 3).join(", ")}${zombies.length > 3 ? " and more" : ""} have near-zero conversions. Pausing saves budget.`,
                impact: `+${fmt(totalWaste)} saved`,
                confidence: 90,
            };
        }
        return null;
    }, [recommendations, skus, hasData]);

    // Calculate summary metrics
    const atRisk = React.useMemo(() => {
        if (!hasData) return 0;
        return anomalies.filter(a => !a.resolved).reduce((a, an) => a + (an.impact || 0), 0)
            + skus.filter(s => s.roas < 1).reduce((a, s) => a + (s.spend || 0), 0);
    }, [anomalies, skus, hasData]);

    const handleApply = () => {
        if (primaryAction?.rec) {
            applyAction(primaryAction.rec);
        }
        onApply("✅ Action logged. Upload new data to measure impact.");
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 transition-all duration-300 ${open ? "bg-black/50 pointer-events-auto" : "bg-transparent pointer-events-none"}`}
                onClick={onClose}
            />
            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 bottom-0 w-[420px] z-50 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
                style={{ background: "rgba(10,10,22,0.98)", borderLeft: "1px solid rgba(124,58,237,0.2)", backdropFilter: "blur(20px)" }}
            >
                <div className="h-full flex flex-col overflow-y-auto">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7C3AED,#6d28d9)", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}>
                                    <Brain size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Atoms Pulse</h2>
                                    <p className="text-[11px] text-gray-500">
                                        AI detections from your data
                                        {pendingEvalCount > 0 && (
                                            <span className="text-violet-400 ml-1">· {pendingEvalCount} pending evaluation</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {!hasData ? (
                        <div className="flex-1 flex items-center justify-center px-6">
                            <div className="text-center">
                                <Brain size={40} className="text-violet-400/30 mx-auto mb-4" />
                                <div className="text-white font-semibold mb-2">No Data Yet</div>
                                <div className="text-xs text-gray-500">Upload a CSV to get AI-powered insights about your ad performance.</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ₹ Summary Strip */}
                            <div className="px-6 py-4 border-b border-white/5" style={{ background: "rgba(124,58,237,0.05)" }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">₹ At Risk</div>
                                        <div className="text-xl font-bold text-red-400 mono">{fmt(atRisk)}</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Blended ROAS</div>
                                        <div className="text-xl font-bold text-emerald-400 mono">{kpis.blendedRoas.toFixed(1)}x</div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Active Alerts</div>
                                        <div className="text-xl font-bold text-violet-300 mono">{anomalies.filter(a => !a.resolved).length}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Insights */}
                            <div className="px-6 py-5 space-y-4 flex-1">
                                {pulseInsights.length > 0 && (
                                    <>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Top Insights</div>
                                        {pulseInsights.map((insight) => (
                                            <div key={insight.id} className="rounded-xl p-4 transition-all" style={{ background: `${insight.color}06`, border: `1px solid ${insight.color}20` }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: `${insight.color}18`, color: insight.color }}>
                                                        {insight.severity.toUpperCase()}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600">{insight.time}</span>
                                                </div>
                                                <div className="text-sm text-white font-semibold leading-snug mb-2">{insight.title}</div>
                                                <div className="text-xs text-gray-400 leading-relaxed mb-2">
                                                    <span className="text-gray-500 font-semibold">Why: </span>{insight.why}
                                                </div>
                                                <div className="text-xs leading-relaxed mb-2" style={{ color: insight.color }}>
                                                    <span className="font-semibold">Action: </span>{insight.whatToDo}
                                                </div>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-xs mono font-bold text-gray-300">{insight.impact}</span>
                                                    {insight.linkToOptimize && (
                                                        <button onClick={() => { onGoOptimize(); onClose(); }} className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-all font-medium">
                                                            Go to Optimize <ArrowRight size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Most Urgent */}
                                {mostUrgent && (
                                    <div className="border-t border-white/5 pt-4">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">🔥 Most Urgent Right Now</div>
                                        <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <AlertTriangle size={13} className="text-red-400" />
                                                <span className="text-xs text-gray-500">{mostUrgent.type}</span>
                                            </div>
                                            <div className="text-sm text-white font-bold mb-2">{mostUrgent.name}</div>
                                            <div className="text-xs text-gray-400 leading-relaxed mb-2">{mostUrgent.reason}</div>
                                            <div className="flex items-center gap-2">
                                                {mostUrgent.atRisk > 0 && <span className="text-xs text-red-400 font-bold mono">{fmt(mostUrgent.atRisk)} at risk</span>}
                                                <button onClick={() => { onGoOptimize(); onClose(); }} className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-all font-medium ml-auto">
                                                    Fix in Optimize <ChevronRight size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Primary Action */}
                                {primaryAction && (
                                    <div className="border-t border-white/5 pt-4">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">⚡ Recommended Action</div>
                                        <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(16,185,129,0.06))", border: "1px solid rgba(124,58,237,0.2)" }}>
                                            <div className="text-sm text-white font-bold mb-2">{primaryAction.title}</div>
                                            <div className="text-xs text-gray-400 leading-relaxed mb-3">{primaryAction.desc}</div>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div>
                                                    <div className="text-[10px] text-gray-500">Impact</div>
                                                    <div className="text-xs text-emerald-400 font-bold mono">{primaryAction.impact}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500">Confidence</div>
                                                    <div className="text-xs text-white font-bold mono">{primaryAction.confidence}%</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${primaryAction.confidence}%`, background: "linear-gradient(90deg,#7C3AED,#10B981)" }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleApply}
                                                className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all btn-primary text-white hover:shadow-lg"
                                                style={{ boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
                                            >
                                                <Check size={14} />Apply & Track
                                            </button>
                                            <div className="text-[10px] text-gray-600 text-center mt-2 italic">Impact measured after next data upload</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-white/5" style={{ background: "rgba(124,58,237,0.03)" }}>
                        <div className="text-[10px] text-gray-600 text-center">
                            Atoms AI · Insights from your uploaded data
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// APP SHELL INNER — uses DataContext
// ═══════════════════════════════════════════════════════════════
const AppShellInner = () => {
    const [mode, setMode] = useState("command");
    const [notifOpen, setNotifOpen] = useState(false);
    const [pulseOpen, setPulseOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const { anomalies: ctxAnomalies, hasData, selectedPlatform, setSelectedPlatform, availablePlatforms } = useData();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const userInitial = user?.email ? user.email[0].toUpperCase() : "U";

    const handleSignOut = async () => {
        setProfileOpen(false);
        await signOut();
        navigate("/login", { replace: true });
    };

    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    const currentMode = ALL_MODES.find(m => m.id === mode) || MODES[0];
    const notifAnomalies = ctxAnomalies || [];

    return (
        <>
            <FontImport />
            {/* Account Settings Modal */}
            {accountOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAccountOpen(false)} />
                    <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-10">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                            <h2 className="text-lg font-bold text-white">Account Settings</h2>
                            <button onClick={() => setAccountOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"><X size={16} /></button>
                        </div>
                        <div className="px-6 py-6 space-y-5">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl text-white font-bold">{userInitial}</div>
                                <div>
                                    <div className="text-white font-semibold">{user?.name || user?.email?.split('@')[0] || "User"}</div>
                                    <div className="text-sm text-gray-400">{user?.email}</div>
                                    <div className="text-xs text-violet-400 mt-0.5">Free Plan</div>
                                </div>
                            </div>
                            {/* Details */}
                            <div className="space-y-3">
                                <div className="glass-light rounded-xl px-4 py-3">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Email</div>
                                    <div className="text-sm text-white">{user?.email}</div>
                                </div>
                                <div className="glass-light rounded-xl px-4 py-3">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Member Since</div>
                                    <div className="text-sm text-white">Email / Password</div>
                                </div>
                                <div className="glass-light rounded-xl px-4 py-3">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Plan</div>
                                    <div className="text-sm text-white flex items-center gap-2">Free <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">Current</span></div>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="min-h-screen bg-grid" style={{ background: "#08080F", minHeight: "100vh" }}>
                {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

                {/* ─── ATOMS PULSE OVERLAY ──────────────────────────── */}
                <AtomsPulse
                    open={pulseOpen}
                    onClose={() => setPulseOpen(false)}
                    onGoOptimize={() => { setMode("optimize"); }}
                    onApply={(msg) => showToast(msg)}
                />

                {/* ─── TOP NAV BAR ──────────────────────────────────── */}
                <header className="fixed top-0 left-0 right-0 h-16 glass border-b border-white/5 flex items-center px-6 gap-4 z-40" style={{ background: "rgba(8,8,20,0.97)" }}>
                    {/* Logo — clicks open Atoms Pulse */}
                    <button onClick={() => { setPulseOpen(!pulseOpen); setNotifOpen(false); }} className="flex items-center gap-2.5 mr-6 group cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${pulseOpen ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-[#08080F]" : "group-hover:shadow-lg"}`} style={{ background: "linear-gradient(135deg,#7C3AED,#a78bfa)", boxShadow: pulseOpen ? "0 0 28px rgba(124,58,237,0.6)" : "0 0 20px rgba(124,58,237,0.5)" }}>
                            <Zap size={16} className="text-white" />
                        </div>
                        <span className={`font-bold text-sm hidden lg:block transition-colors duration-200 ${pulseOpen ? "text-violet-300" : "text-white group-hover:text-violet-200"}`}>Atoms Intelligence</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 pulse-critical hidden lg:block" />
                    </button>

                    {/* Mode Tabs */}
                    <nav className="flex items-center gap-1">
                        {ALL_MODES.map(m => {
                            const isActive = mode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive
                                        ? "text-white"
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                        }`}
                                    style={isActive ? {
                                        background: `${m.color}18`,
                                        border: `1px solid ${m.color}40`,
                                        boxShadow: `0 0 16px ${m.color}15`,
                                    } : { border: "1px solid transparent" }}
                                >
                                    <m.icon size={15} style={{ color: isActive ? m.color : undefined }} />
                                    <span className="hidden md:inline">{m.label}</span>
                                    <span className="md:hidden text-xs">{m.short}</span>
                                    {/* Green dot on upload tab when data is loaded */}
                                    {m.id === "upload" && hasData && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                    {isActive && (
                                        <span className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: m.color }} />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right side controls */}
                    <div className="ml-auto flex items-center gap-3">
                        <select
                            className="text-xs rounded-lg px-3 py-2 text-white font-medium bg-transparent cursor-pointer"
                            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
                            value={selectedPlatform}
                            onChange={e => setSelectedPlatform(e.target.value)}
                        >
                            <option value="All Platforms" style={{ background: "#0F0F1E" }}>All Platforms</option>
                            {availablePlatforms.map(p => <option key={p} value={p} style={{ background: "#0F0F1E" }}>{p}</option>)}
                        </select>

                        <div className="flex items-center gap-1 text-xs text-gray-400 glass-light rounded-lg px-3 py-1.5 cursor-pointer hover:border-violet-500/40 transition-all">
                            <Calendar size={12} /><span className="ml-1">Feb 1 – Feb 28, 2025</span><ChevronDown size={12} className="ml-1" />
                        </div>

                        <div className="relative">
                            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                                <Bell size={18} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                            {notifOpen && (
                                <div className="absolute right-0 top-10 w-72 glass rounded-xl border border-white/10 shadow-2xl z-50">
                                    <div className="px-4 py-3 border-b border-white/5 text-sm font-semibold text-white">Notifications</div>
                                    {notifAnomalies.slice(0, 3).map(a => (
                                        <div key={a.id} className="px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer">
                                            <div className="flex gap-2 items-start">
                                                <Circle size={8} className="mt-1 flex-shrink-0" style={{ color: sevColor(a.sev), fill: sevColor(a.sev) }} />
                                                <div><div className="text-xs text-white leading-snug">{a.title}</div><div className="text-[10px] text-gray-500 mt-0.5">{a.time}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                                className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold cursor-pointer hover:ring-2 hover:ring-violet-400 hover:ring-offset-1 hover:ring-offset-[#08080F] transition-all"
                            >
                                {userInitial}
                            </button>
                            {profileOpen && (
                                <>
                                    {/* Backdrop */}
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 top-10 w-64 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
                                        {/* User info */}
                                        <div className="px-4 py-4 border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm text-white font-bold flex-shrink-0">{userInitial}</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm text-white font-semibold truncate">{user?.name || user?.email?.split('@')[0] || "User"}</div>
                                                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Menu items */}
                                        <div className="py-1">
                                            <button
                                                onClick={() => { setProfileOpen(false); setAccountOpen(true); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2">
                                                <Shield size={14} /> Account Settings
                                            </button>
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center gap-2"
                                            >
                                                <X size={14} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* ─── MAIN CONTENT ─────────────────────────────────── */}
                <main className="pt-16 min-h-screen">
                    <div className="p-6 max-w-[1400px] mx-auto">
                        {/* Mode header */}
                        <div className="flex items-center gap-3 mb-6">
                            <currentMode.icon size={20} style={{ color: currentMode.color }} />
                            <div>
                                <h1 className="text-xl font-bold text-white">{currentMode.label}</h1>
                                <p className="text-xs text-gray-500">{currentMode.desc} · {selectedPlatform} · Last 30 Days</p>
                            </div>
                        </div>

                        {/* Mode content */}
                        {mode === "command" && <CommandCenter />}
                        {mode === "optimize" && <Optimize toast={showToast} />}
                        {mode === "analyze" && <Analyze />}
                        {mode === "compare" && <SnapshotCompare onSwitchMode={setMode} toast={showToast} />}
                        {mode === "upload" && <DataUpload onSwitchMode={setMode} toast={showToast} />}
                    </div>
                </main>
            </div>
        </>
    );
};

// ═══════════════════════════════════════════════════════════════
// APP SHELL — wraps with DataProvider
// ═══════════════════════════════════════════════════════════════
const AppShell = () => (
    <DataProvider>
        <AppShellInner />
    </DataProvider>
);

export default AppShell;
