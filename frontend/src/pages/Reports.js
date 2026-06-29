import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/ui";

import { getServiceUrl } from "../config/api";

const API = getServiceUrl("analytics");

const ReportCard = ({ title, desc, icon, color, onGenerate, loading }) => (
  <div style={{ background:"#162030", border:`1px solid ${color}25`, borderRadius:14, padding:24 }}>
    <div style={{ width:52, height:52, borderRadius:14, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:16 }}>{icon}</div>
    <h3 style={{ color:"#e2e8f0", fontSize:16, fontWeight:700, margin:"0 0 8px" }}>{title}</h3>
    <p style={{ color:"#64748b", fontSize:13, margin:"0 0 20px", lineHeight:1.6 }}>{desc}</p>
    <button onClick={onGenerate} disabled={loading}
      style={{ background:`${color}20`, border:`1px solid ${color}40`, borderRadius:8, padding:"10px 20px", color, fontSize:13, fontWeight:600, cursor:loading?"wait":"pointer", fontFamily:"inherit", opacity:loading?0.6:1, width:"100%" }}>
      {loading ? "Generating…" : "Generate & Download"}
    </button>
  </div>
);

export default function Reports() {
  const { token } = useAuth();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [msg,        setMsg]        = useState("");

  const downloadPDF = async (type = "full") => {
    setPdfLoading(true); setMsg("");
    try {
      const res = await fetch(`${API}/api/report?type=${type}`, { headers:{ Authorization:`Bearer ${token}` }});
      if (!res.ok) throw new Error("Report generation failed. Ensure all services are running.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      let downloadName = `ASTU_Analytics_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      if (type === "research") downloadName = `ASTU_Research_Summary_${new Date().toISOString().slice(0,10)}.pdf`;
      if (type === "community") downloadName = `ASTU_Community_Impact_Report_${new Date().toISOString().slice(0,10)}.pdf`;

      const a = document.createElement("a");
      a.href = url; a.download = downloadName;
      a.click(); URL.revokeObjectURL(url);
      setMsg("success:Report downloaded successfully.");
    } catch(e){ setMsg("error:" + e.message); }
    finally { setPdfLoading(false); }
  };

  const downloadCSV = async () => {
    setCsvLoading(true); setMsg("");
    try {
      const res = await fetch(`${API}/api/export`, { headers:{ Authorization:`Bearer ${token}` }});
      if (!res.ok) throw new Error("Export failed. Ensure all services are running.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ASTU_Projects_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      setMsg("success:Data exported successfully.");
    } catch(e){ setMsg("error:" + e.message); }
    finally { setCsvLoading(false); }
  };

  const isSuccess = msg.startsWith("success:");
  const msgText   = msg.replace(/^(success|error):/, "");

  return (
    <div>
      <PageHeader title="Reports" sub="Generate and download official ASTU analytics reports" />

      {msg && (
        <div style={{ background: isSuccess ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border:`1px solid ${isSuccess?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`, borderRadius:10, padding:"12px 18px", marginBottom:20, color: isSuccess?"#4ade80":"#f87171", fontSize:14 }}>
          {isSuccess ? "✅" : "❌"} {msgText}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18, marginBottom:32 }}>
        <ReportCard
          title="Full Analytics Report (PDF)"
          desc="A comprehensive report covering all active research and community projects, funding distribution, college statistics, and researcher data. Formatted for official university documentation."
          icon="📄" color="#ef4444"
          onGenerate={() => downloadPDF("full")} loading={pdfLoading}
        />
        <ReportCard
          title="Projects Data Export (CSV)"
          desc="Exports the complete project dataset in CSV format, compatible with Microsoft Excel and Google Sheets. Includes all project fields across both research and community categories."
          icon="📊" color="#34d399"
          onGenerate={downloadCSV} loading={csvLoading}
        />
        <ReportCard
          title="Research Summary (PDF)"
          desc="A focused report on research activities — covering funding sources, publication counts, team compositions, and project status. Suitable for submission to the Research Excellence Office."
          icon="🔬" color="#38bdf8"
          onGenerate={() => downloadPDF("research")} loading={pdfLoading}
        />
        <ReportCard
          title="Community Impact Report (PDF)"
          desc="Details the university's community outreach performance, including beneficiaries reached, volunteer involvement, geographic coverage, and budget utilisation across all active programmes."
          icon="👥" color="#a78bfa"
          onGenerate={() => downloadPDF("community")} loading={pdfLoading}
        />
      </div>

      <div style={{ background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)", borderRadius:12, padding:"20px 24px" }}>
        <h3 style={{ color:"#22d3ee", fontSize:14, fontWeight:700, margin:"0 0 10px" }}>Report Notes</h3>
        <ul style={{ color:"#64748b", fontSize:13, lineHeight:1.9, paddingLeft:20, margin:0 }}>
          <li>All reports reflect live data from the database at the time of generation.</li>
          <li>PDF reports follow standard university documentation formatting.</li>
          <li>CSV files can be opened directly in Microsoft Excel or Google Sheets for further analysis.</li>
          <li>Reports are generated in real time — no caching is applied.</li>
        </ul>
      </div>
    </div>
  );
}
