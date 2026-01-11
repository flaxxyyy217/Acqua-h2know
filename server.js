require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/h2know';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  firstTestCompleted: {
    type: Boolean,
    default: false
  },
  timeToFirstTest: {
    type: Number, // Time in seconds
    default: null
  },
  firstTestDate: {
    type: Date,
    default: null
  }
});

const User = mongoose.model('User', userSchema);

// Hydration Test Schema
const hydrationTestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testDate: {
    type: Date,
    default: Date.now
  },
  hydrationLevel: {
    type: String,
    enum: ['Well Hydrated', 'Slightly Dehydrated', 'Dehydrated', 'Severely Dehydrated'],
    required: true
  },
  sensorReading: {
    type: Number,
    required: true
  },
  notes: String,
  isFirstTest: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 6,
    default: null
  },
  ratingComment: {
    type: String,
    default: null
  },
  ratingDate: {
    type: Date,
    default: null
  },
  surveyEmailSent: {
    type: Boolean,
    default: false
  },
  surveyEmailSentDate: {
    type: Date,
    default: null
  }
});

const HydrationTest = mongoose.model('HydrationTest', hydrationTestSchema);

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HydrationTest',
    default: null
  },
  rating: {
    type: Number,
    min: 1,
    max: 6,
    required: true
  },
  comment: {
    type: String,
    default: null
  },
  feedbackDate: {
    type: Date,
    default: Date.now
  },
  testResult: {
    type: String,
    default: null
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// EMAIL CONFIGURATION (Single transporter)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
    console.log('⚠️ Password reset emails will not work!');
    console.log('Please check your EMAIL_USER and EMAIL_PASSWORD in .env file');
  } else {
    console.log('✅ Email server is ready to send emails');
  }
});

// Email templates
const emailTemplates = {
  passwordReset: (email, tempPassword) => ({
    subject: 'Password Reset - ACQUA Hydration System',
    text: `
ACQUA HYDRATION MONITORING SYSTEM
Password Reset Notification
========================================

Dear User,

Your password has been successfully reset. Please use the credentials below to access your account:

Email: ${email}
Temporary Password: ${tempPassword}

IMPORTANT SECURITY NOTICE:
- This is a temporary password for security purposes
- Please change it immediately after logging in
- Never share your password with anyone
- If you did not request this reset, contact support immediately at support@acqua.com

NEXT STEPS:
1. Visit: ${process.env.SITE_URL || 'https://acqua-h2know-1.onrender.com'}
2. Log in with your temporary password
3. Go to Account Settings
4. Change your password to something secure
5. Use a combination of letters, numbers, and symbols for strong security

For assistance or questions, please contact our support team.

Best regards,
The ACQUA Team

________________________________________
This is an automated message from ACQUA Hydration Monitoring System
Please do not reply to this email
© 2026 ACQUA. All rights reserved.
    `
  }),

  customMessage: (subject, message, userName) => ({
    subject: subject,
    text: `
ACQUA HYDRATION MONITORING SYSTEM
${subject}
========================================

Dear ${userName},

${message}

________________________________________

If you have any questions or need assistance, please contact our support team.

Best regards,
The ACQUA Team

ACQUA Hydration Monitoring System
Website: ${process.env.SITE_URL || 'https://acqua-h2know-1.onrender.com'}
Support: support@acqua.com

________________________________________
This is an automated message from ACQUA Hydration Monitoring System
Please do not reply to this email
© 2026 ACQUA. All rights reserved.
    `
  }),

  postTestSurvey: (userName, userEmail, testResult) => ({
    subject: 'Complete Your Post-Test Survey - ACQUA',
    text: `
ACQUA HYDRATION MONITORING SYSTEM
Post-Test Survey Request
========================================

Dear ${userName},

Thank you for completing your hydration test with ACQUA!

Your Test Result: ${testResult}

We value your feedback and would appreciate if you could take a few moments to complete our post-test survey. Your responses help us improve our service and provide better hydration monitoring for all users.

📋 COMPLETE YOUR SURVEY HERE:
https://docs.google.com/forms/d/e/1FAIpQLSfpM7CEa7N4aYiUIcuv2VB8a9XDRdJnH60BWt-SdUSdEAcNYw/viewform?usp=header

The survey will only take 2-3 minutes to complete.

WHY YOUR FEEDBACK MATTERS:
• Helps us improve the accuracy of our hydration tests
• Assists in enhancing user experience
• Contributes to better health monitoring features
• Supports ongoing research and development

Your participation is voluntary but highly appreciated. All responses are confidential and will be used solely for improving our services.

________________________________________

If you have any immediate concerns or questions about your test results, please contact our support team.

Best regards,
The ACQUA Team

ACQUA Hydration Monitoring System
Website: ${process.env.SITE_URL || 'https://acqua-h2know-1.onrender.com'}
Support: support@acqua.com

________________________________________
This is an automated message from ACQUA Hydration Monitoring System
Please do not reply to this email
© 2026 ACQUA. All rights reserved.
    `
  })
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.clearCookie('token');
      return res.redirect('/');
    }
    req.user = user;
    next();
  });
};

