import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Btn } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@astu.edu.et");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Wait for AuthContext to reload user details via useEffect
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreload = (role: "admin" | "researcher" | "viewer") => {
    if (role === "admin") {
      setEmail("admin@astu.edu.et");
      setPassword("admin1234");
    } else if (role === "researcher") {
      setEmail("researcher@astu.edu.et");
      setPassword("research1234");
    } else {
      setEmail("viewer@astu.edu.et");
      setPassword("viewer1234");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080d14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: 420,
          background: "#0f1824",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 12px",
            }}
          >
            🎓
          </div>
          <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>ASTU Research Hub</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Unified Telemetry & Analytics Platform
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Academic Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#e2e8f0",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#e2e8f0",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <Btn type="submit" disabled={loading} variant="primary" style={{ marginTop: 8 }}>
            {loading ? "Authenticating session..." : "Sign In to Portal"}
          </Btn>
        </form>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748b", fontSize: 11, textAlign: "center", margin: "0 0 10px" }}>
            FAST DEMO CREDS (Adama Science and Technology University)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => handlePreload("admin")}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "6px 12px",
                color: "#94a3b8",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "between",
              }}
            >
              <span>🔑 Admin: admin@astu.edu.et</span>
              <span style={{ marginLeft: "auto", color: "#64748b" }}>admin1234</span>
            </button>
            <button
              onClick={() => handlePreload("researcher")}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "6px 12px",
                color: "#94a3b8",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "between",
              }}
            >
              <span>🔬 Researcher: researcher@astu.edu.et</span>
              <span style={{ marginLeft: "auto", color: "#64748b" }}>research1234</span>
            </button>
            <button
              onClick={() => handlePreload("viewer")}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "6px 12px",
                color: "#94a3b8",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "between",
              }}
            >
              <span>👀 Viewer: viewer@astu.edu.et</span>
              <span style={{ marginLeft: "auto", color: "#64748b" }}>viewer1234</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
