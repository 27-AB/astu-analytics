import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Badge, SectionCard, PageHeader, Btn, Loader, ErrorMsg, fmtETB } from "../components/ui";

import { getServiceUrl } from "../config/api";

const API = getServiceUrl("research");
const ANALYTICS_API = getServiceUrl("analytics");

// Correct ASTU colleges from official website
const COLLEGES = [
  "College of Electrical Engineering & Computing",
  "College of Mechanical, Chemical & Materials Engineering",
  "College of Civil Engineering and Architecture",
  "College of Applied Natural Science",
  "College of Humanities and Social Science",
  "Postgraduate Programs",
];

const CENTERS_OF_EXCELLENCE = [
  "None",
  "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)",
  "Center of Excellence for Materials Science and Engineering (CoE-MSE)",
  "Center of Excellence for Allied Sciences (CoE-AS)"
];

const EMPTY_FORM = {
  title: "", lead: "", college: "", department: "", status: "active",
  startDate: "", endDate: "", fundingETB: 0, fundingSource: "ASTU Internal",
  tags: "", summary: "", centerOfExcellence: "None"
};

export default function ResearchProjects() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const querySearch = query.get("search") || "";
  const queryStatus = query.get("status") || "";
  const queryCollege = query.get("college") || "";
  const queryDepartment = query.get("department") || "";
  const queryYear = query.get("year") || "";
  const [projects, setProjects] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  
  // Dynamic topbar search compatibility
  const [search,   setSearch]   = useState(querySearch);
  const [status,   setStatus]   = useState(queryStatus);
  const [collegeFilter, setCollegeFilter] = useState(queryCollege);
  const [departmentFilter, setDepartmentFilter] = useState(queryDepartment);
  const [yearFilter, setYearFilter] = useState(queryYear);
  const [activeTab, setActiveTab] = useState("active_portfolio"); // "active_portfolio" or "proposal_pipeline"
  
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState("");
  const [form,     setForm]     = useState(EMPTY_FORM);

  // AI states
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [translations, setTranslations] = useState({}); // { [projId]: { Amharic: '...', 'Afaan Oromoo': '...' } }
  const [translating, setTranslating] = useState({}); // { [projId]: true }
  const [activeLang, setActiveLang] = useState({}); // { [projId]: 'English' }
  const [matches, setMatches] = useState({}); // { [projId]: [...] }
  const [matching, setMatching] = useState({}); // { [projId]: true }

  const handleTranslate = async (projectId, text, targetLang) => {
    setActiveLang(prev => ({ ...prev, [projectId]: targetLang }));
    if (targetLang === "English") return;
    if (translations[projectId]?.[targetLang]) return; // Already loaded

    setTranslating(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(`${ANALYTICS_API}/api/ai/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text, targetLang })
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setTranslations(prev => ({
          ...prev,
          [projectId]: { ...prev[projectId], [targetLang]: d.translatedText }
        }));
      } else {
        alert("Translation error: " + (d.message || "Failed to translate"));
      }
    } catch (err) {
      alert("Failed to connect for translation: " + err.message);
    } finally {
      setTranslating(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const fetchMatchmaking = async (projectId) => {
    if (matches[projectId]) return; // Already loaded
    setMatching(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(`${ANALYTICS_API}/api/ai/match?projectId=${projectId}&source=research`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setMatches(prev => ({ ...prev, [projectId]: d.matchResults }));
      }
    } catch (err) {
      console.error("Matchmaking error:", err.message);
    } finally {
      setMatching(prev => ({ ...prev, [projectId]: false }));
    }
  };

 const toggleRow = (projectId) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
    } else {
      setExpandedProjectId(projectId);
      
      // BUG FIX: Only fetch matchmaking if we don't already have results.
      // This prevents the "continuous" network request loop.
      if (!matches[projectId] && !matching[projectId]) {
        fetchMatchmaking(projectId);
      }
    }
  };


  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: 100, ...(search && { search }), ...(status && { status }) });
      const res = await fetch(`${API}/projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const d = await res.json();
      setProjects(d.projects || []); setTotal(d.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, search, status]);

  // Sync local filters when URL query changes (dashboard deep links)
  useEffect(() => {
    const current = new URLSearchParams(location.search);
    setSearch(current.get("search") || "");
    setStatus(current.get("status") || "");
    setCollegeFilter(current.get("college") || "");
    setDepartmentFilter(current.get("department") || "");
    setYearFilter(current.get("year") || "");
  }, [location.search]);

  useEffect(() => { load(); }, [load]);

  // Keep URL in sync with filter controls
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (status) next.set("status", status);
    if (collegeFilter) next.set("college", collegeFilter);
    if (departmentFilter) next.set("department", departmentFilter);
    if (yearFilter) next.set("year", yearFilter);

    const nextSearch = next.toString();
    const currentSearch = location.search.replace(/^\?/, "");
    if (nextSearch !== currentSearch) {
      navigate(nextSearch ? `${location.pathname}?${nextSearch}` : location.pathname, { replace: true });
    }
  }, [search, status, collegeFilter, departmentFilter, yearFilter, navigate, location.pathname, location.search]);

  const handleSeed = async () => {
    try {
      const res = await fetch(`${API}/projects/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      alert(d.message);
      load();
    } catch (e) { alert("Seed failed: " + e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await fetch(`${API}/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      load();
    } catch (e) { alert("Delete failed: " + e.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg("");
    try {
      const body = {
        ...form,
        fundingETB: Number(form.fundingETB) || 0,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };
      const url    = editing ? `${API}/projects/${editing._id}` : `${API}/projects`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Save failed");
      setSaveMsg("✅ Project saved successfully!");
      setTimeout(() => {
        setShowForm(false); setEditing(null);
        setForm(EMPTY_FORM); setSaveMsg("");
        load();
      }, 1000);
    } catch (e) {
      setSaveMsg("❌ " + e.message);
    } finally { setSaving(false); }
  };

  const updateProposalStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Status update failed");
      load();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p, tags: (p.tags || []).join(", "), fundingETB: p.fundingETB || 0, centerOfExcellence: p.centerOfExcellence || "None" });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, status: activeTab === "proposal_pipeline" ? "under_review" : "active" });
    setShowForm(true);
  };

  const inputStyle = {
    width: "100%", background: "#0f1824",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    padding: "9px 12px", color: "#e2e8f0", fontSize: 13,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box"
  };
  const labelStyle = {
    display: "block", color: "#94a3b8", fontSize: 11,
    fontWeight: 600, marginBottom: 5,
    textTransform: "uppercase", letterSpacing: ".05em"
  };

  // Grouping for Kanban Board
  const filteredProjects = projects.filter((p) => {
    if (collegeFilter && !p.college?.toLowerCase().includes(collegeFilter.toLowerCase())) return false;
    if (departmentFilter && !p.department?.toLowerCase().includes(departmentFilter.toLowerCase())) return false;
    if (yearFilter && !String(p.startDate || "").startsWith(String(yearFilter))) return false;
    return true;
  });

  const activeProjects = filteredProjects.filter(p => !["under_review", "rejected"].includes(p.status));
  const uniqueDepartments = [...new Set(projects.map((p) => p.department).filter(Boolean))].sort();
  const uniqueYears = [...new Set(projects.map((p) => (p.startDate ? p.startDate.split("-")[0] : "")).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  const kanbanColumns = {
    under_review: { title: "Under Evaluation", items: filteredProjects.filter(p => p.status === "under_review"), color: "#f59e0b" },
    paused: { title: "Revision Required", items: filteredProjects.filter(p => p.status === "paused"), color: "#ef4444" },
    active: { title: "Approved & Active", items: filteredProjects.filter(p => p.status === "active"), color: "#34d399" },
    rejected: { title: "Rejected / Declined", items: filteredProjects.filter(p => p.status === "rejected"), color: "#64748b" }
  };

  return (
    <div>
      <PageHeader
        title="Research Projects Office"
        sub={`${projects.length} total records · research-service (MongoDB)`}
        actions={<>
          {projects.length === 0 && (
            <Btn onClick={handleSeed} variant="secondary">Seed Sample Data</Btn>
          )}
          {(user?.role === "admin" || user?.role === "researcher") && (
            <Btn onClick={openAdd}>+ Add Research Proposal</Btn>
          )}
        </>}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 20, paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab("active_portfolio")}
          style={{
            background: "transparent", border: "none",
            borderBottom: activeTab === "active_portfolio" ? "2px solid #22d3ee" : "2px solid transparent",
            color: activeTab === "active_portfolio" ? "#22d3ee" : "#64748b",
            padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s"
          }}>
          🏛️ Active Research Portfolio
        </button>
        <button
          onClick={() => setActiveTab("proposal_pipeline")}
          style={{
            background: "transparent", border: "none",
            borderBottom: activeTab === "proposal_pipeline" ? "2px solid #22d3ee" : "2px solid transparent",
            color: activeTab === "proposal_pipeline" ? "#22d3ee" : "#64748b",
            padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s"
          }}>
          📋 Grant Proposal Pipeline (Kanban Board)
        </button>
      </div>

      {/* Filters (Active Portfolio tab only) */}
      {activeTab === "active_portfolio" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, lead, or tag…"
            style={{ ...inputStyle, width: 300 }}
          />
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="">All Statuses</option>
            {["active", "completed", "paused", "planned"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}
            style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="">All Colleges</option>
            {COLLEGES.map(c => (
              <option key={c} value={c}>{c.replace("College of ", "")}</option>
            ))}
          </select>
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
            style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="">All Departments</option>
            {uniqueDepartments.map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            style={{ background: "#162030", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            <option value="">All Start Years</option>
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {loading && <Loader />}
      {error   && <ErrorMsg message={error} />}

      {!loading && !error && (
        <>
          {/* Active Portfolio Tab */}
          {activeTab === "active_portfolio" && (
            <SectionCard title={`${activeProjects.length} Active Research Projects`}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Title", "Lead", "College / CoE", "Status", "Funding (ETB)", "Start Date", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeProjects.map(p => (
                      <React.Fragment key={p._id}>
                        <tr
                          onClick={(e) => {
                            if (e.target.closest("button") || e.target.closest("a")) return;
                            toggleRow(p._id);
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                          <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: 500, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.title}>{p.title}</td>
                          <td style={{ padding: "10px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{p.lead}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>
                            <div>{p.college?.replace("College of ", "")}</div>
                            {p.centerOfExcellence && p.centerOfExcellence !== "None" && (
                              <div style={{ color: "#22d3ee", fontSize: 10, marginTop: 2, fontWeight: 600 }}>🏛️ {p.centerOfExcellence.replace("Center of Excellence for ", "").split(" (")[0]}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}><Badge status={p.status} /></td>
                          <td style={{ padding: "10px 12px", color: "#f59e0b", fontFamily: "monospace", fontSize: 12 }}>{(p.fundingETB || 0).toLocaleString()}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{p.startDate}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {(user?.role === "admin" || user?.role === "researcher") && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <Btn small variant="secondary" onClick={() => openEdit(p)}>Edit</Btn>
                                {user?.role === "admin" && (
                                  <Btn small variant="danger" onClick={() => handleDelete(p._id)}>Delete</Btn>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedProjectId === p._id && (
                          <tr style={{ background: "rgba(10, 18, 30, 0.45)" }}>
                            <td colSpan={7} style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
                                
                                {/* Translation Column */}
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Project Abstract / Translation</span>
                                    <div style={{ display: "flex", gap: 4 }}>
                                      {["English", "Amharic", "Afaan Oromoo"].map(lang => {
                                        const active = (activeLang[p._id] || "English") === lang;
                                        return (
                                          <button
                                            key={lang}
                                            onClick={() => handleTranslate(p._id, p.summary || "No description provided.", lang)}
                                            style={{
                                              background: active ? "rgba(34,211,238,0.15)" : "transparent",
                                              border: active ? "1px solid rgba(34,211,238,0.4)" : "1px solid transparent",
                                              color: active ? "#22d3ee" : "#64748b",
                                              padding: "3px 8px",
                                              borderRadius: 6,
                                              fontSize: 11,
                                              cursor: "pointer",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {lang}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.04)", minHeight: 80 }}>
                                    {translating[p._id] ? (
                                      <div style={{ color: "#64748b", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 14, height: 14, border: "2px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                        <span>AI Translating abstract...</span>
                                      </div>
                                    ) : (
                                      <p style={{ color: "#cbd5e1", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                                        {(activeLang[p._id] || "English") === "English"
                                          ? (p.summary || "No description provided.")
                                          : (translations[p._id]?.[activeLang[p._id]] || "No translation loaded.")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Matchmaking Column */}
                                <div>
                                  <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 12 }}>
                                    🎓 AI Research Matchmaking (Potential Collaborators)
                                  </span>

                                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {matching[p._id] ? (
                                      <div style={{ color: "#64748b", fontSize: 12, padding: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 14, height: 14, border: "2px solid rgba(34,211,238,0.2)", borderTopColor: "#22d3ee", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                        <span>Evaluating ASTU research graph and finding matches...</span>
                                      </div>
                                    ) : matches[p._id] && matches[p._id].length > 0 ? (
                                      matches[p._id].map(m => (
                                        <div key={m.projectId} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 12 }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                            <span style={{ color: "#e2e8f0", fontSize: 12.5, fontWeight: 600 }}>{m.lead}</span>
                                            <span style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                                              {m.score}% Match
                                            </span>
                                          </div>
                                          <p style={{ color: "#94a3b8", fontSize: 11, margin: "0 0 6px" }}>{m.title}</p>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {m.reasons.map((r, rIdx) => (
                                              <span key={rIdx} style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)", color: "#22d3ee", borderRadius: 4, padding: "1px 4px", fontSize: 9.5 }}>
                                                {r}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p style={{ color: "#475569", fontSize: 12, padding: "10px 0" }}>No matching researchers found with shared tags or overlap.</p>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>

                    {activeProjects.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#475569" }}>No active projects found. Click "Seed Sample Data" or create a proposal!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Proposal Pipeline Tab (Kanban Board) */}
          {activeTab === "proposal_pipeline" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {Object.entries(kanbanColumns).map(([colKey, col]) => (
                <div key={colKey} style={{ background: "#0f1824", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", padding: "14px 12px", minHeight: "60vh" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: `2px solid ${col.color}40`, paddingBottom: 8 }}>
                    <h3 style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: ".05em" }}>{col.title}</h3>
                    <span style={{ background: `${col.color}20`, color: col.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{col.items.length}</span>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {col.items.map(p => (
                      <div
                        key={p._id}
                        style={{
                          background: "#162030", border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 10, padding: 14, cursor: "default", transition: "all .15s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                        
                        <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.4 }} title={p.title}>
                          {p.title}
                        </div>
                        
                        <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 8px" }}>👤 {p.lead} · {p.department}</p>
                        
                        {p.centerOfExcellence && p.centerOfExcellence !== "None" && (
                          <div style={{ color: "#22d3ee", fontSize: 10, margin: "0 0 8px", fontWeight: 600 }}>🏛️ {p.centerOfExcellence.replace("Center of Excellence for ", "").split(" (")[0]}</div>
                        )}
                        
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, marginTop: 8 }}>
                          <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{fmtETB(p.fundingETB)}</span>
                          
                          {/* Role-based Kanban Controls */}
                          {user?.role === "admin" && (
                            <div style={{ display: "flex", gap: 4 }}>
                              {colKey !== "paused" && colKey !== "active" && (
                                <button
                                  onClick={() => updateProposalStatus(p._id, "paused")}
                                  title="Flag Revision"
                                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
                                  ⚠️ Revise
                                </button>
                              )}
                              {colKey !== "active" && (
                                <button
                                  onClick={() => updateProposalStatus(p._id, "active")}
                                  title="Approve Proposal"
                                  style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
                                  ✓ Approve
                                </button>
                              )}
                              {colKey !== "rejected" && colKey !== "active" && (
                                <button
                                  onClick={() => updateProposalStatus(p._id, "rejected")}
                                  title="Reject Proposal"
                                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b", borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
                                  ✕ Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {col.items.length === 0 && (
                      <div style={{ border: "1px dashed rgba(255,255,255,0.04)", borderRadius: 8, padding: "20px 10px", textAlign: "center", color: "#475569", fontSize: 11 }}>
                        Pipeline empty.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#162030", borderRadius: 16, padding: 32, width: "100%", maxWidth: 600, border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 24 }}>
              {editing ? "Modify Record" : activeTab === "proposal_pipeline" ? "Submit Grant Proposal" : "Add Research Project"}
            </h2>

            {saveMsg && (
              <div style={{ background: saveMsg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${saveMsg.startsWith("✅") ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: saveMsg.startsWith("✅") ? "#4ade80" : "#f87171", fontSize: 13 }}>
                {saveMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Project Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. AI-Powered Crop Disease Detection" />
              </div>

              <div>
                <label style={labelStyle}>Lead Researcher *</label>
                <input required value={form.lead} onChange={e => setForm(f => ({ ...f, lead: e.target.value }))} style={inputStyle} placeholder="e.g. Dr. Tesfaye Worku" />
              </div>

              <div>
                <label style={labelStyle}>Institutional College *</label>
                <select required value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} style={inputStyle}>
                  <option value="">Select College</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Center of Excellence Partnership</label>
                <select value={form.centerOfExcellence} onChange={e => setForm(f => ({ ...f, centerOfExcellence: e.target.value }))} style={inputStyle}>
                  {CENTERS_OF_EXCELLENCE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Department</label>
                <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={inputStyle} placeholder="e.g. Computer Science & Engineering" />
              </div>

              <div>
                <label style={labelStyle}>State / Stage</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  {["active", "paused", "completed", "planned", "under_review", "rejected"].map(s => (
                    <option key={s} value={s}>{s === "under_review" ? "Under Evaluation" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Funding Allocation (ETB)</label>
                <input type="number" min="0" value={form.fundingETB} onChange={e => setForm(f => ({ ...f, fundingETB: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Funding Sponsor</label>
                <input value={form.fundingSource} onChange={e => setForm(f => ({ ...f, fundingSource: e.target.value }))} style={inputStyle} placeholder="e.g. ASTU Internal" />
              </div>

              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Tags / Research Focus (comma separated)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={inputStyle} placeholder="e.g. AI, agriculture, deep learning" />
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Proposal Summary</label>
                <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Brief description of the research goal..." />
              </div>

              <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <Btn variant="secondary" onClick={() => { setShowForm(false); setEditing(null); setSaveMsg(""); }}>Cancel</Btn>
                <Btn disabled={saving}>{saving ? "Submitting…" : "Save Record"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
