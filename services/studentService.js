const {
  StudentProfile,
  Appointment,
  Document,
  Notification,
} = require('../models');
const AppError = require('../utils/appError');
const path = require('path');

const createProfile = async (
  userId,
  { personalInfo, educationalBackground, studyPreferences }
) => {
  const existingProfile = await StudentProfile.findOne({ where: { userId } });
  if (existingProfile) {
    throw new AppError('Profile already exists', 400);
  }
  return StudentProfile.create({
    userId,
    personalInfo,
    educationalBackground,
    studyPreferences,
  });
};

const updateProfile = async (userId, profileData) => {
  const profile = await StudentProfile.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }
  return profile.update(profileData);
};

const getApplicationStatus = async (userId) => {
  const profile = await StudentProfile.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }
  return profile.additionalInfo?.applicationStatus || 'Not Started';
};

const bookAppointment = async ({
  userId,
  consultantId,
  dateTime,
  type,
  notes,
}) => {
  const profile = await StudentProfile.findOne({ where: { userId } });
  if (!profile) {
    throw new AppError('Profile not found', 404);
  }
  return Appointment.create({
    studentId: userId,
    consultantId,
    dateTime,
    type,
    notes,
  });
};

const uploadReviewDocuments = async (userId, { type, file }) => {
  const filePath = `/uploads/leads/${file.filename}`;
  return Document.create({
    userId,
    type,
    filePath,
    status: 'pending',
  });
};

const getCommunicationHistory = async (userId) => {
  return Notification.findAll({ where: { userId } });
};

module.exports = {
  createProfile,
  updateProfile,
  getApplicationStatus,
  bookAppointment,
  uploadReviewDocuments,
  getCommunicationHistory,
};
