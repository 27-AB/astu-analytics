import React, { useState, useEffect } from "react";
import { getServiceUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, SectionCard, Badge, Btn, Loader, ErrorMsg, fmtETB } from "../components/ui";

interface CommunityProject {
  _id: string;
  title: string;
  lead: string;
  college: string;
  status: "active" | "paused" | "completed" | "planned";
  startDate: string;
  endDate: string;
  budgetETB: number;
  location: string;
  beneficiaries: number;
  volunteers: number;
  tags: string[];
  summary: string;
  impact: string;
}

export default function CommunityProjects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    lead: "",
    college: "College of Electrical Engineering & Computing",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    budgetETB: "",
    location: "Adama, East Shewa",
    beneficiaries: "",
    volunteers: "",
    tags: "",
    summary: "",
    impact: "",
    status: "active",
  });

  const apiBase = getServiceUrl("community");

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, collegeFilter]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${apiBase}/api/community-projects?`;
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
        throw new Error(d.message || "Failed to load community projects.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        budgetETB: Number(formData.budgetETB) || 0,
        beneficiaries: Number(formData.beneficiaries) || 0,
        volunteers: Number(formData.volunteers) || 0,
        tags: formData.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch(`${apiBase}/api/community-projects`, {
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
        setFormData({
          title: "",
          lead: "",
          college: "College of Electrical Engineering & Computing",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          budgetETB: "",
          location: "Adama, East Shewa",
          beneficiaries: "",
          volunteers: "",
          tags: "",
          summary: "",
          impact: "",
          status: "active",
        });
        fetchProjects();
      } else {
        alert(d.message || "Outreach submission failed.");
      }
    } catch (err: any) {
      alert("Submission connection error: " + err.message);
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
        title="Community Engagement & Social Outreach"
        sub="Monitor ASTU student volunteer campaigns, civic-tech deployments, and local Kebele development schemes."
        actions={
          <Btn onClick={() => setShowModal(true)} variant="primary">
            ➕ Log Community Outreach
          </Btn>
        }
      />

      {/* Filters */}
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
            placeholder="Search keywords, leads or locations... (Press Enter)"
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          {projects.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, background: "#162030", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ color: "#64748b", margin: 0 }}>No outreach projects found matching criteria.</p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj._id}
                style={{
                  background: "#162030",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Badge status={proj.status} />
                      <span style={{ color: "#a78bfa", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Outreach Track
                      </span>
                    </div>
                  </div>

                  <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>
                    {proj.title}
                  </h3>

                  <p style={{ color: "#64748b", fontSize: 11, margin: "0 0 12px" }}>
                    🏛️ {proj.college}
                  </p>

                  <p style={{ color: "#cbd5e1", fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.4, minHeight: 48 }}>
                    {proj.summary || "No description logged for this community development activity."}
                  </p>

                  {proj.impact && (
                    <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 8, padding: 10, marginBottom: 16 }}>
                      <span style={{ color: "#34d399", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                        Reported Societal Impact
                      </span>
                      <p style={{ color: "#cbd5e1", fontSize: 11.5, margin: "4px 0 0", fontWeight: 500 }}>
                        📈 {proj.impact}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", flexWrap: "wrap", gap: 14 }}>
                  <div>
                    <span style={{ color: "#475569", fontSize: 9.5, fontWeight: 600 }}>Lead Advocate</span>
                    <div style={{ color: "#cbd5e1", fontSize: 11.5, fontWeight: 600, marginTop: 1 }}>{proj.lead}</div>
                  </div>

                  <div>
                    <span style={{ color: "#475569", fontSize: 9.5, fontWeight: 600 }}>Allocated Budget</span>
                    <div style={{ color: "#a78bfa", fontSize: 11.5, fontWeight: 700, marginTop: 1 }}>{fmtETB(proj.budgetETB)}</div>
                  </div>

                  <div>
                    <span style={{ color: "#475569", fontSize: 9.5, fontWeight: 600 }}>Beneficiaries</span>
                    <div style={{ color: "#34d399", fontSize: 11.5, fontWeight: 700, marginTop: 1 }}>{proj.beneficiaries.toLocaleString()}</div>
                  </div>

                  <div>
                    <span style={{ color: "#475569", fontSize: 9.5, fontWeight: 600 }}>Volunteers</span>
                    <div style={{ color: "#38bdf8", fontSize: 11.5, fontWeight: 700, marginTop: 1 }}>{proj.volunteers} students</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal Overlay */}
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
              <h3 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: 0 }}>Log Community Outreach</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Outreach / Campaign Title
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Tree Planting Campaign inside Adama Kebele"
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
                    Lead Advocate / Faculty
                  </label>
                  <input
                    required
                    value={formData.lead}
                    onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                    placeholder="e.g. Dr. Tigist Alemu"
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
                    Sponsoring College
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
                    <option value="College of Mechanical, Chemical & Materials Engineering">Mechanical, Chemical & Materials Engineering</option>
                    <option value="College of Civil Engineering and Architecture">Civil Engineering and Architecture</option>
                    <option value="College of Applied Natural Science">Applied Natural Science</option>
                    <option value="College of Humanities and Social Science">Humanities and Social Science</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Allocated Budget (ETB)
                  </label>
                  <input
                    type="number"
                    value={formData.budgetETB}
                    onChange={(e) => setFormData({ ...formData, budgetETB: e.target.value })}
                    placeholder="e.g. 250000"
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
                    Project Target Location
                  </label>
                  <input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Adama, Wolenchiti"
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
                    Total Beneficiaries
                  </label>
                  <input
                    type="number"
                    value={formData.beneficiaries}
                    onChange={(e) => setFormData({ ...formData, beneficiaries: e.target.value })}
                    placeholder="e.g. 5000"
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
                    Student Volunteers
                  </label>
                  <input
                    type="number"
                    value={formData.volunteers}
                    onChange={(e) => setFormData({ ...formData, volunteers: e.target.value })}
                    placeholder="e.g. 80"
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

              <div>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Summary of Outreach Details
                </label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Outline the campaign, technology transfer, or community engagement goals."
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
                  Reported Societal Impact (if any)
                </label>
                <input
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  placeholder="e.g. 500 households provided safe drinking water and hygiene toolkits."
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

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <Btn type="button" onClick={() => setShowModal(false)} variant="secondary">
                  Cancel
                </Btn>
                <Btn type="submit" variant="primary">
                  Deploy Outreach Record
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
