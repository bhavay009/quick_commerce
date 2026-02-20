import React from "react";
import {
    ArrowUpRight, ArrowDownRight, X, Check, RefreshCw, Zap,
    ChevronDown, Calendar, Bell, Circle
} from "lucide-react";
import { sevColor } from "../data/mockData";

// ─── GOOGLE FONTS ────────────────────────────────────────────
export const FontImport = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    .mono { font-family: 'Space Mono', monospace; }
  `}</style>
);

// ─── KPI CARD ─────────────────────────────────────────────────
export const KpiCard = ({ label, value, change, positive, prefix = "", icon: Icon, large }) => (
    <div className={`glass rounded-xl ${large ? "p-6" : "p-4"} card-hover anim-fade`}>
        <div className="flex items-center gap-2 mb-1">
            {Icon && <Icon size={14} className="text-violet-400" />}
            <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className={`mono ${large ? "text-3xl" : "text-2xl"} font-bold text-white mb-1`}>{prefix}{value}</div>
        {change && (
            <div className={`text-xs flex items-center gap-1 ${positive ? "text-emerald-400" : "text-red-400"}`}>
                {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {change}
            </div>
        )}
    </div>
);

// ─── BADGES ───────────────────────────────────────────────────
export const Badge = ({ text, color = "#7C3AED" }) => (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>{text}</span>
);

export const StatusBadge = ({ s }) => {
    const c = s === "Active" ? "#10B981" : s === "Paused" ? "#F59E0B" : s === "Draft" ? "#6B7280" : "#EF4444";
    return <Badge text={s} color={c} />;
};

// ─── TOAST ────────────────────────────────────────────────────
export const Toast = ({ msg, onClose }) => (
    <div className="fixed top-6 right-6 z-50 toast-enter">
        <div className="glass rounded-xl px-5 py-4 flex items-center gap-3 border border-emerald-500/30" style={{ background: "rgba(16,185,129,0.1)" }}>
            <Check size={18} className="text-emerald-400" />
            <span className="text-sm text-white">{msg}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={14} /></button>
        </div>
    </div>
);

// ─── SECTION HEADER ───────────────────────────────────────────
export const SectionHeader = ({ title, subtitle, actions }) => (
    <div className="flex items-start justify-between mb-6">
        <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
    </div>
);

// ─── BTN ──────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled }) => {
    const base = "rounded-lg font-semibold flex items-center gap-2 transition-all duration-150 cursor-pointer";
    const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
    const v = variant === "primary" ? "btn-primary text-white" : variant === "outline" ? "border border-violet-500/40 text-violet-300 hover:bg-violet-500/10" : "text-gray-400 hover:text-white hover:bg-white/5";
    return <button className={`${base} ${sz} ${v} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={14} />}{children}</button>;
};

// ─── HEALTH GAUGE ─────────────────────────────────────────────
export const HealthGauge = ({ score = 73, size = "lg" }) => {
    const r = size === "lg" ? 56 : 40;
    const circ = 2 * Math.PI * r;
    const pct = score / 100;
    const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
    const offset = circ * (1 - pct * 0.75);
    const w = size === "lg" ? 160 : 120;
    const h = size === "lg" ? 120 : 90;
    const cx = w / 2, cy = size === "lg" ? 90 : 70;
    return (
        <div className="flex flex-col items-center">
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2e" strokeWidth="12" strokeDasharray={circ} strokeDashoffset={circ * 0.25} strokeLinecap="round" transform={`rotate(-225 ${cx} ${cy})`} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-225 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={size === "lg" ? 28 : 22} fontFamily="Space Mono" fontWeight="bold">{score}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="#9ca3af" fontSize={10} fontFamily="DM Sans">Health Score</text>
            </svg>
        </div>
    );
};
