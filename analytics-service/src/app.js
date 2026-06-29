require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors()); app.use(express.json());

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/astu_analytics")
  .then(() => console.log("Analytics-service connected to MongoDB (for caching)"))
  .catch(err => console.error("MongoDB caching DB error:", err.message));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "analytics-service" }));
app.use("/api", require("./routes/analyticsRouter"));
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found." }));
module.exports = app;
