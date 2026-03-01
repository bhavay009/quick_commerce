import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { fmt } from "../data/mockData";
import { createSnapshot, findPreviousSnapshot, compareSnapshots, normalizeRows } from "../data/snapshotEngine";

const DataContext = createContext(null);

// ─── REQUIRED COLUMNS ─────────────────────────────────────────
export const REQUIRED_COLUMNS = ["date", "platform", "campaign", "sku", "spend", "revenue", "clicks", "impressions"];

const COLUMN_ALIASES = {
    date: ["date", "day", "report_date", "report date", "timestamp"],
    platform: ["platform", "marketplace", "channel", "source", "ad_platform", "ad platform", "city"],
    campaign: ["campaign", "campaign_name", "campaign name", "ad_group", "ad group", "hub_id", "seller_name"],
    sku: ["sku", "product", "sku_name", "product_name", "product name", "sku name", "item", "product_id"],
    spend: ["spend", "cost", "ad_spend", "ad spend", "amount_spent", "amount spent", "price_inr"],
    revenue: ["revenue", "sales", "conversion_value", "conversion value", "total_revenue", "total revenue", "gmv", "orders_today"],
    clicks: ["clicks", "click", "total_clicks", "total clicks", "orders_last_hour"],
    impressions: ["impressions", "imps", "total_impressions", "total impressions", "stock_available"],
};

// ─── COLUMN MAPPING ───────────────────────────────────────────
function mapColumns(headers) {
    const normalized = headers.map(h => h.trim().toLowerCase());
    const mapping = {};
    const missing = [];

    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
        const idx = normalized.findIndex(h => aliases.includes(h));
        if (idx !== -1) {
            mapping[key] = headers[idx];
        } else {
            missing.push(key);
        }
    }
    return { mapping, missing };
}

