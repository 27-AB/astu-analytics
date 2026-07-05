import React, { useState } from "react";
import { PageHeader, SectionCard, Btn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { getServiceUrl } from "../config/api";

export default function Reports() {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  const analyticsUrl = getServiceUrl("analytics");

  const handleDownloadPDF = async (type: "full" | "research" | "community") => {
    setDownloading(type);
    try {
      const response = await fetch(`${analyticsUrl}/api/api/report?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to generate report.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ASTU_${type}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert("Error compiling report: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCSV = async () => {
    setDownloading("csv");
    try {
      const response = await fetch(`${analyticsUrl}/api/api/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to export telemetry spreadsheet.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ASTU_Projects_Portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert("Error exporting CSV: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="ASTU Research Reports & Export Engine"
        sub="Compile real-time analytical bulletins, download certified PDF folders, or export raw CSV databases to load into SPSS or Excel."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {/* Full Executive summary card */}
        <SectionCard title="Full Executive Audit (PDF)">
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4, margin: "0 0 18px" }}>
            Generates a high-quality PDF containing complete executive metrics, academic college rankings, active project ledgers, and community volunteer counts.
          </p>
          <Btn
            onClick={() => handleDownloadPDF("full")}
            disabled={downloading !== null}
            variant={downloading === "full" ? "secondary" : "primary"}
            style={{ width: "100%" }}
          >
            {downloading === "full" ? "Compiling PDF..." : "📥 Download Full PDF"}
          </Btn>
        </SectionCard>

        {/* Scientific Research card */}
        <SectionCard title="Research Portfolio Summary (PDF)">
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4, margin: "0 0 18px" }}>
            Generates a targeted report focusing on active principal investigators, engineering grant allocations, center of excellence participation, and publication indices.
          </p>
          <Btn
            onClick={() => handleDownloadPDF("research")}
            disabled={downloading !== null}
            variant={downloading === "research" ? "secondary" : "primary"}
            style={{ width: "100%" }}
          >
            {downloading === "research" ? "Compiling PDF..." : "📥 Download Research PDF"}
          </Btn>
        </SectionCard>

        {/* Community outreach card */}
        <SectionCard title="Community Impact Folder (PDF)">
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4, margin: "0 0 18px" }}>
            Generates a targeted brochure demonstrating student volunteer hours, beneficiary counts by Kebele, location directories, and logged social impacts.
          </p>
          <Btn
            onClick={() => handleDownloadPDF("community")}
            disabled={downloading !== null}
            variant={downloading === "community" ? "secondary" : "primary"}
            style={{ width: "100%" }}
          >
            {downloading === "community" ? "Compiling PDF..." : "📥 Download Outreach PDF"}
          </Btn>
        </SectionCard>

        {/* Raw Spreadsheet csv */}
        <SectionCard title="Spreadsheet Export (CSV)">
          <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.4, margin: "0 0 18px" }}>
            Exports raw project ledgers, start dates, budgets, and status keys formatted directly for analytical tools like Microsoft Excel, R, or Python Pandas.
          </p>
          <Btn
            onClick={handleDownloadCSV}
            disabled={downloading !== null}
            variant="success"
            style={{ width: "100%" }}
          >
            {downloading === "csv" ? "Exporting Spreadsheet..." : "📊 Export Raw CSV Database"}
          </Btn>
        </SectionCard>
      </div>
    </div>
  );
}
