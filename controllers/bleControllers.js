// controllers/bleController.js
const BLESession = require('../models/BLESession');
const BLEReading = require('../models/BLEReading');
const HydrationTest = require('../models/HydrationTest');
const User = require('../models/user');
const { convertArduinoData, calculateHydrationLevel } = require('../sevices/bleDataService');

/**
 * START BLE SESSION
 * Called when browser successfully connects to ESP32
 */
exports.startSession = async (req, res) => {
  try {
    const { deviceName, deviceId, browserInfo } = req.body;
    const userId = req.user.id;

    // Close any existing active sessions for this user
    await BLESession.updateMany(
      { userId, isActive: true },
      { 
        isActive: false, 
        sessionEnd: new Date(),
        'metadata.disconnectReason': 'new_session_started'
      }
    );

    // Create new session
    const session = new BLESession({
      userId,
      deviceName,
      deviceId,
      browserInfo: {
        userAgent: browserInfo?.userAgent || req.headers['user-agent'],
        platform: browserInfo?.platform || 'unknown'
      }
    });

    await session.save();

    console.log(`✅ BLE session started for user ${req.user.email}`);

    res.json({
      success: true,
      message: 'BLE session started',
      session: {
        id: session._id,
        deviceName: session.deviceName,
        startTime: session.sessionStart
      }
    });

  } catch (error) {
    console.error('Error starting BLE session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start session'
    });
  }
};

/**
 * SESSION HEARTBEAT
 * Browser sends this every 30 seconds to keep session alive
 */
exports.sessionHeartbeat = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    const session = await BLESession.findOne({
      _id: sessionId,
      userId,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    session.lastHeartbeat = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Heartbeat received'
    });

  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      message: 'Heartbeat failed'
    });
  }
};

/**
 * END BLE SESSION
 * Called when browser disconnects from ESP32
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId, reason } = req.body;
    const userId = req.user.id;

    const session = await BLESession.findOne({
      _id: sessionId,
      userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const duration = Math.floor((Date.now() - session.sessionStart) / 1000);

    session.isActive = false;
    session.sessionEnd = new Date();
    session.metadata.disconnectReason = reason || 'user_initiated';
    session.metadata.totalDuration = duration;

    await session.save();

    console.log(`🔴 BLE session ended for user ${req.user.email} (${duration}s)`);

    res.json({
      success: true,
      message: 'Session ended',
      stats: {
        duration,
        readingsCount: session.readingsCount
      }
    });

  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

/**
 * GET ACTIVE SESSION
 * Check if user has an active BLE connection
 */
exports.getActiveSession = async (req, res) => {
  try {
    const session = await BLESession.findOne({
      userId: req.user.id,
      isActive: true
    }).sort({ sessionStart: -1 });

    if (!session) {
      return res.json({
        success: true,
        hasActiveSession: false
      });
    }

    res.json({
      success: true,
      hasActiveSession: true,
      session: {
        id: session._id,
        deviceName: session.deviceName,
        startTime: session.sessionStart,
        duration: Math.floor((Date.now() - session.sessionStart) / 1000),
        readingsCount: session.readingsCount
      }
    });

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check session'
    });
  }
};

/**
 * RECEIVE BLE DATA
 * Browser forwards parsed ESP32 sensor data here
 */
exports.receiveData = async (req, res) => {
  try {
    const { sessionId, sensorData, timestamp } = req.body;
    const userId = req.user.id;

    // Verify session exists and is active
    const session = await BLESession.findOne({
      _id: sessionId,
      userId,
      isActive: true
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive session'
      });
    }

    // Convert Arduino format to internal format if needed
    const convertedData = convertArduinoData(sensorData);

    // Calculate hydration level
    const hydrationAnalysis = calculateHydrationLevel(
      convertedData.color,
      convertedData.frequency,
      convertedData.volume
    );

    // Store raw BLE reading
    const reading = new BLEReading({
      userId,
      sessionId,
      sensorData: {
        color: {
          name: sensorData.color,
          rgb: {
            r: sensorData.r,
            g: sensorData.g,
            b: sensorData.b
          },
          value: convertedData.color
        },
        specificGravity: {
          value: parseFloat(sensorData.sg),
          raw: sensorData.sg
        },
        ph: {
          value: parseFloat(sensorData.ph),
          raw: sensorData.ph
        },
        frequency: convertedData.frequency,
        volume: convertedData.volume
      },
      hydrationLevel: hydrationAnalysis.level,
      hydrationPercentage: hydrationAnalysis.percentage,
      readingTimestamp: timestamp ? new Date(timestamp) : new Date(),
      dataQuality: {
        isValid: true,
        validationErrors: []
      }
    });

    await reading.save();

    // Update session stats
    session.readingsCount += 1;
    session.lastHeartbeat = new Date();
    await session.save();

    // Check if this should create a HydrationTest
    const user = await User.findById(userId);
    const isFirstTest = !user.firstTestCompleted;

    // Create hydration test record
    const hydrationTest = new HydrationTest({
      userId,
      hydrationLevel: hydrationAnalysis.level,
      sensorReading: convertedData.color,
      notes: `SG: ${sensorData.sg}, pH: ${sensorData.ph}, Color: ${sensorData.color}`,
      isFirstTest
    });

    await hydrationTest.save();

    // Link reading to test
    reading.testId = hydrationTest._id;
    reading.processed = true;
    await reading.save();

    // Update user if first test
    if (isFirstTest) {
      const accountAge = (Date.now() - user.createdAt.getTime()) / 1000;
      user.firstTestCompleted = true;
      user.timeToFirstTest = Math.round(accountAge);
      user.firstTestDate = new Date();
      await user.save();

      console.log(`🎉 First test via BLE for ${user.email}`);
    }

    console.log(`📊 BLE data received: ${hydrationAnalysis.level}`);

    res.json({
      success: true,
      message: 'Data received and processed',
      reading: {
        id: reading._id,
        hydrationLevel: hydrationAnalysis.level,
        percentage: hydrationAnalysis.percentage,
        timestamp: reading.readingTimestamp
      },
      test: {
        id: hydrationTest._id,
        isFirstTest
      }
    });

  } catch (error) {
    console.error('Error receiving BLE data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process data'
    });
  }
};

/**
 * GET RECENT READINGS
 */
exports.getRecentReadings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const readings = await BLEReading.find({ userId: req.user.id })
      .sort({ readingTimestamp: -1 })
      .limit(limit)
      .select('-__v');

    res.json({
      success: true,
      readings,
      count: readings.length
    });

  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch readings'
    });
  }
};

/**
 * GET SESSION READINGS
 */
exports.getSessionReadings = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const readings = await BLEReading.find({
      sessionId,
      userId: req.user.id
    }).sort({ readingTimestamp: 1 });

    res.json({
      success: true,
      readings,
      count: readings.length
    });

  } catch (error) {
    console.error('Error fetching session readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch readings'
    });
  }
};

/**
 * ADMIN: GET ALL SESSIONS
 */
exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await BLESession.find()
      .populate('userId', 'fullName email')
      .sort({ sessionStart: -1 })
      .limit(100);

    res.json({
      success: true,
      sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
};

/**
 * ADMIN: CLEANUP ABANDONED SESSIONS
 */
exports.cleanupSessions = async (req, res) => {
  try {
    const closedCount = await BLESession.closeAbandonedSessions();

    res.json({
      success: true,
      message: `Closed ${closedCount} abandoned sessions`,
      closedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed'
    });
  }
};