// ─── DATA PROCESSING ──────────────────────────────────────────
function processRawData(rows, colMapping) {
    // Normalize each row to standard keys
    const normalized = rows.map(row => ({
        date: row[colMapping.date] || "",
        platform: row[colMapping.platform] || "Unknown",
        campaign: row[colMapping.campaign] || "",
        sku: row[colMapping.sku] || "",
        spend: parseFloat(row[colMapping.spend]) || 0,
        revenue: parseFloat(row[colMapping.revenue]) || 0,
        clicks: parseInt(row[colMapping.clicks]) || 0,
        impressions: parseInt(row[colMapping.impressions]) || 0,
    })).filter(r => r.campaign || r.sku);

    // ── Aggregate campaigns
    const campMap = {};
    normalized.forEach(r => {
        if (!campMap[r.campaign]) {
            campMap[r.campaign] = { name: r.campaign, spend: 0, revenue: 0, clicks: 0, impressions: 0, orders: 0, skus: new Set() };
        }
        const c = campMap[r.campaign];
        c.spend += r.spend;
        c.revenue += r.revenue;
        c.clicks += r.clicks;
        c.impressions += r.impressions;
        c.orders += Math.round(r.revenue / 500); // est orders
        if (r.sku) c.skus.add(r.sku);
        if (r.platform) c.platform = r.platform;
    });

    // Distinct platforms
    const platformSet = new Set(normalized.map(r => r.platform).filter(Boolean));

    const campaigns = Object.values(campMap).map((c, i) => ({
        id: i + 1,
        name: c.name,
        brand: "Uploaded",
        cat: "—",
        platform: c.platform || "Unknown",
        status: "Active",
        budget: Math.round(c.spend / 28 * 1.2),
        spend: Math.round(c.spend),
        revenue: Math.round(c.revenue),
        roas: c.spend > 0 ? +(c.revenue / c.spend).toFixed(2) : 0,
        acos: c.revenue > 0 ? +((c.spend / c.revenue) * 100).toFixed(1) : 0,
        cpc: c.clicks > 0 ? +(c.spend / c.clicks).toFixed(1) : 0,
        ctr: c.impressions > 0 ? +((c.clicks / c.impressions) * 100).toFixed(1) : 0,
        imp: c.impressions,
        orders: c.orders,
    }));

    // ── Aggregate SKUs
    const skuMap = {};
    normalized.forEach(r => {
        if (!r.sku) return;
        if (!skuMap[r.sku]) {
            skuMap[r.sku] = { name: r.sku, spend: 0, revenue: 0, clicks: 0, impressions: 0, platform: r.platform };
        }
        const s = skuMap[r.sku];
        s.spend += r.spend;
        s.revenue += r.revenue;
        s.clicks += r.clicks;
        s.impressions += r.impressions;
    });

    const skus = Object.values(skuMap).map((s, i) => {
        const roas = s.spend > 0 ? +(s.revenue / s.spend).toFixed(2) : 0;
        const cpc = s.clicks > 0 ? +(s.spend / s.clicks).toFixed(1) : 0;
        const ctr = s.impressions > 0 ? +((s.clicks / s.impressions) * 100).toFixed(1) : 0;
        const orders = Math.round(s.revenue / 500);
        // Quadrant assignment
        const highSpend = s.spend > (totalSpend(normalized) / Object.keys(skuMap).length);
        const highRoas = roas >= 2.0;
        const quad = highRoas && highSpend ? "hero" : highRoas && !highSpend ? "gem" : !highRoas && highSpend ? "drain" : "zombie";
        return {
            id: i + 1,
            name: s.name,
            cat: "—",
            platform: s.platform || "Unknown",
            spend: Math.round(s.spend),
            revenue: Math.round(s.revenue),
            roas,
            orders,
            cpc,
            ctr,
            inv: "—",
            quad,
        };
    });

    // ── Daily ROAS chart data
    const dateMap = {};
    normalized.forEach(r => {
        if (!dateMap[r.date]) dateMap[r.date] = { spend: 0, revenue: 0 };
        dateMap[r.date].spend += r.spend;
        dateMap[r.date].revenue += r.revenue;
    });
    const sortedDates = Object.keys(dateMap).sort();
    const roasChartData = sortedDates.map(d => ({
        date: formatDateLabel(d),
        ROAS: dateMap[d].spend > 0 ? +((dateMap[d].revenue / dateMap[d].spend)).toFixed(2) : 0,
        spend: Math.round(dateMap[d].spend),
    }));

    // ── KPIs
    const totalSpendVal = normalized.reduce((a, r) => a + r.spend, 0);
    const totalRevenue = normalized.reduce((a, r) => a + r.revenue, 0);
    const totalClicks = normalized.reduce((a, r) => a + r.clicks, 0);
    const totalImpressions = normalized.reduce((a, r) => a + r.impressions, 0);
    const blendedRoas = totalSpendVal > 0 ? +(totalRevenue / totalSpendVal).toFixed(2) : 0;

    // ── Category spend (use campaign name prefix as proxy)
    const catMap = {};
    campaigns.forEach(c => {
        const cat = c.name.split(" ")[0] || "Other";
        if (!catMap[cat]) catMap[cat] = 0;
        catMap[cat] += c.spend;
    });
    const pieData = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, val]) => ({
            name,
            value: totalSpendVal > 0 ? Math.round((val / totalSpendVal) * 100) : 0,
            spend: fmt(val),
        }));

    // ── Anomalies / Alerts — auto-detect from data
    const anomalies = [];
    campaigns.forEach(c => {
        if (c.roas < 1.0 && c.spend > 10000) {
            anomalies.push({
                id: anomalies.length + 1,
                sev: "Critical",
                title: `${c.name} — ROAS is ${c.roas}x on ₹${Math.round(c.spend / 1000)}K spend`,
                desc: `This campaign is spending heavily but generating poor returns. Current ROAS ${c.roas}x is below breakeven.`,
                time: "Auto-detected",
                action: "Reduce Spend or Pause",
                campaign: c.name,
                resolved: false,
            });
        } else if (c.roas < 1.5 && c.spend > 5000) {
            anomalies.push({
                id: anomalies.length + 1,
                sev: "Warning",
                title: `${c.name} — ROAS declining at ${c.roas}x`,
                desc: `Performance is below target threshold. Consider reducing spend allocation.`,
                time: "Auto-detected",
                action: "Review in Actions tab",
                campaign: c.name,
                resolved: false,
            });
        }
    });

    // ── AI Recommendations — generated from data patterns
    const recommendations = [];
    const zombieSkus = skus.filter(s => s.quad === "zombie");
    if (zombieSkus.length > 0) {
        const zombieSpend = zombieSkus.reduce((a, s) => a + s.spend, 0);
        recommendations.push({
            id: 1,
            priority: "Critical",
            cat: "SKU Management",
            icon: null,
            title: `Pause ${zombieSkus.length} zombie SKU${zombieSkus.length > 1 ? "s" : ""} burning ${fmt(zombieSpend)}`,
            desc: `${zombieSkus.map(s => s.name).join(", ")} show near-zero ROAS. Pausing Spend saves budget immediately.`,
            impact: zombieSpend,
            confidence: 95,
            campaign: "Multiple",
            roas_impact: "+0.3x",
            applied: false,
        });
    }

    const drainSkus = skus.filter(s => s.quad === "drain");
    if (drainSkus.length > 0) {
        recommendations.push({
            id: 2,
            priority: "High",
            cat: "Spend Strategy",
            icon: null,
            title: `Reduce Spend on ${drainSkus.length} drain SKU${drainSkus.length > 1 ? "s" : ""} — high spend, low ROAS`,
            desc: `These SKUs consume significant budget but underperform. Reducing spend allocation can improve blended ROAS.`,
            impact: Math.round(drainSkus.reduce((a, s) => a + s.spend, 0) * 0.3),
            confidence: 82,
            campaign: "Multiple",
            roas_impact: "+0.2x",
            applied: false,
        });
    }

    const heroSkus = skus.filter(s => s.quad === "hero");
    if (heroSkus.length > 0) {
        recommendations.push({
            id: 3,
            priority: "Medium",
            cat: "Budget Reallocation",
            icon: null,
            title: `Scale Spend on ${heroSkus.length} hero SKU${heroSkus.length > 1 ? "s" : ""} — scaling opportunity`,
            desc: `These top performers have room to grow. Reallocating budget from drains/zombies can amplify returns.`,
            impact: Math.round(heroSkus.reduce((a, s) => a + s.revenue, 0) * 0.15),
            confidence: 76,
            campaign: "Multiple",
            roas_impact: "+0.5x",
            applied: false,
        });
    }

    // ── Health score
    const healthScore = Math.min(100, Math.max(10, Math.round(
        (blendedRoas >= 2.5 ? 30 : blendedRoas >= 1.5 ? 20 : 10) +
        (zombieSkus.length === 0 ? 25 : Math.max(0, 25 - zombieSkus.length * 5)) +
        (anomalies.filter(a => a.sev === "Critical").length === 0 ? 25 : 10) +
        (campaigns.length > 0 ? 20 : 0)
    )));

    return {
        campaigns,
        skus,
        roasChartData,
        pieData,
        anomalies: anomalies.length > 0 ? anomalies : [{ id: 1, sev: "Positive", title: "All campaigns healthy", desc: "No anomalies detected.", time: "Now", action: "Keep monitoring", campaign: "—", resolved: false }],
        recommendations,
        kpis: {
            totalSpend: totalSpendVal,
            totalRevenue,
            blendedRoas,
            totalClicks,
            totalImpressions,
            totalOrders: Math.round(totalRevenue / 500),
            activeCampaigns: campaigns.length,
            healthScore,
        },
        dateRange: sortedDates.length > 0 ? `${sortedDates[0]} – ${sortedDates[sortedDates.length - 1]}` : "—",
        rowCount: normalized.length,
        platforms: [...platformSet],
    };
}

