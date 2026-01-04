require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

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
  }
});

const User = mongoose.model('User', userSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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