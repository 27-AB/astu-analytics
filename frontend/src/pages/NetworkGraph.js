import React, { useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { SectionCard, PageHeader, Loader, ErrorMsg, fmtETB } from "../components/ui";

const COLLEGE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Orange
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

export default function NetworkGraph() {
  const { data, loading, error } = useAnalytics();
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg message={`Could not load collaboration graph: ${error}`} />;

  const { colleges = [], researchProjects = [], communityProjects = [], researchers = [] } = data;

  const allProjects = [
    ...researchProjects.map(p => ({ ...p, type: "research" })),
    ...communityProjects.map(p => ({ ...p, type: "community" }))
  ];

  // Calculate coordinates for College Nodes
  // We arrange them in a circle around the center (250, 220)
  const centerX = 260;
  const centerY = 200;
  const radius = 130;

  const collegeNodes = colleges.map((col, idx) => {
    const angle = (idx * 2 * Math.PI) / colleges.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Aggregate data for this college
    const collegeProjects = allProjects.filter(p => p.college === col.name);
    const funding = collegeProjects.reduce((sum, p) => sum + (p.fundingETB || p.budgetETB || 0), 0);
    const facultyCount = researchers.filter(r => r.college === col.name).length;

    return {
      id: col._id,
      name: col.name,
      shortName: col.name.replace("College of ", "").split(",")[0],
      x,
      y,
      color: COLLEGE_COLORS[idx % COLLEGE_COLORS.length],
      projectCount: collegeProjects.length,
      funding,
      facultyCount,
      projects: collegeProjects
    };
  });

  // Calculate collaborative edges
  // An edge exists if there's any cross-department or collaborative project overlap (simulated links based on overlapping tags)
  const edges = [];
  for (let i = 0; i < collegeNodes.length; i++) {
    for (let j = i + 1; j < collegeNodes.length; j++) {
      const colA = collegeNodes[i];
      const colB = collegeNodes[j];
      
      // Calculate overlap in tags
      const tagsA = new Set(colA.projects.flatMap(p => p.tags || []));
      const tagsB = new Set(colB.projects.flatMap(p => p.tags || []));
      const sharedTags = [...tagsA].filter(tag => tagsB.has(tag));

      if (sharedTags.length > 0) {
        edges.push({
          source: colA,
          target: colB,
          sharedTags,
          weight: Math.min(sharedTags.length, 5) // max weight 5
        });
      }
    }
  }

  const activeCollege = selectedCollege 
    ? collegeNodes.find(c => c.name === selectedCollege.name) 
    : null;

  return (
    <div>
      <PageHeader 
        title="Collaborative Research Graph" 
        sub="Academic network mapping cross-college synergies and tag co-occurrences across ASTU" 
      />

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        
        {/* Interactive Graph Area */}
        <SectionCard title="ASTU Institutional Synergy Map">
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
            Click nodes to inspect a college's research profile. Hover over edges to view shared research focus areas.
          </p>

          <div style={{ position: "relative", background: "#06090e", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
            <svg width="100%" height="420" viewBox="0 0 520 400" style={{ display: "block" }}>
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Render Connection Edges */}
              {edges.map((edge, idx) => {
                const isHovered = hoveredNode && 
                  (hoveredNode.id === edge.source.id || hoveredNode.id === edge.target.id);
                const isSelected = activeCollege && 
                  (activeCollege.id === edge.source.id || activeCollege.id === edge.target.id);
                
                return (
                  <g key={idx}>
                    <line
                      x1={edge.source.x}
                      y1={edge.source.y}
                      x2={edge.target.x}
                      y2={edge.target.y}
                      stroke={edge.source.color}
                      strokeWidth={edge.weight * 1.5}
                      opacity={isSelected ? 0.85 : isHovered ? 0.6 : 0.15}
                      style={{ transition: "opacity 0.2s" }}
                    />
                    
                    {/* Hover hotspot */}
                    <line
                      x1={edge.source.x}
                      y1={edge.source.y}
                      x2={edge.target.x}
                      y2={edge.target.y}
                      stroke="transparent"
                      strokeWidth={15}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredNode({ type: "edge", edge })}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                  </g>
                );
              })}

              {/* Render Node Circles */}
              {collegeNodes.map((node) => {
                const isHovered = hoveredNode && hoveredNode.id === node.id;
                const isSelected = activeCollege && activeCollege.id === node.id;
                
                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedCollege(node)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Outer glowing halo */}
                    <circle
                      r={24 + node.projectCount * 0.8}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={2}
                      opacity={isSelected ? 0.8 : isHovered ? 0.5 : 0}
                      style={{ transition: "opacity 0.2s" }}
                    />

                    {/* Node Core */}
                    <circle
                      r={16 + node.projectCount * 0.8}
                      fill={node.color}
                      opacity={isSelected ? 0.9 : isHovered ? 0.8 : 0.25}
                      stroke={node.color}
                      strokeWidth={1.5}
                      style={{ transition: "all 0.2s" }}
                    />

                    {/* Icon indicator */}
                    <text
                      y={4}
                      fill={isSelected || isHovered ? "#080d14" : "#e2e8f0"}
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {node.projectCount}
                    </text>

                    {/* Label */}
                    <text
                      y={36 + node.projectCount * 0.8}
                      fill={isSelected || isHovered ? "#22d3ee" : "#64748b"}
                      fontSize="9.5"
                      fontWeight={isSelected ? "bold" : "500"}
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {node.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Edge Info Overlay */}
            {hoveredNode && hoveredNode.type === "edge" && (
              <div 
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  maxWidth: 280,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(6px)"
                }}
              >
                <div style={{ color: "#22d3ee", fontWeight: 700, marginBottom: 4 }}>
                  🤝 College Collaboration
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 11.5 }}>
                  {hoveredNode.edge.source.shortName} ↔ {hoveredNode.edge.target.shortName}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                  Shared focus: <strong>{hoveredNode.edge.sharedTags.join(", ")}</strong>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Sidebar Info Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Academic Synergy Dossier">
            {activeCollege ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ color: activeCollege.color, fontSize: 16, fontWeight: 700, margin: 0 }}>
                    {activeCollege.name}
                  </h3>
                  <span style={{ color: "#64748b", fontSize: 12 }}>Adama Science & Technology University</span>
                </div>

                {/* College KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Projects</span>
                    <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{activeCollege.projectCount}</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Faculty</span>
                    <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700 }}>{activeCollege.facultyCount}</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                    <span style={{ color: "#64748b", fontSize: 10, display: "block" }}>Funding</span>
                    <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, fontFamily: "monospace", marginTop: 4, display: "block" }}>
                      {fmtETB(activeCollege.funding)}
                    </span>
                  </div>
                </div>

                {/* Projects List */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                  <span style={{ color: "#475569", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 8 }}>
                    Active & Seeded Projects ({activeCollege.projectCount})
                  </span>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                    {activeCollege.projects.map((p, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          background: "rgba(255,255,255,0.01)", 
                          border: "1px solid rgba(255,255,255,0.03)", 
                          borderRadius: 6, 
                          padding: 10 
                        }}
                      >
                        <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5 }}>
                          <span style={{ color: "#64748b" }}>Lead: {p.lead}</span>
                          <span style={{ color: p.type === "research" ? "#38bdf8" : "#34d399", fontWeight: 600, textTransform: "capitalize" }}>
                            {p.type}
                          </span>
                        </div>
                      </div>
                    ))}
                    {activeCollege.projectCount === 0 && (
                      <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No projects registered yet for this college.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, color: "#475569" }}>
                <span style={{ fontSize: 36, marginBottom: 12 }}>🏛️</span>
                <span style={{ fontSize: 13, textAlign: "center", maxWidth: 220 }}>
                  Select any college node in the synergy map to inspect its academic telemetry.
                </span>
              </div>
            )}
          </SectionCard>
        </div>

      </div>
    </div>
  );
}
