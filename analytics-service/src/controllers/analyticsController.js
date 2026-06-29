const { getAggregatedAnalytics } = require("../services/aggregatorService");
const PDFDocument = require("pdfkit");

// GET /api/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = await getAggregatedAnalytics(token);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(502).json({ success: false, message: "Failed to fetch from upstream services.", detail: err.message });
  }
};

// GET /api/export  — download CSV of all projects
exports.exportCSV = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { researchProjects, communityProjects } = await getAggregatedAnalytics(token);
    const all = [
      ...researchProjects.map(p => ({ ...p, source: "Research" })),
      ...communityProjects.map(p => ({ ...p, source: "Community", fundingETB: p.budgetETB })),
    ];
    const headers = ["id", "title", "lead", "college", "status", "startDate", "endDate", "fundingETB", "source"];
    const rows = all.map(p => headers.map(h => `"${(p[h]||"").toString().replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=ASTU_Projects_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/report  — generate PDF report
exports.generatePDF = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = await getAggregatedAnalytics(token);
    const { summary, byStatus, byCollege, researchProjects, communityProjects } = data;

    const type = req.query.type || "full";
    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `ASTU_Analytics_Report_${dateStr}.pdf`;
    let reportTitle = "ASTU University Analytics Report";

    if (type === "research") {
      filename = `ASTU_Research_Summary_${dateStr}.pdf`;
      reportTitle = "ASTU Research Activities & Funding Summary";
    } else if (type === "community") {
      filename = `ASTU_Community_Impact_Report_${dateStr}.pdf`;
      reportTitle = "ASTU Community Outreach & Impact Report";
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text(reportTitle, { align: "center" });
    doc.fontSize(11).font("Helvetica").fillColor("#555")
       .text(`Adama Science and Technology University`, { align: "center" })
       .text(`Generated: ${new Date().toLocaleDateString("en-ET", { dateStyle: "full" })}`, { align: "center" });
    doc.moveDown(1.5);

    if (type === "research") {
      // Research summary stats
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Research Portfolio Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      
      const researchFunding = researchProjects.reduce((sum, p) => sum + (p.fundingETB || 0), 0);
      const researchRows = [
        ["Total Research Projects", researchProjects.length],
        ["Total Research Funding (ETB)", researchFunding.toLocaleString()],
        ["Total Publications", summary.totalPublications],
        ["Average Publications/Project", researchProjects.length > 0 ? (summary.totalPublications / researchProjects.length).toFixed(1) : 0],
      ];
      researchRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1.5);

      // Projects List
      doc.fontSize(14).font("Helvetica-Bold").text("Research Projects List");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      researchProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i+1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
           .text(`Lead: ${p.lead || "N/A"}  |  College: ${p.college || "N/A"}  |  Status: ${p.status || "N/A"}  |  Funding: ETB ${(p.fundingETB||0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });

    } else if (type === "community") {
      // Community summary stats
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Community Outreach Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      
      const communityBudget = communityProjects.reduce((sum, p) => sum + (p.budgetETB || 0), 0);
      const communityRows = [
        ["Total Outreach Projects", communityProjects.length],
        ["Total Allocated Budget (ETB)", communityBudget.toLocaleString()],
        ["Total Beneficiaries Reached", summary.totalBeneficiaries.toLocaleString()],
        ["Total Student Volunteers Engaged", summary.totalVolunteers.toLocaleString()],
      ];
      communityRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#333").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1.5);

      // Projects List
      doc.fontSize(14).font("Helvetica-Bold").text("Outreach Projects List");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      communityProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i+1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
           .text(`Lead: ${p.lead || "N/A"}  |  Location: ${p.location||"Adama"}  |  Beneficiaries: ${(p.beneficiaries||0).toLocaleString()}  |  Budget: ETB ${(p.budgetETB||0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });

    } else {
      // Comprehensive Full Report
      // Summary section
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Executive Summary");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      const summaryRows = [
        ["Total Projects",       summary.totalProjects],
        ["Research Projects",    summary.researchCount],
        ["Community Projects",   summary.communityCount],
        ["Active Colleges",      summary.activeColleges],
        ["Total Funding (ETB)",  summary.totalFundingETB.toLocaleString()],
        ["Total Publications",   summary.totalPublications],
        ["People Benefited",     summary.totalBeneficiaries.toLocaleString()],
        ["Volunteers Engaged",   summary.totalVolunteers],
      ];
      summaryRows.forEach(([label, value]) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(String(value));
      });
      doc.moveDown(1);

      // Status breakdown
      doc.fontSize(14).font("Helvetica-Bold").text("Project Status Breakdown");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      Object.entries(byStatus).forEach(([status, count]) => {
        doc.fontSize(11).font("Helvetica").text(`${status.charAt(0).toUpperCase()+status.slice(1)}: ${count} projects`);
      });
      doc.moveDown(1);

      // Projects by college
      doc.fontSize(14).font("Helvetica-Bold").text("Projects by College");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      Object.entries(byCollege).sort((a,b) => b[1]-a[1]).forEach(([college, count]) => {
        doc.fontSize(10).font("Helvetica").text(`${college}: ${count}`);
      });
      doc.moveDown(1);

      // Research projects list
      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Research Projects");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      researchProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i+1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
           .text(`Lead: ${p.lead || "N/A"}  |  College: ${p.college || "N/A"}  |  Status: ${p.status || "N/A"}  |  Funding: ETB ${(p.fundingETB||0).toLocaleString()}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });

      // Community projects list
      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Community Projects");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#ddd").moveDown(0.5);
      communityProjects.forEach((p, i) => {
        doc.fontSize(11).font("Helvetica-Bold").text(`${i+1}. ${p.title || "Untitled"}`);
        doc.fontSize(10).font("Helvetica").fillColor("#444")
           .text(`Lead: ${p.lead || "N/A"}  |  Location: ${p.location||"Adama"}  |  Beneficiaries: ${(p.beneficiaries||0).toLocaleString()}  |  Status: ${p.status || "N/A"}`);
        if (p.summary) doc.fontSize(9).fillColor("#666").text(p.summary, { width: 500 });
        doc.fillColor("#000").moveDown(0.5);
      });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation failed:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: "PDF generation failed", detail: err.message });
    }
  }
};
