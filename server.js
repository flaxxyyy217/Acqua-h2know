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
  }
});

const HydrationTest = mongoose.model('HydrationTest', hydrationTestSchema);

// EMAIL CONFIGURATION (Enhanced with better error handling)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // Use 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  },
  debug: true, // Enable debug output
  logger: true // Log to console
});

// Verify email configuration on startup with detailed logging
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:');
    console.log('Error details:', error);
    console.log('⚠️ Password reset emails will not work!');
    console.log('Please check your EMAIL_USER and EMAIL_PASSWORD in .env file');
    console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
    console.log('🔑 EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    console.log('🔑 EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
  } else {
    console.log('✅ Email server is ready to send emails');
    console.log('📧 Sending from:', process.env.EMAIL_USER);
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

// Forgot Password - Send reset email (IMPROVED VERSION)
app.post('/api/forgot-password', async (req, res) => {
  try {
    console.log('🔐 Forgot password request received');
    console.log('📧 Request body:', { email: req.body.email });
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log('❌ Email not found:', email);
      return res.json({ 
        success: true, 
        message: 'If that email exists, a reset link has been sent.' 
      });
    }

    // Generate temporary password
    const tempPassword = 'Temp' + Math.random().toString(36).substring(2, 10).toUpperCase() + '!1';
    
    console.log('✅ Generated temp password for:', user.email);
    
    // Hash and save new password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const oldPassword = user.password;
    
    user.password = hashedPassword;
    await user.save();

    console.log('💾 Password updated in database');

    // Send email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const emailContent = emailTemplates.passwordReset(user.email, tempPassword);
        
        console.log('📧 Attempting to send email to:', user.email);
        console.log('📧 From:', process.env.EMAIL_FROM || process.env.EMAIL_USER);
        
        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"ACQUA System" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: emailContent.subject,
          text: emailContent.text
        });

        console.log('✅ Email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('📝 Accepted:', info.accepted);
        console.log('🚫 Rejected:', info.rejected);

        res.json({ 
          success: true, 
          message: '✅ Password reset email sent successfully. Please check your inbox (and spam folder).' 
        });
      } catch (emailError) {
        console.error('❌ Email send error:');
        console.error('Error name:', emailError.name);
        console.error('Error message:', emailError.message);
        console.error('Error code:', emailError.code);
        console.error('Full error:', emailError);
        
        // Revert password change if email fails
        user.password = oldPassword;
        await user.save();
        
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send reset email. Error: ' + emailError.message 
        });
      }
    } else {
      console.log('⚠️ Email service not configured');
      console.log('EMAIL_USER:', !!process.env.EMAIL_USER);
      console.log('EMAIL_PASSWORD:', !!process.env.EMAIL_PASSWORD);
      
      res.status(500).json({ 
        success: false, 
        message: 'Email service not configured on server' 
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
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

    res.json({
      success: true,
      message: 'Test recorded successfully',
      test: newTest,
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

// TEST EMAIL ENDPOINT - Add this after your other routes
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
    console.log('🔑 EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
    
    const testEmail = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"ACQUA Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'ACQUA Email Test - ' + new Date().toLocaleString(),
      text: 'If you receive this email, your email configuration is working correctly!',
      html: '<h1>✅ Success!</h1><p>Your ACQUA email system is configured correctly.</p>'
    });

    console.log('✅ Test email sent!');
    console.log('Message ID:', testEmail.messageId);
    console.log('Response:', testEmail.response);

    res.json({
      success: true,
      message: 'Test email sent! Check your inbox (and spam folder)',
      details: {
        messageId: testEmail.messageId,
        response: testEmail.response,
        accepted: testEmail.accepted,
        rejected: testEmail.rejected
      }
    });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed: ' + error.message,
      error: {
        name: error.name,
        code: error.code,
        command: error.command
      }
    });
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