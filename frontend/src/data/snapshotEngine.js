// ═══════════════════════════════════════════════════════════════
// SNAPSHOT ENGINE — storage, matching, comparison
// ═══════════════════════════════════════════════════════════════

let idCounter = 0;

/**
 * Generate a simple unique ID for snapshots.
 */
function generateId() {
    idCounter += 1;
    return `snap-${Date.now()}-${idCounter}`;
}

// ─── RECORD KEY ───────────────────────────────────────────────
/**
 * Compound key used to match records between snapshots.
 */
function recordKey(r) {
    return `${(r.platform || "").toLowerCase()}|${(r.sku || "").toLowerCase()}|${(r.campaign || "").toLowerCase()}`;
}

// ─── CREATE SNAPSHOT ──────────────────────────────────────────
/**
 * Build a snapshot from normalized rows (already mapped to standard keys).
 *
 * @param {Object[]} normalizedRows  — rows with { date, platform, campaign, sku, spend, revenue, clicks, impressions }
 * @param {string}   filename
 * @returns {Object} snapshot
 */
export function createSnapshot(normalizedRows, filename) {
    const dates = normalizedRows.map(r => r.date).filter(Boolean).sort();
    const dateRange = dates.length > 0
        ? { from: dates[0], to: dates[dates.length - 1] }
        : { from: "—", to: "—" };

    // Aggregate by platform + sku + campaign
    const recordMap = {};
    normalizedRows.forEach(r => {
        const key = recordKey(r);
        if (!recordMap[key]) {
            recordMap[key] = {
                key,
                platform: r.platform || "Unknown",
                sku: r.sku || "—",
                campaign: r.campaign || "—",
                spend: 0,
                revenue: 0,
                clicks: 0,
                impressions: 0,
                orders: 0,
                rowCount: 0,
            };
        }
        const rec = recordMap[key];
        rec.spend += r.spend;
        rec.revenue += r.revenue;
        rec.clicks += r.clicks;
        rec.impressions += r.impressions;
        rec.orders += Math.round(r.revenue / 500); // estimate
        rec.rowCount += 1;
    });

    // Compute derived metrics per record
    const records = Object.values(recordMap).map(rec => ({
        ...rec,
        roas: rec.spend > 0 ? +(rec.revenue / rec.spend).toFixed(2) : 0,
        cpc: rec.clicks > 0 ? +(rec.spend / rec.clicks).toFixed(1) : 0,
        ctr: rec.impressions > 0 ? +((rec.clicks / rec.impressions) * 100).toFixed(1) : 0,
    }));

    // Platforms present
    const platforms = [...new Set(normalizedRows.map(r => r.platform).filter(Boolean))];

    return {
        snapshot_id: generateId(),
        filename,
        upload_date: new Date().toISOString(),
        date_range: dateRange,
        date_range_label: dates.length > 0 ? `${dates[0]} – ${dates[dates.length - 1]}` : "—",
        platforms,
        records,
        totals: {
            spend: records.reduce((a, r) => a + r.spend, 0),
            revenue: records.reduce((a, r) => a + r.revenue, 0),
            orders: records.reduce((a, r) => a + r.orders, 0),
            clicks: records.reduce((a, r) => a + r.clicks, 0),
            impressions: records.reduce((a, r) => a + r.impressions, 0),
        },
    };
}

// ─── FIND PREVIOUS SNAPSHOT ───────────────────────────────────
/**
 * Find the most recent prior snapshot that shares at least one platform
 * with the given snapshot.
 */
export function findPreviousSnapshot(allSnapshots, currentSnapshot) {
    const currentPlatforms = new Set(currentSnapshot.platforms.map(p => p.toLowerCase()));

    // Search backwards (most recent first), skip current
    for (let i = allSnapshots.length - 1; i >= 0; i--) {
        const snap = allSnapshots[i];
        if (snap.snapshot_id === currentSnapshot.snapshot_id) continue;
        const overlap = snap.platforms.some(p => currentPlatforms.has(p.toLowerCase()));
        if (overlap) return snap;
    }
    return null;
}

// ─── COMPARE SNAPSHOTS ────────────────────────────────────────
/**
 * Compare two snapshots record-by-record.
 *
 * @param {Object} current  — the newer snapshot
 * @param {Object} previous — the older snapshot
 * @returns {Object} comparison result
 */