// Middleware to redirect logged-in users away from login page
const redirectIfAuthenticated = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        return res.redirect('/homepage');
      }
      next();
    });
  } else {
    next();
  }
};

// PUBLIC ROUTES
app.get('/', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'combo.html'));
});

app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'combo.html'));
});

app.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'combo.html'));
});

// API ROUTES - AUTHENTICATION
app.post('/api/signup', async (req, res) => {
  try {
    console.log('Signup attempt:', { email: req.body.email, fullName: req.body.fullName });
    
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      console.log('Signup failed: Missing fields');
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      console.log('Signup failed: Password too short');
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (existingUser) {
      console.log('Signup failed: Email already exists:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();
    
    console.log('✅ User created:', email);

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, fullName: newUser.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: isProduction
    });

    res.json({ 
      success: true, 
      message: 'Account created successfully',
      redirectUrl: '/homepage'
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Login failed: Missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log('Login failed: User not found:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Login failed: Invalid password for:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: isProduction
    });

    console.log('✅ Login successful:', email);

    res.json({ 
      success: true, 
      message: 'Login successful',
      redirectUrl: '/homepage'
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ 
    success: true, 
    message: 'Logged out successfully',
    redirectUrl: '/'
  });
});

// Forgot Password - Send reset email
app.post('/api/forgot-password', async (req, res) => {
  try {
    console.log('Forgot password request received:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      // Don't reveal if email exists for security, but still return success
      console.log('Email not found:', email);
      return res.json({ 
        success: true, 
        message: 'If that email exists, a reset link has been sent.' 
      });
    }

    // Generate temporary password
    const tempPassword = 'Temp' + Math.random().toString(36).substring(2, 10).toUpperCase() + '!1';
    
    console.log('Generated temp password for:', user.email);
    
    // Hash and save new password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const oldPassword = user.password; // Store old password in case email fails
    
    user.password = hashedPassword;
    await user.save();

    // Send email only if email service is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const emailContent = emailTemplates.passwordReset(user.email, tempPassword);
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ACQUA System" <noreply@acqua.com>',
          to: user.email,
          subject: emailContent.subject,
          text: emailContent.text
        });

        console.log(`✅ Password reset email sent to ${user.email}`);

        res.json({ 
          success: true, 
          message: 'Password reset email sent successfully. Please check your inbox.' 
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        
        // Revert password change if email fails
        user.password = oldPassword;
        await user.save();
        
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send reset email. Email service may not be configured properly.' 
        });
      }
    } else {
      // Email not configured - for development/testing
      console.log('⚠️ Email service not configured. New password:', tempPassword);
      
      res.json({ 
        success: true, 
        message: 'Password reset. (Email service not configured - check server logs for new password)',
        // In production, remove this:
        devPassword: tempPassword 
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

// Admin Reset Password with Email
app.post('/api/admin/reset-password', authenticateToken, async (req, res) => {
  try {
    const { userId, newPassword, sendEmail } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and new password required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset for ${user.email} by admin`);

    // Send email if requested
    if (sendEmail) {
      try {
        const emailContent = emailTemplates.passwordReset(user.email, newPassword);
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ACQUA System" <noreply@acqua.com>',
          to: user.email,
          subject: emailContent.subject,
          text: emailContent.text
        });

        console.log(`✅ Password reset email sent to ${user.email}`);

        res.json({ 
          success: true, 
          message: `Password reset for ${user.email}. Email sent successfully.`,
          tempPassword: newPassword,
          emailSent: true
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        res.json({ 
          success: true, 
          message: `Password reset for ${user.email}, but email failed to send.`,
          tempPassword: newPassword,
          emailSent: false,
          emailError: emailError.message
        });
      }
    } else {
      res.json({ 
        success: true, 
        message: `Password reset for ${user.email}`,
        tempPassword: newPassword,
        emailSent: false
      });
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
});

// Send Custom Email to User
app.post('/api/admin/send-email', authenticateToken, async (req, res) => {
  try {
    const { userId, subject, message } = req.body;

    if (!userId || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID, subject, and message are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const emailContent = emailTemplates.customMessage(subject, message, user.fullName);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ACQUA System" <noreply@acqua.com>',
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text
    });

    console.log(`✅ Custom email sent to ${user.email}`);

    res.json({ 
      success: true, 
      message: `Email sent successfully to ${user.email}`
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email: ' + error.message 
    });
  }
});

// Send Bulk Email
app.post('/api/admin/send-bulk-email', authenticateToken, async (req, res) => {
  try {
    const { userIds, subject, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User IDs array is required' 
      });
    }

    if (!subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject and message are required' 
      });
    }

    const users = await User.find({ _id: { $in: userIds } });

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No users found' 
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const user of users) {
      try {
        const emailContent = emailTemplates.customMessage(subject, message, user.fullName);
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ACQUA System" <noreply@acqua.com>',
          to: user.email,
          subject: emailContent.subject,
          text: emailContent.text
        });

        results.success.push(user.email);
        console.log(`✅ Bulk email sent to ${user.email}`);
      } catch (error) {
        results.failed.push({ email: user.email, error: error.message });
        console.error(`❌ Failed to send bulk email to ${user.email}:`, error.message);
      }
    }

    res.json({ 
      success: true, 
      message: `Sent ${results.success.length} emails successfully. ${results.failed.length} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send bulk emails: ' + error.message 
    });
  }
});

// PROTECTED ROUTES
app.get('/homepage', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

app.get('/reminders', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reminders.html'));
});

app.get('/notification', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'notification.html'));
});

