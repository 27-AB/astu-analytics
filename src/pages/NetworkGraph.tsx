import React, { useState } from "react";
import { PageHeader, SectionCard, Btn } from "../components/ui";

interface Node {
  id: string;
  label: string;
  type: "college" | "topic" | "researcher" | "project";
  x: number;
  y: number;
  color: string;
  size: number;
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

const NODES: Node[] = [
  // Colleges
  { id: "c_ceec", label: "Computing (CEEC)", type: "college", x: 250, y: 140, color: "#3b82f6", size: 28 },
  { id: "c_cmcme", label: "Materials (CMCME)", type: "college", x: 550, y: 140, color: "#f59e0b", size: 28 },
  { id: "c_ccea", label: "Civil & Arch (CCEA)", type: "college", x: 400, y: 380, color: "#10b981", size: 28 },
  { id: "c_cans", label: "Applied Science (CANS)", type: "college", x: 150, y: 380, color: "#8b5cf6", size: 28 },

  // Shared Tech Nodes (Topics)
  { id: "t_ai", label: "Artificial Intelligence", type: "topic", x: 250, y: 260, color: "#22d3ee", size: 24 },
  { id: "t_solar", label: "Solar & Renewables", type: "topic", x: 450, y: 220, color: "#ec4899", size: 24 },
  { id: "t_iot", label: "IoT & Smart Systems", type: "topic", x: 380, y: 100, color: "#a855f7", size: 24 },

  // Projects
  { id: "p_crop", label: "AI Crop Disease Detector", type: "project", x: 100, y: 200, color: "#64748b", size: 16 },
  { id: "p_solar_water", label: "Solar Water Purifier", type: "project", x: 650, y: 250, color: "#64748b", size: 16 },
  { id: "p_seismic", label: "Seismic Adama Mapping", type: "project", x: 500, y: 430, color: "#64748b", size: 16 },
  { id: "p_blockchain", label: "Blockchain Land Registry", type: "project", x: 160, y: 80, color: "#64748b", size: 16 },
  { id: "p_wind", label: "Rift Valley Wind Mapping", type: "project", x: 340, y: 450, color: "#64748b", size: 16 },
  { id: "p_traffic", label: "Smart Traffic Control", type: "project", x: 480, y: 60, color: "#64748b", size: 16 },
];

const EDGES: Edge[] = [
  // Connections to topics
  { source: "c_ceec", target: "t_ai", label: "Primary Department" },
  { source: "c_ceec", target: "t_iot", label: "Faculty Hub" },
  { source: "c_cmcme", target: "t_solar", label: "Energy Labs" },
  { source: "c_cmcme", target: "t_iot", label: "Industrial Eng" },
  { source: "c_ccea", target: "t_iot", label: "Smart Infrastructure" },
  { source: "c_cans", target: "t_solar", label: "Biophysics Track" },
  { source: "c_cans", target: "t_ai", label: "Bioinformatics" },

  // Projects to Topics
  { source: "p_crop", target: "t_ai", label: "Uses ML models" },
  { source: "p_crop", target: "c_ceec", target_college: "CEEC" } as any,
  { source: "p_solar_water", target: "t_solar", label: "Photovoltaic cells" },
  { source: "p_solar_water", target: "c_cmcme", target_college: "CMCME" } as any,
  { source: "p_seismic", target: "c_ccea", target_college: "CCEA" } as any,
  { source: "p_blockchain", target: "t_ai", label: "Cryptography integration" },
  { source: "p_blockchain", target: "c_ceec", target_college: "CEEC" } as any,
  { source: "p_wind", target: "t_solar", label: "Hybrid site prospecting" },
  { source: "p_wind", target: "c_ceec", target_college: "CEEC" } as any,
  { source: "p_traffic", target: "t_iot", label: "Uses wireless sensors" },
  { source: "p_traffic", target: "t_ai", label: "Adaptive timings" },
  { source: "p_traffic", target: "c_ceec", target_college: "CEEC" } as any,
];

export default function NetworkGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const activeNodeId = selectedNodeId || hoveredNodeId;

  // Compute connected nodes for highlighting
  const connectedNodeIds = new Set<string>();
  if (activeNodeId) {
    connectedNodeIds.add(activeNodeId);
    EDGES.forEach((edge) => {
      if (edge.source === activeNodeId) {
        connectedNodeIds.add(edge.target);
      } else if (edge.target === activeNodeId) {
        connectedNodeIds.add(edge.source);
      }
    });
  }

  const selectedNode = NODES.find((n) => n.id === activeNodeId);

