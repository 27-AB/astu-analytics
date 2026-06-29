import React from "react";

export const StatCard = ({ title, value, sub, icon, color = "#22d3ee", change }) => (
  <div style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", transition: "transform .2s", cursor: "default" }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{title}</p>
        <p style={{ color: "#e2e8f0", fontSize: 28, fontWeight: 700, margin: "4px 0 2px", lineHeight: 1 }}>{value}</p>
        {change && <p style={{ color: "#22d3ee", fontSize: 12, margin: 0 }}>↑ {change}</p>}
        {sub && !change && <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>{sub}</p>}
      </div>
    </div>
    <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${color}15, transparent 70%)`, transform: "translate(20px,-20px)", pointerEvents: "none" }} />
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
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: "capitalize", background: s.bg, color: s.color }}>
      {status}
    </span>
  );
};

export const SectionCard = ({ title, children, action }) => (
  <div style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 22px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

export const PageHeader = ({ title, sub, actions }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
    <div>
      <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
      {sub && <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>{sub}</p>}
    </div>
    {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
  </div>
);

export const Btn = ({ children, onClick, variant = "primary", disabled, small }) => {
  const styles = {
    primary:   { background: "linear-gradient(135deg,#1d4ed8,#06b6d4)", color: "#fff", border: "none" },
    secondary: { background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" },
    danger:    { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" },
    success:   { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius: 8, padding: small ? "6px 12px" : "9px 18px", fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", transition: "opacity .15s" }}>
      {children}
    </button>
  );
};

export const Loader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
    <div style={{ width: 36, height: 36, border: "3px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const ErrorMsg = ({ message }) => (
  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "16px 20px", color: "#f87171", fontSize: 14 }}>
    ⚠️ {message}
  </div>
);

export const fmtETB = (n) => n >= 1_000_000 ? `ETB ${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `ETB ${(n/1000).toFixed(0)}K` : `ETB ${n}`;

export { default as AiChatbot } from "./AiChatbot";

