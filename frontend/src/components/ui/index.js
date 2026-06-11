import React from "react";
export { Skeleton, CardSkeleton, TableSkeleton, ChartSkeleton, FormSkeleton, ListSkeleton } from "./Skeleton";
export { SearchBar } from "./SearchBar";

export const StatCard = ({ title, value, sub, icon, color = "#22d3ee", change, trend = "up" }) => (
  <div style={{ 
    background: "var(--bg-secondary)", 
    border: "1px solid var(--border-color)", 
    borderRadius: 14, 
    padding: "20px 22px", 
    position: "relative", 
    overflow: "hidden", 
    transition: "all .3s ease", 
    cursor: "default",
    boxShadow: "var(--card-shadow)"
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "var(--card-shadow-hover)";
      e.currentTarget.style.borderColor = "var(--border-hover)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "var(--card-shadow)";
      e.currentTarget.style.borderColor = "var(--border-color)";
    }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 12, 
        background: `${color}20`, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        fontSize: 22, 
        flexShrink: 0,
        transition: "transform .2s"
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{title}</p>
        <p style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 700, margin: "4px 0 2px", lineHeight: 1 }}>{value}</p>
        {change && (
          <p style={{ 
            color: trend === "up" ? "#4ade80" : trend === "down" ? "#f87171" : "#22d3ee", 
            fontSize: 12, 
            margin: 0,
            fontWeight: 600
          }}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {change}
          </p>
        )}
        {sub && !change && <p style={{ color: "var(--text-tertiary)", fontSize: 11, margin: 0 }}>{sub}</p>}
      </div>
    </div>
    <div style={{ 
      position: "absolute", 
      top: 0, 
      right: 0, 
      width: 80, 
      height: 80, 
      borderRadius: "50%", 
      background: `radial-gradient(circle, ${color}15, transparent 70%)`, 
      transform: "translate(20px,-20px)", 
      pointerEvents: "none" 
    }} />
  </div>
);

export const Badge = ({ status }) => {
  const map = {
    active:    { bg: "rgba(34,211,238,.15)",  color: "#22d3ee" },
    completed: { bg: "rgba(167,139,250,.15)", color: "#a78bfa" },
    paused:    { bg: "rgba(245,158,11,.15)",  color: "#f59e0b" },
    planned:   { bg: "rgba(148,163,184,.15)", color: "#94a3b8" },
  };
  const s = map[status] || map.planned;
  return (
    <span style={{ 
      display: "inline-block", 
      padding: "3px 10px", 
      borderRadius: 99, 
      fontSize: 11, 
      fontWeight: 600, 
      textTransform: "capitalize", 
      background: s.bg, 
      color: s.color,
      transition: "all .2s"
    }}>
      {status}
    </span>
  );
};

export const SectionCard = ({ title, children, action }) => (
  <div style={{ 
    background: "var(--bg-secondary)", 
    border: "1px solid var(--border-color)", 
    borderRadius: 14, 
    padding: "20px 22px",
    boxShadow: "var(--card-shadow)",
    transition: "all .3s ease"
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

export const PageHeader = ({ title, sub, actions }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
    <div>
      <h1 style={{ color: "var(--text-primary)", fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
      {sub && <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 0" }}>{sub}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
  </div>
);

export const Btn = ({ children, onClick, variant = "primary", disabled, small }) => {
  const styles = {
    primary:   { background: "linear-gradient(135deg,#1d4ed8,#06b6d4)", color: "#fff", border: "none" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" },
    danger:    { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" },
    success:   { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ 
        ...styles[variant], 
        borderRadius: 8, 
        padding: small ? "6px 12px" : "9px 18px", 
        fontSize: small ? 12 : 13, 
        fontWeight: 600, 
        cursor: disabled ? "not-allowed" : "pointer", 
        opacity: disabled ? 0.5 : 1, 
        fontFamily: "inherit", 
        transition: "all .2s ease",
        boxShadow: variant === "primary" ? "0 4px 6px -1px rgba(29,78,216,0.2)" : "none"
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
};

export const Loader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
    <div style={{ 
      width: 36, 
      height: 36, 
      border: "3px solid rgba(34,211,238,0.2)", 
      borderTopColor: "#22d3ee", 
      borderRadius: "50%", 
      animation: "spin 0.8s linear infinite" 
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const ErrorMsg = ({ message }) => (
  <div style={{ 
    background: "rgba(239,68,68,0.1)", 
    border: "1px solid rgba(239,68,68,0.25)", 
    borderRadius: 10, 
    padding: "16px 20px", 
    color: "#f87171", 
    fontSize: 14 
  }}>
    ⚠️ {message}
  </div>
);

export const fmtETB = (n) => n >= 1_000_000 ? `ETB ${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `ETB ${(n/1000).toFixed(0)}K` : `ETB ${n}`;
