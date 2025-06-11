const {
  StudentProfile,
  Appointment,
  Document,
  Lead,
  Office,
} = require('../models');
const notificationService = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');

const createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      personalInfo,
      educationalBackground,
      studyPreferences,
      testScores,
      workExperience,
      financialInfo,
      additionalInfo,
    } = req.body;

    // Basic required fields validation
    if (!personalInfo || !educationalBackground || !studyPreferences) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if profile already exists (prevent duplicates)
    const existingProfile = await StudentProfile.findOne({ where: { userId } });
    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    // Create student profile
    const profile = await StudentProfile.create({
      id: uuidv4(), // Primary key of StudentProfile
      userId,
      personalInfo,
      educationalBackground,
      studyPreferences,
      testScores,
      workExperience,
      financialInfo,
      additionalInfo,
    });

    // Determine default office — TODO: Replace with location-based routing later
    const office = await Office.findOne();
    if (!office) {
      return res
        .status(500)
        .json({ error: 'No office available for lead assignment' });
    }

    // Create lead
    const lead = await Lead.create({
      id: uuidv4(),
      studentId: userId,
      officeId: office.id,
      source: 'online',
      studyPreferences,
      languagePreference: personalInfo.languagePreference || 'english',
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Lead created from student profile',
        },
      ],
    });

    await notificationService.sendNotification({
      userId: userId,
      type: 'in_app',
      message: 'Your student profile has been created successfully.',
      details: {
        profileId: profile.id,
        leadId: lead.id,
        officeId: office.id,
      },
    });

    // Optional: notify admin/staff (e.g., office manager)
    const officeManager = await User.findOne({
      where: { role: 'manager', officeId: office.id },
    });
    if (officeManager) {
      await notificationService.sendNotification({
        userId: officeManager.id,
        type: 'in_app',
        message: `A new student has registered: ${req.user.fullName}`,
        details: { studentId: userId, profileId: profile.id },
      });
    }

    return res.status(201).json({
      message: 'Student profile and lead created successfully',
      profile,
      lead,
    });
  } catch (err) {
    console.error('Error creating student profile & lead:', err);
    return res
      .status(500)
      .json({ error: 'Server error while creating profile and lead' });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    await profile.update(req.body);
    await notificationService.sendNotification({
      userId: req.user.id,
      type: 'in_app',
      message: 'Your profile has been updated successfully.',
      details: {
        updatedFields: Object.keys(req.body),
      },
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const getApplicationStatus = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    res.json(profile.additionalInfo.applicationStatus || {});
  } catch (error) {
    next(error);
  }
};

const getPendingTasks = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    res.json(profile.additionalInfo.checklist || []);
  } catch (error) {
    next(error);
  }
};

const getUpcomingAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { studentId: req.user.id, status: 'scheduled' },
      include: [{ model: User, as: 'consultant' }],
    });
    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

const bookAppointment = async (req, res, next) => {
  try {
    const appointmentData = { ...req.body, studentId: req.user.id };
    const appointment = await Appointment.create(appointmentData);
    await notificationService.sendAppointmentConfirmation(
      req.user.id,
      appointment.id
    );

    await notificationService.sendNotification({
      userId: appointment.consultantId,
      type: 'in_app',
      message: 'A new appointment has been booked by a student.',
      details: {
        studentId: req.user.id,
        appointmentId: appointment.id,
        dateTime: appointment.dateTime,
      },
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

const joinMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.body;
    // Placeholder for joining virtual meeting (e.g., generate meeting link)
    res.json({ message: 'Meeting joined', meetingId });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    await notificationService.sendMessage(req.user.id, req.body.message);
    res.json({ message: 'Message sent' });
  } catch (error) {
    next(error);
  }
};

const getCommunicationHistory = async (req, res, next) => {
  try {
    const history = await notificationService.getCommunicationHistory(
      req.user.id
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const uploadReviewDocuments = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new Error('File required');
    const document = await Document.create({
      userId: req.user.id,
      type: req.body.type,
      filePath: file.path,
    });
    await notificationService.notifyDocumentUpload(req.user.id, document.id);

    await notificationService.sendNotification({
      userId: req.user.id,
      type: 'in_app',
      message: `Your document "${req.body.type}" was uploaded successfully.`,
      details: {
        documentId: document.id,
        type: req.body.type,
      },
    });

    // Optional: Notify consultant (if consultant-user relationship exists)
    const lead = await Lead.findOne({ where: { studentId: req.user.id } });
    if (lead?.assignedConsultant) {
      await notificationService.sendNotification({
        userId: lead.assignedConsultant,
        type: 'in_app',
        message: `A student has uploaded a new document: ${req.body.type}`,
        details: { documentId: document.id, studentId: req.user.id },
      });
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
};

const updateProfileInfo = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new AppError('Profile not found', 404);
    await profile.update(req.body);
    await notificationService.notifyProfileUpdate(req.user.id);

    // Optional — also notify assigned consultant:
    const lead = await Lead.findOne({ where: { studentId: req.user.id } });
    if (lead?.assignedConsultant) {
      await notificationService.sendNotification({
        userId: lead.assignedConsultant,
        type: 'in_app',
        message: 'A student has updated their profile info.',
        details: {
          studentId: req.user.id,
          updatedFields: Object.keys(req.body),
        },
      });
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const submitClarifications = async (req, res, next) => {
  try {
    await notificationService.submitClarifications(req.user.id, req.body);

    // Optional: Notify consultant for review
    const lead = await Lead.findOne({ where: { studentId: req.user.id } });
    if (lead?.assignedConsultant) {
      await notificationService.sendNotification({
        userId: lead.assignedConsultant,
        type: 'in_app',
        message: 'A student has submitted clarifications for review.',
        details: {
          studentId: req.user.id,
          clarificationFields: Object.keys(req.body),
        },
      });
    }

    res.json({ message: 'Clarifications submitted' });
  } catch (error) {
    next(error);
  }
};

const getReviewStatus = async (req, res, next) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
    });
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

const getApplicationChecklist = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    res.json(profile.additionalInfo.checklist || []);
  } catch (error) {
    next(error);
  }
};

const getDeadlineCalendar = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    res.json(profile.additionalInfo.deadlines || []);
  } catch (error) {
    next(error);
  }
};

const getDocumentStatus = async (req, res, next) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
    });
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

const downloadApplicationSummary = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findByPk(req.user.id);
    if (!profile) throw new Error('Profile not found');
    const summary = await reportService.generateApplicationSummary(profile);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  updateProfile,
  getApplicationStatus,
  getPendingTasks,
  getUpcomingAppointments,
  bookAppointment,
  joinMeeting,
  sendMessage,
  getCommunicationHistory,
  uploadReviewDocuments,
  updateProfileInfo,
  submitClarifications,
  getReviewStatus,
  getApplicationChecklist,
  getDeadlineCalendar,
  getDocumentStatus,
  downloadApplicationSummary,
};
