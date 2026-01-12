// models/BLEReading.js
const mongoose = require('mongoose');

/**
 * Stores raw BLE data received from ESP32 via browser
 * This is separate from HydrationTest to keep raw sensor data
 * 
 *
 */
const bleReadingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BLESession',
    required: true,
    index: true
  },
  // Raw sensor data from ESP32
  sensorData: {
    color: {
      name: String,      // "Light Yellow"
      rgb: {
        r: Number,       // 0-255
        g: Number,
        b: Number
      },
      value: Number      // 0-1023 (converted for compatibility)
    },
    specificGravity: {
      value: Number,     // 1.010-1.030
      raw: String        // "1.020"
    },
    ph: {
      value: Number,     // 5.5-8.0
      raw: String        // "6.5"
    },
    frequency: Number,   // Estimated 0-8 times/day
    volume: Number       // Estimated 0-300ml
  },
  // Calculated hydration level
  hydrationLevel: {
    type: String,
    enum: ['Well Hydrated', 'Slightly Dehydrated', 'Dehydrated', 'Severely Dehydrated'],
    required: true
  },
  hydrationPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  // Data quality metrics
  dataQuality: {
    isValid: {
      type: Boolean,
      default: true
    },
    validationErrors: [String],
    signalStrength: String, // If ESP32 provides RSSI
    readTime: Number // milliseconds to read sensor
  },
  // Timestamps
  readingTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  receivedTimestamp: {
    type: Date,
    default: Date.now
  },
  // Link to final test result
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HydrationTest',
    default: null
  },
  // Processing status
  processed: {
    type: Boolean,
    default: false
  },
  processingError: String
}, {
  timestamps: true
});

// Index for querying recent readings
bleReadingSchema.index({ userId: 1, readingTimestamp: -1 });
bleReadingSchema.index({ sessionId: 1, readingTimestamp: -1 });

// Virtual for reading age
bleReadingSchema.virtual('ageInSeconds').get(function() {
  return Math.floor((Date.now() - this.readingTimestamp) / 1000);
});

module.exports = mongoose.model('BLEReading', bleReadingSchema);
