import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0f1824", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:420, background:"#162030", borderRadius:16, padding:"40px 36px", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1d4ed8,#06b6d4)", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <span style={{ fontSize:28 }}>🎓</span>
          </div>
          <h1 style={{ color:"#e2e8f0", fontSize:22, fontWeight:700, margin:0 }}>ASTU Analytics Portal</h1>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Adama Science and Technology University</p>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"10px 14px", marginBottom:20, color:"#f87171", fontSize:13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", color:"#94a3b8", fontSize:12, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="yourname@astu.edu.et"
              style={{ width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", color:"#94a3b8", fontSize:12, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width:"100%", background:"#0f1824", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{ width:"100%", background:"linear-gradient(135deg,#1d4ed8,#06b6d4)", color:"#fff", border:"none", borderRadius:8, padding:"13px", fontSize:15, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop:28, padding:"16px", background:"rgba(6,182,212,0.06)", borderRadius:8, border:"1px solid rgba(6,182,212,0.15)" }}>
          <p style={{ color:"#64748b", fontSize:12, marginBottom:10, fontWeight:600 }}>DEMO ACCOUNTS & CAPABILITIES:</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div>
              <p style={{ color:"#94a3b8", fontSize:12, margin:0 }}>Admin: <span style={{ color:"#22d3ee" }}>admin@astu.edu.et</span> / admin1234</p>
              <p style={{ color:"#64748b", fontSize:11, margin:"2px 0 0", fontStyle:"italic" }}>↳ Full access — CRUD projects, manage user roles, wipe/seed database</p>
            </div>
            <div>
              <p style={{ color:"#94a3b8", fontSize:12, margin:0 }}>Researcher: <span style={{ color:"#22d3ee" }}>researcher@astu.edu.et</span> / research1234</p>
              <p style={{ color:"#64748b", fontSize:11, margin:"2px 0 0", fontStyle:"italic" }}>↳ Research access — Add and edit research & community projects, view all insights</p>
            </div>
            <div>
              <p style={{ color:"#94a3b8", fontSize:12, margin:0 }}>Viewer: <span style={{ color:"#22d3ee" }}>viewer@astu.edu.et</span> / viewer1234</p>
              <p style={{ color:"#64748b", fontSize:11, margin:"2px 0 0", fontStyle:"italic" }}>↳ Read-only access — Browse dashboards, projects, and download reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
