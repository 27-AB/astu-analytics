import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getServiceUrl } from "../config/api";
import { PageHeader, SectionCard, Btn, ErrorMsg } from "../components/ui";

export default function Settings() {
  const { user, token, updateSession } = useAuth();

  // Profile Form state
  const [name, setName] = useState(user?.name || "");
  const [college, setCollege] = useState(user?.college || "");
  const [password, setPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // System Stats
  const [sysHealth, setSysHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Seeding button states
  const [seedingUsers, setSeedingUsers] = useState(false);
  const [seedingProjects, setSeedingProjects] = useState(false);
  const [seedingColleges, setSeedingColleges] = useState(false);

  const authUrl = getServiceUrl("auth");
  const researchUrl = getServiceUrl("research");

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`${authUrl}/api/health`);
      const d = await res.json();
      setSysHealth(d);
    } catch (err) {
      console.warn("Could not load health metrics.");
    } finally {
      setHealthLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);
    try {
      const payload: any = { name, college };
      if (password) payload.password = password;

      const res = await fetch(`${authUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setProfileSuccess("Academic credentials updated successfully.");
        updateSession(d.token, d.user);
        setPassword("");
      } else {
        alert(d.message || "Failed to update profile.");
      }
    } catch (err: any) {
      alert("Profile edit network error: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSeedUsers = async () => {
    setSeedingUsers(true);
    try {
      const res = await fetch(`${authUrl}/api/auth/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      alert(d.message || "Users seeded successfully!");
      fetchSystemHealth();
    } catch (err) {
      alert("Seeding failed.");
    } finally {
      setSeedingUsers(false);
    }
  };

  const handleSeedProjects = async () => {
    setSeedingProjects(true);
    try {
      // Seed research
      const res1 = await fetch(`${researchUrl}/api/projects/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Seed community
      const res2 = await fetch(`${getServiceUrl("community")}/api/community-projects/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res1.ok && res2.ok) {
        alert("Research & Outreach repositories seeded successfully with correct ASTU demo data!");
      } else {
        alert("Seeding partial error.");
      }
    } catch (err) {
      alert("Seeding failed.");
    } finally {
      setSeedingProjects(false);
    }
  };

  const handleSeedColleges = async () => {
    setSeedingColleges(true);
    try {
      const res = await fetch(`${getServiceUrl("college")}/api/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      alert(d.message || "Colleges & Researchers seeded successfully!");
    } catch (err) {
      alert("Seeding failed.");
    } finally {
      setSeedingColleges(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings & System Governance"
        sub="Update your profile credentials, inspect live microservice databases, and deploy official ASTU seeds."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        {/* Profile Card */}
        <SectionCard title="Edit Academic Profile">
          {profileSuccess && (
            <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              ✔ {profileSuccess}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Academic Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            <div>
              <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                College / Division
              </label>
              <input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
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

            <div>
              <label style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Update Password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

            <Btn type="submit" variant="primary" disabled={profileLoading} style={{ marginTop: 6 }}>
              {profileLoading ? "Updating database..." : "Update Credentials"}
            </Btn>
          </form>
        </SectionCard>

        {/* Microservice Governance & Seeding */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Governance Telemetry */}
          <SectionCard title="Microservice Telemetry & Cache">
            {healthLoading ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>Inquiring gateway status...</p>
            ) : sysHealth ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Active Environment:</span>
                  <span style={{ color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>{sysHealth.environment}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Persistent Storage:</span>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>{sysHealth.database}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Gemini AI Core (3.5-Flash):</span>
                  <span style={{ color: sysHealth.aiEnabled ? "#34d399" : "#f87171", fontWeight: 700 }}>
                    {sysHealth.aiEnabled ? "🟢 ONLINE" : "🔴 OFF-GRID FALLBACK"}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: "#f87171", fontSize: 13 }}>Gateway unreachable.</p>
            )}
          </SectionCard>

          {/* Seeds Panel (Admin Only) */}
          {user?.role === "admin" && (
            <SectionCard title="Database Seeding & Restores">
              <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 16px", lineHeight: 1.4 }}>
                Restore or update the initial ASTU repositories. This action writes pre-configured colleges, 14 researchers, projects, and proposals directly into active records.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Btn onClick={handleSeedUsers} disabled={seedingUsers} variant="secondary" small>
                  {seedingUsers ? "Seeding..." : "🔑 Restore Default Admin/Faculty Logins"}
                </Btn>
                <Btn onClick={handleSeedColleges} disabled={seedingColleges} variant="secondary" small>
                  {seedingColleges ? "Seeding..." : "🏛️ Re-index 6 Colleges & 14 Faculty Scientists"}
                </Btn>
                <Btn onClick={handleSeedProjects} disabled={seedingProjects} variant="secondary" small>
                  {seedingProjects ? "Seeding..." : "🔬 Restore 12 Research & 8 Community Tracks"}
                </Btn>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