// ─── ATOMS INTELLIGENCE ENGINE ───────────────────────────────
// Generates seller-trustworthy action cards from real snapshot comparison deltas.
// An action is generated ONLY if:
//   1. A SKU-level metric changed materially vs previous upload
//   2. The change has clear ₹ financial impact
//   3. A specific business root cause can be identified from metric patterns
//   4. Ignoring will cause measurable loss in 24-48h

function generateAtomsActions(comparison) {
    if (!comparison || !comparison.comparisons) return [];
    const candidates = [];
    const { comparisons } = comparison;

    comparisons.forEach(comp => {
        if (comp.status !== "matched" || !comp.delta) return;

        const { curr, prev, delta, sku, platform, campaign } = comp;
        if (!prev || !curr) return;

        // ── SCENARIO 1: ROAS Decline ≥ 15% — Spend is being wasted ──
        if (prev.roas > 0 && delta.roasPct <= -15) {
            const spendWasted = curr.spend > 0 ? Math.round(curr.spend * (1 - (curr.roas / Math.max(prev.roas, 0.01)))) : 0;
            const loss24h = Math.max(Math.round(Math.abs(delta.revenue)), Math.round(curr.spend * 0.3));
            const gmvRecoverable = Math.round(Math.abs(delta.revenue) * 0.7);

            // Determine root cause from metric pattern
            let primaryCause, secondaryFactors;
            if (delta.spendPct > 10 && delta.ordersPct < 0) {
                primaryCause = `Spend increased by ${delta.spendPct.toFixed(0)}% while orders dropped ${Math.abs(delta.ordersPct).toFixed(0)}% — bid inflation without proportional conversion.`;
                secondaryFactors = [
                    `CPC rose from ₹${prev.cpc || 0} to ₹${curr.cpc || 0} (${((curr.cpc - prev.cpc) / Math.max(prev.cpc, 0.1) * 100).toFixed(0)}% increase)`,
                    `Conversion rate likely declined as clicks grew ${delta.clicksPct || 0}% but orders fell`
                ];
            } else if (delta.revenuePct < -20) {
                primaryCause = `Revenue dropped ₹${Math.abs(Math.round(delta.revenue)).toLocaleString()} (${Math.abs(delta.revenuePct).toFixed(0)}%) while spend remained similar — demand contraction or competition pressure.`;
                secondaryFactors = [
                    `Orders fell from ${prev.orders} to ${curr.orders} (${delta.ordersPct?.toFixed(0) || 0}%)`,
                    `Average order value shift may indicate basket shrinkage`
                ];
            } else {
                primaryCause = `ROAS declined from ${prev.roas.toFixed(2)}x to ${curr.roas.toFixed(2)}x — efficiency degradation across the funnel.`;
                secondaryFactors = [
                    `Spend delta: ${delta.spend >= 0 ? '+' : ''}₹${Math.round(delta.spend).toLocaleString()} (${delta.spendPct?.toFixed(0) || 0}%)`,
                    `Revenue delta: ${delta.revenue >= 0 ? '+' : ''}₹${Math.round(delta.revenue).toLocaleString()} (${delta.revenuePct?.toFixed(0) || 0}%)`
                ];
            }

            // Recommended actions with exact values
            const recs = [];
            if (delta.spendPct > 10) {
                recs.push(`Reduce daily spend by ${Math.min(30, Math.round(Math.abs(delta.spendPct) * 0.6))}% to ₹${Math.round(curr.spend * 0.75).toLocaleString()} for this SKU`);
            } else {
                recs.push(`Pause and review bid strategy — current CPC of ₹${(curr.cpc || 0).toFixed(1)} is not converting`);
            }
            if (curr.roas < 1.0) {
                recs.push(`Pause campaign for this SKU immediately — ROAS ${curr.roas.toFixed(2)}x means every ₹1 spent returns less than ₹1`);
            } else {
                recs.push(`Move ₹${Math.round(curr.spend * 0.2).toLocaleString()} daily budget toward higher-performing SKUs in same campaign`);
            }
            recs.push(`Review and update product listing/keywords for ${sku} to improve click-to-order conversion`);

            const severity = delta.roasPct <= -30 || curr.roas < 1.0 ? "Critical" : "High";

            candidates.push({
                id: `atoms-roas-${sku}-${platform}`,
                priority: severity,
                cat: "ROAS Decline",
                title: `[${severity.toUpperCase()}] ${sku} requires action in ${platform}`,
                isAtoms: true,
                sortImpact: loss24h,
                payload: {
                    sku: `${sku}`,
                    category: campaign,
                    location: `${platform}, ${campaign}`,
                    timeWindow: comparison.time_gap || "Last upload period",
                    impact: {
                        recovered: gmvRecoverable,
                        roasBefore: prev.roas,
                        roasAfter: prev.roas.toFixed(2),
                        loss24h: loss24h
                    },
                    deltas: [
                        { label: "ROAS", val: `${curr.roas.toFixed(2)}x`, delta: `${delta.roasPct.toFixed(1)}% vs last period` },
                        { label: "Revenue", val: `₹${Math.round(curr.revenue).toLocaleString()}`, delta: `${delta.revenue >= 0 ? '+' : ''}₹${Math.round(delta.revenue).toLocaleString()} (${delta.revenuePct?.toFixed(0) || 0}%)` },
                        { label: "Spend", val: `₹${Math.round(curr.spend).toLocaleString()}`, delta: `${delta.spend >= 0 ? '+' : ''}₹${Math.round(delta.spend).toLocaleString()} (${delta.spendPct?.toFixed(0) || 0}%)` }
                    ],
                    rootCause: {
                        primary: primaryCause,
                        secondary: secondaryFactors
                    },
                    recommendations: recs,
                    urgency: curr.roas < 1.0 ? "Immediate" : "Today",
                    urgencyReason: curr.roas < 1.0
                        ? `Every hour of delay burns ₹${Math.round(curr.spend / 24).toLocaleString()} net negative.`
                        : `Continued spend at current efficiency will compound losses by ₹${Math.round(loss24h * 0.15).toLocaleString()}/day.`,
                    confidence: Math.min(96, 70 + Math.round(Math.abs(delta.roasPct) * 0.5)),
                    evidence: [
                        `Based on ${comp.prev.rowCount || 'multi'}-day to ${comp.curr?.rowCount || 'multi'}-day comparison`,
                        `ROAS moved from ${prev.roas.toFixed(2)}x to ${curr.roas.toFixed(2)}x across full periods`
                    ]
                }
            });
        }

        // ── SCENARIO 2: Revenue Drop ≥ 20% with Stable/Increased Spend ──
        if (delta.revenuePct <= -20 && delta.spendPct >= -5 && Math.abs(delta.roasPct) < 15) {
            const loss24h = Math.round(Math.abs(delta.revenue) * 0.6);
            const gmvRecoverable = Math.round(Math.abs(delta.revenue) * 0.5);

            candidates.push({
                id: `atoms-rev-${sku}-${platform}`,
                priority: "High",
                cat: "Revenue / Conversion",
                title: `[HIGH] ${sku} revenue dropped in ${platform}`,
                isAtoms: true,
                sortImpact: loss24h,
                payload: {
                    sku: `${sku}`,
                    category: campaign,
                    location: `${platform}, ${campaign}`,
                    timeWindow: comparison.time_gap || "Last upload period",
                    impact: {
                        recovered: gmvRecoverable,
                        roasBefore: prev.roas,
                        roasAfter: (prev.roas * 0.95).toFixed(2),
                        loss24h: loss24h
                    },
                    deltas: [
                        { label: "Revenue", val: `₹${Math.round(curr.revenue).toLocaleString()}`, delta: `${delta.revenuePct.toFixed(0)}% vs last period` },
                        { label: "Orders", val: `${curr.orders}`, delta: `${delta.orders >= 0 ? '+' : ''}${delta.orders} (${delta.ordersPct?.toFixed(0) || 0}%)` },
                        { label: "Spend", val: `₹${Math.round(curr.spend).toLocaleString()}`, delta: `${delta.spendPct >= 0 ? '+' : ''}${delta.spendPct.toFixed(0)}% (held steady)` }
                    ],
                    rootCause: {
                        primary: `Orders declined from ${prev.orders} to ${curr.orders} while spend held at ₹${Math.round(curr.spend).toLocaleString()} — conversion funnel breakdown.`,
                        secondary: [
                            `Revenue per order shifted from ₹${prev.orders > 0 ? Math.round(prev.revenue / prev.orders).toLocaleString() : '—'} to ₹${curr.orders > 0 ? Math.round(curr.revenue / curr.orders).toLocaleString() : '—'}`,
                            `Impressions ${delta.impressionsPct > 0 ? 'grew' : 'fell'} ${Math.abs(delta.impressionsPct || 0).toFixed(0)}% — ${delta.impressionsPct > 0 ? 'visibility is not the issue' : 'reduced visibility may be contributing'}`
                        ]
                    },
                    recommendations: [
                        `Audit product listing: price, images, reviews for ${sku} — conversion drop suggests buyer hesitation`,
                        `Reduce spend by 15% to ₹${Math.round(curr.spend * 0.85).toLocaleString()} until conversion recovers`,
                        `Check competitor pricing — a ₹${Math.round(curr.revenue / Math.max(curr.orders, 1) * 0.05)} price reduction may recover volume`
                    ],
                    urgency: "Today",
                    urgencyReason: `₹${Math.round(curr.spend).toLocaleString()} daily spend continues at depressed conversion — burns ₹${Math.round(curr.spend * 0.25).toLocaleString()}/day in excess cost.`,
                    confidence: Math.min(92, 65 + Math.round(Math.abs(delta.revenuePct) * 0.5)),
                    evidence: [
                        `Revenue dropped ₹${Math.abs(Math.round(delta.revenue)).toLocaleString()} across full comparison period`,
                        `Spend-to-revenue ratio deteriorated from 1:${prev.roas.toFixed(1)} to 1:${curr.roas.toFixed(1)}`
                    ]
                }
            });
        }

        // ── SCENARIO 3: Overspend — Spend Up ≥ 25% with ROAS Flat/Down ──
        if (delta.spendPct >= 25 && delta.roasPct <= 5) {
            const excessSpend = Math.round(delta.spend * 0.4);
            const loss24h = excessSpend;

            candidates.push({
                id: `atoms-spend-${sku}-${platform}`,
                priority: delta.roasPct < 0 ? "Critical" : "Medium",
                cat: "Spend / Budget",
                title: `[${delta.roasPct < 0 ? 'CRITICAL' : 'MEDIUM'}] ${sku} overspending in ${platform}`,
                isAtoms: true,
                sortImpact: loss24h,
                payload: {
                    sku: `${sku}`,
                    category: campaign,
                    location: `${platform}, ${campaign}`,
                    timeWindow: comparison.time_gap || "Last upload period",
                    impact: {
                        recovered: excessSpend,
                        roasBefore: prev.roas,
                        roasAfter: (curr.revenue / Math.max(curr.spend - excessSpend, 1)).toFixed(2),
                        loss24h: loss24h
                    },
                    deltas: [
                        { label: "Spend", val: `₹${Math.round(curr.spend).toLocaleString()}`, delta: `+${delta.spendPct.toFixed(0)}% vs last period` },
                        { label: "ROAS", val: `${curr.roas.toFixed(2)}x`, delta: `${delta.roasPct >= 0 ? '+' : ''}${delta.roasPct.toFixed(1)}% (${delta.roasPct <= 0 ? 'declining' : 'flat'})` },
                        { label: "Revenue", val: `₹${Math.round(curr.revenue).toLocaleString()}`, delta: `${delta.revenuePct >= 0 ? '+' : ''}${delta.revenuePct.toFixed(0)}% — not keeping pace with spend` }
                    ],
                    rootCause: {
                        primary: `Spend grew ₹${Math.round(delta.spend).toLocaleString()} (+${delta.spendPct.toFixed(0)}%) but revenue only grew ${delta.revenuePct.toFixed(0)}% — diminishing returns on incremental spend.`,
                        secondary: [
                            `CPC increased from ₹${(prev.cpc || 0).toFixed(1)} to ₹${(curr.cpc || 0).toFixed(1)} — bid competition intensified`,
                            `Additional ₹${Math.round(delta.spend).toLocaleString()} spend yielded only ₹${Math.round(delta.revenue).toLocaleString()} incremental revenue`
                        ]
                    },
                    recommendations: [
                        `Cap daily spend at ₹${Math.round(prev.spend * 1.1).toLocaleString()} — revert to last period's proven level +10%`,
                        `Reallocate ₹${excessSpend.toLocaleString()} excess to top-ROAS SKUs in the portfolio`,
                        `Set automated bid ceiling at ₹${Math.round((prev.cpc || curr.cpc) * 1.05).toFixed(1)} to prevent CPC creep`
                    ],
                    urgency: delta.roasPct < 0 ? "Immediate" : "This week",
                    urgencyReason: `Excess spend of ₹${excessSpend.toLocaleString()} per period compounds — acts as a direct margin drain until corrected.`,
                    confidence: Math.min(94, 72 + Math.round(delta.spendPct * 0.3)),
                    evidence: [
                        `Spend-revenue gap: +${delta.spendPct.toFixed(0)}% spend vs ${delta.revenuePct >= 0 ? '+' : ''}${delta.revenuePct.toFixed(0)}% revenue`,
                        `Marginal ROAS on incremental spend: ${delta.spend > 0 ? (delta.revenue / delta.spend).toFixed(2) : '0.00'}x (below portfolio average)`
                    ]
                }
            });
        }
    });

    // Also check for NEW SKUs with strong initial metrics (scale opportunity)
    comparisons.forEach(comp => {
        if (comp.status !== "new" || !comp.curr) return;
        const { curr, sku, platform, campaign } = comp;
        if (curr.roas >= 2.5 && curr.revenue >= 5000) {
            candidates.push({
                id: `atoms-new-${sku}-${platform}`,
                priority: "Medium",
                cat: "Scale Opportunity",
                title: `[MEDIUM] ${sku} — new high-performer in ${platform}`,
                isAtoms: true,
                sortImpact: Math.round(curr.revenue * 0.3),
                payload: {
                    sku: `${sku}`,
                    category: campaign,
                    location: `${platform}, ${campaign}`,
                    timeWindow: "First observation period",
                    impact: {
                        recovered: Math.round(curr.revenue * 0.3),
                        roasBefore: 0,
                        roasAfter: curr.roas.toFixed(2),
                        loss24h: 0
                    },
                    deltas: [
                        { label: "ROAS", val: `${curr.roas.toFixed(2)}x`, delta: "New — no prior baseline" },
                        { label: "Revenue", val: `₹${Math.round(curr.revenue).toLocaleString()}`, delta: "First period tracked" },
                        { label: "Spend", val: `₹${Math.round(curr.spend).toLocaleString()}`, delta: "Initial budget allocation" }
                    ],
                    rootCause: {
                        primary: `New SKU entered portfolio with ${curr.roas.toFixed(2)}x ROAS and ₹${Math.round(curr.revenue).toLocaleString()} revenue — outperforming portfolio average.`,
                        secondary: [
                            `${curr.orders} orders generated in first tracked period`,
                            `Cost per order: ₹${curr.orders > 0 ? Math.round(curr.spend / curr.orders).toLocaleString() : '—'}`
                        ]
                    },
                    recommendations: [
                        `Increase daily budget by 25% to ₹${Math.round(curr.spend * 1.25).toLocaleString()} to capture incremental demand`,
                        `Monitor CPC closely — set alert if CPC exceeds ₹${Math.round((curr.cpc || 5) * 1.3).toFixed(1)}`,
                        `Source budget from underperforming SKUs with ROAS below 1.5x`
                    ],
                    urgency: "This week",
                    urgencyReason: `Early-mover advantage — scaling before competitors bid up this keyword/placement.`,
                    confidence: 72,
                    evidence: [
                        `First-period ROAS of ${curr.roas.toFixed(2)}x suggests strong product-market fit`,
                        `Revenue of ₹${Math.round(curr.revenue).toLocaleString()} validates demand at current price point`
                    ]
                }
            });
        }
    });

    // Sort by financial impact descending, cap at 3
    candidates.sort((a, b) => b.sortImpact - a.sortImpact);
    return candidates.slice(0, 3);
}

