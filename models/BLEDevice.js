const mongoose = require('mongoose');

const bleDeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Device identification
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  deviceName: {
    type: String,
    default: 'ESP32-Hydration'
  },
  macAddress: {
    type: String,
    uppercase: true
  },
  
  // Device info
  firmwareVersion: String,
  hardwareVersion: String,
  manufacturer: {
    type: String,
    default: 'Espressif'
  },
  
  // Pairing info
  isPaired: {
    type: Boolean,
    default: true
  },
  firstPaired: {
    type: Date,
    default: Date.now
  },
  lastConnected: {
    type: Date,
    default: Date.now
  },
  
  // Usage statistics
  stats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalReadings: {
      type: Number,
      default: 0
    },
    totalConnectTime: {
      type: Number,
      default: 0 // milliseconds
    },
    lastSessionDuration: Number,
    averageSessionDuration: Number
  },
  
  // Device settings
  settings: {
    readingInterval: {
      type: Number,
      default: 5000, // milliseconds
      min: 1000,
      max: 60000
    },
    autoTest: {
      type: Boolean,
      default: false
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // Device health
  health: {
    batteryLevel: Number,
    signalStrength: Number,
    lastError: String,
    errorCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'error'],
      default: 'active'
    }
  },
  
  // User notes
  nickname: String,
  notes: String,
  
  // Soft delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
bleDeviceSchema.index({ userId: 1, isActive: 1 });
bleDeviceSchema.index({ lastConnected: -1 });
bleDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Virtual for device age
bleDeviceSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.firstPaired) / (1000 * 60 * 60 * 24));
});

// Method to update connection timestamp
bleDeviceSchema.methods.recordConnection = function() {
  this.lastConnected = new Date();
  this.stats.totalSessions += 1;
  return this.save();
};

// Method to update stats after session
bleDeviceSchema.methods.updateSessionStats = function(sessionDuration, readingsCount) {
  this.stats.lastSessionDuration = sessionDuration;
  this.stats.totalConnectTime += sessionDuration;
  this.stats.totalReadings += readingsCount;
  
  // Calculate average session duration
  if (this.stats.totalSessions > 0) {
    this.stats.averageSessionDuration = 
      this.stats.totalConnectTime / this.stats.totalSessions;
  }
  
  return this.save();
};

// Method to record error
bleDeviceSchema.methods.recordError = function(errorMessage) {
  this.health.lastError = errorMessage;
  this.health.errorCount += 1;
  
  // If too many errors, mark as error status
  if (this.health.errorCount > 10) {
    this.health.status = 'error';
  }
  
  return this.save();
};

// Static method to find user's active devices
bleDeviceSchema.statics.findUserDevices = function(userId, activeOnly = true) {
  const query = { userId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ lastConnected: -1 });
};

module.exports = mongoose.model('BLEDevice', bleDeviceSchema);