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
// Automatically delete cache entries after 30 days to prevent bloat
AiCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("AiCache", AiCacheSchema);
