import React, { useState, useEffect } from "react";
import { getServiceUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Loader, ErrorMsg, Btn } from "../components/ui";

interface Researcher {
  _id: string;
  name: string;
  title: string;
  college: string;
  department: string;
  email: string;
  specialization: string[];
  publications: number;
  activeProjects: number;
}

export default function Researchers() {
  const { token } = useAuth();
  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");

  const apiBase = getServiceUrl("college");

  useEffect(() => {
    fetchResearchers();
  }, [collegeFilter]);

  const fetchResearchers = async () => {
    setLoading(true);
    try {
      let url = `${apiBase}/api/researchers?`;
      if (collegeFilter) url += `college=${encodeURIComponent(collegeFilter)}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setResearchers(d.researchers);
      } else {
        throw new Error(d.message || "Failed to load researchers registry.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchResearchers();
    }
  };

  return (
    <div>
      <PageHeader
        title="ASTU Researcher & Scholar Registry"
        sub="Browse the faculty members, principal investigators, and scholars leading scientific breakthroughs at ASTU."
      />

      {/* Filter bar */}
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
            placeholder="Search researcher names or specialities... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyPress}
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

        <Btn onClick={fetchResearchers} variant="secondary" small>
          🔍 Apply Filter
        </Btn>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorMsg message={error} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {researchers.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, background: "#162030", borderRadius: 14 }}>
              <p style={{ color: "#64748b", margin: 0 }}>No researchers found matching specified query.</p>
            </div>
          ) : (
            researchers.map((r) => (
              <div
                key={r._id}
                style={{
                  background: "#162030",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #1d4ed8, #06b6d4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {r.name?.[r.title ? r.title.length + 1 : 0] || r.name?.[0]}
                    </div>
                    <div>
                      <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, margin: 0 }}>
                        {r.title} {r.name}
                      </h3>
                      <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0" }}>
                        {r.department} • {r.college.replace("College of ", "")}
                      </p>
                    </div>
                  </div>

                  <p style={{ color: "#94a3b8", fontSize: 12.5, margin: "14px 0 0" }}>
                    ✉️ <a href={`mailto:${r.email}`} style={{ color: "#22d3ee", textDecoration: "none" }}>{r.email}</a>
                  </p>

                  <div style={{ marginTop: 14 }}>
                    <span style={{ color: "#475569", fontSize: 9.5, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                      Specializations
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {r.specialization?.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 4,
                            fontSize: 10,
                            padding: "2px 6px",
                            color: "#94a3b8",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#64748b" }}>
                    Publications: <strong style={{ color: "#cbd5e1" }}>{r.publications}</strong>
                  </span>
                  <span style={{ color: "#64748b" }}>
                    Active projects: <strong style={{ color: "#22d3ee" }}>{r.activeProjects}</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