export function compareSnapshots(current, previous) {
    const prevMap = {};
    previous.records.forEach(r => { prevMap[r.key] = r; });

    const currMap = {};
    current.records.forEach(r => { currMap[r.key] = r; });

    const allKeys = new Set([...Object.keys(prevMap), ...Object.keys(currMap)]);

    const comparisons = [];

    allKeys.forEach(key => {
        const curr = currMap[key];
        const prev = prevMap[key];

        if (curr && prev) {
            // ── Matched record
            const spendDelta = curr.spend - prev.spend;
            const revenueDelta = curr.revenue - prev.revenue;
            const ordersDelta = curr.orders - prev.orders;
            const roasDelta = +(curr.roas - prev.roas).toFixed(2);

            const spendPct = prev.spend > 0 ? +((spendDelta / prev.spend) * 100).toFixed(1) : (curr.spend > 0 ? 100 : 0);
            const revenuePct = prev.revenue > 0 ? +((revenueDelta / prev.revenue) * 100).toFixed(1) : (curr.revenue > 0 ? 100 : 0);
            const ordersPct = prev.orders > 0 ? +((ordersDelta / prev.orders) * 100).toFixed(1) : (curr.orders > 0 ? 100 : 0);
            const roasPct = prev.roas > 0 ? +((roasDelta / prev.roas) * 100).toFixed(1) : 0;

            const outcome = labelOutcome(roasDelta, prev.roas, spendDelta);

            comparisons.push({
                key,
                platform: curr.platform,
                sku: curr.sku,
                campaign: curr.campaign,
                status: "matched",
                outcome,
                prev: { spend: prev.spend, revenue: prev.revenue, orders: prev.orders, roas: prev.roas },
                curr: { spend: curr.spend, revenue: curr.revenue, orders: curr.orders, roas: curr.roas },
                delta: {
                    spend: spendDelta, revenue: revenueDelta, orders: ordersDelta, roas: roasDelta,
                    spendPct, revenuePct, ordersPct, roasPct,
                },
            });
        } else if (curr && !prev) {
            // ── New SKU
            comparisons.push({
                key,
                platform: curr.platform,
                sku: curr.sku,
                campaign: curr.campaign,
                status: "new",
                outcome: "New",
                prev: null,
                curr: { spend: curr.spend, revenue: curr.revenue, orders: curr.orders, roas: curr.roas },
                delta: null,
            });
        } else if (!curr && prev) {
            // ── Missing / Inactive
            comparisons.push({
                key,
                platform: prev.platform,
                sku: prev.sku,
                campaign: prev.campaign,
                status: "inactive",
                outcome: "Inactive",
                prev: { spend: prev.spend, revenue: prev.revenue, orders: prev.orders, roas: prev.roas },
                curr: null,
                delta: null,
            });
        }
    });

    // Sort: matched first (by absolute ROAS delta desc), then new, then inactive
    comparisons.sort((a, b) => {
        const order = { matched: 0, new: 1, inactive: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        if (a.delta && b.delta) return Math.abs(b.delta.roas) - Math.abs(a.delta.roas);
        return 0;
    });

    // Aggregate totals
    const totalsDelta = {
        spend: current.totals.spend - previous.totals.spend,
        revenue: current.totals.revenue - previous.totals.revenue,
        orders: current.totals.orders - previous.totals.orders,
        roas: +(
            (current.totals.spend > 0 ? current.totals.revenue / current.totals.spend : 0) -
            (previous.totals.spend > 0 ? previous.totals.revenue / previous.totals.spend : 0)
        ).toFixed(2),
    };

    totalsDelta.spendPct = previous.totals.spend > 0 ? +((totalsDelta.spend / previous.totals.spend) * 100).toFixed(1) : 0;
    totalsDelta.revenuePct = previous.totals.revenue > 0 ? +((totalsDelta.revenue / previous.totals.revenue) * 100).toFixed(1) : 0;
    totalsDelta.ordersPct = previous.totals.orders > 0 ? +((totalsDelta.orders / previous.totals.orders) * 100).toFixed(1) : 0;

    return {
        current_snapshot_id: current.snapshot_id,
        previous_snapshot_id: previous.snapshot_id,
        time_gap: getTimeGap(previous, current),
        comparisons,
        totalsDelta,
        summary: {
            total: comparisons.length,
            improved: comparisons.filter(c => c.outcome === "Improved").length,
            declined: comparisons.filter(c => c.outcome === "Declined").length,
            neutral: comparisons.filter(c => c.outcome === "Neutral").length,
            new: comparisons.filter(c => c.status === "new").length,
            inactive: comparisons.filter(c => c.status === "inactive").length,
        },
    };
}

// ─── OUTCOME LABELING ─────────────────────────────────────────
const ROAS_THRESHOLD = 0.05; // ±5% of previous ROAS to count as neutral

function labelOutcome(roasDelta, prevRoas, spendDelta) {
    const threshold = Math.max(ROAS_THRESHOLD, prevRoas * 0.05);
    if (roasDelta > threshold) return "Improved";
    if (roasDelta < -threshold) return "Declined";
    return "Neutral";
}

// ─── TIME GAP ─────────────────────────────────────────────────
export function getTimeGap(olderSnap, newerSnap) {
    try {
        const d1 = new Date(olderSnap.upload_date);
        const d2 = new Date(newerSnap.upload_date);
        const diffMs = d2 - d1;
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} apart`;
        const diffHrs = Math.round(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} apart`;
        const diffDays = Math.round(diffHrs / 24);
        return `${diffDays} day${diffDays > 1 ? "s" : ""} apart`;
    } catch {
        return "—";
    }
}

// ─── NORMALIZE ROWS (re-export for DataContext) ───────────────
/**
 * Normalize raw parsed rows using a column mapping, same as DataContext's
 * internal logic but exported for snapshot creation.
 */
export function normalizeRows(rows, colMapping) {
    return rows.map(row => ({
        date: row[colMapping.date] || "",
        platform: row[colMapping.platform] || "Unknown",
        campaign: row[colMapping.campaign] || "",
        sku: row[colMapping.sku] || "",
        spend: parseFloat(row[colMapping.spend]) || 0,
        revenue: parseFloat(row[colMapping.revenue]) || 0,
        clicks: parseInt(row[colMapping.clicks]) || 0,
        impressions: parseInt(row[colMapping.impressions]) || 0,
    })).filter(r => r.campaign || r.sku);
}
