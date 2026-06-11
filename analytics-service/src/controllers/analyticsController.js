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

// GET /api/report  — generate full analytics PDF report
exports.generatePDF = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Report generation request received from user: ${req.user?.id || 'unknown'}`);
    const token = req.headers.authorization?.split(" ")[1];
    const data = await getAggregatedAnalytics(token);
    const { summary, byStatus, byCollege, researchProjects, communityProjects, yearlyTrend } = data;

    if (!summary) {
      console.error(`[${new Date().toISOString()}] Report generation failed: Unable to fetch analytics data`);
      throw new Error("Unable to fetch analytics data. Some services may be unavailable.");
    }

    console.log(`[${new Date().toISOString()}] Generating PDF report with ${researchProjects?.length || 0} research projects and ${communityProjects?.length || 0} community projects`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ASTU_Analytics_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    // ========== COVER PAGE ==========
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#1e40af").text("COMPREHENSIVE ANALYTICS REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor("#334155").text("Adama Science and Technology University", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#64748b")
       .text("Office of Research and Innovation", { align: "center" })
       .text(`Report Period: ${new Date().getFullYear()}`, { align: "center" })
       .text(`Generated: ${new Date().toLocaleDateString("en-ET", { dateStyle: "full" })}`, { align: "center" });
    
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#475569").text("This report provides a comprehensive overview of all research and community engagement activities at ASTU, including funding distribution, project outcomes, and institutional impact metrics.", { align: "center", width: 450 });
    
    // ========== EXECUTIVE SUMMARY ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#000").text("EXECUTIVE SUMMARY");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#1e40af").moveDown(1);
    
    // Key metrics in a grid layout
    doc.fontSize(12).font("Helvetica").fillColor("#334155")
       .text("This comprehensive analytics report covers the complete portfolio of academic and community initiatives at ASTU. The data reflects active research programs, community outreach efforts, and their measurable impact on society.", { width: 500 });
    doc.moveDown(1);

    const metrics = [
      { label: "Total Active Initiatives", value: summary.totalProjects, color: "#3b82f6" },
      { label: "Research Projects", value: summary.researchCount, color: "#8b5cf6" },
      { label: "Community Outreach", value: summary.communityCount, color: "#10b981" },
      { label: "Participating Colleges", value: summary.activeColleges, color: "#f59e0b" },
      { label: "Total Investment (ETB)", value: summary.totalFundingETB.toLocaleString(), color: "#ef4444" },
      { label: "Academic Publications", value: summary.totalPublications, color: "#06b6d4" },
      { label: "Community Beneficiaries", value: summary.totalBeneficiaries.toLocaleString(), color: "#84cc16" },
      { label: "Volunteer Engagement", value: summary.totalVolunteers, color: "#ec4899" },
    ];

    metrics.forEach((metric, idx) => {
      if (idx % 2 === 0 && idx > 0) doc.moveDown(0.5);
      const x = idx % 2 === 0 ? 50 : 305;
      doc.rect(x, doc.y, 250, 40).fillAndStroke(metric.color + "15", metric.color + "50");
      doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(metric.label, x + 10, doc.y + 10, { width: 230 });
      doc.fontSize(16).font("Helvetica-Bold").fillColor(metric.color).text(String(metric.value), x + 10, doc.y + 25, { width: 230 });
      if (idx % 2 === 0) doc.y -= 40;
    });
    doc.moveDown(3);

    // Key insights based on data
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Key Insights & Highlights");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#cbd5e1").moveDown(0.5);
    
    const activeRate = summary.totalProjects > 0 ? ((byStatus.active || 0) / summary.totalProjects * 100).toFixed(1) : 0;
    const completionRate = summary.totalProjects > 0 ? ((byStatus.completed || 0) / summary.totalProjects * 100).toFixed(1) : 0;
    const avgFundingPerProject = summary.researchCount > 0 ? (summary.totalFundingETB / summary.researchCount).toFixed(0) : 0;
    const avgPublicationsPerProject = summary.researchCount > 0 ? (summary.totalPublications / summary.researchCount).toFixed(1) : 0;
    
    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`• Project Portfolio Health: ${activeRate}% of projects are currently active, with a ${completionRate}% completion rate demonstrating strong project management and delivery capabilities.`, { width: 500, lineGap: 3 });
    doc.text(`• Research Investment Efficiency: Average funding per research project is ETB ${parseInt(avgFundingPerProject).toLocaleString()}, with an average output of ${avgPublicationsPerProject} publications per project.`, { width: 500, lineGap: 3 });
    doc.text(`• Community Impact Scale: ${summary.totalBeneficiaries.toLocaleString()} community members have benefited from ${summary.communityCount} outreach initiatives, supported by ${summary.totalVolunteers} volunteer hours.`, { width: 500, lineGap: 3 });
    
    const topCollege = Object.entries(byCollege).sort((a,b) => b[1]-a[1])[0];
    if (topCollege) {
      doc.text(`• Leading College: ${topCollege[0]} leads with ${topCollege[1]} active projects, representing ${(topCollege[1]/summary.totalProjects*100).toFixed(1)}% of total university initiatives.`, { width: 500, lineGap: 3 });
    }

    // ========== PROJECT STATUS ANALYSIS ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("PROJECT STATUS ANALYSIS");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#1e40af").moveDown(1);

    doc.fontSize(11).font("Helvetica").fillColor("#334155")
       .text("The following breakdown provides insights into project lifecycle management and completion rates across all institutional initiatives.", { width: 500 });
    doc.moveDown(1);

    const statusColors = {
      active: "#10b981",
      completed: "#3b82f6",
      paused: "#f59e0b",
      planned: "#8b5cf6",
      under_review: "#06b6d4",
      rejected: "#ef4444"
    };

    Object.entries(byStatus).sort((a,b) => b[1]-a[1]).forEach(([status, count]) => {
      const percentage = ((count / summary.totalProjects) * 100).toFixed(1);
      const color = statusColors[status] || "#64748b";
      const barWidth = (count / summary.totalProjects) * 400;
      
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000")
         .text(`${status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}`, 50, doc.y);
      doc.fontSize(10).font("Helvetica").fillColor("#64748b")
         .text(`${count} projects (${percentage}%)`, 200, doc.y - 11);
      
      doc.rect(50, doc.y + 5, barWidth, 12).fill(color + "50");
      doc.rect(50, doc.y + 5, barWidth, 12).stroke(color);
      doc.moveDown(1.5);
    });

    // ========== COLLEGE DISTRIBUTION ==========
    doc.moveDown(1);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("INSTITUTIONAL DISTRIBUTION");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#1e40af").moveDown(1);

    doc.fontSize(11).font("Helvetica").fillColor("#334155")
       .text("Project distribution across ASTU colleges, showing research and community engagement participation levels.", { width: 500 });
    doc.moveDown(1);

    const sortedColleges = Object.entries(byCollege).sort((a,b) => b[1]-a[1]);
    sortedColleges.forEach(([college, count], idx) => {
      const percentage = ((count / summary.totalProjects) * 100).toFixed(1);
      const barWidth = (count / summary.totalProjects) * 350;
      const color = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"][idx % 6];
      
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000")
         .text(`${college}`, 50, doc.y, { width: 200 });
      doc.fontSize(9).font("Helvetica").fillColor("#64748b")
         .text(`${count} projects (${percentage}%)`, 260, doc.y - 10);
      
      doc.rect(50, doc.y + 5, barWidth, 10).fill(color + "40");
      doc.rect(50, doc.y + 5, barWidth, 10).stroke(color);
      doc.moveDown(1.2);
    });

    // ========== RESEARCH PROJECTS SECTION ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#8b5cf6").text("RESEARCH PROJECTS PORTFOLIO");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#8b5cf6").moveDown(1);

    if (researchProjects.length === 0) {
      doc.fontSize(11).fillColor("#64748b").text("No research projects currently registered in the system.", { width: 500 });
    } else {
      doc.fontSize(10).font("Helvetica").fillColor("#334155")
         .text(`Displaying ${researchProjects.length} research projects with comprehensive details including funding sources, team composition, and publication outputs.`, { width: 500 });
      doc.moveDown(1);

      researchProjects.forEach((p, i) => {
        if (doc.y > 700) doc.addPage();
        
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#8b5cf6").text(`${i+1}. ${p.title}`, { width: 500 });
        doc.fontSize(9).font("Helvetica").fillColor("#000")
           .text(`Principal Investigator: ${p.lead} | ${p.college}`, { continued: false });
        if (p.department) doc.text(`Department: ${p.department}`, { continued: false });
        
        doc.fontSize(9).fillColor("#64748b")
           .text(`Status: ${p.status.toUpperCase()} | Funding: ETB ${(p.fundingETB||0).toLocaleString()} | Source: ${p.fundingSource || "N/A"}`, { continued: false })
           .text(`Team Size: ${p.teamSize || 1} members | Publications: ${p.publications || 0} | Period: ${p.startDate} - ${p.endDate || "Ongoing"}`, { continued: false });
        
        if (p.centerOfExcellence && p.centerOfExcellence !== "None") {
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#10b981").text(`🏆 Center of Excellence: ${p.centerOfExcellence}`, { continued: false });
        }
        
        if (p.summary) {
          doc.moveDown(0.3);
          doc.fontSize(9).font("Helvetica").fillColor("#475569").text(p.summary, { width: 500, align: "justify" });
        }
        
        doc.moveTo(50, doc.y + 8).lineTo(560, doc.y + 8).stroke("#e2e8f0");
        doc.moveDown(1);
      });
    }

    // ========== COMMUNITY PROJECTS SECTION ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#10b981").text("COMMUNITY OUTREACH INITIATIVES");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#10b981").moveDown(1);

    if (communityProjects.length === 0) {
      doc.fontSize(11).fillColor("#64748b").text("No community projects currently registered in the system.", { width: 500 });
    } else {
      doc.fontSize(10).font("Helvetica").fillColor("#334155")
         .text(`Showcasing ${communityProjects.length} community engagement projects demonstrating ASTU's commitment to social responsibility and regional development.`, { width: 500 });
      doc.moveDown(1);

      communityProjects.forEach((p, i) => {
        if (doc.y > 700) doc.addPage();
        
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#10b981").text(`${i+1}. ${p.title}`, { width: 500 });
        doc.fontSize(9).font("Helvetica").fillColor("#000")
           .text(`Project Lead: ${p.lead} | ${p.college}`, { continued: false });
        
        doc.fontSize(9).fillColor("#64748b")
           .text(`Status: ${p.status.toUpperCase()} | Location: ${p.location || "Adama"} | Budget: ETB ${(p.budgetETB||0).toLocaleString()}`, { continued: false })
           .text(`Direct Beneficiaries: ${(p.beneficiaries||0).toLocaleString()} people | Volunteers: ${p.volunteers || 0} | Period: ${p.startDate} - ${p.endDate || "Ongoing"}`, { continued: false });
        
        if (p.summary) {
          doc.moveDown(0.3);
          doc.fontSize(9).font("Helvetica").fillColor("#475569").text(p.summary, { width: 500, align: "justify" });
        }
        
        if (p.impact) {
          doc.moveDown(0.3);
          doc.fontSize(9).font("Helvetica-Bold").fillColor("#10b981").text("Impact: ", { continued: true });
          doc.font("Helvetica").fillColor("#475569").text(p.impact, { width: 500 });
        }
        
        doc.moveTo(50, doc.y + 8).lineTo(560, doc.y + 8).stroke("#e2e8f0");
        doc.moveDown(1);
      });
    }

    // ========== FOOTER ==========
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1e40af").text("REPORT CONCLUSION", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").fillColor("#334155").text(
      `This comprehensive analytics report demonstrates ASTU's commitment to research excellence and community engagement. With ${summary.totalProjects} active initiatives spanning ${summary.activeColleges} colleges, the university continues to drive innovation and social impact through strategic investments and collaborative partnerships.`,
      { align: "center", width: 450 }
    );

    doc.end();
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/report/research  — generate research summary PDF
exports.generateResearchPDF = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = await getAggregatedAnalytics(token);
    const { summary, researchProjects } = data;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ASTU_Research_Summary_${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    // ========== COVER PAGE ==========
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#7c3aed").text("RESEARCH EXCELLENCE REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor("#334155").text("Adama Science and Technology University", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(13).fillColor("#64748b")
       .text("Office of Research and Innovation Excellence", { align: "center" })
       .text(`Academic Year: ${new Date().getFullYear()}`, { align: "center" })
       .text(`Report Date: ${new Date().toLocaleDateString("en-ET", { dateStyle: "full" })}`, { align: "center" });
    
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#475569").text(
      "This report provides a detailed analysis of ASTU's research portfolio, including funding allocation, publication metrics, departmental performance, research team composition, and center of excellence achievements. The data presented reflects the university's commitment to advancing knowledge and fostering innovation.",
      { align: "center", width: 450 }
    );

    // ========== RESEARCH OVERVIEW ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#7c3aed").text("RESEARCH PORTFOLIO OVERVIEW");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#7c3aed").moveDown(1);

    const activeProjects = researchProjects.filter(p => p.status === "active").length;
    const completedProjects = researchProjects.filter(p => p.status === "completed").length;
    const totalFunding = researchProjects.reduce((sum, p) => sum + (p.fundingETB || 0), 0);
    const avgTeamSize = researchProjects.length > 0 ? (researchProjects.reduce((sum, p) => sum + (p.teamSize || 0), 0) / researchProjects.length).toFixed(1) : 0;
    const avgFunding = researchProjects.length > 0 ? (totalFunding / researchProjects.length).toFixed(0) : 0;
    const avgPublications = researchProjects.length > 0 ? (summary.totalPublications / researchProjects.length).toFixed(2) : 0;

    // Key metrics grid
    const researchMetrics = [
      { label: "Total Research Projects", value: summary.researchCount, icon: "📚" },
      { label: "Active Projects", value: activeProjects, icon: "🔬" },
      { label: "Completed Projects", value: completedProjects, icon: "✅" },
      { label: "Total Funding (ETB)", value: totalFunding.toLocaleString(), icon: "💰" },
      { label: "Total Publications", value: summary.totalPublications, icon: "📄" },
      { label: "Average Team Size", value: avgTeamSize + " researchers", icon: "👥" },
      { label: "Avg. Funding/Project", value: "ETB " + parseInt(avgFunding).toLocaleString(), icon: "📊" },
      { label: "Avg. Publications/Project", value: avgPublications, icon: "📈" },
    ];

    researchMetrics.forEach((metric, idx) => {
      if (idx % 2 === 0 && idx > 0) doc.moveDown(0.5);
      const x = idx % 2 === 0 ? 50 : 305;
      const color = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899"][idx];
      
      doc.rect(x, doc.y, 250, 45).fillAndStroke(color + "15", color + "40");
      doc.fontSize(18).text(metric.icon, x + 10, doc.y + 12);
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(metric.label, x + 40, doc.y + 10, { width: 200 });
      doc.fontSize(14).font("Helvetica-Bold").fillColor(color).text(String(metric.value), x + 40, doc.y + 25, { width: 200 });
      if (idx % 2 === 0) doc.y -= 45;
    });
    doc.moveDown(3);

    // Research Excellence Indicators
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Research Excellence Indicators");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#cbd5e1").moveDown(0.5);

    const completionRate = summary.researchCount > 0 ? ((completedProjects / summary.researchCount) * 100).toFixed(1) : 0;
    const successRate = activeProjects + completedProjects;
    const productivityIndex = researchProjects.length > 0 ? (summary.totalPublications / researchProjects.length * 100).toFixed(0) : 0;

    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`• Completion Rate: ${completionRate}% of research projects have been successfully completed, demonstrating effective project management and research execution.`, { width: 500, lineGap: 3 });
    doc.text(`• Research Productivity Index: ${productivityIndex} - measured as publications per project × 100, indicating strong research output quality.`, { width: 500, lineGap: 3 });
    doc.text(`• Funding Efficiency: Average investment of ETB ${parseInt(avgFunding).toLocaleString()} per project generating ${avgPublications} publications, showing competitive return on investment.`, { width: 500, lineGap: 3 });
    doc.text(`• Team Collaboration: Average team size of ${avgTeamSize} researchers per project promotes interdisciplinary knowledge exchange and capacity building.`, { width: 500, lineGap: 3 });

    // ========== FUNDING ANALYSIS ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("RESEARCH FUNDING ANALYSIS");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#7c3aed").moveDown(1);

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text("Analysis of research funding sources, allocation patterns, and investment distribution across projects.", { width: 500 });
    doc.moveDown(1);

    const fundingSources = {};
    const fundingByCollege = {};
    researchProjects.forEach(p => {
      const source = p.fundingSource || "Other";
      fundingSources[source] = (fundingSources[source] || 0) + (p.fundingETB || 0);
      const college = p.college || "Unspecified";
      fundingByCollege[college] = (fundingByCollege[college] || 0) + (p.fundingETB || 0);
    });

    doc.fontSize(13).font("Helvetica-Bold").fillColor("#7c3aed").text("Funding Sources Distribution");
    doc.moveDown(0.5);

    Object.entries(fundingSources).sort((a,b) => b[1]-a[1]).forEach(([source, amount]) => {
      const percentage = ((amount / totalFunding) * 100).toFixed(1);
      const barWidth = (amount / totalFunding) * 400;
      const color = source.includes("International") ? "#3b82f6" : source.includes("Government") ? "#10b981" : source.includes("Industry") ? "#f59e0b" : "#8b5cf6";
      
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text(source, 50, doc.y);
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`ETB ${amount.toLocaleString()} (${percentage}%)`, 250, doc.y - 10);
      
      doc.rect(50, doc.y + 5, barWidth, 12).fill(color + "50");
      doc.rect(50, doc.y + 5, barWidth, 12).stroke(color);
      doc.moveDown(1.5);
    });

    doc.moveDown(1);
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#7c3aed").text("Funding Distribution by College");
    doc.moveDown(0.5);

    Object.entries(fundingByCollege).sort((a,b) => b[1]-a[1]).forEach(([college, amount]) => {
      const percentage = ((amount / totalFunding) * 100).toFixed(1);
      doc.fontSize(10).font("Helvetica").fillColor("#334155")
         .text(`${college}: ETB ${amount.toLocaleString()} (${percentage}%)`, { width: 500 });
    });

    // ========== DEPARTMENTAL ANALYSIS ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("DEPARTMENTAL RESEARCH PERFORMANCE");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#7c3aed").moveDown(1);

    const byDepartment = {};
    const publicationsByDept = {};
    const fundingByDept = {};

    researchProjects.forEach(p => {
      const dept = p.department || "Unspecified";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      publicationsByDept[dept] = (publicationsByDept[dept] || 0) + (p.publications || 0);
      fundingByDept[dept] = (fundingByDept[dept] || 0) + (p.fundingETB || 0);
    });

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text("Comparative analysis of research activity across departments, showing project counts, publication outputs, and funding acquisition.", { width: 500 });
    doc.moveDown(1);

    const sortedDepts = Object.entries(byDepartment).sort((a,b) => b[1]-a[1]).slice(0, 10);
    sortedDepts.forEach(([dept, count]) => {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#7c3aed").text(dept);
      doc.fontSize(9).font("Helvetica").fillColor("#334155")
         .text(`  └ Projects: ${count} | Publications: ${publicationsByDept[dept] || 0} | Funding: ETB ${(fundingByDept[dept] || 0).toLocaleString()}`);
      doc.moveDown(0.5);
    });

    // ========== CENTER OF EXCELLENCE ==========
    const centerProjects = researchProjects.filter(p => p.centerOfExcellence && p.centerOfExcellence !== "None");
    if (centerProjects.length > 0) {
      doc.moveDown(1);
      doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("CENTERS OF EXCELLENCE");
      doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#10b981").moveDown(1);

      const centerGroups = {};
      centerProjects.forEach(p => {
        const center = p.centerOfExcellence;
        if (!centerGroups[center]) centerGroups[center] = [];
        centerGroups[center].push(p);
      });

      Object.entries(centerGroups).forEach(([center, projects]) => {
        const centerFunding = projects.reduce((sum, p) => sum + (p.fundingETB || 0), 0);
        const centerPubs = projects.reduce((sum, p) => sum + (p.publications || 0), 0);
        
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#10b981").text(`🏆 ${center}`);
        doc.fontSize(9).font("Helvetica").fillColor("#334155")
           .text(`Projects: ${projects.length} | Funding: ETB ${centerFunding.toLocaleString()} | Publications: ${centerPubs}`, { indent: 20 });
        doc.moveDown(0.8);
      });
    }

    // ========== DETAILED PROJECTS ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#7c3aed").text("RESEARCH PROJECTS INVENTORY");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#7c3aed").moveDown(1);

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text(`Comprehensive listing of all ${researchProjects.length} research projects with detailed information.`, { width: 500 });
    doc.moveDown(1);

    researchProjects.forEach((p, i) => {
      if (doc.y > 680) doc.addPage();
      
      // Project header with status indicator
      const statusColors = { active: "#10b981", completed: "#3b82f6", paused: "#f59e0b", planned: "#8b5cf6" };
      const statusColor = statusColors[p.status] || "#64748b";
      
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000").text(`${i+1}. ${p.title}`, { width: 480 });
      doc.rect(540, doc.y - 12, 8, 8).fill(statusColor);
      
      // Principal Investigator & Affiliation
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#7c3aed").text("Principal Investigator: ", { continued: true });
      doc.font("Helvetica").fillColor("#000").text(p.lead);
      doc.fontSize(9).fillColor("#64748b").text(`${p.college} | ${p.department || "N/A"}`, { continued: false });
      
      // Project metrics
      doc.fontSize(9).font("Helvetica").fillColor("#334155")
         .text(`Status: ${p.status.toUpperCase()} | Period: ${p.startDate} - ${p.endDate || "Ongoing"}`, { continued: false })
         .text(`Funding: ETB ${(p.fundingETB||0).toLocaleString()} (${p.fundingSource || "N/A"}) | Team: ${p.teamSize || 1} members`, { continued: false })
         .text(`Publications: ${p.publications || 0} | External Link: ${p.externalLink || "N/A"}`, { continued: false });
      
      if (p.centerOfExcellence && p.centerOfExcellence !== "None") {
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#10b981").text(`🏆 Center of Excellence: ${p.centerOfExcellence}`, { continued: false });
      }
      
      // Project description
      if (p.summary) {
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica").fillColor("#475569").text(p.summary, { width: 500, align: "justify" });
      }
      
      // Tags
      if (p.tags && p.tags.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor("#7c3aed").text(`Keywords: ${p.tags.join(", ")}`, { width: 500 });
      }
      
      doc.moveTo(50, doc.y + 8).lineTo(560, doc.y + 8).stroke("#e2e8f0");
      doc.moveDown(0.8);
    });

    // ========== CONCLUSION ==========
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#7c3aed").text("RESEARCH EXCELLENCE SUMMARY", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").fillColor("#334155").text(
      `ASTU's research portfolio demonstrates significant academic impact with ${summary.researchCount} active research initiatives generating ${summary.totalPublications} publications. The total research investment of ETB ${totalFunding.toLocaleString()} reflects the university's strategic commitment to advancing knowledge, fostering innovation, and building research capacity across ${Object.keys(byDepartment).length} departments.`,
      { align: "center", width: 450 }
    );

    doc.end();
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/report/community  — generate community impact PDF
exports.generateCommunityPDF = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const data = await getAggregatedAnalytics(token);
    const { summary, communityProjects } = data;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=ASTU_Community_Impact_${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    // ========== COVER PAGE ==========
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#059669").text("COMMUNITY IMPACT REPORT", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor("#334155").text("Adama Science and Technology University", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(13).fillColor("#64748b")
       .text("Community Engagement & Social Responsibility Office", { align: "center" })
       .text(`Reporting Period: ${new Date().getFullYear()}`, { align: "center" })
       .text(`Generated: ${new Date().toLocaleDateString("en-ET", { dateStyle: "full" })}`, { align: "center" });
    
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#475569").text(
      "This comprehensive impact report documents ASTU's community engagement initiatives, showcasing our commitment to social responsibility, sustainable development, and meaningful partnerships with local communities. The report highlights project outcomes, beneficiary demographics, volunteer contributions, and the measurable social impact of university-community collaborations.",
      { align: "center", width: 450 }
    );

    // ========== IMPACT OVERVIEW ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#059669").text("COMMUNITY ENGAGEMENT OVERVIEW");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    const activeProjects = communityProjects.filter(p => p.status === "active").length;
    const completedProjects = communityProjects.filter(p => p.status === "completed").length;
    const totalBudget = communityProjects.reduce((sum, p) => sum + (p.budgetETB || 0), 0);
    const totalBeneficiaries = communityProjects.reduce((sum, p) => sum + (p.beneficiaries || 0), 0);
    const totalVolunteers = communityProjects.reduce((sum, p) => sum + (p.volunteers || 0), 0);
    const avgBeneficiaries = communityProjects.length > 0 ? (totalBeneficiaries / communityProjects.length).toFixed(0) : 0;
    const avgBudget = communityProjects.length > 0 ? (totalBudget / communityProjects.length).toFixed(0) : 0;
    const beneficiariesPerVolunteer = totalVolunteers > 0 ? (totalBeneficiaries / totalVolunteers).toFixed(1) : 0;

    // Impact metrics with icons
    const communityMetrics = [
      { label: "Total Community Projects", value: summary.communityCount, icon: "🤝", color: "#059669" },
      { label: "Active Initiatives", value: activeProjects, icon: "🔄", color: "#10b981" },
      { label: "Completed Initiatives", value: completedProjects, icon: "✅", color: "#3b82f6" },
      { label: "Total Investment (ETB)", value: totalBudget.toLocaleString(), icon: "💰", color: "#f59e0b" },
      { label: "Community Beneficiaries", value: totalBeneficiaries.toLocaleString(), icon: "👥", color: "#ef4444" },
      { label: "Volunteer Hours", value: totalVolunteers, icon: "🙌", color: "#8b5cf6" },
      { label: "Avg. Reach/Project", value: parseInt(avgBeneficiaries).toLocaleString() + " people", icon: "📊", color: "#06b6d4" },
      { label: "Impact Ratio", value: beneficiariesPerVolunteer + ":1", icon: "⚡", color: "#ec4899" },
    ];

    communityMetrics.forEach((metric, idx) => {
      if (idx % 2 === 0 && idx > 0) doc.moveDown(0.5);
      const x = idx % 2 === 0 ? 50 : 305;
      
      doc.rect(x, doc.y, 250, 45).fillAndStroke(metric.color + "15", metric.color + "40");
      doc.fontSize(18).text(metric.icon, x + 10, doc.y + 12);
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(metric.label, x + 40, doc.y + 10, { width: 200 });
      doc.fontSize(14).font("Helvetica-Bold").fillColor(metric.color).text(String(metric.value), x + 40, doc.y + 25, { width: 200 });
      if (idx % 2 === 0) doc.y -= 45;
    });
    doc.moveDown(3);

    // Social Impact Highlights
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Social Impact Highlights");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke("#cbd5e1").moveDown(0.5);

    const successRate = summary.communityCount > 0 ? ((completedProjects / summary.communityCount) * 100).toFixed(1) : 0;
    const costPerBeneficiary = totalBeneficiaries > 0 ? (totalBudget / totalBeneficiaries).toFixed(2) : 0;
    const volunteerEfficiency = totalVolunteers > 0 ? ((totalBeneficiaries / totalVolunteers) * 100).toFixed(0) : 0;

    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`• Wide-Reaching Impact: ${totalBeneficiaries.toLocaleString()} community members directly benefited from ASTU outreach programs, with an average of ${parseInt(avgBeneficiaries).toLocaleString()} beneficiaries per initiative.`, { width: 500, lineGap: 3 });
    doc.text(`• Cost-Effective Delivery: Investment of ETB ${costPerBeneficiary} per beneficiary demonstrates efficient resource utilization and maximum social impact per birr spent.`, { width: 500, lineGap: 3 });
    doc.text(`• Volunteer Mobilization: ${totalVolunteers} volunteer hours contributed by students and faculty, achieving a ${beneficiariesPerVolunteer}:1 beneficiary-to-volunteer ratio.`, { width: 500, lineGap: 3 });
    doc.text(`• Project Success Rate: ${successRate}% completion rate demonstrates strong community partnerships and effective project implementation capabilities.`, { width: 500, lineGap: 3 });

    // ========== IMPACT BY CATEGORY ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("IMPACT ANALYSIS BY FOCUS AREA");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text("Breakdown of community engagement initiatives across thematic areas, showing the diversity and reach of ASTU's social responsibility programs.", { width: 500 });
    doc.moveDown(1);

    // Group by category
    const categoryGroups = {};
    communityProjects.forEach(p => {
      const cat = p.category || "General Community Development";
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = { count: 0, beneficiaries: 0, budget: 0, projects: [] };
      }
      categoryGroups[cat].count += 1;
      categoryGroups[cat].beneficiaries += (p.beneficiaries || 0);
      categoryGroups[cat].budget += (p.budgetETB || 0);
      categoryGroups[cat].projects.push(p);
    });

    const categoryColors = {
      "education": "#3b82f6",
      "health": "#ef4444",
      "agriculture": "#10b981",
      "technology": "#8b5cf6",
      "environment": "#059669",
    };

    Object.entries(categoryGroups).sort((a,b) => b[1].beneficiaries - a[1].beneficiaries).forEach(([category, data]) => {
      const catName = category.charAt(0).toUpperCase() + category.slice(1);
      const color = categoryColors[category.toLowerCase()] || "#64748b";
      const percentage = ((data.beneficiaries / totalBeneficiaries) * 100).toFixed(1);
      
      doc.fontSize(12).font("Helvetica-Bold").fillColor(color).text(`${catName}`, 50, doc.y);
      doc.fontSize(9).font("Helvetica").fillColor("#334155")
         .text(`└ Projects: ${data.count} | Beneficiaries: ${data.beneficiaries.toLocaleString()} (${percentage}%) | Budget: ETB ${data.budget.toLocaleString()}`, 60, doc.y);
      doc.moveDown(0.8);
    });

    // ========== GEOGRAPHIC DISTRIBUTION ==========
    doc.moveDown(1);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("GEOGRAPHIC DISTRIBUTION");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    const locationGroups = {};
    communityProjects.forEach(p => {
      const loc = p.location || "Adama";
      locationGroups[loc] = (locationGroups[loc] || 0) + 1;
    });

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text("ASTU's community engagement spans multiple geographic locations, extending the university's impact beyond the immediate campus area.", { width: 500 });
    doc.moveDown(1);

    Object.entries(locationGroups).sort((a,b) => b[1] - a[1]).forEach(([location, count]) => {
      const barWidth = (count / summary.communityCount) * 400;
      doc.fontSize(10).font("Helvetica").fillColor("#000")
         .text(`${location}: ${count} projects`, 50, doc.y);
      doc.rect(50, doc.y + 5, barWidth, 10).fill("#059669" + "50");
      doc.rect(50, doc.y + 5, barWidth, 10).stroke("#059669");
      doc.moveDown(1.3);
    });

    // ========== BUDGET UTILIZATION ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("RESOURCE ALLOCATION & BUDGETING");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text("Financial analysis of community engagement investments, showing budget allocation patterns and fiscal responsibility.", { width: 500 });
    doc.moveDown(1);

    // Budget by status
    const budgetByStatus = {};
    communityProjects.forEach(p => {
      const status = p.status || "active";
      budgetByStatus[status] = (budgetByStatus[status] || 0) + (p.budgetETB || 0);
    });

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#059669").text("Budget Allocation by Project Status");
    doc.moveDown(0.5);

    Object.entries(budgetByStatus).sort((a,b) => b[1] - a[1]).forEach(([status, amount]) => {
      const percentage = ((amount / totalBudget) * 100).toFixed(1);
      const statusColor = status === "completed" ? "#3b82f6" : status === "active" ? "#10b981" : "#f59e0b";
      
      doc.fontSize(10).font("Helvetica").fillColor("#000")
         .text(`${status.charAt(0).toUpperCase() + status.slice(1)}: ETB ${amount.toLocaleString()} (${percentage}%)`, 50, doc.y);
      doc.moveDown(0.6);
    });

    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#059669").text("Budget Distribution by Category");
    doc.moveDown(0.5);

    Object.entries(categoryGroups).sort((a,b) => b[1].budget - a[1].budget).forEach(([category, data]) => {
      const percentage = ((data.budget / totalBudget) * 100).toFixed(1);
      doc.fontSize(10).font("Helvetica").fillColor("#334155")
         .text(`${category}: ETB ${data.budget.toLocaleString()} (${percentage}%)`, 50, doc.y);
      doc.moveDown(0.6);
    });

    // ========== VOLUNTEER ENGAGEMENT ==========
    doc.addPage();
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#000").text("VOLUNTEER ENGAGEMENT ANALYSIS");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    const projectsWithVolunteers = communityProjects.filter(p => (p.volunteers || 0) > 0);
    const avgVolunteersPerProject = projectsWithVolunteers.length > 0 ? (totalVolunteers / projectsWithVolunteers.length).toFixed(1) : 0;

    doc.fontSize(10).font("Helvetica").fillColor("#334155");
    doc.text(`Total volunteer engagement: ${totalVolunteers} volunteer hours across ${projectsWithVolunteers.length} projects.`, { width: 500 });
    doc.text(`Average volunteer mobilization: ${avgVolunteersPerProject} volunteers per project.`, { width: 500 });
    doc.text(`Impact multiplier: Each volunteer hour reached ${beneficiariesPerVolunteer} community beneficiaries.`, { width: 500 });
    doc.moveDown(1);

    // Top volunteer-driven projects
    const topVolunteerProjects = [...communityProjects]
      .sort((a,b) => (b.volunteers || 0) - (a.volunteers || 0))
      .slice(0, 5);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#059669").text("Top Volunteer-Driven Initiatives");
    doc.moveDown(0.5);

    topVolunteerProjects.forEach((p, idx) => {
      if (p.volunteers > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text(`${idx+1}. ${p.title}`);
        doc.fontSize(9).font("Helvetica").fillColor("#334155")
           .text(`   Volunteers: ${p.volunteers} | Beneficiaries: ${(p.beneficiaries||0).toLocaleString()} | Ratio: ${p.volunteers > 0 ? (p.beneficiaries/p.volunteers).toFixed(1) : 0}:1`);
        doc.moveDown(0.6);
      }
    });

    // ========== DETAILED PROJECTS ==========
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#059669").text("COMMUNITY PROJECTS DIRECTORY");
    doc.moveTo(50, doc.y).lineTo(560, doc.y).lineWidth(2).stroke("#059669").moveDown(1);

    doc.fontSize(10).font("Helvetica").fillColor("#334155")
       .text(`Complete inventory of all ${communityProjects.length} community engagement initiatives with impact assessments.`, { width: 500 });
    doc.moveDown(1);

    communityProjects.forEach((p, i) => {
      if (doc.y > 680) doc.addPage();
      
      // Project header with status
      const statusColors = { active: "#10b981", completed: "#3b82f6", paused: "#f59e0b", planned: "#8b5cf6" };
      const statusColor = statusColors[p.status] || "#64748b";
      
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#000").text(`${i+1}. ${p.title}`, { width: 480 });
      doc.rect(540, doc.y - 12, 8, 8).fill(statusColor);
      
      // Project lead and affiliation
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#059669").text("Project Lead: ", { continued: true });
      doc.font("Helvetica").fillColor("#000").text(`${p.lead} | ${p.college}`);
      
      // Project metrics
      doc.fontSize(9).font("Helvetica").fillColor("#334155")
         .text(`Status: ${p.status.toUpperCase()} | Location: ${p.location || "Adama"} | Category: ${p.category || "General"}`, { continued: false })
         .text(`Budget: ETB ${(p.budgetETB||0).toLocaleString()} | Period: ${p.startDate} - ${p.endDate || "Ongoing"}`, { continued: false })
         .text(`Direct Beneficiaries: ${(p.beneficiaries||0).toLocaleString()} people | Volunteers: ${p.volunteers || 0} hours`, { continued: false });
      
      // Impact statement
      if (p.impact) {
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#10b981").text("Impact Achievement: ", { continued: true });
        doc.font("Helvetica").fillColor("#475569").text(p.impact, { width: 500 });
      }
      
      // Project description
      if (p.summary) {
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica").fillColor("#475569").text(p.summary, { width: 500, align: "justify" });
      }
      
      // Tags
      if (p.tags && p.tags.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor("#059669").text(`Tags: ${p.tags.join(", ")}`, { width: 500 });
      }
      
      doc.moveTo(50, doc.y + 8).lineTo(560, doc.y + 8).stroke("#e2e8f0");
      doc.moveDown(0.8);
    });

    // ========== CONCLUSION ==========
    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#059669").text("COMMUNITY ENGAGEMENT SUMMARY", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").fillColor("#334155").text(
      `ASTU's community engagement portfolio demonstrates a strong commitment to social responsibility and sustainable development. With ${summary.communityCount} active initiatives reaching ${totalBeneficiaries.toLocaleString()} beneficiaries across multiple geographic locations, the university continues to serve as a catalyst for positive social change. The mobilization of ${totalVolunteers} volunteer hours and investment of ETB ${totalBudget.toLocaleString()} reflects institutional dedication to building meaningful partnerships and creating lasting impact in the communities we serve.`,
      { align: "center", width: 450 }
    );

    doc.end();
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};
