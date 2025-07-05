const { User, Lead, StudentProfile } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const axios = require('axios');
const AppError = require('../utils/appError');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // throw new Error('Invalid credentials');
      throw new AppError('Invalid credentials', 400);
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, officeId: user.officeId },
      process.env.JWT_SECRET
      // { expiresIn: '30m' } // Session timeout (User Story 1.1)
    );

    await User.update({ lastLogin: new Date() }, { where: { id: user.id } });

    const { password: savedPassword, ...userWithoutPassword } = user.get({
      plain: true,
    });

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};


const signup = async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      officeId,
      studyPreferences = {},
      ...rest
    } = req.body;

    if (!email || !password || !name) {
      throw new Error('Email, password, name, are required');
    }
    
    let location = null;
    if(!officeId){
      // 🔍 Get user IP
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  
      // 🌍 Optional: Get location
      try {
        const geo = await axios.get(`http://ip-api.com/json/${ip}`);
        location = geo.data; // e.g., geo.data.city, geo.data.country, etc.
        console.log('User location from IP:', location);
      } catch (err) {
        console.warn('Failed to fetch geolocation:', err.message);
      }
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      ...rest,
      role: 'student',
      isActive: true,
      officeId,
      signupLocation: 'in-app',
    });

    // Create StudentProfile
    await StudentProfile.create({
      userId: newUser.id,
      personalInfo: {},
      educationalBackground: {},
      studyPreferences,
    });

    // Create Lead
    const lead = await Lead.create({
      studentId: newUser.id,
      officeId,
      source: 'online',
      assignedConsultant: null,
      studyPreferences,
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Lead created from student signup',
        },
      ],
    });

    res.status(201).json({
      message: 'Student registered and lead created successfully',
      userId: newUser.id,
      leadId: lead.id,
      location,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Invalidate token (client-side or use blacklist in production)
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    next(error);
  }
};

const confirmPasswordReset = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new Error('Invalid token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update({ password: hashedPassword }, { where: { id: user.id } });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  signup,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
};
