import React, { useState, useEffect } from "react";
import { getServiceUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, SectionCard, Badge, Btn, Loader, ErrorMsg, fmtETB } from "../components/ui";

interface Project {
  _id: string;
  title: string;
  lead: string;
  college: string;
  department: string;
  status: "active" | "paused" | "completed" | "planned" | "under_review" | "rejected";
  startDate: string;
  endDate: string;
  fundingETB: number;
  fundingSource: string;
  tags: string[];
  summary: string;
  publications: number;
  teamSize: number;
  centerOfExcellence: string;
}

interface MatchResult {
  projectId: string;
  title: string;
  lead: string;
  college: string;
  score: number;
  reasons: string[];
}

export default function ResearchProjects() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");

  // Create Project Proposal Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    college: "College of Electrical Engineering & Computing",
    department: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    fundingETB: "",
    fundingSource: "ASTU Internal Grants",
    summary: "",
    tags: "",
    centerOfExcellence: "None",
    teamSize: "1",
    status: "active",
  });

  // Matchmaker drawer/overlay state
  const [activeMatches, setActiveMatches] = useState<MatchResult[]>([]);
  const [matchingProjId, setMatchingProjId] = useState<string | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const apiBase = getServiceUrl("research");

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, collegeFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${apiBase}/api/projects?`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (collegeFilter) url += `college=${encodeURIComponent(collegeFilter)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setProjects(d.projects);
      } else {
        throw new Error(d.message || "Failed to load projects portfolio.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        fundingETB: Number(formData.fundingETB) || 0,
        teamSize: Number(formData.teamSize) || 1,
        tags: formData.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch(`${apiBase}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setShowModal(false);
        // Reset form
        setFormData({
          title: "",
          college: "College of Electrical Engineering & Computing",
          department: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          fundingETB: "",
          fundingSource: "ASTU Internal Grants",
          summary: "",
          tags: "",
          centerOfExcellence: "None",
          teamSize: "1",
          status: "active",
        });
        fetchProjects();
      } else {
        alert(d.message || "Proposal submission failed.");
      }
    } catch (err: any) {
      alert("Submission connection error: " + err.message);
    }
  };

  const triggerMatchmaking = async (projId: string) => {
    setMatchingProjId(projId);
    setMatchingLoading(true);
    setActiveMatches([]);
    try {
      const res = await fetch(`${apiBase}/api/ai/match?projectId=${projId}&source=research`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setActiveMatches(d.matchResults);
      } else {
        alert(d.message || "Failed to compile matchmaking telemetry.");
      }
    } catch (err) {
      alert("Matchmaker connection error.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchProjects();
    }
  };

  return (
    <div>
      <PageHeader
        title="Scientific & Applied Research Portfolio"
        sub="Monitor ASTU faculty projects, submit peer-reviewed proposals, and discover synergistic connections."
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => setShowModal(true)} variant="primary">
              ➕ Submit Proposal Draft
            </Btn>
          </div>
        }
      />

      {/* Filter and Search rail */}
      <div
        style={{
          background: "#0f1824",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            placeholder="Search keywords, leads or tags... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: "#162030",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#94a3b8",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Projects</option>
          <option value="completed">Completed Projects</option>
          <option value="planned">Planned Projects</option>
          <option value="paused">Paused Projects</option>
          <option value="under_review">Under Review Proposals</option>
        </select>

        <select
          value={collegeFilter}
          onChange={(e) => setCollegeFilter(e.target.value)}
          style={{
            background: "#162030",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#94a3b8",
            fontSize: 13,
            outline: "none",
            maxWidth: 320,
          }}
        >
          <option value="">All Colleges</option>
          <option value="Electrical Engineering">Electrical Engineering & Computing</option>
          <option value="Mechanical, Chemical">Mechanical, Chemical & Materials</option>
          <option value="Civil Engineering">Civil Engineering and Architecture</option>
          <option value="Applied Natural Science">Applied Natural Science</option>
          <option value="Humanities">Humanities and Social Science</option>
          <option value="Postgraduate">Postgraduate Programs</option>
        </select>

        <Btn onClick={fetchProjects} variant="secondary" small>
          🔍 Apply Filter
        </Btn>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorMsg message={error} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: matchingProjId ? "1fr 340px" : "1fr", gap: 24, transition: "all .3s" }}>
          {/* Main List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {projects.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, background: "#162030", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ color: "#64748b", margin: 0 }}>No projects found matching the criteria.</p>
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj._id}
                  style={{
                    background: "#162030",
                    border: matchingProjId === proj._id ? "1px solid #22d3ee" : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, margin: 0 }}>{proj.title}</h3>
                        <Badge status={proj.status} />
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 4, fontWeight: 500 }}>
                        {proj.college} {proj.department && `• Department of ${proj.department}`}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="secondary" onClick={() => triggerMatchmaking(proj._id)}>
                        🕸️ Synergy Matchmaker
                      </Btn>
                    </div>
                  </div>

                  <p style={{ color: "#94a3b8", fontSize: 13, margin: 0, lineHeight: 1.4, maxWidth: 800 }}>
                    {proj.summary || "No academic project summary description cataloged."}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: ".05em" }}>Lead Investigator</span>
                      <div style={{ color: "#cbd5e1", fontSize: 12, fontWeight: 600, marginTop: 2 }}>{proj.lead}</div>
                    </div>

                    <div>
                      <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: ".05em" }}>Funding / Source</span>
                      <div style={{ color: "#10b981", fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                        {fmtETB(proj.fundingETB)} <span style={{ color: "#475569", fontWeight: 500, fontSize: 11 }}>via {proj.fundingSource}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: ".05em" }}>Timeline</span>
                      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>
                        {proj.startDate} {proj.endDate ? `to ${proj.endDate}` : "• Ongoing"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 600, letterSpacing: ".05em" }}>Team / Publications</span>
                      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>
                        👥 {proj.teamSize || 1} members  •  📄 {proj.publications || 0} papers
                      </div>
                    </div>

                    <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                      {proj.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 6,
                            fontSize: 10.5,
                            padding: "3px 8px",
                            color: "#94a3b8",
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Matchmaking Sidebar Sidebar */}
          {matchingProjId && (
            <div
              style={{
                background: "#0f1824",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignSelf: "flex-start",
                position: "sticky",
                top: 84,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>
                  🧬 Synergy Recommendation
                </h4>
                <button
                  onClick={() => setMatchingProjId(null)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>

              {matchingLoading ? (
                <Loader />
              ) : activeMatches.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 12, margin: 0, textAlign: "center", padding: "20px 0" }}>
                  No overlapping synergy tracks calculated.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {activeMatches.map((match, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span
                          style={{
                            background: "rgba(34,211,238,0.1)",
                            color: "#22d3ee",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          Score: {match.score}% Match
                        </span>
                      </div>
                      <div style={{ color: "#e2e8f0", fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>
                        {match.title}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>
                        Lead: {match.lead}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                        {match.reasons.map((r, i) => (
                          <div key={i} style={{ color: "#34d399", fontSize: 9.5 }}>
                            ✔ {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Proposal Modal Overlay */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0f1824",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              width: 550,
              padding: 30,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: 0 }}>Submit Proposal Draft</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProposal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Proposal Title
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Multi-agent drone navigation systems"
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#e2e8f0",
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    College Domain
                  </label>
                  <select
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    style={{
                      width: "100%",
                      background: "#162030",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    <option value="College of Electrical Engineering & Computing">Electrical Engineering & Computing</option>
                    <option value="College of Mechanical, Chemical & Materials Engineering">Mechanical, Chemical & Materials</option>
                    <option value="College of Civil Engineering and Architecture">Civil Engineering and Architecture</option>
                    <option value="College of Applied Natural Science">Applied Natural Science</option>
                    <option value="College of Humanities and Social Science">Humanities and Social Science</option>
                    <option value="Postgraduate Programs">Postgraduate Programs</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Department
                  </label>
                  <input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Requested Funding (ETB)
                  </label>
                  <input
                    type="number"
                    value={formData.fundingETB}
                    onChange={(e) => setFormData({ ...formData, fundingETB: e.target.value })}
                    placeholder="e.g. 1500000"
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Funding Source
                  </label>
                  <input
                    value={formData.fundingSource}
                    onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Proposed Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{
                      width: "100%",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Center of Excellence Match
                  </label>
                  <select
                    value={formData.centerOfExcellence}
                    onChange={(e) => setFormData({ ...formData, centerOfExcellence: e.target.value })}
                    style={{
                      width: "100%",
                      background: "#162030",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    <option value="None">None</option>
                    <option value="Center of Excellence for Allied Sciences (CoE-AS)">Center of Excellence for Allied Sciences (CoE-AS)</option>
                    <option value="Center of Excellence for Materials Science and Engineering (CoE-MSE)">Center of Excellence for Materials Science and Engineering (CoE-MSE)</option>
                    <option value="Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)">Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Draft Summary & Context
                </label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Outline the objectives, scientific merit, and regional impact."
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#e2e8f0",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Keywords / Tags (Comma separated)
                </label>
                <input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g. microgrid, solar, optimization"
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#e2e8f0",
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Status submission - defaults to active project or under review proposal based on user role */}
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Initial Project Telemetry Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#162030",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  <option value="under_review">Draft / Under Evaluation (Proposal)</option>
                  <option value="active">Active Track (Granted)</option>
                  <option value="planned">Planned Pipeline</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <Btn type="button" onClick={() => setShowModal(false)} variant="secondary">
                  Cancel
                </Btn>
                <Btn type="submit" variant="primary">
                  Transmit Proposal Draft
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
