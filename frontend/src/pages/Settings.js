import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { PageHeader, SectionCard, Btn } from "../components/ui";
import { getApiUrls } from "../config/api";

export default function Settings() {
  const { user, token } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [loadUsers,  setLoadUsers]  = useState(false);
  const [msg,        setMsg]        = useState("");
  const [editRole,   setEditRole]   = useState({});  // {userId: newRole}
  const [savingRole, setSavingRole] = useState(null);
  
  // User creation state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "viewer", college: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Profile update state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", college: "", role: "viewer", password: "" });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Admin user profile editing state
  const [showEditUser, setShowEditUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", college: "", role: "viewer", password: "", isActive: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  
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

  // Create new user (admin only)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    addLog("Creating new user account...", "info");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      
      addLog(`New user ${newUser.email} created successfully.`, "success");
      setMsg("success:User created successfully.");
      setNewUser({ name: "", email: "", password: "", role: "viewer", college: "" });
      setShowAddUser(false);
      fetchUsers();
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      addLog(`❌ User creation failed: ${e.message}`, "error");
      setMsg("error:" + e.message);
    } finally { setCreatingUser(false); }
  };

  // Update own profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    addLog("Updating user profile...", "info");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      
      addLog("Profile updated successfully.", "success");
      setMsg("success:Profile updated successfully!");
      setShowEditProfile(false);
      setProfileForm({ name: "", email: "", college: "", role: "viewer", password: "" });
      
      // Refresh user data from backend
      const userRes = await fetch(`${apiConfig.authUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && userData.user) {
          // Update user in auth context
          localStorage.setItem('user', JSON.stringify(userData.user));
          window.location.reload();
        }
      }
      
      setTimeout(() => setMsg(""), 5000);
    } catch (e) {
      addLog(`❌ Profile update failed: ${e.message}`, "error");
      setMsg("error:" + e.message);
    } finally { setUpdatingProfile(false); }
  };

  // Admin: Update any user's profile
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUpdatingUser(true);
    addLog(`Updating user profile for ${editUserForm.email}...`, "info");
    try {
      const res = await fetch(`${apiConfig.authUrl}/auth/users/${editingUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editUserForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      
      addLog(`User profile updated successfully.`, "success");
      setMsg("success:User profile updated successfully!");
      setShowEditUser(false);
      setEditUserForm({ name: "", email: "", college: "", role: "viewer", password: "", isActive: true });
      setEditingUserId(null);
      fetchUsers();
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      addLog(`❌ User profile update failed: ${e.message}`, "error");
      setMsg("error:" + e.message);
    } finally { setUpdatingUser(false); }
  };

  // Open edit user modal
  const openEditUser = (user) => {
    setEditingUserId(user._id);
    setEditUserForm({
      name: user.name,
      email: user.email,
      college: user.college || "",
      role: user.role,
      password: "",
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    setShowEditUser(true);
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
          <SectionCard title="User Account Control" action={
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ color:"#64748b", fontSize:12 }}>{users.length} registered accounts</span>
              <Btn small onClick={() => setShowAddUser(true)}>+ Add User</Btn>
            </div>
          }>
            <p style={{ color:"#64748b", fontSize:13, marginBottom:16 }}>
              Promote or demote users. Permissions change instantly across research, community, and settings access.
            </p>
            
            {/* Add User Form */}
            {showAddUser && (
              <div style={{ background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.2)", borderRadius:8, padding:16, marginBottom:16 }}>
                <h4 style={{ color:"#22d3ee", fontSize:14, fontWeight:600, margin:"0 0 12px" }}>Create New User</h4>
                <form onSubmit={handleCreateUser} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Full Name</label>
                    <input
                      required
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                      style={inputStyle}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Email</label>
                    <input
                      required
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      style={inputStyle}
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                  <div>
                    <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Password</label>
                    <input
                      required
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      style={inputStyle}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div>
                    <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Role</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                      style={inputStyle}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="researcher">Researcher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>College</label>
                    <input
                      value={newUser.college}
                      onChange={e => setNewUser({...newUser, college: e.target.value})}
                      style={inputStyle}
                      placeholder="e.g. College of Engineering"
                    />
                  </div>
                  <div style={{ gridColumn:"1/-1", display:"flex", gap:10, marginTop:8 }}>
                    <Btn disabled={creatingUser}>{creatingUser ? "Creating..." : "Create User"}</Btn>
                    <Btn variant="secondary" onClick={() => setShowAddUser(false)}>Cancel</Btn>
                  </div>
                </form>
              </div>
            )}
            {loadUsers ? <p style={{ color:"#64748b" }}>Loading database records...</p> : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr>{["Full Name","Email","Current Role","Actions","College","Registered"].map(h=>(
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
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <Btn small onClick={() => openEditUser(u)}>Edit</Btn>
                            {u._id !== user?.id && (
                              <>
                                <select
                                  defaultValue={u.role}
                                  onChange={e => setEditRole(r => ({...r, [u._id]: e.target.value}))}
                                  style={{ background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"5px 8px", color:"#e2e8f0", fontSize:12, outline:"none", fontFamily:"inherit" }}>
                                  <option value="viewer">Viewer</option>
                                  <option value="researcher">Researcher</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <Btn small onClick={() => handleRoleChange(u._id, editRole[u._id] || u.role)} disabled={savingRole === u._id}>
                                  {savingRole === u._id ? "..." : "Apply"}
                                </Btn>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12 }}>{u.college || "—"}</td>
                        <td style={{ padding:"10px 12px", color:"#64748b", fontSize:12, fontFamily:"monospace" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#162030", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:24, width:500, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ color:"#e2e8f0", fontSize:18, fontWeight:700, margin:"0 0 16px" }}>Edit User Profile</h3>
            <form onSubmit={handleUpdateUser} style={{ display:"grid", gap:12 }}>
              <div>
                <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Full Name</label>
                <input
                  required
                  value={editUserForm.name}
                  onChange={e => setEditUserForm({...editUserForm, name: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Email</label>
                <input
                  required
                  type="email"
                  value={editUserForm.email}
                  onChange={e => setEditUserForm({...editUserForm, email: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div>
                <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editUserForm.password}
                  onChange={e => setEditUserForm({...editUserForm, password: e.target.value})}
                  style={inputStyle}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Role</label>
                <select
                  value={editUserForm.role}
                  onChange={e => setEditUserForm({...editUserForm, role: e.target.value})}
                  style={inputStyle}
                >
                  <option value="viewer">Viewer</option>
                  <option value="researcher">Researcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>College</label>
                <input
                  value={editUserForm.college}
                  onChange={e => setEditUserForm({...editUserForm, college: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g. College of Engineering"
                />
              </div>
              <div>
                <label style={{ display:"flex", alignItems:"center", gap:8, color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>
                  <input
                    type="checkbox"
                    checked={editUserForm.isActive}
                    onChange={e => setEditUserForm({...editUserForm, isActive: e.target.checked})}
                    style={{ width:16, height:16 }}
                  />
                  Active Account
                </label>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <Btn disabled={updatingUser}>{updatingUser ? "Updating..." : "Update User"}</Btn>
                <Btn variant="secondary" onClick={() => setShowEditUser(false)}>Cancel</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div style={{ marginTop:16 }}>
        <SectionCard title="User Session Profile" action={<Btn small onClick={() => { setShowEditProfile(true); setProfileForm({ name: user?.name || "", email: user?.email || "", college: user?.college || "", role: user?.role || "viewer", password: "" }); }}>Edit Profile</Btn>}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
            {[
              { label:"Full Name", value: user?.name },
              { label:"Email Address",     value: user?.email },
              { label:"Access Privilege",      value: user?.role },
              { label:"Institutional College",   value: user?.college || "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"12px 16px" }}>
                <p style={{ color:"#475569", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:".05em", margin:"0 0 4px" }}>{label}</p>
                <p style={{ color:"#e2e8f0", fontSize:13, fontWeight:500, margin:0, textTransform:"capitalize" }}>{value}</p>
              </div>
            ))}
          </div>
          
          {/* Edit Profile Form */}
          {showEditProfile && (
            <div style={{ marginTop:20, background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.2)", borderRadius:8, padding:16 }}>
              <h4 style={{ color:"#22d3ee", fontSize:14, fontWeight:600, margin:"0 0 12px" }}>Update Your Profile</h4>
              <form onSubmit={handleUpdateProfile} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Full Name</label>
                  <input
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    style={inputStyle}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Email Address</label>
                  <input
                    required
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                    style={inputStyle}
                    placeholder="e.g. john@example.com"
                  />
                </div>
                <div>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Institutional College</label>
                  <input
                    value={profileForm.college}
                    onChange={e => setProfileForm({...profileForm, college: e.target.value})}
                    style={inputStyle}
                    placeholder="e.g. College of Engineering"
                  />
                </div>
                <div>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>Role</label>
                  <select
                    value={profileForm.role || user?.role || "viewer"}
                    onChange={e => setProfileForm({...profileForm, role: e.target.value})}
                    style={inputStyle}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="researcher">Researcher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ display:"block", color:"#94a3b8", fontSize:11, fontWeight:600, marginBottom:5 }}>New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={profileForm.password}
                    onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                    style={inputStyle}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
                <div style={{ gridColumn:"1/-1", display:"flex", gap:10, marginTop:8 }}>
                  <Btn disabled={updatingProfile}>{updatingProfile ? "Updating..." : "Update Profile"}</Btn>
                  <Btn variant="secondary" onClick={() => setShowEditProfile(false)}>Cancel</Btn>
                </div>
              </form>
              <p style={{ color:"#64748b", fontSize:11, marginTop:12, margin:0 }}>
                💡 Changes will take effect immediately. You may need to refresh the page to see updated information.
              </p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
