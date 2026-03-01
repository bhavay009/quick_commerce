// ─── CONSTANTS (used for colors / fallback lists) ─────────────
export const PLATFORMS = ["All Platforms", "Platform A", "Blinkit", "Instamart", "BigBasket Now", "Dunzo"];

export const PIE_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899"];

// ─── HELPERS ──────────────────────────────────────────────────
export const fmt = n => {
    if (!n && n !== 0) return "—";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
};
export const fmtN = n => n?.toLocaleString('en-IN') || "—";
export const roasColor = r => r >= 2.5 ? "#10B981" : r >= 1.5 ? "#F59E0B" : "#EF4444";
export const roasClass = r => r >= 2.5 ? "roas-green" : r >= 1.5 ? "roas-amber" : "roas-red";
export const sevColor = s => s === "Critical" ? "#EF4444" : s === "Warning" ? "#F59E0B" : s === "Positive" ? "#10B981" : "#3B82F6";
export const prioColor = p => p === "Critical" ? "#EF4444" : p === "High" ? "#F59E0B" : "#3B82F6";

export const darkTooltip = {
    contentStyle: { background: "#0F0F1E", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 8, color: "#fff", fontSize: 12 },
    labelStyle: { color: "#a78bfa" },
    itemStyle: { color: "#e5e7eb" }
};
