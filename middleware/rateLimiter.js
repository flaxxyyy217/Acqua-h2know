// middleware/rateLimiter.js
const rateLimit = require('./middleware/rateLimiter');

/**
 * Rate limiter specifically for BLE endpoints
 * Prevents spam from malicious clients
 */
exports.bleRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (1 every 2 seconds)
  message: {
    success: false,
    message: 'Too many BLE requests. Please wait before sending more data.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count requests from same user
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin users if needed
    return req.user && req.user.isAdmin;
  }
});

/**
 * Stricter rate limiter for session creation
 */
exports.sessionRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 session starts per 5 minutes
  message: {
    success: false,
    message: 'Too many session attempts. Please wait before connecting again.'
  },
  keyGenerator: (req) => req.user?.id || req.ip
});

