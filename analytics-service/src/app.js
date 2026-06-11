require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Configure CORS to handle preflight requests and allow credentials
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    // In production, you would whitelist specific origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "analytics-service" }));
app.use("/api", require("./routes/analyticsRouter"));
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found." }));
module.exports = app;
