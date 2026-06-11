const router = require("express").Router();
const { getAnalytics, exportCSV, generatePDF, generateResearchPDF, generateCommunityPDF } = require("../controllers/analyticsController");
const { protect } = require("../middleware/auth");

router.get("/analytics", protect, getAnalytics);
router.get("/export",    protect, exportCSV);
router.get("/report",    protect, generatePDF);
router.get("/report/research", protect, generateResearchPDF);
router.get("/report/community", protect, generateCommunityPDF);

module.exports = router;
