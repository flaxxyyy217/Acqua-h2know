// routes/ble.js
const express = require('express');
const router = express.Router();
const bleController = require('../controllers/bleControllers');
const { authenticateToken } = require('../middleware/auth');
const { validateBLEData, validateSession } = require('../middleware/validation');
const { bleRateLimiter } = require('../middleware/rateLimiter');

/**
 * BLE Session Management Routes
 * These handle the lifecycle of browser-ESP32 BLE connections
 */

// POST /api/ble/session/start
// Browser calls this when BLE connection succeeds
router.post('/session/start', 
  authenticateToken,
  bleRateLimiter,
  validateSession,
  bleController.startSession
);

// POST /api/ble/session/heartbeat
// Browser sends periodic pings to keep session alive
router.post('/session/heartbeat',
  authenticateToken,
  bleController.sessionHeartbeat
);

// POST /api/ble/session/end
// Browser calls this when BLE disconnects
router.post('/session/end',
  authenticateToken,
  bleController.endSession
);

// GET /api/ble/session/active
// Check if user has active BLE session
router.get('/session/active',
  authenticateToken,
  bleController.getActiveSession
);

/**
 * BLE Data Routes
 * Handle incoming sensor data from ESP32 via browser
 */

// POST /api/ble/data
// Browser forwards BLE sensor data here
router.post('/data',
  authenticateToken,
  bleRateLimiter,
  validateBLEData,
  bleController.receiveData
);

// GET /api/ble/readings/recent
// Get recent BLE readings for current user
router.get('/readings/recent',
  authenticateToken,
  bleController.getRecentReadings
);

// GET /api/ble/readings/:sessionId
// Get all readings from specific session
router.get('/readings/:sessionId',
  authenticateToken,
  bleController.getSessionReadings
);

/**
 * Admin Routes
 */

// GET /api/ble/admin/sessions
// View all active sessions (admin only)
router.get('/admin/sessions',
  authenticateToken,
  bleController.getAllSessions
);

// POST /api/ble/admin/cleanup
// Close abandoned sessions (admin only)
router.post('/admin/cleanup',
  authenticateToken,
  bleController.cleanupSessions
);

module.exports = router;