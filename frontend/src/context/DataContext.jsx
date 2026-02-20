import React, { createContext, useContext, useState, useCallback } from "react";
import { fmt } from "../data/mockData";
import { createSnapshot, findPreviousSnapshot, compareSnapshots, normalizeRows } from "../data/snapshotEngine";

const DataContext = createContext(null);

// ─── REQUIRED COLUMNS ─────────────────────────────────────────
export const REQUIRED_COLUMNS = ["date", "platform", "campaign", "sku", "spend", "revenue", "clicks", "impressions"];

const COLUMN_ALIASES = {
    date: ["date", "day", "report_date", "report date"],
    platform: ["platform", "marketplace", "channel", "source", "ad_platform", "ad platform"],
    campaign: ["campaign", "campaign_name", "campaign name", "ad_group", "ad group"],
    sku: ["sku", "product", "sku_name", "product_name", "product name", "sku name", "item"],
    spend: ["spend", "cost", "ad_spend", "ad spend", "amount_spent", "amount spent"],
    revenue: ["revenue", "sales", "conversion_value", "conversion value", "total_revenue", "total revenue", "gmv"],
    clicks: ["clicks", "click", "total_clicks", "total clicks"],
    impressions: ["impressions", "imps", "total_impressions", "total impressions"],
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
                action: "Pause or reduce bids immediately",
                campaign: c.name,
                resolved: false,
            });
        } else if (c.roas < 1.5 && c.spend > 5000) {
            anomalies.push({
                id: anomalies.length + 1,
                sev: "Warning",
                title: `${c.name} — ROAS declining at ${c.roas}x`,
                desc: `Performance is below target threshold. Consider bid adjustments.`,
                time: "Auto-detected",
                action: "Review bids in Optimize tab",
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
            desc: `${zombieSkus.map(s => s.name).join(", ")} show near-zero ROAS. Pausing saves budget immediately.`,
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
            cat: "Bid Optimization",
            icon: null,
            title: `Reduce bids on ${drainSkus.length} drain SKU${drainSkus.length > 1 ? "s" : ""} — high spend, low ROAS`,
            desc: `These SKUs consume significant budget but underperform. Bid reduction can improve blended ROAS.`,
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
            title: `Increase budget for ${heroSkus.length} hero SKU${heroSkus.length > 1 ? "s" : ""} — scaling opportunity`,
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

    const hasData = processedData !== null;

    const ingestData = useCallback((rows, headers, filename) => {
        setError(null);
        const { mapping, missing } = mapColumns(headers);
        if (missing.length > 0) {
            setError(`Missing required columns: ${missing.join(", ")}. Found: ${headers.join(", ")}`);
            return false;
        }
        try {
            const processed = processRawData(rows, mapping);
            setRawRows(rows);
            setProcessedData(processed);

            // ── Evaluate applied actions against new data ────────
            setAppliedActions(prev => evaluateActions(prev, processed));

            // ── Snapshot creation ────────────────────────────────
            const normalizedForSnap = normalizeRows(rows, mapping);
            const newSnapshot = createSnapshot(normalizedForSnap, filename);

            setSnapshots(prev => {
                const updated = [...prev, newSnapshot];

                // Auto-compare with previous snapshot
                const prevSnap = findPreviousSnapshot(updated, newSnapshot);
                if (prevSnap) {
                    const comparison = compareSnapshots(newSnapshot, prevSnap);
                    setComparisonResult(comparison);
                } else {
                    setComparisonResult(null);
                }

                return updated;
            });

            setUploadHistory(h => [{
                filename,
                time: new Date().toLocaleString(),
                rows: rows.length,
                cols: headers.length,
                dateRange: processed.dateRange,
                snapshotId: newSnapshot.snapshot_id,
            }, ...h]);
            return true;
        } catch (e) {
            setError(`Processing error: ${e.message}`);
            return false;
        }
    }, []);

    const clearData = useCallback(() => {
        setRawRows([]);
        setProcessedData(null);
        setError(null);
        setUploadHistory([]);
        setSnapshots([]);
        setAppliedActions([]);
    }, []);

    // ── Action State Machine ─────────────────────────────────
    const applyAction = useCallback((rec) => {
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
            state: "applied", // applied | evaluated
            outcome: null,    // null | improved | declined | neutral
            evaluatedAt: null,
        };
        setAppliedActions(prev => [...prev, action]);
        return action;
    }, [processedData]);

    const isActionApplied = useCallback((recId) => {
        return appliedActions.some(a => a.recId === recId && (a.state === "applied" || a.state === "evaluated"));
    }, [appliedActions]);

    const dismissAction = useCallback((recId) => {
        setAppliedActions(prev => [...prev, {
            id: `dismiss-${Date.now()}`,
            recId,
            state: "dismissed",
            appliedAt: new Date().toISOString(),
        }]);
    }, []);

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
