const {
  StudentProfile,
  Appointment,
  Document,
  Lead,
  Office,
  User,
  Notification,
} = require('../models');
const notificationService = require('../services/notificationService');
const AppError = require('../utils/appError');
const { VALID_TYPES } = require('../utils');
const reportService = require('../services/reportService');
const path = require('path');

const createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId, 'User ID from create');

    const {
      personalInfo,
      educationalBackground,
      studyPreferences,
      testScores,
      workExperience,
      financialInfo,
      additionalInfo,
    } = req.body;
    // Validate required fields for creation
    if (!personalInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID not found' });
    }

    let profile = await StudentProfile.findOne({ where: { userId } });
    console.log(profile, 'User profile from create');

    if (profile) {
      // 🛠️ Update only provided fields
      const updateData = {};
      if (personalInfo) updateData.personalInfo = personalInfo;
      if (educationalBackground)
        updateData.educationalBackground = educationalBackground;
      if (studyPreferences) updateData.studyPreferences = studyPreferences;
      if (testScores) updateData.testScores = testScores;
      if (workExperience) updateData.workExperience = workExperience;
      if (financialInfo) updateData.financialInfo = financialInfo;
      if (additionalInfo) updateData.additionalInfo = additionalInfo;

      await profile.update(updateData);

      await notificationService.sendNotification({
        userId,
        type: 'in_app',
        message: 'Your profile has been updated successfully.',
        details: {
          updatedFields: Object.keys(updateData),
        },
      });

      return res.status(200).json({
        message: 'Student profile updated successfully',
        profile,
      });
    }

    // No profile exists → Create new profile
    profile = await StudentProfile.create({
      userId,
      personalInfo,
      educationalBackground: educationalBackground || {}, // or [] based on schema
      studyPreferences: studyPreferences || {},
      testScores: testScores || {},
      workExperience: workExperience || {},
      financialInfo: financialInfo || {},
      additionalInfo: additionalInfo || {},
    });
    await User.update({ isProfileCreated: true }, { where: { id: userId } });

    const office = await Office.findOne();
    if (!office) {
      return res
        .status(500)
        .json({ error: 'No office available for lead assignment' });
    }

    const lead = await Lead.create({
      studentId: userId,
      officeId: office.id,
      source: 'online',
      studyPreferences: studyPreferences || {},
      languagePreference: personalInfo.languagePreference || 'english',
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Lead created from student profile',
        },
      ],
    });

    await notificationService.sendNotification({
      userId,
      type: 'in_app',
      message: 'Your student profile has been created successfully.',
      details: {
        profileId: profile.id,
        leadId: lead.id,
        officeId: office.id,
      },
    });

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
    console.error('Error creating/updating student profile & lead:', err);
    return res
      .status(500)
      .json({ error: 'Server error while processing profile' });
  }
};

const getProfile = async (req, res) => {
  try {
    const authUserId = req.user.id;
    console.log(authUserId, 'Authenticated user ID');

    // Step 1: Find the user
    const user = await User.findByPk(authUserId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(user.id, 'User found');
    // Step 2: Look up StudentProfile by userId
    const profile = await StudentProfile.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.status(200).json({ profile });
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
    });
    if (!profile) throw new Error('Profile not found');

    console.log(req.body, 'Update profile data:', req.body);
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
    const profile = await StudentProfile.findOne({ userId: req.user.id });
    if (!profile) throw new Error('Profile not found');
    if (!profile.additionalInfo)
      return res.status(200).json({ status: 'pending' });
    res.json(profile.additionalInfo.applicationStatus || {});
  } catch (error) {
    next(error);
  }
};

