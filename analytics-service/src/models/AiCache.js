const mongoose = require("mongoose");

const AiCacheSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["translation", "chat", "matchmaking"]
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to search key efficiently
AiCacheSchema.index({ key: 1 });

module.exports = mongoose.model("AiCache", AiCacheSchema);
