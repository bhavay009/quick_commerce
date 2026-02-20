import React from "react";
import { Activity, Upload } from "lucide-react";
import { KpiCard, HealthGauge } from "../components/ui";
import { useData } from "../context/DataContext";
import { sevColor, fmt } from "../data/mockData";

// ═══════════════════════════════════════════════════════════════
// MODE 1: COMMAND CENTER — "What's wrong right now?"
// No tables, no deep analytics, no secondary KPIs.
// Max one simple trend. Diagnose in < 30 seconds.
// ═══════════════════════════════════════════════════════════════

const CommandCenter = () => {
    const { anomalies, kpis, campaigns: ctxCampaigns, roasChartData, hasData, comparisonResult } = useData();

    // ─── Empty State ──────────────────────────────────────────
    if (!hasData) {
        return (
            <div className="anim-fade flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Upload size={32} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Data Yet</h2>
                <p className="text-gray-500 text-sm max-w-md">Upload your first CSV from the Data Upload tab to see your Command Center come alive with real metrics.</p>
            </div>
        );
    }

    const criticalAlerts = anomalies.filter(a => !a.resolved);
    const activeCamps = ctxCampaigns.filter(c => c.status === "Active").length;
    const pausedCamps = ctxCampaigns.filter(c => c.status === "Paused").length;

    // Compute sub-metrics from real data
    const avgCtr = ctxCampaigns.length > 0
        ? ctxCampaigns.reduce((a, c) => a + (c.ctr || 0), 0) / ctxCampaigns.length : 0;
    const bidEff = Math.min(100, Math.round(kpis.blendedRoas >= 2.5 ? 80 + kpis.blendedRoas * 4 : kpis.blendedRoas * 30));
    const ctrQuality = Math.min(100, Math.round(avgCtr * 25));
    const spendPacing = Math.min(100, Math.round(kpis.totalOrders > 0 ? 60 + (kpis.blendedRoas / 3) * 30 : 0));
    const roasTrend = Math.min(100, Math.round(kpis.blendedRoas * 28));

    // ROAS sparkline from actual data (last 7 points or fill)
    const sparkData = roasChartData.length > 0
        ? roasChartData.slice(-7).map(d => {
            const vals = Object.entries(d).filter(([k]) => k !== "date" && k !== "spend");
            return vals.length > 0 ? vals.reduce((a, [, v]) => a + v, 0) / vals.length : 0;
        })
        : [kpis.blendedRoas];
    while (sparkData.length < 7) sparkData.unshift(sparkData[0] || 0);

    // Comparison-based change text
    const revenueChange = comparisonResult?.summary?.revenueDelta;
    const roasChange = comparisonResult?.summary?.roasDelta;

    const revChangeText = revenueChange != null
        ? `${revenueChange >= 0 ? "↑" : "↓"} ${Math.abs(revenueChange).toFixed(0)}% vs last upload`
        : "From uploaded data";
    const roasChangeText = roasChange != null
        ? `${roasChange >= 0 ? "↑" : "↓"} ${Math.abs(roasChange).toFixed(2)}x vs last upload`
        : "From uploaded data";

    return (
        <div className="space-y-6 anim-fade">
            {/* ─── Hero: Health + KPIs ──────────────────────────────── */}
            <div className="grid grid-cols-12 gap-5">
                {/* Health Gauge — the single most important number */}
                <div className="col-span-4 glass rounded-2xl p-6 flex flex-col items-center justify-center">
                    <HealthGauge score={kpis.healthScore} size="lg" />
                    <div className={`text-sm font-medium mt-2 ${kpis.healthScore >= 80 ? "text-emerald-400" : kpis.healthScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                        {kpis.healthScore >= 80 ? "Healthy" : kpis.healthScore >= 60 ? "Good" : "Needs attention"} — {criticalAlerts.length} alert{criticalAlerts.length !== 1 ? "s" : ""} active
                    </div>
                    {/* Sub-metrics */}
                    <div className="w-full space-y-2.5 mt-5">
                        {[
                            { l: "Bid Efficiency", v: bidEff, c: bidEff >= 70 ? "#10B981" : bidEff >= 50 ? "#F59E0B" : "#EF4444" },
                            { l: "CTR Quality", v: ctrQuality, c: ctrQuality >= 70 ? "#10B981" : ctrQuality >= 50 ? "#F59E0B" : "#EF4444" },
                            { l: "Spend Pacing", v: spendPacing, c: spendPacing >= 70 ? "#10B981" : spendPacing >= 50 ? "#F59E0B" : "#EF4444" },
                            { l: "ROAS Trend", v: roasTrend, c: roasTrend >= 70 ? "#10B981" : roasTrend >= 50 ? "#F59E0B" : "#EF4444" },
                        ].map(s => (
                            <div key={s.l}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">{s.l}</span>
                                    <span className="mono font-semibold" style={{ color: s.c }}>{s.v}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${s.v}%`, background: s.c }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* GMV + ROAS — the two numbers that matter */}
                <div className="col-span-4 space-y-5">
                    <KpiCard
                        label="GMV (Ads)"
                        value={fmt(kpis.totalRevenue)}
                        change={revChangeText}
                        positive={revenueChange == null || revenueChange >= 0}
                        large={true}
                    />
                    <KpiCard
                        label="Blended ROAS"
                        value={`${kpis.blendedRoas.toFixed(2)}x`}
                        change={roasChangeText}
                        positive={roasChange == null || roasChange >= 0}
                        large={true}
                    />
                    {/* Mini ROAS sparkline */}
                    <div className="glass rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">ROAS — Last 7 Days</div>
                        <div className="flex items-end gap-1 h-10">
                            {sparkData.map((v, i) => (
                                <div key={i} className="flex-1 rounded-t transition-all duration-500"
                                    style={{
                                        height: `${Math.max(10, (v / Math.max(...sparkData, 1)) * 100)}%`,
                                        background: i === sparkData.length - 1 ? "linear-gradient(to top, #7C3AED, #a78bfa)" : "rgba(124,58,237,0.25)",
                                        minHeight: 4
                                    }}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                            <span>7d ago</span><span>Today</span>
                        </div>
                    </div>
                </div>

                {/* Live Alerts — actionable at a glance */}
                <div className="col-span-4 glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`w-2.5 h-2.5 rounded-full ${criticalAlerts.length > 0 ? "bg-red-500 pulse-critical" : "bg-emerald-500"}`} />
                        <span className="text-sm text-white font-semibold">Live Alerts</span>
                        <span className="text-xs text-gray-500 ml-auto">{criticalAlerts.length} active</span>
                    </div>
                    <div className="space-y-3">
                        {criticalAlerts.length === 0 ? (
                            <div className="rounded-xl p-4 text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <div className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded inline-block mb-2" style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}>POSITIVE</div>
                                <div className="text-sm text-gray-200 font-medium">All campaigns healthy</div>
                                <div className="text-xs text-emerald-400 mt-1">✨ Keep monitoring</div>
                            </div>
                        ) : criticalAlerts.map(a => (
                            <div key={a.id} className="rounded-xl p-4 transition-all hover:scale-[1.01]"
                                style={{ background: `${sevColor(a.sev)}08`, border: `1px solid ${sevColor(a.sev)}30` }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                                        style={{ background: `${sevColor(a.sev)}20`, color: sevColor(a.sev) }}>
                                        {a.sev.toUpperCase()}
                                    </span>
                                    {a.platform && a.platform !== "All Platforms" && (
                                        <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{a.platform}</span>
                                    )}
                                    <span className="text-[10px] text-gray-600">{a.time}</span>
                                </div>
                                <div className="text-sm text-gray-200 font-medium leading-snug mb-2">{a.title}</div>
                                <div className="flex items-center gap-1.5 text-xs" style={{ color: sevColor(a.sev) }}>
                                    <Activity size={11} />
                                    <span className="font-medium">{a.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Bottom: Quick status strip ──────────────────────── */}
            <div className="glass rounded-xl px-5 py-3 flex items-center gap-6">
                {[
                    { l: "Active Campaigns", v: String(activeCamps), c: "#10B981" },
                    { l: "Paused", v: String(pausedCamps), c: "#F59E0B" },
                    { l: "Total Spend", v: fmt(kpis.totalSpend), c: "#a78bfa" },
                    { l: "Orders", v: String(kpis.totalOrders), c: "#10B981" },
                ].map(s => (
                    <div key={s.l} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} />
                        <span className="text-xs text-gray-500">{s.l}</span>
                        <span className="mono text-sm font-bold text-white">{s.v}</span>
                    </div>
                ))}
                <div className="ml-auto text-xs text-gray-600">Last refreshed: just now</div>
            </div>
        </div>
    );
};

export default CommandCenter;
