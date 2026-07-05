const router = require("express").Router();
const { getAnalytics, exportCSV, generatePDF } = require("../controllers/analyticsController");
const { translateText, chatCopilot, getMatchmaking } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // max 10 requests per minute
  message: { success: false, message: "Too many AI chatbot messages. Please wait 1 minute." }
});

router.get("/analytics", protect, getAnalytics);
router.get("/export",    protect, exportCSV);
router.get("/report",    protect, generatePDF);

// AI & Advanced Analytics Routes
router.post("/ai/translate", protect, translateText);
router.post("/ai/chat",      protect, chatLimiter, chatCopilot);
router.get("/ai/match",      protect, getMatchmaking);

// New Strategic Route
router.get("/ai/strategic-analysis", protect, require("../controllers/aiController").getStrategicAnalysis);


module.exports = router;
