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
  ownerId:      { type: String, default: "" },
  collaborators:[{
    userId: { type: String },
    name:   { type: String },
    email:  { type: String }
  }],
  proposalFileUrl:  { type: String, default: "" },
  proposalFileName: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Research", researchSchema);
