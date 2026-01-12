// models/BLESession.js
const mongoose = require('mongoose');

/**
 * Tracks active BLE connections between browser and ESP32
 * Backend uses this to know when user is actively testing
 */
const bleSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceId: {
    type: String, // Browser's BLE device ID
    required: true
  },
  sessionStart: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionEnd: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now
  },
  readingsCount: {
    type: Number,
    default: 0
  },
  // Track browser info for debugging
  browserInfo: {
    userAgent: String,
    platform: String
  },
  // Session metadata
  metadata: {
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    disconnectReason: String,
    totalDuration: Number // seconds
  }
}, {
  timestamps: true
});

// Index for finding active sessions
bleSessionSchema.index({ userId: 1, isActive: 1 });

// Auto-close sessions older than 1 hour with no heartbeat
bleSessionSchema.statics.closeAbandonedSessions = async function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await this.updateMany(
    { 
      isActive: true, 
      lastHeartbeat: { $lt: oneHourAgo } 
    },
    { 
      isActive: false, 
      sessionEnd: new Date(),
      'metadata.disconnectReason': 'timeout'
    }
  );
  
  return result.modifiedCount;
};

module.exports = mongoose.model('BLESession', bleSessionSchema);