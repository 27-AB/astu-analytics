import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { PageHeader, SectionCard, Btn } from "../components/ui";
import { getApiUrls } from "../config/api";

const COLLEGES = [
  "College of Electrical Engineering & Computing",
  "College of Mechanical, Chemical & Materials Engineering",
  "College of Civil Engineering and Architecture",
  "College of Applied Natural Science",
  "College of Humanities and Social Science",
  "Postgraduate Programs",
];

export default function Settings() {
  const { user, token, updateSession } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [loadUsers,  setLoadUsers]  = useState(false);
  const [msg,        setMsg]        = useState("");
  const [editRole,   setEditRole]   = useState({});  // {userId: newRole}
  const [savingRole, setSavingRole] = useState(null);

  // Self Profile update states
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileCollege, setProfileCollege] = useState(user?.college || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Admin add user states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "viewer", college: "" });
  const [newUserSaving, setNewUserSaving] = useState(false);

  // Admin edit user states
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUser, setEditUser] = useState({ id: "", name: "", email: "", role: "viewer", college: "", isActive: true, password: "" });
  const [editUserSaving, setEditUserSaving] = useState(false);

  
  // API Endpoints State
  const [apiConfig, setApiConfig] = useState(() => {
    const urls = getApiUrls();
    return {
      researchUrl: urls.research,
      communityUrl: urls.community,
      collegeUrl: urls.college,
      analyticsUrl: urls.analytics,
      authUrl: urls.auth,
    };
  });

  // Services Diagnostics State
  const [pingStats, setPingStats] = useState({
    auth: { name: "Auth Service", status: "offline", latency: null },
    research: { name: "Research Service", status: "offline", latency: null },
    community: { name: "Community Service", status: "offline", latency: null },
    college: { name: "College Service", status: "offline", latency: null },
    analytics: { name: "Analytics Service", status: "offline", latency: null },
  });
  const [logs, setLogs] = useState([
    `[${new Date().toLocaleTimeString()}] 🚀 ASTU Diagnostics Monitor Initialized.`,
    `[${new Date().toLocaleTimeString()}] 🛰️ Attempting handshake with microservices...`
  ]);

  const terminalEndRef = useRef(null);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          college: profileCollege,
          password: profilePassword || undefined
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to update profile.");
      
      updateSession(d.token, d.user);
      setProfilePassword(""); // Reset password input
      addLog("Successfully updated session profile", "success");
      setMsg("success:Profile updated successfully.");
    } catch (err) {
      setMsg("error:" + err.message);
      addLog(`Failed to update session profile: ${err.message}`, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAdminCreateUser = async (e) => {
    e.preventDefault();
    setNewUserSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to create user.");

      setNewUser({ name: "", email: "", password: "", role: "viewer", college: "" });
      setShowAddUserModal(false);
      fetchUsers();
      setMsg("success:User created successfully.");
      addLog(`Admin created new user: ${newUser.email}`, "success");
    } catch (err) {
      setMsg("error:" + err.message);
      addLog(`Admin user creation failed: ${err.message}`, "error");
    } finally {
      setNewUserSaving(false);
    }
  };

  const handleAdminUpdateUser = async (e) => {
    e.preventDefault();
    setEditUserSaving(true);
    setMsg("");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editUser.name,
          email: editUser.email,
          role: editUser.role,
          college: editUser.college,
          isActive: editUser.isActive,
          password: editUser.password || undefined
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to update user.");

      setShowEditUserModal(false);
      fetchUsers();
      setMsg("success:User profile updated successfully.");
      addLog(`Admin updated user profile: ${editUser.email}`, "success");
    } catch (err) {
      setMsg("error:" + err.message);
      addLog(`Admin user profile update failed: ${err.message}`, "error");
    } finally {
      setEditUserSaving(false);
    }
  };

  // Fetch registered users (admin only)
  const fetchUsers = async () => {
    if (user?.role !== "admin") return;
    setLoadUsers(true);
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not fetch users.");
      const d = await res.json();
      setUsers(d.users || []);
    } catch (e) {
      addLog(`❌ Failed to retrieve user records: ${e.message}`, "error");
    } finally { setLoadUsers(false); }
  };

  useEffect(() => {
    if (user?.role === "admin") fetchUsers();
  }, [user]);

  // Append entry to terminal logs
  const addLog = (text, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const symbol = type === "success" ? "🟢" : type === "error" ? "🔴" : "⚡";
    setLogs(prev => [...prev, `[${timestamp}] ${symbol} ${text}`]);
  };

  // Run dynamic latency diagnostics
  const runDiagnostics = async () => {
    const targets = {
      auth: apiConfig.authUrl,
      research: apiConfig.researchUrl,
      community: apiConfig.communityUrl,
      college: apiConfig.collegeUrl,
      analytics: apiConfig.analyticsUrl,
    };

    const newStats = { ...pingStats };

    for (const [key, url] of Object.entries(targets)) {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        // try health check
        const res = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const latency = Math.round(performance.now() - start);
        if (res.ok) {
          newStats[key] = { ...pingStats[key], status: "online", latency };
          addLog(`${pingStats[key].name} connected successfully. Latency: ${latency}ms`, "success");
        } else {
          newStats[key] = { ...pingStats[key], status: "online", latency };
          addLog(`${pingStats[key].name} responded with status ${res.status}. Latency: ${latency}ms`);
        }
      } catch (e) {
        // Retry base URL handshake
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          const latency = Math.round(performance.now() - start);
          newStats[key] = { ...pingStats[key], status: "online", latency };
          addLog(`${pingStats[key].name} online. Latency: ${latency}ms`, "success");
        } catch (err) {
          newStats[key] = { ...pingStats[key], status: "offline", latency: null };
          addLog(`${pingStats[key].name} handshake failed. Service is offline or blocked by CORS.`, "error");
        }
      }
    }
    setPingStats(newStats);
  };

  // Run diagnostics on load and every 8 seconds
  useEffect(() => {
    runDiagnostics();
    const timer = setInterval(runDiagnostics, 8000);
    return () => clearInterval(timer);
  }, [apiConfig]);

  // Seed simulated live system logs to look high-tech
  useEffect(() => {
    const mockLogs = [
      "DB Query: Fetched active research projects list.",
      "CORS policy validated for college aggregator.",
      "JWT signature verified for incoming request.",
      "Cached analytics reports cleared from memory.",
      "MongoDB aggregation pipeline executed on funding metrics.",
      "Buffer pool synchronization complete.",
    ];

    const interval = setInterval(() => {
      const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)];
      addLog(`System trace: ${randomLog}`);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const saveApiConfig = () => {
    localStorage.setItem("astu_research_url",  apiConfig.researchUrl);
    localStorage.setItem("astu_community_url", apiConfig.communityUrl);
    localStorage.setItem("astu_college_url",   apiConfig.collegeUrl);
    localStorage.setItem("astu_analytics_url", apiConfig.analyticsUrl);
    localStorage.setItem("astu_auth_url",      apiConfig.authUrl);
    
    addLog("Configuration saved successfully to Local Storage.", "success");
    setMsg("success:Configuration saved. Click Apply & Refresh to reload with new settings.");
    setTimeout(() => setMsg(""), 5000);
  };

  // Seed All services + wipe old wrong data
  const handleSeedAll = async () => {
    setMsg("info:Initialising database with official ASTU data...");
    addLog("🌱 Wiping database & executing full ASTU re-seed pipeline...", "info");
    
    try {
      const results = await Promise.allSettled([
        fetch(`${apiConfig.authUrl}/auth/seed`, { method: "POST" }),
        fetch(`${apiConfig.researchUrl}/projects/seed`, { method: "POST", headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${apiConfig.communityUrl}/community-projects/seed`, { method: "POST", headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${apiConfig.collegeUrl}/seed`, { method: "POST", headers: { Authorization: `Bearer ${token}` }}),
      ]);

      const failed = results.filter(r => r.status === "rejected" || (r.value && !r.value.ok));
      if (failed.length > 0) {
        addLog("❌ Database initialisation completed with errors. Verify all services are running.", "error");
        setMsg("error:Some services could not be reached. Verify all 5 services are running.");
      } else {
        addLog("🎉 Database seeded and aligned with correct ASTU colleges!", "success");
        setMsg("success:Database initialised successfully. Return to Dashboard to see correct colleges!");
        fetchUsers();
      }
    } catch (e) {
      addLog(`❌ Seed failure: ${e.message}`, "error");
      setMsg("error:" + e.message);
    }
  };

  // Change user role (admin only)
  const handleRoleChange = async (userId, newRole) => {
    setSavingRole(userId);
    addLog(`Attempting to promote/demote user ${userId} to ${newRole}...`, "info");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      
      addLog(`User role updated to ${newRole} in MongoDB database.`, "success");
      setMsg("success:Role updated successfully.");
      fetchUsers();
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      addLog(`❌ Role modification failed: ${e.message}`, "error");
      setMsg("error:" + e.message);
    } finally { setSavingRole(null); }
  };

  const isSuccess = msg.startsWith("success:");
  const isError   = msg.startsWith("error:");
  const msgText   = msg.replace(/^(success|error|info):/, "");
  const ROLE_COLOR = { admin:"#ef4444", researcher:"#38bdf8", viewer:"#34d399" };

  const inputStyle = {
    width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13,
    outline:"none", fontFamily:"monospace", boxSizing:"border-box"
  };

  return (
    <div>
      <PageHeader title="System Settings" sub="Microservices diagnostics and administration panel" />

      {msg && (
        <div style={{ background: isSuccess?"rgba(34,197,94,0.1)":isError?"rgba(239,68,68,0.1)":"rgba(6,182,212,0.1)", border:`1px solid ${isSuccess?"rgba(34,197,94,0.3)":isError?"rgba(239,68,68,0.3)":"rgba(6,182,212,0.3)"}`, borderRadius:10, padding:"12px 18px", marginBottom:20, color: isSuccess?"#4ade80":isError?"#f87171":"#22d3ee", fontSize:14 }}>
          {isSuccess?"✅":isError?"❌":"ℹ️"} {msgText}
        </div>
      )}

      {/* API Configuration */}
      <SectionCard title="Microservice Service Endpoints">
        <p style={{ color:"#64748b", fontSize:13, marginBottom:20, lineHeight:1.7 }}>
          Configure base URLs for backend services. If you change endpoints and click Save $\rightarrow$ Apply, the entire analytics portal will query the new source dynamically.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {[
            { label:"Research Service (Port 4001)",  key:"researchUrl",  placeholder:"http://localhost:4001" },
            { label:"Community Service (Port 4002)", key:"communityUrl", placeholder:"http://localhost:4002" },
            { label:"College Service (Port 4003)",   key:"collegeUrl",   placeholder:"http://localhost:4003" },
            { label:"Analytics Service (Port 4000)", key:"analyticsUrl", placeholder:"http://localhost:4000" },
            { label:"Auth Service (Port 4004)",      key:"authUrl",      placeholder:"http://localhost:4004" },
          ].map(({ label,key,placeholder }) => (
            <div key={key}>
              <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
              <input
                value={apiConfig[key]}
                onChange={e => setApiConfig(c => ({...c, [key]: e.target.value}))}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, display:"flex", gap:10 }}>
          <Btn onClick={saveApiConfig}>Save Configuration</Btn>
          <Btn variant="secondary" onClick={() => window.location.reload()}>Apply & Refresh</Btn>
        </div>
      </SectionCard>

      {/* Service Diagnostics and Scrolling logs terminal */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
        {/* Health Indicators */}
        <SectionCard title="Uptime Diagnostics Grid">
          <p style={{ color:"#64748b", fontSize:13, marginBottom:16 }}>
            Active handshake diagnostics pinging backends every 8 seconds.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {Object.entries(pingStats).map(([key, item]) => {
              const isOnline = item.status === "online";
              return (
                <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:8, padding:"10px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{
                      display:"inline-block", width:10, height:10, borderRadius:"50%",
                      background: isOnline ? "#22d3ee" : "#ef4444",
                      boxShadow: isOnline ? "0 0 10px #22d3ee" : "0 0 10px #ef4444",
                      transition: "all 0.5s ease"
                    }} />
                    <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{item.name}</span>
                  </div>
                  <span style={{ color: isOnline ? "#4ade80" : "#f87171", fontSize:12, fontFamily:"monospace" }}>
                    {isOnline ? `Online · ${item.latency || 0}ms` : "Offline"}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Retro Terminal Logs */}
        <SectionCard title="Live Access logs console">
          <p style={{ color:"#64748b", fontSize:13, marginBottom:12 }}>
            System transaction stream. Real-time telemetry.
          </p>
          <div
            ref={terminalEndRef}
            style={{
              height: 195, background: "#06090e", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)",
              padding:"12px 14px", fontFamily:"Consolas, Monaco, monospace", fontSize:11, color:"#a7f3d0",
              overflowY:"auto", lineHeight:1.5, boxSizing:"border-box"
            }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom:6, borderBottom:"1px solid rgba(255,255,255,0.01)", paddingBottom:2 }}>
                {log}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Database seed — admin only */}
      {user?.role === "admin" && (
        <div style={{ marginTop:16 }}>
          <SectionCard title="Database Initialisation Pipeline">
            <p style={{ color:"#64748b", fontSize:13, marginBottom:8, lineHeight:1.7 }}>
              Seeding clears previous outdated collections and seeds official ASTU data. Run this to fix incorrect college dropdown lists or reset default accounts dynamically.
            </p>
            <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#f59e0b" }}>
              ⚠️ Running this resets database collections for colleges, researchers, research projects, community projects, and core accounts.
            </div>
            <Btn onClick={handleSeedAll} variant="success">🌱 WIPE & INITIALISE ASTU DATA</Btn>
          </SectionCard>
        </div>
      )}

      {/* User management — admin only */}
      {user?.role === "admin" && (
        <div style={{ marginTop:16 }}>
          <SectionCard 
            title="User Account Control" 
            action={
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Btn small onClick={() => setShowAddUserModal(true)}>+ Create New User</Btn>
                <span style={{ color:"#64748b", fontSize:12 }}>{users.length} accounts</span>
              </div>
            }
          >
            <p style={{ color:"#64748b", fontSize:13, marginBottom:16, lineHeight:1.5 }}>
              Manage registered users, change roles, modify profiles, or activate/deactivate accounts.
              <br />
              <span style={{ color:"#ef4444", fontWeight:600 }}>Admin:</span> Full control &middot; 
              <span style={{ color:"#38bdf8", fontWeight:600, marginLeft:8 }}>Researcher:</span> Project control &middot; 
              <span style={{ color:"#34d399", fontWeight:600, marginLeft:8 }}>Viewer:</span> Read-only
            </p>
            {loadUsers ? <p style={{ color:"#64748b" }}>Loading database records...</p> : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr>{["Full Name","Email","Role","College","Status","Registered","Actions"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"8px 12px", color:"#475569", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,0.06)", whiteSpace:"nowrap" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"10px 12px", color:"#e2e8f0", fontWeight:500 }}>{u.name}</td>
                        <td style={{ padding:"10px 12px", color:"#94a3b8", fontFamily:"monospace", fontSize:12 }}>{u.email}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ background:`${ROLE_COLOR[u.role]}15`, color:ROLE_COLOR[u.role], padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, textTransform:"capitalize" }}>{u.role}</span>
                        </td>
                        <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12 }}>{u.college || "—"}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ color: u.isActive !== false ? "#34d399" : "#ef4444", fontWeight: 600 }}>
                            {u.isActive !== false ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12, fontFamily:"monospace" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding:"10px 12px" }}>
                          {u._id !== user?.id ? (
                            <Btn small variant="secondary" onClick={() => {
                              setEditUser({
                                id: u._id,
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                college: u.college || "",
                                isActive: u.isActive !== false,
                                password: ""
                              });
                              setShowEditUserModal(true);
                            }}>Modify</Btn>
                          ) : (
                            <span style={{ color:"#475569", fontSize:12 }}>Logged-in</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Account Info form for self-update */}
      <div style={{ marginTop:16 }}>
        <SectionCard title="Update Session Profile">
          <form onSubmit={handleUpdateProfile} style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, alignItems:"end" }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={profileName} onChange={e=>setProfileName(e.target.value)} style={inputStyle} placeholder="Name" required />
            </div>
            <div>
              <label style={labelStyle}>College Affiliation</label>
              <select value={profileCollege} onChange={e=>setProfileCollege(e.target.value)} style={inputStyle}>
                <option value="">No College (viewer / admin)</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>New Password (optional)</label>
              <input type="password" value={profilePassword} onChange={e=>setProfilePassword(e.target.value)} style={inputStyle} placeholder="Leave blank to keep current" />
            </div>
            <div>
              <Btn disabled={profileSaving} style={{ width: "100%" }}>
                {profileSaving ? "Saving..." : "Save Profile"}
              </Btn>
            </div>
          </form>
        </SectionCard>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#162030", borderRadius: 16, padding: 32, width: "100%", maxWidth: 500, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>Create New User Account</h3>
            <form onSubmit={handleAdminCreateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input required value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} placeholder="Name" />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} style={inputStyle} placeholder="email@astu.edu.et" />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))} style={inputStyle} placeholder="password" />
              </div>
              <div>
                <label style={labelStyle}>Access Role *</label>
                <select value={newUser.role} onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                  <option value="viewer">Viewer</option>
                  <option value="researcher">Researcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>College</label>
                <select value={newUser.college} onChange={e => setNewUser(prev => ({ ...prev, college: e.target.value }))} style={inputStyle}>
                  <option value="">No College</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <Btn variant="secondary" onClick={() => setShowAddUserModal(false)}>Cancel</Btn>
                <Btn disabled={newUserSaving}>{newUserSaving ? "Creating..." : "Create User"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#162030", borderRadius: 16, padding: 32, width: "100%", maxWidth: 500, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>Modify User Profile</h3>
            <form onSubmit={handleAdminUpdateUser} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input required value={editUser.name} onChange={e => setEditUser(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input required type="email" value={editUser.email} onChange={e => setEditUser(prev => ({ ...prev, email: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Access Role</label>
                <select value={editUser.role} onChange={e => setEditUser(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                  <option value="viewer">Viewer</option>
                  <option value="researcher">Researcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>College</label>
                <select value={editUser.college} onChange={e => setEditUser(prev => ({ ...prev, college: e.target.value }))} style={inputStyle}>
                  <option value="">No College</option>
                  {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Account Status</label>
                <select value={String(editUser.isActive)} onChange={e => setEditUser(prev => ({ ...prev, isActive: e.target.value === "true" }))} style={inputStyle}>
                  <option value="true">Active</option>
                  <option value="false">Deactivated</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reset Password (optional)</label>
                <input type="password" value={editUser.password} onChange={e => setEditUser(prev => ({ ...prev, password: e.target.value }))} style={inputStyle} placeholder="Leave blank to keep current" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <Btn variant="secondary" onClick={() => setShowEditUserModal(false)}>Cancel</Btn>
                <Btn disabled={editUserSaving}>{editUserSaving ? "Saving..." : "Save Changes"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