  return (
    <div>
      <PageHeader
        title="ASTU Synergy Matchmaker Network"
        sub="Interactive topological graph illustrating interdisciplinary collaboration paths across colleges, shared technologies, and key research pipelines."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        {/* SVG Canvas Board */}
        <SectionCard title="Interactive Topology Mapping Board">
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 520,
              background: "#0a0f18",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}
          >
            {/* SVG Visualizer */}
            <svg width="100%" height="100%" viewBox="0 0 750 500">
              {/* Grid backdrop */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Render edges */}
              {EDGES.map((edge, idx) => {
                const sNode = NODES.find((n) => n.id === edge.source);
                const tNode = NODES.find((n) => n.id === edge.target);
                if (!sNode || !tNode) return null;

                const isHighlighted =
                  activeNodeId === null ||
                  (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target));

                return (
                  <line
                    key={idx}
                    x1={sNode.x}
                    y1={sNode.y}
                    x2={tNode.x}
                    y2={tNode.y}
                    stroke={isHighlighted ? "#22d3ee" : "rgba(255,255,255,0.04)"}
                    strokeWidth={isHighlighted ? 1.8 : 1}
                    strokeDasharray={sNode.type === "project" || tNode.type === "project" ? "4,4" : "0"}
                    transition="stroke .2s, stroke-width .2s"
                    style={{ transition: "all .25s" }}
                  />
                );
              })}

              {/* Render Nodes */}
              {NODES.map((node) => {
                const isHighlighted = activeNodeId === null || connectedNodeIds.has(node.id);
                const isCurrent = activeNodeId === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Ripple animation circle */}
                    {isCurrent && (
                      <circle
                        r={node.size + 8}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="1.5"
                        opacity="0.4"
                        style={{ animation: "ping 1.5s ease-in-out infinite" }}
                      />
                    )}

                    {/* Outer Circle */}
                    <circle
                      r={node.size}
                      fill={isHighlighted ? node.color : "#162030"}
                      stroke={isHighlighted ? "#fff" : "rgba(255,255,255,0.06)"}
                      strokeWidth={isCurrent ? 2.5 : 1}
                      opacity={isHighlighted ? 0.9 : 0.2}
                      style={{ transition: "all .25s" }}
                    />

                    {/* Node icon placeholder */}
                    <text
                      textAnchor="middle"
                      dy=".3em"
                      fill={isHighlighted ? "#fff" : "#475569"}
                      fontSize={node.size > 20 ? 12 : 9}
                      fontWeight="bold"
                    >
                      {node.type === "college" ? "🏛️" : node.type === "topic" ? "💡" : "🔬"}
                    </text>

                    {/* Label */}
                    <text
                      y={node.size + 16}
                      textAnchor="middle"
                      fill={isHighlighted ? "#cbd5e1" : "#475569"}
                      fontSize={11}
                      fontWeight={isHighlighted ? 600 : 400}
                      style={{ transition: "all .25s" }}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Float Overlay Legend */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "10px 14px",
                borderRadius: 8,
                display: "flex",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} /> Academic Colleges
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} /> Key Technologies
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#64748b" }} /> Active Projects
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Node Inspector Side-Rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Inspector Panel">
            {selectedNode ? (
              <div>
                <span
                  style={{
                    background: `${selectedNode.color}20`,
                    color: selectedNode.color,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    textTransform: "uppercase",
                  }}
                >
                  {selectedNode.type} Node
                </span>
                <h4 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, margin: "8px 0 6px" }}>
                  {selectedNode.label}
                </h4>

                <p style={{ color: "#94a3b8", fontSize: 12.5, lineHeight: 1.4, margin: "0 0 16px" }}>
                  {selectedNode.type === "college"
                    ? "Represents a primary university faculty. Click other highlighted nodes to see technology specialities under development."
                    : selectedNode.type === "topic"
                    ? "Represents a cross-cutting technological core. Overlapping connections represent opportunities for dual-college grants."
                    : "Represents an active research payload tracking telemetry inside ASTU."}
                </p>

                <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "#475569", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Connected Assets
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {EDGES.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).map((edge, idx) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = NODES.find((n) => n.id === otherId);
                      return (
                        <div
                          key={idx}
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 11.5,
                            color: "#cbd5e1",
                          }}
                        >
                          <span style={{ color: "#22d3ee" }}>{otherNode?.label}</span>
                          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 2 }}>{edge.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#64748b", fontSize: 12.5, margin: 0, textAlign: "center", padding: "40px 0" }}>
                Hover or click any node on the graph to inspect technological couplings.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
