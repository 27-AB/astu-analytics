require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const mongoStates = ["disconnected", "connected", "connecting", "disconnecting"];

mongoose
  .connect(process.env.MONGO_URI || "", { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log("Auth-service connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err.message));

app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });
app.get("/health", (_req, res) => {
  const ready = mongoose.connection.readyState;
  res.json({
    status: ready === 1 ? "ok" : "degraded",
    service: "auth-service",
    mongo: mongoStates[ready] || "unknown",
    hasMongoUri: Boolean(process.env.MONGO_URI),
  });
});
app.use("/auth", require("./routes/authRouter"));
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found." }));

module.exports = app;
