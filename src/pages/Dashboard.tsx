import React, { useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { PageHeader, StatCard, SectionCard, Badge, Loader, ErrorMsg, fmtETB, Btn } from "../components/ui";
import { getServiceUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

export default function Dashboard() {
  const { data, loading, error, refetch } = useAnalytics();
  const { token } = useAuth();
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, { amharic?: string; oromoo?: string }>>({});

  const handleTranslate = async (projId: string, text: string, lang: "Amharic" | "Oromoo") => {
    if (!text) return;
    setTranslatingId(`${projId}_${lang}`);
    try {
      const res = await fetch(`${getServiceUrl("analytics")}/api/ai/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, targetLang: lang }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setTranslations((prev) => ({
          ...prev,
          [projId]: {
            ...prev[projId],
            [lang.toLowerCase() === "amharic" ? "amharic" : "oromoo"]: d.translatedText,
          },
        }));
      } else {
        alert(d.message || "Translation failed.");
      }
    } catch (err) {
      alert("Translation server connection error.");
    } finally {
      setTranslatingId(null);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMsg message={error} />;

  const summary = data?.summary || {
    totalProjects: 0,
    researchCount: 0,
    communityCount: 0,
    activeColleges: 0,
    totalFundingETB: 0,
    totalPublications: 0,
    totalBeneficiaries: 0,
    totalVolunteers: 0,
    activeRatePct: 0,
  };

  const chartData = data?.yearlyTrendSeries || [];
  const collegeDataRaw = data?.byCollege || {};
  const collegeChartData = Object.entries(collegeDataRaw).map(([name, val]) => ({
    name: name.replace("College of ", ""),
    count: val,
  }));

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ef4444"];

  return (
    <div>
      <PageHeader
        title="ASTU Telemetry & Research Analytics"
        sub="Unified analytical view of Adama Science and Technology University research, community initiatives, and intellectual output."
        actions={
          <Btn onClick={refetch} variant="secondary">
            🔄 Refresh Feeds
          </Btn>
        }
      />

      {/* Grid Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 28 }}>
        <StatCard title="Active Research Projects" value={summary.researchCount} sub="High-impact engineering/applied science" icon="🔬" color="#3b82f6" />
        <StatCard title="Community Initiatives" value={summary.communityCount} sub="Social impact & civic tech" icon="👥" color="#10b981" />
        <StatCard title="Portfolio Value" value={fmtETB(summary.totalFundingETB)} sub="Acquired grant & university funding" icon="💰" color="#f59e0b" />
        <StatCard title="Total Publications" value={summary.totalPublications} sub="Registered peer-reviewed papers" icon="📄" color="#8b5cf6" />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 24, marginBottom: 28 }}>
        {/* Trend Area Chart */}
        <SectionCard title="Yearly Project Intake & Resource Trends">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorResearch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCommunity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#0f1824", borderColor: "rgba(255,255,255,0.1)", borderRadius: 10 }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="research" name="Research Projects" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorResearch)" />
                <Area type="monotone" dataKey="community" name="Community Projects" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCommunity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Bar Chart by College */}
        <SectionCard title="Active Projects Distribution by College">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={collegeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} interval={0} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#0f1824", borderColor: "rgba(255,255,255,0.1)", borderRadius: 10 }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="count" name="Projects Count" radius={[4, 4, 0, 0]}>
                  {collegeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Recent Activity Table and Synergy Board */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <SectionCard title="Recent Activity Feed & Live Multilingual Translation">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#cbd5e1", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textTransform: "uppercase", fontSize: 11, color: "#64748b", letterSpacing: ".05em" }}>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>Project Details</th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>Lead Investigator</th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>Budget / Resource</th>
                  <th style={{ textAlign: "left", padding: "12px 10px" }}>Focus tags</th>
                  <th style={{ textAlign: "right", padding: "12px 10px" }}>Gemini Translation</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentProjects?.slice(0, 6).map((proj: any, idx: number) => {
                  const hasTrans = translations[proj._id];
                  return (
                    <React.Fragment key={proj._id || idx}>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "14px 10px" }}>
                          <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{proj.title}</div>
                          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
                            {proj.college} • <span style={{ color: "#3b82f6" }}>{proj.source === "research" ? "Research" : "Community"}</span>
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: 11.5, marginTop: 6, maxWidth: 420, lineHeight: 1.4 }}>
                            {proj.summary || "No summary provided."}
                          </div>
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{proj.lead}</span>
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>
                            {proj.fundingETB !== undefined ? fmtETB(proj.fundingETB) : fmtETB(proj.budgetETB || 0)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {proj.tags?.slice(0, 3).map((t: string, i: number) => (
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
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Btn
                              small
                              variant="secondary"
                              onClick={() => handleTranslate(proj._id, proj.summary || proj.title, "Amharic")}
                              disabled={translatingId === `${proj._id}_Amharic`}
                              style={{ padding: "4px 8px" }}
                            >
                              {translatingId === `${proj._id}_Amharic` ? "..." : "አማርኛ"}
                            </Btn>
                            <Btn
                              small
                              variant="secondary"
                              onClick={() => handleTranslate(proj._id, proj.summary || proj.title, "Oromoo")}
                              disabled={translatingId === `${proj._id}_Oromoo`}
                              style={{ padding: "4px 8px" }}
                            >
                              {translatingId === `${proj._id}_Oromoo` ? "..." : "Oromoo"}
                            </Btn>
                          </div>
                        </td>
                      </tr>

                      {/* Display active Gemini Translations */}
                      {(hasTrans?.amharic || hasTrans?.oromoo) && (
                        <tr style={{ background: "rgba(6,182,212,0.02)" }}>
                          <td colSpan={5} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {hasTrans.amharic && (
                                <div style={{ fontSize: 12, color: "#22d3ee" }}>
                                  🇪🇹 <strong>የአማርኛ ትርጉም (Gemini AI):</strong> {hasTrans.amharic}
                                </div>
                              )}
                              {hasTrans.oromoo && (
                                <div style={{ fontSize: 12, color: "#a78bfa" }}>
                                  🌿 <strong>Hiika Afaan Oromoo (Gemini AI):</strong> {hasTrans.oromoo}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
