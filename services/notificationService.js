const { Notification, User, Appointment, Message, Document } = require('../models');
const nodemailer = require('nodemailer');
const AppError = require('../utils/appError');
const { Op } = require('sequelize');
const { VALID_TYPES } = require('../utils');

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
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
      // throw new AppError('Failed to send email', 500);
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
      message: `Your appointment is scheduled for ${appointment.dateTime.toISOString()}.`,
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
      message: `Your appointment on ${appointment.dateTime.toISOString()} has been canceled.`,
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
      message: `Reminder: Your appointment is scheduled for ${appointment.dateTime.toISOString()}.`,
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
  if (!userId || !clarificationData || !clarificationData.clarification) {
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
      message: `${clarificationData.clarification}`,
      status: 'pending',
      details: clarificationData,
    });
  }
};

const requestProfileInfo = async (studentId, requestData) => {
  if (!studentId || !requestData || !requestData.message) {
    throw new AppError('Student ID and request message are required', 400);
  }

  const user = await User.findByPk(studentId);
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
      userId: studentId,
      type: 'in_app',
      message: `Profile information requested: ${requestData.message}`,
      status: 'pending',
      details: requestData,
    });
  }
};

const sendReviewNotification = async (studentId, reviewData) => {
  if (!studentId || !reviewData || !reviewData.message) {
    throw new AppError('Student ID and review message are required', 400);
  }

  const user = await User.findByPk(studentId);
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
      userId: studentId,
      type: 'in_app',
      message: `Review requested: ${reviewData.message}`,
      status: 'pending',
      details: reviewData,
    });
  }
};

const sendMessage = async ({ studentId, message, senderId, type="text", }) => {
  if (!studentId || !message || !senderId) {
    throw new AppError('Student ID, message, and sender ID are required', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Store message in Messages table
  await Message.create({
    senderId,
    recipientId: studentId,
    content: message,
    isReceiverRead: false,
    type,
  });

  // Send notification
  const preferences = user.notificationPreferences || {
    email: true,
    sms: true,
    in_app: true,
  };
  if (preferences.in_app) {
    await Notification.create({
      userId: studentId,
      type: 'in_app',
      message: `New message: ${message}`,
      status: 'pending',
      details: { senderId },
    });
  }
};

const shareResources = async (studentId, resources) => {
  if (
    !studentId ||
    !Array.isArray(resources) ||
    resources.length === 0 ||
    !resources.every((item) => typeof item === 'string')
  ) {
    throw new AppError(
      'Student ID and a non-empty array of string resources are required',
      400
    );
  }

  const user = await User.findByPk(studentId);
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
      id: require('uuid').v4(),
      userId: studentId,
      type: 'in_app',
      message: 'New resources have been shared with you.',
      status: 'pending',
      details: { resources },
    });
  }
};

// general for all
const getCommunicationHistory = async (senderId, recipientId) => {
  if (!senderId || !recipientId) {
    throw new AppError('Sender ID and recipient ID are required', 400);
  }

  const history = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: senderId, recipientId: recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
    },
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return history;
};

// general use for all
const markMessagesAsRead = async (senderId, recipientId) => {
  if (!senderId || !recipientId) {
    throw new AppError('Student ID and counselor ID are required', 400);
  }

  await Message.update(
    { isReceiverRead: true },
    {
      where: {
        senderId,
        recipientId,
        isReceiverRead: false,
      },
    }
  );
};

const trackDocumentSubmission = async (studentId, files, types, notes) => {
  if (
    !studentId ||
    !Array.isArray(files) ||
    files.length === 0 ||
    !Array.isArray(types) ||
    types.length !== files.length ||
    !Array.isArray(notes) ||
    notes.length !== files.length
  ) {
    throw new AppError(
      'Student ID, files, types, and notes arrays are required and must have equal length',
      400
    );
  }

  if (!types.every((type) => VALID_TYPES.includes(type))) {
    throw new AppError('Invalid document type provided', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const documents = [];
  for (let i = 0; i < files.length; i++) {
    const document = await Document.create({
      userId: studentId,
      type: types[i],
      filePath: files[i].path,
      notes: notes[i] || null,
    });

    await Notification.create({
      userId: studentId,
      type: 'in_app',
      message: `Your document "${types[i]}" has been submitted successfully.`,
      status: 'pending',
      details: { documentId: document.id },
    });

    documents.push(document);
  }

  return documents;
};

const setDeadlineReminder = async (studentId, reminderData) => {
  if (
    !studentId ||
    !reminderData ||
    !reminderData.deadline ||
    !reminderData.message
  ) {
    throw new AppError('Student ID, deadline, and message are required', 400);
  }

  const deadline = new Date(reminderData.deadline);
  if (isNaN(deadline.getTime())) {
    throw new AppError('Invalid deadline date format', 400);
  }

  const user = await User.findByPk(studentId);
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
      userId: studentId,
      type: 'in_app',
      message: reminderData.message,
      status: 'pending',
      details: { deadline: reminderData.deadline },
    });
  }
};

const uploadLeadDocuments = async (leadId, studentId, files, types, notes) => {
  if (
    !leadId ||
    !studentId ||
    !Array.isArray(files) ||
    files.length === 0 ||
    !Array.isArray(types) ||
    types.length !== files.length ||
    !Array.isArray(notes) ||
    notes.length !== files.length
  ) {
    throw new AppError(
      'Lead ID, student ID, files, types, and notes arrays are required and must have equal length',
      400
    );
  }

  if (!types.every((type) => VALID_TYPES.includes(type))) {
    throw new AppError('Invalid document type provided', 400);
  }

  const user = await User.findByPk(studentId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const documents = await Promise.all(
    files.map(async (file, index) => {
      const document = await Document.create({
        userId: studentId,
        type: types[index],
        filePath: file.path,
        notes: notes[index] || null,
      });

      await Notification.create({
        userId: studentId,
        type: 'in_app',
        message: `New document uploaded: ${types[index]}`,
        status: 'pending',
        details: { leadId, documentId: document.id },
      });

      return document;
    })
  );

  return documents;
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
  requestProfileInfo,
  sendReviewNotification,
  sendMessage,
  shareResources,
  getCommunicationHistory,
  markMessagesAsRead,
  trackDocumentSubmission,
  setDeadlineReminder,
  uploadLeadDocuments,
};
