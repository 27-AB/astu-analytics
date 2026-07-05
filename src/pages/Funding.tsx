import React from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { PageHeader, StatCard, SectionCard, Loader, ErrorMsg, fmtETB } from "../components/ui";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function Funding() {
  const { data, loading, error } = useAnalytics();

  if (loading) return <Loader />;
  if (error) return <ErrorMsg message={error} />;

  const summary = data?.summary || { totalFundingETB: 0, researchCount: 0, communityCount: 0 };
  const researchProjects = data?.researchProjects || [];

  // Compute stats
  const totalFunding = summary.totalFundingETB;
  const avgGrant = researchProjects.length > 0 ? totalFunding / researchProjects.length : 0;

  // Group by funding sources
  const sourceGrouping = researchProjects.reduce((acc: any, p: any) => {
    const src = p.fundingSource || "ASTU Internal";
    acc[src] = (acc[src] || 0) + (p.fundingETB || 0);
    return acc;
  }, {});

  const sourceChartData = Object.entries(sourceGrouping).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

  return (
    <div>
      <PageHeader
        title="ASTU Grants, Budgets & Funding Tracks"
        sub="Financial auditing suite summarizing institutional research grants, international fellowships, and community project accounts."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, marginBottom: 28 }}>
        <StatCard title="Total Sourced Capital" value={fmtETB(totalFunding)} sub="Aggregated university & external grants" icon="💰" color="#10b981" />
        <StatCard title="Average Research Grant" value={fmtETB(Math.round(avgGrant))} sub="Per Principal Investigator track" icon="📈" color="#3b82f6" />
        <StatCard title="Highest Sourced Grant" value="ETB 3.2M" sub="Aluto-Langano Geothermal Survey" icon="🏆" color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        {/* Funding by Source Pie Chart */}
        <SectionCard title="Resource Allocation by Funding Entity">
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sourceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`ETB ${Number(value).toLocaleString()}`, "Allocated"]}
                  contentStyle={{ background: "#0f1824", borderColor: "rgba(255,255,255,0.1)", borderRadius: 10 }}
                />
                <Legend verticalAlign="bottom" height={40} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Top Budgets Table */}
        <SectionCard title="Major Funded Research Initiatives">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {researchProjects
              .filter((p: any) => p.fundingETB > 0)
              .sort((a: any, b: any) => b.fundingETB - a.fundingETB)
              .slice(0, 5)
              .map((p: any, idx: number) => (
                <div
                  key={p._id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                      PI: {p.lead} • {p.fundingSource}
                    </div>
                  </div>
                  <span style={{ color: "#10b981", fontSize: 14, fontWeight: 700 }}>
                    {fmtETB(p.fundingETB)}
                  </span>
                </div>
              ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
