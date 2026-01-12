// config/bluetooth.js

/**
 * BLE Configuration Constants
 * MUST MATCH VALUES IN ESP32 FIRMWARE AND BROWSER CODE
 */
module.exports = {
  // UUIDs must match ESP32 BLEServer configuration
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHARACTERISTIC_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  
  // Device identification
  DEVICE_NAME_PREFIX: 'Acqua_ESP32',
  
  // Session management
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in ms
  HEARTBEAT_INTERVAL: 30 * 1000,   // 30 seconds in ms
  
  // Data validation
  MAX_READINGS_PER_MINUTE: 30,
  MIN_TIME_BETWEEN_READINGS: 2000, // 2 seconds in ms
  
  // Sensor ranges
  SENSOR_RANGES: {
    color: { min: 0, max: 1023 },
    rgb: { min: 0, max: 255 },
    specificGravity: { min: 1.000, max: 1.050 },
    ph: { min: 4.0, max: 9.0 },
    frequency: { min: 0, max: 8 },
    volume: { min: 0, max: 300 }
  },
  
  // Hydration thresholds
  HYDRATION_THRESHOLDS: {
    wellHydrated: 256,
    slightlyDehydrated: 512,
    dehydrated: 768,
    severelyDehydrated: 1024
  }
};