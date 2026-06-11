const mongoose = require("mongoose");

const researchSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  lead:         { type: String, required: true },
  college:      { type: String, required: true },
  department:   { type: String, required: true },
  status:       { type: String, enum: ["active", "paused", "completed", "planned", "under_review", "rejected"], default: "active" },
  startDate:    { type: String, required: true },
  endDate:      { type: String },
  fundingETB:   { type: Number, default: 0 },
  fundingSource:{ type: String, default: "ASTU Internal" },
  tags:         [String],
  summary:      { type: String },
  publications: { type: Number, default: 0 },
  teamSize:     { type: Number, default: 1 },
  externalLink: { type: String, default: "" },
  centerOfExcellence: { type: String, default: "None" },
  attachments:  [{ 
    filename: { type: String },
    originalName: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    uploadDate: { type: Date, default: Date.now }
  }],
  // Ownership & Collaboration Fields
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdByName:{ type: String, default: "" },
  collaborators:[{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: ["high", "medium", "low"], default: "medium" }
  }],
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastModifiedByName: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Research", researchSchema);
