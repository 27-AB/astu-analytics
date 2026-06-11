const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  lead:         { type: String, required: true },
  college:      { type: String, required: true },
  status:       { type: String, enum: ["active", "paused", "completed", "planned"], default: "active" },
  startDate:    { type: String, required: true },
  endDate:      { type: String },
  budgetETB:    { type: Number, default: 0 },
  location:     { type: String, default: "Adama" },
  beneficiaries:{ type: Number, default: 0 },
  volunteers:   { type: Number, default: 0 },
  tags:         [String],
  summary:      { type: String },
  impact:       { type: String },
  // Ownership & Collaboration Fields
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdByName:{ type: String, default: "" },
  collaborators:[{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastModifiedByName: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Community", communitySchema);