const getPendingTasks = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user.id });
    if (!profile) throw new Error('Profile not found');
    if (!profile.additionalInfo) return res.status(200).json([]);
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
    const studentId = req.user.id;

    // Check if student has a lead and assigned consultant
    // const lead = await Lead.findOne({ where: { studentId } });

    // if (!lead || !lead.assignedConsultant || !lead.officeId) {
    //   // ❗ No consultant/office assigned – find super_admin or admin
    //   const admin = await User.findOne({ where: { role: 'super_admin' } });

    //   if (admin) {
    //     await notificationService.sendMessage({
    //       studentId: admin.id,
    //       senderId: studentId,
    //       message:
    //         'Request to assign office and consultant to the student before booking appointment.',
    //     });
    //   }

    //   return res.status(400).json({
    //     error:
    //       'You are not assigned to any consultant or office. A request has been sent to admin.',
    //   });
    // }

    // ✅ Create appointment with assigned consultant
    const appointmentData = {
      studentId,
      // consultantId: lead.assignedConsultant,
      consultantId: 'a05e4e98-8444-4ee3-bf88-2ace28c91431',
      officeId: '95e9d665-9c4f-44e5-a38c-87726b9878ff',
      dateTime: req.body.dateTime,
      type: req.body.type,
      notes: req.body.notes,
    };

    const appointment = await Appointment.create(appointmentData);

    // ✅ Notify student and consultant
    await notificationService.sendAppointmentConfirmation(
      studentId,
      appointment.id
    );

    // await notificationService.sendNotification({
    //   userId: lead.assignedConsultant,
    //   type: 'in_app',
    //   message: 'A new appointment has been booked by a student.',
    //   details: {
    //     studentId,
    //     appointmentId: appointment.id,
    //     dateTime: appointment.dateTime,
    //   },
    // });

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
    const studentId = req.user.id;
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // 🔍 Find student's lead
    const lead = await Lead.findOne({ where: { studentId } });

    // ❌ No consultant assigned
    if (!lead || !lead.assignedConsultant) {
      const admin = await User.findOne({ where: { role: 'super_admin' } });

      if (admin) {
        await notificationService.sendMessage({
          studentId: admin.id,
          message: `Student ${req.user.fullName || studentId} is requesting a consultant assignment.`,
          senderId: studentId,
          type: 'text',
        });
      }

      return res.status(400).json({
        error:
          'You are not assigned to any consultant. A request has been sent to the admin.',
      });
    }

    // ✅ Consultant assigned — send message
    const consultantId = lead.assignedConsultant;

    await notificationService.sendMessage({
      studentId: consultantId,
      message,
      senderId: studentId,
      type: 'text',
    });

    return res.json({ message: 'Message sent to assigned consultant' });
  } catch (error) {
    next(error);
  }
};

const getCommunicationHistory = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ where: { studentId: req.user.id } });
    if (!lead || !lead.assignedConsultant) {
      return res.status(200).json([]);
    }
    const history = await notificationService.getCommunicationHistory(
      req.user.id,
      lead.assignedConsultant
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const uploadReviewDocuments = async (req, res, next) => {
  try {
    const files = req.files;
    let { types } = req.body;
    const userId = req.user.id;

    if (!files || files.length === 0) {
      throw new Error('File(s) required');
    }

    if (!types) {
      throw new Error('Document type(s) required');
    }

    if (typeof types === 'string') {
      types = types.includes(',')
        ? types.split(',').map((t) => t.trim())
        : [types.trim()];
    } else if (!Array.isArray(types)) {
      types = [types];
    }

    if (types.length !== files.length) {
      return res.status(400).json({
        error: `The number of types (${types.length}) must match the number of uploaded files (${files.length})`,
      });
    }

    if (!types.every((type) => VALID_TYPES.includes(type))) {
      return res.status(400).json({
        error: 'Invalid document type(s) provided',
        validTypes: VALID_TYPES,
      });
    }

    const documents = await Promise.all(
      files.map(async (file, index) => {
        // Store filePath as /uploads/leads/${filename}
        const filePath = `/uploads/leads/${file.filename}`;

        const document = await Document.create({
          userId,
          type: types[index],
          filePath,
          fileName: file.originalname,
          fileSize: file.size,
        });

        await Notification.create({
          userId,
          type: 'in_app',
          message: 'A new document has been uploaded.',
          status: 'pending',
          details: {
            documentId: document.id,
          },
        });

        await notificationService.sendNotification({
          userId,
          type: 'in_app',
          message: `Your document "${types[index]}" was uploaded successfully.`,
          details: {
            documentId: document.id,
            type: types[index],
          },
        });

        const lead = await Lead.findOne({ where: { studentId: userId } });
        if (lead?.assignedConsultant) {
          await notificationService.sendNotification({
            userId: lead.assignedConsultant,
            type: 'in_app',
            message: `A student has uploaded a new document: ${types[index]}`,
            details: { documentId: document.id, studentId: userId },
          });
        }

        return document;
      })
    );

    res.json({
      success: true,
      message: `${documents.length} document(s) uploaded successfully`,
      documents,
    });
  } catch (error) {
    next(error);
  }
};
const updateProfileInfo = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user.id });
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
    const profile = await StudentProfile.findOne({ userId: req.user.id });
    if (!profile) throw new Error('Profile not found');
    if (!profile.additionalInfo) return res.json([]);
    res.json(profile.additionalInfo.checklist || []);
  } catch (error) {
    next(error);
  }
};

const getDeadlineCalendar = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user.id });
    if (!profile) throw new Error('Profile not found');
    if (!profile.additionalInfo) return res.send([]);
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

// const downloadApplicationSummary = async (req, res, next) => {
//   try {
//     const profile = await StudentProfile.findOne({ userId: req.user.id, });
//     if (!profile) throw new Error('Profile not found');
//     const summary = await reportService.generateApplicationSummary(profile);
//     res.setHeader('Content-Type', 'application/pdf');
//     res.send(summary);
//   } catch (error) {
//     next(error);
//   }
// };

const downloadApplicationSummary = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
    });
    if (!profile) throw new AppError('Profile not found', 404);
    const summary = await reportService.generateApplicationSummary(profile);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=application_summary.pdf'
    );
    res.send(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getProfile,
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