function totalSpend(rows) {
    return rows.reduce((a, r) => a + r.spend, 0);
}

function formatDateLabel(d) {
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return `${dt.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()]}`;
    } catch { return d; }
}

// ─── EVALUATE APPLIED ACTIONS ─────────────────────────────────
function evaluateActions(actions, newData) {
    if (!actions || actions.length === 0 || !newData?.kpis) return actions;
    return actions.map(action => {
        // Only evaluate actions in "applied" state
        if (action.state !== "applied" || !action.baselineMetrics) return action;
        const before = action.baselineMetrics;
        const after = newData.kpis;
        // Compare ROAS and health score
        const roasDelta = (after.blendedRoas || 0) - (before.blendedRoas || 0);
        const healthDelta = (after.healthScore || 0) - (before.healthScore || 0);
        let outcome = "neutral";
        if (roasDelta > 0.1 || healthDelta > 3) outcome = "improved";
        else if (roasDelta < -0.1 || healthDelta < -3) outcome = "declined";
        return {
            ...action,
            state: "evaluated",
            outcome,
            evaluatedAt: new Date().toISOString(),
            afterMetrics: {
                blendedRoas: after.blendedRoas,
                totalSpend: after.totalSpend,
                totalRevenue: after.totalRevenue,
                healthScore: after.healthScore,
            },
        };
    });
}

