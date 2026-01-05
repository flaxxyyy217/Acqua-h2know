require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
// Configure email transporter (add after mongoose connection)
var transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready');
  }
});

// Email templates
const emailTemplates = {
  passwordReset: (email, tempPassword) => ({
    subject: '🔑 Your Password Has Been Reset - ACQUA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: white; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .password { font-size: 24px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; }
          .button { background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💧 ACQUA</h1>
            <p>Password Reset Notification</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>Your password has been reset by an administrator. Here are your new login credentials:</p>
            
            <div class="password-box">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong></p>
              <p class="password">${tempPassword}</p>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul>
                <li>This is a temporary password</li>
                <li>Please change it immediately after logging in</li>
                <li>Never share your password with anyone</li>
                <li>If you didn't request this reset, contact support immediately</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.SITE_URL || 'http://localhost:5500'}" class="button">
                Login to ACQUA
              </a>
            </div>

            <p>After logging in with this temporary password, please:</p>
            <ol>
              <li>Go to your account settings</li>
              <li>Change your password to something secure</li>
              <li>Use a combination of letters, numbers, and symbols</li>
            </ol>

            <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br><strong>The ACQUA Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message from ACQUA Hydration Monitoring System</p>
            <p>© 2026 ACQUA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  customMessage: (subject, message, userName) => ({
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }
          .button { background: linear-gradient(135deg, #3b82f6, #0ea5e9); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💧 ACQUA</h1>
            <p>Important Message</p>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <div class="message-box">
              ${message.replace(/\n/g, '<br>')}
            </div>

            <div style="text-align: center;">
              <a href="${process.env.SITE_URL || 'http://localhost:5500'}" class="button">
                Visit ACQUA
              </a>
            </div>

            <p>If you have any questions, please contact our support team.</p>

            <p>Best regards,<br><strong>The ACQUA Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message from ACQUA Hydration Monitoring System</p>
            <p>© 2026 ACQUA. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
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

    // Send email if requested
    if (sendEmail) {
      try {
        const emailContent = emailTemplates.passwordReset(user.email, newPassword);
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'ACQUA <noreply@acqua.com>',
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html
        });

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
      from: process.env.EMAIL_FROM || 'ACQUA <noreply@acqua.com>',
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

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
          from: process.env.EMAIL_FROM || 'ACQUA <noreply@acqua.com>',
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        results.success.push(user.email);
      } catch (error) {
        results.failed.push({ email: user.email, error: error.message });
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// EMAIL CONFIGURATION
var transporter = nodemailer.createTransport({
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
    console.log('⚠️  Password reset emails will not work!');
  } else {
    console.log('✅ Email server is ready to send emails');
  }
});

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
  }
});

const User = mongoose.model('User', userSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';



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
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, fullName: newUser.fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict'
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
      sameSite: 'strict'
    });

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

// Admin Dashboard Route (Protected)
app.get('/admin', authenticateToken, async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get all users with their data (Admin API)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Get all users without passwords
    const users = await User.find().select('-password').lean();
    
    // Add placeholder for hydration results
    const usersWithResults = users.map(user => ({
      ...user,
      hydrationResults: [] // Will be populated when you add hydration tracking
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
    
    // CSV Headers
    let csv = 'Full Name,Email,Account Created,Last Login,Total Tests,Last Test Result,Hydration Status\n';
    
    // Add user data
    users.forEach(user => {
      const createdDate = new Date(user.createdAt).toLocaleDateString();
      csv += `"${user.fullName}","${user.email}","${createdDate}","N/A","0","N/A","N/A"\n`;
    });

    // Set headers for file download
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
        testHistory: []
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
  notes: String
});

const HydrationTest = mongoose.model('HydrationTest', hydrationTestSchema);

// API to add hydration test (for Arduino integration)
app.post('/api/hydration/test', authenticateToken, async (req, res) => {
  try {
    const { hydrationLevel, sensorReading, notes } = req.body;

    const newTest = new HydrationTest({
      userId: req.user.id,
      hydrationLevel,
      sensorReading,
      notes
    });

    await newTest.save();

    res.json({
      success: true,
      message: 'Test recorded successfully',
      test: newTest
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

// 404 Handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// START SERVER
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});