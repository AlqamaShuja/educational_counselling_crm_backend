const { Notification, User, Appointment } = require('../models');
const nodemailer = require('nodemailer');
const AppError = require('../utils/appError');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendNotification = async ({ userId, type, message, details }) => {
  const notification = await Notification.create({
    userId,
    type,
    message,
    status: 'pending',
    details,
  });

  if (type === 'email') {
    try {
      const user = await User.findByPk(userId);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Education Consulting CRM Notification',
        text: message,
      });
      notification.status = 'sent';
      await notification.save();
    } catch (error) {
      notification.status = 'failed';
      await notification.save();
      throw new AppError('Failed to send email', 500);
    }
  } else if (type === 'sms') {
    // Placeholder: Implement SMS service (e.g., Twilio)
    notification.status = 'sent'; // Mock for now
    await notification.save();
  }

  return notification;
};

const getNotifications = async (userId) => {
  return Notification.findAll({ where: { userId } });
};

const markNotificationRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }
  notification.read = true;
  await notification.save();
  return notification;
};

const setPreferences = async (userId, preferences) => {
  // Validate user
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Validate preferences
  if (!preferences || typeof preferences !== 'object') {
    throw new AppError('Invalid preferences format', 400);
  }

  const validTypes = ['email', 'sms', 'in_app'];
  const invalidKeys = Object.keys(preferences).filter(
    (key) => !validTypes.includes(key)
  );
  if (invalidKeys.length > 0) {
    throw new AppError(
      `Invalid preference types: ${invalidKeys.join(', ')}`,
      400
    );
  }

  // Ensure all valid types are included, defaulting to existing or true
  const currentPreferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  const updatedPreferences = {
    email:
      typeof preferences.email === 'boolean'
        ? preferences.email
        : currentPreferences.email,
    sms:
      typeof preferences.sms === 'boolean'
        ? preferences.sms
        : currentPreferences.sms,
    in_app:
      typeof preferences.in_app === 'boolean'
        ? preferences.in_app
        : currentPreferences.in_app,
  };

  // Update user
  await user.update({ notificationPreferences: updatedPreferences });
};

const sendAppointmentConfirmation = async (studentId, appointmentId) => {
  if (!studentId || !appointmentId) {
    throw new AppError('Student ID and appointment ID are required', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      userId: studentId,
      type: 'in_app',
      message: `Your appointment is scheduled for ${appointment.scheduledAt.toISOString()}.`,
      status: 'pending',
      details: { appointmentId },
    });
  }
};

const notifyCancellation = async (studentId, appointmentId) => {
  if (!studentId || !appointmentId) {
    throw new AppError('Student ID and appointment ID are required', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      id: require('uuid').v4(),
      userId: studentId,
      type: 'in_app',
      message: `Your appointment on ${appointment.scheduledAt.toISOString()} has been canceled.`,
      status: 'pending',
      details: { appointmentId },
    });
  }
};

const sendAppointmentReminder = async (studentId, appointmentId) => {
  if (!studentId || !appointmentId) {
    throw new AppError('Student ID and appointment ID are required', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      userId: studentId,
      type: 'in_app',
      message: `Reminder: Your appointment is scheduled for ${appointment.scheduledAt.toISOString()}.`,
      status: 'pending',
      details: { appointmentId },
    });
  }
};

const notifyProfileUpdate = async (userId) => {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      userId,
      type: 'in_app',
      message: 'Your profile has been updated successfully.',
      status: 'pending',
      details: { updatedAt: new Date().toISOString() },
    });
  }
};

const submitClarifications = async (userId, clarificationData) => {
  if (!userId || !clarificationData || !clarificationData.message) {
    throw new AppError('User ID and clarification message are required', 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      userId,
      type: 'in_app',
      message: `Clarification submitted: ${clarificationData.message}`,
      status: 'pending',
      details: clarificationData,
    });
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  markNotificationRead,
  setPreferences,
  sendAppointmentConfirmation,
  notifyCancellation,
  sendAppointmentReminder,
  notifyProfileUpdate,
  submitClarifications,
};
