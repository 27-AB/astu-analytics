import React, { useState, useEffect } from "react";
import { getServiceUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Loader, ErrorMsg, SectionCard } from "../components/ui";

interface College {
  _id: string;
  name: string;
  shortName: string;
  dean: string;
  established: number;
  departments: string[];
  description: string;
  color: string;
}

export default function Colleges() {
  const { token } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${getServiceUrl("college")}/api/colleges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setColleges(d.colleges);
      } else {
        throw new Error(d.message || "Failed to load colleges telemetry.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMsg message={error} />;

  return (
    <div>
      <PageHeader
        title="ASTU Academic Colleges & Centres"
        sub="Explore the academic units powering Adama Science and Technology University's technical research and regional leadership."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
        {colleges.map((c) => (
          <div
            key={c._id}
            style={{
              background: "#162030",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Color Accent Pill */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 4,
                background: c.color || "#3b82f6",
              }}
            />

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", gap: 12, marginBottom: 8 }}>
                <span
                  style={{
                    background: `${c.color || "#3b82f6"}20`,
                    color: c.color || "#3b82f6",
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                  }}
                >
                  {c.shortName}
                </span>
                <span style={{ color: "#475569", fontSize: 11, fontWeight: 500 }}>Est. {c.established}</span>
              </div>

              <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.3 }}>
                {c.name}
              </h3>

              <p style={{ color: "#94a3b8", fontSize: 12.5, margin: "0 0 16px", lineHeight: 1.4 }}>
                {c.description || "No academic domain prospectus cataloged."}
              </p>

              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: "#64748b" }}>Dean of College:</span>
                  <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{c.dean}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>Academic Programs:</span>
                  <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{c.departments?.length || 0} Departments</span>
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".05em", display: "block", marginBottom: 8 }}>
                Departmental Specialities
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {c.departments?.map((dep, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 4,
                      fontSize: 10,
                      padding: "3px 6px",
                      color: "#94a3b8",
                    }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