// ─── PROVIDER ─────────────────────────────────────────────────
export function DataProvider({ children }) {
    const [rawRows, setRawRows] = useState([]);
    const [processedData, setProcessedData] = useState(null);
    const [uploadHistory, setUploadHistory] = useState([]);
    const [error, setError] = useState(null);
    const [snapshots, setSnapshots] = useState([]);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
    const [appliedActions, setAppliedActions] = useState([]);
    const { token, user } = useAuth();
    const [isRestoring, setIsRestoring] = useState(false);

    // ─── RESTORE STATE ON LOGIN ───────────────────────────────
    useEffect(() => {
        const restore = async () => {
            if (!token || !user) return;
            setIsRestoring(true);
            try {
                const res = await fetch('http://localhost:5001/api/imports/restore', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const d = await res.json();
                if (d.hasData) {
                    // Map back to internal format
                    const normalized = d.skus.map(s => ({
                        date: s.created_at,
                        platform: s.platform || "Platform A",
                        campaign: s.campaign || "Restored",
                        sku: s.sku_name,
                        spend: Number(s.spend),
                        revenue: Number(s.revenue),
                        clicks: Number(s.clicks),
                        impressions: Number(s.impressions),
                    })).filter(r => r.sku);

                    // Re-process for view state
                    const processed = processRawData(normalized, {
                        date: "date", platform: "platform", campaign: "campaign",
                        sku: "sku", spend: "spend", revenue: "revenue",
                        clicks: "clicks", impressions: "impressions"
                    });

                    setProcessedData(processed);
                    setSnapshots([{
                        snapshot_id: d.latestImport.id,
                        filename: d.latestImport.filename,
                        timestamp: d.latestImport.created_at,
                        summary: { row_count: d.latestImport.row_count }
                    }]);

                    // Map actions
                    setAppliedActions(d.actions.map(a => ({
                        id: a.id,
                        recId: a.importId, // using importId as proxy or adding field
                        type: a.type,
                        title: a.title,
                        desc: a.desc,
                        state: a.state,
                        outcome: a.outcome,
                        appliedAt: a.appliedAt,
                        evaluatedAt: a.evaluatedAt,
                        baselineMetrics: a.baselineMetrics,
                        afterMetrics: a.afterMetrics,
                        impact: Number(a.impact),
                        confidence: a.confidence
                    })));

                    setUploadHistory([{
                        filename: d.latestImport.filename,
                        time: new Date(d.latestImport.created_at).toLocaleString(),
                        rows: d.latestImport.row_count,
                        dateRange: processed.dateRange,
                    }]);
                }
            } catch (err) {
                console.error("Restore error:", err);
            } finally {
                setIsRestoring(false);
            }
        };
        restore();
    }, [token, user]);

    const hasData = processedData !== null;

    const ingestData = useCallback(async (rows, headers, filename) => {
        setError(null);
        const { mapping, missing } = mapColumns(headers);
        if (missing.length > 0) {
            setError(`Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`);
            return false;
        }
        try {
            const processed = processRawData(rows, mapping);

            // ── Persist to Backend ────────────────────────────
            if (token) {
                const normalizedForDB = rows.map(row => ({
                    date: row[mapping.date],
                    platform: row[mapping.platform],
                    campaign: row[mapping.campaign],
                    sku: row[mapping.sku],
                    spend: parseFloat(row[mapping.spend]) || 0,
                    revenue: parseFloat(row[mapping.revenue]) || 0,
                    clicks: parseInt(row[mapping.clicks]) || 0,
                    impressions: parseInt(row[mapping.impressions]) || 0,
                    orders: Math.round((parseFloat(row[mapping.revenue]) || 0) / 500)
                }));

                await fetch('http://localhost:5001/api/skus/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ skus: normalizedForDB, filename })
                });
            }

            setRawRows(rows);
            setProcessedData(processed);

            // ── Evaluate applied actions against new data ────────
            setAppliedActions(prev => {
                const updated = evaluateActions(prev, processed);
                // Sync evaluations to backend
                updated.forEach(async (a) => {
                    if (a.state === "evaluated" && a.id && !a.id.startsWith("action-")) {
                        await fetch(`http://localhost:5001/api/actions`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(a)
                        });
                    }
                });
                return updated;
            });

            // ── Snapshot creation ────────────────────────────────
            const normalizedForSnap = normalizeRows(rows, mapping);
            const newSnapshot = createSnapshot(normalizedForSnap, filename);

            setSnapshots(prev => {
                const updated = [...prev, newSnapshot];
                const prevSnap = findPreviousSnapshot(updated, newSnapshot);
                if (prevSnap) {
                    const freshComparison = compareSnapshots(newSnapshot, prevSnap);
                    setComparisonResult(freshComparison);

                    // ── Generate Atoms Intelligence Actions from FRESH comparison ──
                    const seriousActions = generateAtomsActions(freshComparison);
                    if (seriousActions.length > 0) {
                        setProcessedData(pd => ({
                            ...pd,
                            recommendations: seriousActions
                        }));
                    }
                } else {
                    setComparisonResult(null);
                }
                return updated;
            });

            setUploadHistory(h => [{
                filename,
                time: new Date().toLocaleString(),
                rows: rows.length,
                dateRange: processed.dateRange,
                snapshotId: newSnapshot.snapshot_id,
            }, ...h]);
            return true;
        } catch (e) {
            setError(`Processing error: ${e.message}`);
            return false;
        }
    }, [token]);

    const clearData = useCallback(async () => {
        if (token) {
            await fetch('http://localhost:5001/api/imports/latest', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        setRawRows([]);
        setProcessedData(null);
        setError(null);
        setUploadHistory([]);
        setSnapshots([]);
        setAppliedActions([]);
    }, [token]);

    // ── Action State Machine ─────────────────────────────────
    const applyAction = useCallback(async (rec) => {
        const action = {
            id: `action-${Date.now()}`,
            recId: rec.id,
            type: rec.cat || "General",
            title: rec.title,
            desc: rec.desc,
            platform: rec.platform || rec.campaign || "Multiple",
            campaign: rec.campaign || "Multiple",
            skus: rec.skuNames || [],
            appliedAt: new Date().toISOString(),
            baselineMetrics: processedData?.kpis ? {
                blendedRoas: processedData.kpis.blendedRoas,
                totalSpend: processedData.kpis.totalSpend,
                totalRevenue: processedData.kpis.totalRevenue,
                healthScore: processedData.kpis.healthScore,
            } : null,
            impact: rec.impact,
            roasImpact: rec.roas_impact,
            confidence: rec.confidence,
            state: "applied",
            outcome: null,
            evaluatedAt: null,
            importId: snapshots[0]?.snapshot_id // Link to snapshot
        };

        if (token) {
            const res = await fetch('http://localhost:5001/api/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(action)
            });
            const savedAction = await res.json();
            setAppliedActions(prev => [...prev, { ...action, id: savedAction.id }]);
        } else {
            setAppliedActions(prev => [...prev, action]);
        }
        return action;
    }, [processedData, token, snapshots]);

    const isActionApplied = useCallback((recId) => {
        return appliedActions.some(a => a.recId === recId && (a.state === "applied" || a.state === "evaluated"));
    }, [appliedActions]);

    const dismissAction = useCallback(async (recId) => {
        const existing = appliedActions.find(a => a.recId === recId);
        if (existing && existing.id && !existing.id.startsWith("action-") && token) {
            await fetch(`http://localhost:5001/api/actions/${existing.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        setAppliedActions(prev => prev.filter(a => a.recId !== recId));
    }, [appliedActions, token]);


    // Return processed data if available, otherwise null
    const data = hasData ? processedData : null;

    // Platform filter helper
    const pf = (arr) => {
        if (!arr) return [];
        if (selectedPlatform === "All Platforms") return arr;
        return arr.filter(item => item.platform === selectedPlatform || item.platform === "All Platforms");
    };

    // Available platforms: from data or mock
    const availablePlatforms = data?.platforms ?? ["Zepto", "Blinkit", "Instamart", "BigBasket Now", "Dunzo"];

    return (
        <DataContext.Provider value={{
            data,
            hasData,
            rawRows,
            uploadHistory,
            error,
            ingestData,
            clearData,
            setError,
            selectedPlatform,
            setSelectedPlatform,
            availablePlatforms,
            // Snapshot data
            snapshots,
            comparisonResult,
            snapshotCount: snapshots.length,
            hasComparison: comparisonResult !== null,
            // Convenience getters — return processed data, filtered by platform (empty when no CSV uploaded)
            campaigns: pf(data?.campaigns ?? []),
            skus: pf(data?.skus ?? []),
            roasChartData: data?.roasChartData ?? [],
            pieData: data?.pieData ?? [],
            anomalies: pf(data?.anomalies ?? []),
            // Filter out applied/dismissed actions from recommendations
            recommendations: pf(data?.recommendations ?? []).filter(
                r => !appliedActions.some(a => a.recId === r.id && (a.state === "applied" || a.state === "evaluated" || a.state === "dismissed"))
            ),
            appliedActions,
            applyAction,
            isActionApplied,
            dismissAction,
            kpis: data?.kpis ?? {
                totalSpend: 0, totalRevenue: 0, blendedRoas: 0,
                totalClicks: 0, totalImpressions: 0, totalOrders: 0,
                activeCampaigns: 0, healthScore: 0,
            },
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used within DataProvider");
    return ctx;
}

export default DataContext;
