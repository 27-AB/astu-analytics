import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Badge, SectionCard, PageHeader, Btn, Loader, ErrorMsg, fmtETB } from "../components/ui";

import { getServiceUrl } from "../config/api";

const API = getServiceUrl("community");
const ANALYTICS_API = getServiceUrl("analytics");

// Correct official colleges
const COLLEGES = [
  "College of Electrical Engineering & Computing",
  "College of Mechanical, Chemical & Materials Engineering",
  "College of Civil Engineering and Architecture",
  "College of Applied Natural Science",
  "College of Humanities and Social Science",
  "Postgraduate Programs",
];

export default function CommunityProjects() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  
  // Tabs and Hotspots
  const [activeTab, setActiveTab] = useState("table_view"); // "table_view" or "impact_map"
  const [hoveredLocation, setHoveredLocation] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ title:"", lead:"", college:"", location:"Adama", status:"active", startDate:"", endDate:"", budgetETB:0, beneficiaries:0, volunteers:0, tags:"", summary:"", impact:"" });

  // Translation states
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState({});
  const [activeLang, setActiveLang] = useState({});

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


  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit:50, ...(search && {search}), ...(status && {status}) });
      const res = await fetch(`${API}/community-projects?${params}`, { headers:{ Authorization:`Bearer ${token}` }});
      const d = await res.json();
      setProjects(d.projects||[]); setTotal(d.total||0);
    } catch(e){ setError(e.message); }
    finally { setLoading(false); }
  }, [token, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    await fetch(`${API}/community-projects/seed`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }});
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await fetch(`${API}/community-projects/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` }});
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, budgetETB: Number(form.budgetETB)||0, beneficiaries: Number(form.beneficiaries)||0, volunteers: Number(form.volunteers)||0, tags: form.tags ? form.tags.split(",").map(t=>t.trim()).filter(Boolean) : [] };
    const url    = editing ? `${API}/community-projects/${editing._id}` : `${API}/community-projects`;
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
    setShowForm(false); setEditing(null);
    setForm({ title:"",lead:"",college:"",location:"Adama",status:"active",startDate:"",endDate:"",budgetETB:0,beneficiaries:0,volunteers:0,tags:"",summary:"",impact:"" });
    load();
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p, tags: (p.tags||[]).join(", ") });
    setShowForm(true);
  };

  const totalBenef = projects.reduce((s,p)=>s+(p.beneficiaries||0),0);
  const totalVols  = projects.reduce((s,p)=>s+(p.volunteers||0),0);
  const totalBudg  = projects.reduce((s,p)=>s+(p.budgetETB||0),0);

  // --- Dynamic SVG Impact Map Calculations ---
  // Coordinates in East Shewa district orbital network
  const LOCATIONS_CONFIG = {
    adama:     { name: "Adama (HQ)", cx: 280, cy: 220, color: "#38bdf8" },
    wonji:     { name: "Wonji District", cx: 380, cy: 300, color: "#34d399" },
    modjo:     { name: "Modjo Substation", cx: 180, cy: 190, color: "#f59e0b" },
    bishoftu:  { name: "Bishoftu Corridor", cx: 80, cy: 140, color: "#a78bfa" }
  };

  const getAggregateByLocation = (locKey) => {
    const matched = projects.filter(p => p.location?.toLowerCase().includes(locKey));
    return {
      count: matched.length,
      budget: matched.reduce((s, p) => s + (p.budgetETB || 0), 0),
      beneficiaries: matched.reduce((s, p) => s + (p.beneficiaries || 0), 0),
      volunteers: matched.reduce((s, p) => s + (p.volunteers || 0), 0),
      list: matched.map(m => m.title)
    };
  };

  return (
    <div>
      <PageHeader title="Community Projects" sub={`${total} outreach projects in and around East Shewa`}
        actions={<>
          {projects.length===0 && <Btn onClick={handleSeed} variant="secondary">Seed Sample Data</Btn>}
          {(user?.role==="admin"||user?.role==="researcher") && <Btn onClick={()=>setShowForm(true)}>+ Add Project</Btn>}
        </>}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 20, paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab("table_view")}
          style={{
            background: "transparent", border: "none",
            borderBottom: activeTab === "table_view" ? "2px solid #34d399" : "2px solid transparent",
            color: activeTab === "table_view" ? "#34d399" : "#64748b",
            padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s"
          }}>
          📁 Projects Table View
        </button>
        <button
          onClick={() => setActiveTab("impact_map")}
          style={{
            background: "transparent", border: "none",
            borderBottom: activeTab === "impact_map" ? "2px solid #34d399" : "2px solid transparent",
            color: activeTab === "impact_map" ? "#34d399" : "#64748b",
            padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s"
          }}>
          🗺️ Interactive Regional Impact Map
        </button>
      </div>

      {/* Impact summary row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Beneficiaries", value: totalBenef.toLocaleString(), icon:"👥", color:"#34d399" },
          { label:"Total Volunteers",    value: totalVols.toLocaleString(),  icon:"🙋", color:"#38bdf8" },
          { label:"Total Budget",        value: fmtETB(totalBudg),           icon:"💰", color:"#f59e0b" },
        ].map(({ label,value,icon,color })=>(
          <div key={label} style={{ background:"#162030", border:`1px solid ${color}25`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:26 }}>{icon}</span>
            <div>
              <div style={{ color, fontSize:22, fontWeight:700 }}>{value}</div>
              <div style={{ color:"#64748b", fontSize:12 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading && <Loader />}
      {error   && <ErrorMsg message={error} />}

      {!loading && !error && (
        <>
          {/* Tab 1: Table List View */}
          {activeTab === "table_view" && (
            <>
              {/* Filters */}
              <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects…"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 14px", color:"#e2e8f0", fontSize:13, width:280, outline:"none", fontFamily:"inherit" }} />
                <select value={status} onChange={e=>setStatus(e.target.value)}
                  style={{ background:"#162030", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 14px", color:"#94a3b8", fontSize:13, outline:"none", fontFamily:"inherit" }}>
                  <option value="">All Status</option>
                  {["active","completed","paused","planned"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              <SectionCard title={`${total} Community Projects`}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr>{["Title","Lead","College","Location","Beneficiaries","Budget","Status","Actions"].map(h=>(
                        <th key={h} style={{ textAlign:"left", padding:"8px 12px", color:"#475569", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,0.06)", whiteSpace:"nowrap" }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {projects.map(p=>(
                        <React.Fragment key={p._id}>
                          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                            onClick={(e) => {
                              if (e.target.closest("button") || e.target.closest("a")) return;
                              setExpandedProjectId(expandedProjectId === p._id ? null : p._id);
                            }}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"10px 12px", color:"#e2e8f0", fontWeight:500, maxWidth:220, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={p.title}>{p.title}</td>
                            <td style={{ padding:"10px 12px", color:"#94a3b8", whiteSpace:"nowrap" }}>{p.lead}</td>
                            <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12 }}>{p.college?.replace("College of ","")}</td>
                            <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12 }}>{p.location}</td>
                            <td style={{ padding:"10px 12px", color:"#34d399", fontWeight:600 }}>{(p.beneficiaries||0).toLocaleString()}</td>
                            <td style={{ padding:"10px 12px", color:"#f59e0b", fontSize:12, fontFamily:"monospace" }}>{fmtETB(p.budgetETB||0)}</td>
                            <td style={{ padding:"10px 12px" }}><Badge status={p.status} /></td>
                            <td style={{ padding:"10px 12px" }}>
                              {(user?.role==="admin"||user?.role==="researcher") && (
                                <div style={{ display:"flex", gap:6 }}>
                                  <Btn small variant="secondary" onClick={()=>openEdit(p)}>Edit</Btn>
                                  {user?.role==="admin" && <Btn small variant="danger" onClick={()=>handleDelete(p._id)}>Del</Btn>}
                                </div>
                              )}
                            </td>
                          </tr>
                          {expandedProjectId === p._id && (
                            <tr style={{ background: "rgba(10, 18, 30, 0.45)" }}>
                              <td colSpan={8} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                      <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Outreach Abstract / Translation</span>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        {["English", "Amharic", "Afaan Oromoo"].map(lang => {
                                          const active = (activeLang[p._id] || "English") === lang;
                                          return (
                                            <button
                                              key={lang}
                                              onClick={() => handleTranslate(p._id, p.summary || "No description provided.", lang)}
                                              style={{
                                                background: active ? "rgba(52,211,153,0.15)" : "transparent",
                                                border: active ? "1px solid rgba(52,211,153,0.4)" : "1px solid transparent",
                                                color: active ? "#34d399" : "#64748b",
                                                padding: "3px 8px",
                                                borderRadius: 6,
                                                fontSize: 10.5,
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
                                    <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 8, padding: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                                      {translating[p._id] ? (
                                        <div style={{ color: "#64748b", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                          <div style={{ width: 12, height: 12, border: "2px solid rgba(52,211,153,0.2)", borderTopColor: "#34d399", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                          <span>AI Translating...</span>
                                        </div>
                                      ) : (
                                        <p style={{ color: "#cbd5e1", fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
                                          {(activeLang[p._id] || "English") === "English"
                                            ? (p.summary || "No description provided.")
                                            : (translations[p._id]?.[activeLang[p._id]] || "No translation loaded.")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 10 }}>Social Impact Assessment</span>
                                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: 12 }}>
                                      <p style={{ color: "#e2e8f0", fontSize: 12.5, margin: 0, fontWeight: 500 }}>🎯 Target Impact:</p>
                                      <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0", lineHeight: 1.4 }}>{p.impact || "General community support and knowledge transfer."}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}

          {/* Tab 2: Interactive SVG regional map */}
          {activeTab === "impact_map" && (
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
              {/* Map view */}
              <SectionCard title="Adama & East Shewa Corridor Outreach Map">
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
                  Hover over active pulsing radar hotspots to analyze regional impact metrics calculated dynamically from live database records.
                </p>
                <div style={{ position: "relative", overflow: "hidden", background: "#090f17", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <svg width="100%" height="400" viewBox="0 0 500 360" style={{ display: "block" }}>
                    <defs>
                      <style>{`
                        @keyframes radarPulse {
                          0% { r: 6px; opacity: 1; stroke-width: 1px; }
                          50% { r: 18px; opacity: 0.4; stroke-width: 2px; }
                          100% { r: 30px; opacity: 0; stroke-width: 1px; }
                        }
                        .radar-glow {
                          animation: radarPulse 2s infinite ease-out;
                        }
                      `}</style>
                    </defs>

                    {/* East Shewa styled grid paths (stylized highway and river boundaries) */}
                    <path d="M 50,150 Q 150,160 250,220 T 450,280" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 50,150 Q 150,160 250,220 T 450,280" fill="none" stroke="rgba(34,211,238,0.04)" strokeWidth="2" strokeLinecap="round" />
                    
                    <path d="M 180,50 L 180,190 Q 280,220 380,300" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" strokeLinecap="round" />

                    {/* Plot coordinates beacons */}
                    {Object.entries(LOCATIONS_CONFIG).map(([key, config]) => {
                      const data = getAggregateByLocation(key);
                      return (
                        <g
                          key={key}
                          onMouseEnter={() => setHoveredLocation({ key, config, data })}
                          onMouseLeave={() => setHoveredLocation(null)}
                          style={{ cursor: "pointer" }}>
                          
                          {/* Radar waves */}
                          {data.count > 0 && (
                            <circle
                              cx={config.cx}
                              cy={config.cy}
                              fill="none"
                              stroke={config.color}
                              className="radar-glow"
                            />
                          )}

                          <circle
                            cx={config.cx}
                            cy={config.cy}
                            r={data.count > 0 ? 8 : 4}
                            fill={data.count > 0 ? config.color : "#1e293b"}
                            stroke="#090f17"
                            strokeWidth={1.5}
                          />

                          <text
                            x={config.cx}
                            y={config.cy - 12}
                            fill="#94a3b8"
                            fontSize="9"
                            fontWeight="600"
                            textAnchor="middle"
                            pointerEvents="none">
                            {config.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </SectionCard>

              {/* Dynamic stats sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <SectionCard title="Impact Dossier">
                  {hoveredLocation ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div>
                        <h3 style={{ color: hoveredLocation.config.color, fontSize: 16, fontWeight: 700, margin: 0 }}>{hoveredLocation.config.name}</h3>
                        <p style={{ color: "#64748b", fontSize: 12, margin: "2px 0 0" }}>East Shewa Development Grid</p>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                          <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Active Outreach</span>
                          <span style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700 }}>{hoveredLocation.data.count} Projects</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                          <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Allocated Budget</span>
                          <span style={{ color: "#f59e0b", fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>{fmtETB(hoveredLocation.data.budget)}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                          <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Beneficiaries</span>
                          <span style={{ color: "#34d399", fontSize: 18, fontWeight: 700 }}>{hoveredLocation.data.beneficiaries.toLocaleString()}</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 10 }}>
                          <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Student Vols</span>
                          <span style={{ color: "#38bdf8", fontSize: 18, fontWeight: 700 }}>{hoveredLocation.data.volunteers.toLocaleString()}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                        <span style={{ color: "#475569", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>Outreach Projects</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 110, overflowY: "auto" }}>
                          {hoveredLocation.data.list.map((title, idx) => (
                            <div key={idx} style={{ color: "#94a3b8", fontSize: 11.5, borderLeft: `2px solid ${hoveredLocation.config.color}`, paddingLeft: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={title}>
                              {title}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, color: "#475569" }}>
                      <span style={{ fontSize: 32, marginBottom: 12 }}>🗺️</span>
                      <span style={{ fontSize: 12, textAlign: "center" }}>Hover over map coordinate indicators to load dynamic regional stats.</span>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#162030", borderRadius:16, padding:32, width:"100%", maxWidth:600, border:"1px solid rgba(255,255,255,0.1)", maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ color:"#e2e8f0", fontSize:18, fontWeight:700, marginTop:0, marginBottom:24 }}>{editing?"Edit":"Add"} Community Project</h2>
            <form onSubmit={handleSubmit} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { label:"Title",            key:"title",         type:"text",     span:true },
                { label:"Lead",             key:"lead",          type:"text"               },
                { label:"College",          key:"college",       type:"select",   options:COLLEGES },
                { label:"Location",         key:"location",      type:"text"               },
                { label:"Status",           key:"status",        type:"select",   options:["active","paused","completed","planned"] },
                { label:"Budget (ETB)",     key:"budgetETB",     type:"number"             },
                { label:"Beneficiaries",    key:"beneficiaries", type:"number"             },
                { label:"Volunteers",       key:"volunteers",    type:"number"             },
                { label:"Start Date",       key:"startDate",     type:"date"               },
                { label:"End Date",         key:"endDate",       type:"date"               },
                { label:"Tags (comma sep)", key:"tags",          type:"text",     span:true },
                { label:"Summary",          key:"summary",       type:"textarea", span:true },
                { label:"Impact",           key:"impact",        type:"textarea", span:true },
              ].map(({ label,key,type,span,options })=>(
                <div key={key} style={{ gridColumn:span?"1/-1":undefined }}>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                  {type==="select" ? (
                    <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      style={{ width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}>
                      {options.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  ) : type==="textarea" ? (
                    <textarea value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} rows={3}
                      style={{ width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
                  ) : (
                    <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      style={{ width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                  )}
                </div>
              ))}
              <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <Btn variant="secondary" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</Btn>
                <Btn>Save Project</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
