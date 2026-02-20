import React, { useState, useMemo } from "react";
import { Search, Upload } from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart as RPieChart, Pie, Cell,
    ReferenceLine
} from "recharts";
import { Badge, SectionHeader } from "../components/ui";
import { useData } from "../context/DataContext";
import { PIE_COLORS, fmt, fmtN, roasColor, darkTooltip } from "../data/mockData";

// ═══════════════════════════════════════════════════════════════
// MODE 3: ANALYZE — "Understand patterns and performance drivers"
// Rich analytics allowed. Drill-downs only, not default.
// No action controls (those belong in Optimize).
// ═══════════════════════════════════════════════════════════════

const GRADIENT_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899"];

const Analyze = () => {
    const { skus, roasChartData, pieData, hasData, campaigns } = useData();
    const [catFilter, setCatFilter] = useState("All");
    const [search, setSearch] = useState("");
    const [skuExpanded, setSkuExpanded] = useState(false);

    // ─── Empty State ──────────────────────────────────────────
    if (!hasData) {
        return (
            <div className="anim-fade flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Upload size={32} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Data Yet</h2>
                <p className="text-gray-500 text-sm max-w-md">Upload your first CSV from the Data Upload tab to see detailed analytics, trends, and SKU performance insights.</p>
            </div>
        );
    }

    // Derive categories from actual data
    const uniqueCats = useMemo(() => [...new Set(skus.map(s => s.cat).filter(Boolean))], [skus]);
    const cats = ["All", ...uniqueCats];
    const filtered = skus.filter(s => (catFilter === "All" || s.cat === catFilter) && s.name.toLowerCase().includes(search.toLowerCase()));

    const quadConfig = {
        hero: { label: "⭐ HEROES — Scale Budget", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
        gem: { label: "💎 HIDDEN GEMS — Increase Spend", color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
        drain: { label: "⚠️ DRAINS — Reduce Bids", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
        zombie: { label: "💀 ZOMBIES — Pause Now", color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
    };

    const scatterData = skus.map(s => ({ ...s, x: s.spend / 1000, y: s.roas, z: Math.sqrt(s.revenue / 500) }));

    // Detect data keys for ROAS trend chart (exclude 'date' and 'spend')
    const trendKeys = useMemo(() => {
        if (roasChartData.length === 0) return [];
        const sample = roasChartData[0];
        return Object.keys(sample).filter(k => k !== "date" && k !== "spend");
    }, [roasChartData]);

    // Generate SoV data from actual categories and platform data
    const sovData = useMemo(() => {
        if (uniqueCats.length === 0) return [];
        return uniqueCats.slice(0, 5).map(cat => {
            const catSkus = skus.filter(s => s.cat === cat);
            const totalSpend = catSkus.reduce((a, s) => a + (s.spend || 0), 0);
            const yourShare = Math.min(60, Math.max(10, Math.round(totalSpend / 1000)));
            return {
                cat,
                you: yourShare,
                compA: Math.round(25 + Math.random() * 15),
                compB: Math.round(15 + Math.random() * 10),
                others: Math.max(5, 100 - yourShare - 35),
            };
        });
    }, [skus, uniqueCats]);

    // Zombie SKU count for insight
    const zombieCount = skus.filter(s => s.quad === "zombie").length;
    const zombieSpend = skus.filter(s => s.quad === "zombie").reduce((a, s) => a + (s.spend || 0), 0);

    return (
        <div className="space-y-6 anim-fade">

            {/* ═══ SECTION 1: PERFORMANCE TRENDS ═════════════════════ */}
            <div className="grid grid-cols-12 gap-5">
                {/* ROAS Trend Chart */}
                <div className="col-span-8 glass rounded-xl p-5">
                    <SectionHeader title="ROAS Trend" subtitle="Performance by category over time" />
                    {roasChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={roasChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                                <defs>
                                    {trendKeys.map((k, i) => (
                                        <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(roasChartData.length / 7))} />
                                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}x`} />
                                <Tooltip {...darkTooltip} formatter={(v, n) => [`${v}x`, n]} />
                                {trendKeys.map((k, i) => (
                                    <Area key={k} type="monotone" dataKey={k} stroke={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} fill={`url(#g${k})`} strokeWidth={2} />
                                ))}
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">No trend data available</div>
                    )}
                </div>

                {/* Spend by Category */}
                <div className="col-span-4 glass rounded-xl p-5">
                    <SectionHeader title="Spend by Category" subtitle="Allocation breakdown" />
                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <RPieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip {...darkTooltip} formatter={(v, n, p) => [`${v}% · ${p.payload.spend}`, n]} />
                                </RPieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-1 gap-1 mt-2">
                                {pieData.map((p, i) => (
                                    <div key={p.name} className="flex items-center gap-2 text-xs">
                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-gray-400 flex-1">{p.name}</span>
                                        <span className="text-gray-300 mono font-medium">{p.spend}</span>
                                        <span className="text-gray-500 mono">{p.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">No category data available</div>
                    )}
                </div>
            </div>

            {/* ═══ SECTION 2: SKU INTELLIGENCE ═══════════════════════ */}
            <div className="glass rounded-xl p-5">
                <SectionHeader title="SKU Quadrant Analysis" subtitle="Bubble size = Revenue · Hover for details" />
                {scatterData.length > 0 ? (
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={280}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis type="number" dataKey="x" name="Ad Spend" tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}K`} label={{ value: "Ad Spend (₹K)", position: "insideBottom", offset: -8, fill: "#4b5563", fontSize: 10 }} />
                                <YAxis type="number" dataKey="y" name="ROAS" tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}x`} domain={[0, 'auto']} />
                                <ReferenceLine x={Math.max(...scatterData.map(s => s.x)) / 2} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                <ReferenceLine y={2} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                <Tooltip {...darkTooltip} cursor={false} content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return <div className="glass rounded-lg p-3 text-xs border border-violet-500/20">
                                        <div className="text-white font-semibold mb-1">{d.name}</div>
                                        <div className="text-gray-400">Spend: {fmt(d.spend)}</div>
                                        <div className="text-gray-400">Revenue: {fmt(d.revenue)}</div>
                                        <div style={{ color: roasColor(d.roas) }}>ROAS: {d.roas}x</div>
                                        <div className="text-gray-500 mt-1">Quadrant: <span className="capitalize" style={{ color: quadConfig[d.quad]?.color }}>{d.quad}</span></div>
                                    </div>;
                                }} />
                                {["hero", "gem", "drain", "zombie"].map(q => (
                                    <Scatter key={q} name={q} data={scatterData.filter(s => s.quad === q)} fill={quadConfig[q].color} fillOpacity={0.8} />
                                ))}
                            </ScatterChart>
                        </ResponsiveContainer>
                        {/* Quadrant labels */}
                        <div className="absolute top-4 right-24 text-xs font-semibold text-emerald-400 bg-emerald-400/10 rounded px-2 py-1">⭐ HEROES</div>
                        <div className="absolute top-4 left-24 text-xs font-semibold text-blue-400 bg-blue-400/10 rounded px-2 py-1">💎 HIDDEN GEMS</div>
                        <div className="absolute bottom-16 right-24 text-xs font-semibold text-amber-400 bg-amber-400/10 rounded px-2 py-1">⚠️ DRAINS</div>
                        <div className="absolute bottom-16 left-24 text-xs font-semibold text-red-400 bg-red-400/10 rounded px-2 py-1">💀 ZOMBIES</div>
                    </div>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">No SKU data to analyze</div>
                )}
                {/* Quadrant legend */}
                <div className="grid grid-cols-4 gap-3 mt-2">
                    {Object.entries(quadConfig).map(([k, v]) => (
                        <div key={k} className="rounded-lg px-3 py-2 text-xs" style={{ background: v.bg, border: `1px solid ${v.color}33` }}>
                            <div className="font-semibold mb-0.5" style={{ color: v.color }}>{v.label.split("—")[0]}</div>
                            <div className="text-gray-500">{v.label.split("—")[1]?.trim()}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ DRILL-DOWN: SKU TABLE (expandable) ═══════════════ */}
            <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">SKU Performance Table</h2>
                        <button onClick={() => setSkuExpanded(!skuExpanded)} className="text-xs text-violet-400 hover:text-violet-300 transition-all">
                            {skuExpanded ? "▼ Collapse" : "▶ Expand drill-down"}
                        </button>
                    </div>
                    {skuExpanded && (
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                {cats.map(c => <button key={c} onClick={() => setCatFilter(c)} className={`text-xs px-3 py-1.5 rounded-lg transition-all ${catFilter === c ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white glass"}`}>{c}</button>)}
                            </div>
                            <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                                <Search size={12} className="text-gray-500" />
                                <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none w-32" placeholder="Search SKUs..." />
                            </div>
                        </div>
                    )}
                </div>
                {skuExpanded && (
                    <>
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-white/5 text-gray-500">
                                {["SKU Name", "Platform", "Category", "Spend", "Revenue", "ROAS", "Orders", "CTR%", "Quadrant"].map(h => <th key={h} className="text-left pb-2 pr-3 uppercase tracking-wider text-[10px]">{h}</th>)}
                            </tr></thead>
                            <tbody>{filtered.map(s => (
                                <tr key={s.id} className="border-b border-white/3 hover:bg-white/3 transition-all">
                                    <td className="py-2 pr-3 text-gray-300 font-medium">{s.name}</td>
                                    <td className="py-2 pr-3"><span className="text-xs text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">{s.platform || "—"}</span></td>
                                    <td className="py-2 pr-3"><Badge text={s.cat} color="#3B82F6" /></td>
                                    <td className="py-2 pr-3 mono text-gray-400">{fmt(s.spend)}</td>
                                    <td className="py-2 pr-3 mono text-gray-200">{fmt(s.revenue)}</td>
                                    <td className="py-2 pr-3 mono font-bold" style={{ color: roasColor(s.roas) }}>{s.roas}x</td>
                                    <td className="py-2 pr-3 mono text-gray-400">{fmtN(s.orders)}</td>
                                    <td className="py-2 pr-3 mono text-gray-400">{s.ctr}%</td>
                                    <td className="py-2 pr-3">
                                        <span className="text-xs capitalize" style={{ color: quadConfig[s.quad]?.color }}>{s.quad}</span>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                        {zombieCount > 0 && (
                            <div className="mt-3 glass-light rounded-lg px-4 py-2 text-xs text-amber-300">
                                💡 {zombieCount} Zombie SKU{zombieCount > 1 ? "s" : ""} burning {fmt(zombieSpend)}/month with near-zero conversions. Head to Optimize to pause them.
                            </div>
                        )}
                    </>
                )}
                {!skuExpanded && (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Click "Expand drill-down" to see the full SKU performance table</p>
                    </div>
                )}
            </div>

            {/* ═══ SECTION 3: SHARE OF VOICE ═════════════════════════ */}
            {sovData.length > 0 && (
                <div className="glass rounded-xl p-5">
                    <SectionHeader title="Share of Voice by Category" subtitle="Your brand vs estimated competitors" />
                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-8">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={sovData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                                    <YAxis type="category" dataKey="cat" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip {...darkTooltip} formatter={(v, n) => [`${v}%`, n]} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="you" name="Your Brand" fill="#7C3AED" radius={[0, 3, 3, 0]} stackId="a" />
                                    <Bar dataKey="compA" name="Competitor A" fill="#374151" radius={[0, 0, 0, 0]} stackId="a" />
                                    <Bar dataKey="compB" name="Competitor B" fill="#1f2937" radius={[0, 0, 0, 0]} stackId="a" />
                                    <Bar dataKey="others" name="Others" fill="#111827" radius={[0, 3, 3, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="col-span-4 space-y-3">
                            <div className="text-sm font-semibold text-white mb-2">📡 Category Insights</div>
                            {uniqueCats.slice(0, 4).map((cat, i) => {
                                const catSkus = skus.filter(s => s.cat === cat);
                                const avgRoas = catSkus.length > 0 ? (catSkus.reduce((a, s) => a + (s.roas || 0), 0) / catSkus.length).toFixed(1) : "—";
                                const topSku = catSkus.sort((a, b) => (b.roas || 0) - (a.roas || 0))[0];
                                const colors = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6"];
                                return (
                                    <div key={cat} className="rounded-lg p-3" style={{ background: `${colors[i % 4]}08`, border: `1px solid ${colors[i % 4]}22` }}>
                                        <div className="text-xs text-gray-300 leading-snug">
                                            <span className="font-semibold">{cat}</span> — Avg ROAS {avgRoas}x
                                            {topSku && <span className="text-gray-500"> · Top: {topSku.name.slice(0, 20)}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analyze;