app.get('/badges', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'badges.html'));
});

app.get('/manual', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Manual.html'));
});

app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW: Check if user needs timer (first test not completed)
app.get('/api/user/timer-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('firstTestCompleted timeToFirstTest createdAt');
    
    res.json({ 
      success: true, 
      needsTimer: !user.firstTestCompleted,
      accountCreatedAt: user.createdAt,
      timeToFirstTest: user.timeToFirstTest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Dashboard Route (Protected)
app.get('/admin', authenticateToken, async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get all users with their data (Admin API)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    const usersWithResults = users.map(user => ({
      ...user,
      hydrationResults: []
    }));

    res.json({ 
      success: true, 
      users: usersWithResults,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

// Get all feedback (Admin API)
app.get('/api/admin/feedback', authenticateToken, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ feedbackDate: -1 })
      .populate('userId', 'fullName email')
      .populate('testId', 'hydrationLevel testDate')
      .lean();

    res.json({ 
      success: true, 
      feedback: feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching feedback' 
    });
  }
});

// Get feedback statistics (Admin API)
app.get('/api/admin/feedback/stats', authenticateToken, async (req, res) => {
  try {
    const totalFeedback = await Feedback.countDocuments();
    
    const ratingStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const avgRating = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    const feedbackWithComments = await Feedback.countDocuments({ 
      comment: { $ne: null, $ne: '' } 
    });

    res.json({ 
      success: true, 
      stats: {
        totalFeedback,
        averageRating: avgRating.length > 0 ? avgRating[0].averageRating.toFixed(2) : 0,
        ratingDistribution: ratingStats,
        feedbackWithComments,
        feedbackWithoutComments: totalFeedback - feedbackWithComments
      }
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching feedback statistics' 
    });
  }
});

// Export users to CSV
app.get('/api/admin/export/csv', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    let csv = 'Full Name,Email,Account Created,Last Login,Total Tests,Last Test Result,Hydration Status,Time to First Test (seconds)\n';
    
    users.forEach(user => {
      const createdDate = new Date(user.createdAt).toLocaleDateString();
      const timeToFirstTest = user.timeToFirstTest || 'N/A';
      csv += `"${user.fullName}","${user.email}","${createdDate}","N/A","0","N/A","N/A","${timeToFirstTest}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=acqua_users_' + Date.now() + '.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Export feedback to CSV
app.get('/api/admin/export/feedback-csv', authenticateToken, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ feedbackDate: -1 })
      .lean();

    let csv = 'Date,User Name,Email,Rating (1-6),Test Result,Comment\n';
    
    feedback.forEach(item => {
      const date = new Date(item.feedbackDate).toLocaleString();
      const comment = (item.comment || 'No comment').replace(/"/g, '""'); // Escape quotes
      csv += `"${date}","${item.userName}","${item.userEmail}","${item.rating}","${item.testResult || 'N/A'}","${comment}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=acqua_feedback_' + Date.now() + '.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Export feedback to JSON
app.get('/api/admin/export/feedback-json', authenticateToken, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ feedbackDate: -1 })
      .lean();

    const exportData = {
      exportDate: new Date().toISOString(),
      totalFeedback: feedback.length,
      feedback: feedback.map(item => ({
        date: item.feedbackDate,
        userName: item.userName,
        userEmail: item.userEmail,
        rating: item.rating,
        testResult: item.testResult,
        comment: item.comment,
        testId: item.testId
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=acqua_feedback_' + Date.now() + '.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// Export users to JSON
app.get('/api/admin/export/json', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      totalUsers: users.length,
      users: users.map(user => ({
        fullName: user.fullName,
        email: user.email,
        accountCreated: user.createdAt,
        totalTests: 0,
        lastTestResult: 'N/A',
        hydrationStatus: 'N/A',
        testHistory: [],
        timeToFirstTest: user.timeToFirstTest || null,
        firstTestCompleted: user.firstTestCompleted || false
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=acqua_users_' + Date.now() + '.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// API to add hydration test
app.post('/api/hydration/test', authenticateToken, async (req, res) => {
  try {
    const { hydrationLevel, sensorReading, notes, elapsedTime } = req.body;

    const user = await User.findById(req.user.id);
    
    // Check if this is the first test
    const isFirstTest = !user.firstTestCompleted;

    const newTest = new HydrationTest({
      userId: req.user.id,
      hydrationLevel,
      sensorReading,
      notes,
      isFirstTest
    });

    await newTest.save();

    // Update user if this is their first test
    if (isFirstTest && elapsedTime) {
      user.firstTestCompleted = true;
      user.timeToFirstTest = Math.round(elapsedTime); // Store in seconds
      user.firstTestDate = new Date();
      await user.save();
      
      console.log(`✅ First test completed for ${user.email}. Time: ${Math.round(elapsedTime)} seconds`);
    }

    // Send post-test survey email
    sendPostTestSurveyEmail(user, newTest);

    res.json({
      success: true,
      message: 'Test recorded successfully',
      test: newTest,
      testId: newTest._id,
      isFirstTest,
      timeToFirstTest: isFirstTest ? user.timeToFirstTest : null
    });
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).json({ success: false, message: 'Failed to save test' });
  }
});

// Get user's hydration history
app.get('/api/hydration/history', authenticateToken, async (req, res) => {
  try {
    const tests = await HydrationTest.find({ userId: req.user.id })
      .sort({ testDate: -1 })
      .limit(50);

    res.json({ success: true, tests });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// Helper function to send post-test survey email
async function sendPostTestSurveyEmail(user, test) {
  // Only send if email service is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email service not configured. Skipping survey email.');
    return;
  }

  // Don't send if already sent for this test
  if (test.surveyEmailSent) {
    return;
  }

  try {
    const emailContent = emailTemplates.postTestSurvey(
      user.fullName, 
      user.email, 
      test.hydrationLevel
    );
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ACQUA System" <noreply@acqua.com>',
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text
    });

    // Mark survey email as sent
    test.surveyEmailSent = true;
    test.surveyEmailSentDate = new Date();
    await test.save();

    console.log(`✅ Post-test survey email sent to ${user.email}`);
  } catch (emailError) {
    console.error('Error sending post-test survey email:', emailError);
    // Don't throw error - test should still be saved even if email fails
  }
}

// Submit rating for a test
app.post('/api/hydration/rating', authenticateToken, async (req, res) => {
  try {
    const { rating, comment, testId } = req.body;

    if (!rating || rating < 1 || rating > 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid rating (1-6) is required' 
      });
    }

    // Get user info
    const user = await User.findById(req.user.id);

    // If testId is provided, update that specific test
    // Otherwise, update the most recent test
    let test;
    
    if (testId) {
      test = await HydrationTest.findOne({ 
        _id: testId, 
        userId: req.user.id 
      });
    } else {
      test = await HydrationTest.findOne({ userId: req.user.id })
        .sort({ testDate: -1 });
    }

    if (!test) {
      return res.status(404).json({ 
        success: false, 
        message: 'Test not found' 
      });
    }

    // Update test with rating
    test.rating = rating;
    test.ratingComment = comment || null;
    test.ratingDate = new Date();
    
    await test.save();

    // Create separate feedback record with user details
    const feedback = new Feedback({
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      testId: test._id,
      rating: rating,
      comment: comment || null,
      testResult: test.hydrationLevel,
      feedbackDate: new Date()
    });

    await feedback.save();

    console.log(`✅ Rating submitted: ${rating} stars by ${user.fullName} (${user.email})`);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: {
        rating: test.rating,
        comment: test.ratingComment,
        date: test.ratingDate
      }
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// START SERVER (Only once!)
const PORT = process.env.PORT || 5500;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔗 URL: ${process.env.SITE_URL || 'http://localhost:' + PORT}`);
});