// middleware/validation.js
const { body, validationResult } = require('express-validator');

/**
 * Validate BLE session data
 */
exports.validateSession = [
  body('deviceName')
    .trim()
    .notEmpty()
    .withMessage('Device name required')
    .isLength({ max: 100 })
    .withMessage('Device name too long'),
  
  body('deviceId')
    .trim()
    .notEmpty()
    .withMessage('Device ID required'),
  
  body('browserInfo')
    .optional()
    .isObject()
    .withMessage('Browser info must be object'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate BLE sensor data from ESP32
 */
exports.validateBLEData = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID required')
    .isMongoId()
    .withMessage('Invalid session ID'),

  body('sensorData')
    .notEmpty()
    .withMessage('Sensor data required')
    .isObject()
    .withMessage('Sensor data must be object'),

  body('sensorData.color')
    .notEmpty()
    .withMessage('Color data required')
    .isString()
    .withMessage('Color must be string'),

  body('sensorData.r')
    .isInt({ min: 0, max: 255 })
    .withMessage('RGB red value must be 0-255'),

  body('sensorData.g')
    .isInt({ min: 0, max: 255 })
    .withMessage('RGB green value must be 0-255'),

  body('sensorData.b')
    .isInt({ min: 0, max: 255 })
    .withMessage('RGB blue value must be 0-255'),

  body('sensorData.sg')
    .notEmpty()
    .withMessage('Specific gravity required')
    .isString()
    .withMessage('SG must be string')
    .custom((value) => {
      const sg = parseFloat(value);
      if (isNaN(sg) || sg < 1.000 || sg > 1.050) {
        throw new Error('SG must be between 1.000 and 1.050');
      }
      return true;
    }),

  body('sensorData.ph')
    .notEmpty()
    .withMessage('pH required')
    .isString()
    .withMessage('pH must be string')
    .custom((value) => {
      const ph = parseFloat(value);
      if (isNaN(ph) || ph < 4.0 || ph > 9.0) {
        throw new Error('pH must be between 4.0 and 9.0');
      }
      return true;
    }),

  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Invalid timestamp format'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn('⚠️ BLE data validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Invalid sensor data',
        errors: errors.array()
      });
    }
    next();
  }
];
