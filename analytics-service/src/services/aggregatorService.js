require("dotenv").config();
const axios = require("axios");

const RESEARCH_URL  = process.env.RESEARCH_SERVICE_URL  || "http://localhost:4001";
const COMMUNITY_URL = process.env.COMMUNITY_SERVICE_URL || "http://localhost:4002";
const COLLEGE_URL   = process.env.COLLEGE_SERVICE_URL   || "http://localhost:4003";

// Helper — forward the user's JWT to upstream services
const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const getAggregatedAnalytics = async (token) => {
  const [rRes, cRes, colRes, rchRes] = await Promise.allSettled([
    axios.get(`${RESEARCH_URL}/projects?limit=100`,            authHeader(token)),
    axios.get(`${COMMUNITY_URL}/community-projects?limit=100`, authHeader(token)),
    axios.get(`${COLLEGE_URL}/colleges`,                       authHeader(token)),
    axios.get(`${COLLEGE_URL}/researchers`,                    authHeader(token)),
  ]);

  const researchProjects  = rRes.status === 'fulfilled' ? (rRes.value.data.projects   || []) : [];
  const communityProjects = cRes.status === 'fulfilled' ? (cRes.value.data.projects   || []) : [];
  const colleges          = colRes.status === 'fulfilled' ? (colRes.value.data.colleges || []) : [];
  const researchers       = rchRes.status === 'fulfilled' ? (rchRes.value.data.researchers || []) : [];

  // Log failures for debugging
  if (rRes.status === 'rejected') console.error('Research service error:', rRes.reason.message);
  if (cRes.status === 'rejected') console.error('Community service error:', cRes.reason.message);
  if (colRes.status === 'rejected') console.error('College service error (colleges):', colRes.reason.message);
  if (rchRes.status === 'rejected') console.error('College service error (researchers):', rchRes.reason.message);

  const allProjects = [
    ...researchProjects.map(p  => ({ ...p, source: "research"  })),
    ...communityProjects.map(p => ({ ...p, source: "community" })),
  ];

  // ── Status counts
  const byStatus = allProjects.reduce((acc, p) => { acc[p.status] = (acc[p.status]||0)+1; return acc; }, {});

  // ── Projects per college
  const byCollege = allProjects.reduce((acc, p) => { acc[p.college] = (acc[p.college]||0)+1; return acc; }, {});

  // ── Total funding
  const totalFunding = allProjects.reduce((sum, p) => sum + (p.fundingETB || p.budgetETB || 0), 0);

  // ── Total beneficiaries (community projects)
  const totalBeneficiaries = communityProjects.reduce((sum, p) => sum + (p.beneficiaries||0), 0);
  const totalVolunteers    = communityProjects.reduce((sum, p) => sum + (p.volunteers||0), 0);

  // ── Total publications
  const totalPublications = researchProjects.reduce((sum, p) => sum + (p.publications||0), 0);

  // ── Yearly trend from project start dates (not Mongo createdAt)
  const getProjectYear = (p) => {
    const raw = p.startDate || p.createdAt;
    if (!raw) return null;
    if (typeof raw === "string" && /^\d{4}/.test(raw)) return Number(raw.slice(0, 4));
    const yr = new Date(raw).getFullYear();
    return Number.isFinite(yr) ? yr : null;
  };

  const yearCounts = {};
  const yearlyByType = {};
  const fundingByYear = {};

  const tallyYear = (p, type) => {
    const yr = getProjectYear(p);
    if (!yr || yr < 2018) return;
    yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    if (!yearlyByType[yr]) yearlyByType[yr] = { research: 0, community: 0 };
    yearlyByType[yr][type] += 1;
    fundingByYear[yr] = (fundingByYear[yr] || 0) + (p.fundingETB || p.budgetETB || 0);
  };

  researchProjects.forEach((p) => tallyYear(p, "research"));
  communityProjects.forEach((p) => tallyYear(p, "community"));

  const trendYears = Object.keys(yearCounts).map(Number);
  const minTrendYear = trendYears.length ? Math.min(...trendYears) : new Date().getFullYear() - 5;
  const maxTrendYear = Math.max(new Date().getFullYear(), ...(trendYears.length ? trendYears : [minTrendYear]));

  const yearlyTrendSeries = [];
  for (let y = minTrendYear; y <= maxTrendYear; y++) {
    yearlyTrendSeries.push({
      year: String(y),
      total: yearCounts[y] || 0,
      research: yearlyByType[y]?.research || 0,
      community: yearlyByType[y]?.community || 0,
      fundingETB: fundingByYear[y] || 0,
    });
  }

  // ── Top research departments
  const byDepartment = researchProjects.reduce((acc, p) => {
    const dep = p.department || "Unspecified";
    acc[dep] = (acc[dep] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: {
      totalProjects:      allProjects.length,
      researchCount:      researchProjects.length,
      communityCount:     communityProjects.length,
      activeColleges:     colleges.length,
      totalFundingETB:    totalFunding,
      totalPublications,
      totalBeneficiaries,
      totalVolunteers,
      activeRatePct: allProjects.length > 0
        ? Math.round(((byStatus.active||0)/allProjects.length)*1000)/10
        : 0,
    },
    byStatus,
    byCollege,
    yearlyTrend: yearCounts,
    yearlyTrendSeries,
    byDepartment,
    researchProjects,
    communityProjects,
    colleges,
    researchers,
    recentProjects: allProjects.slice(0, 10),
  };
};

module.exports = { getAggregatedAnalytics };
