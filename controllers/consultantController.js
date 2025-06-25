const {
  Lead,
  StudentProfile,
  Appointment,
  Document,
  OfficeConsultant,
  User,
  Task,
} = require('../models');
const leadService = require('../services/leadService');
const notificationService = require('../services/notificationService');
const AppError = require('../utils/appError');

const getLeadDocuments = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      where: {
        id: req.params.id,
        assignedConsultant: req.user.id,
      },
      include: [{ model: User, as: 'student' }],
    });
    if (!lead) {
      throw new AppError('Lead not found or not assigned to consultant', 404);
    }
    const documents = await Document.findAll({
      where: { userId: lead.studentId },
    });
    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

const getLeadTasks = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      where: {
        id: req.params.id,
        assignedConsultant: req.user.id,
      },
    });
    if (!lead) {
      throw new AppError('Lead not found or not assigned to consultant', 404);
    }
    const tasks = await Task.findAll({
      where: { leadId: lead.id },
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};
const getAssignedLeads = async (req, res, next) => {
  try {
    const leads = await Lead.findAll({
      where: { assignedConsultant: req.user.id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: { exclude: ['password', 'ificationPreferences'] },
          include: [
            {
              model: StudentProfile,
              as: 'profile',
              required: false,
            },
          ],
        },
      ],
    });

    res.json(leads);
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id)
      throw new Error('Lead not found');
    await lead.update({ status });
    await leadService.logLeadHistory(lead.id, `status: ${status}`, req.user.id);

    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `Your lead status has been updated to: ${status}`,
      details: {
        leadId: lead.id,
      },
    });

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const addConsultationNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id)
      throw new Error('Lead not found');
    const history = [
      ...lead.history,
      { note, timestamp: new Date(), userId: req.user.id },
    ];
    await lead.update({ history });

    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: 'Your consultant has added new notes to your profile.',
      details: {
        leadId: lead.id,
      },
    });

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

/**
 * Converts nearly-any “array-like” value to a real array of trimmed strings.
 * Returns [] for falsy/empty input.
 */
const toArray = (raw) => {
  // Already an array?  Great – just clone to avoid mutating caller’s array.
  if (Array.isArray(raw)) return [...raw];

  // Nullish or empty string → empty array
  if (!raw || (typeof raw === 'string' && raw.trim() === '')) return [];

  let str = String(raw).trim();

  // --- 1️⃣ Try regular JSON.parse (works for '["a","b"]') -------------
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {
    /* ignore */
  }

  // --- 2️⃣ Fix single quotes & try again ------------------------------
  try {
    const jsonFriendly = str
      .replace(/^\s*'\[/, '[') // "'[" → "["
      .replace(/\]\s*'$/, ']') // "]'" → "]"
      .replace(/'/g, '"'); // all single → double quotes
    const parsed = JSON.parse(jsonFriendly);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {
    /* ignore */
  }

  // --- 3️⃣ Fallback: treat as comma-separated string -------------------
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean); // remove empty segments
};

// const uploadLeadDocument = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const files = req.files;
//     let { types, notes } = req.body;

//     if (!files || files.length === 0) {
//       throw new AppError('File(s) required', 400);
//     }

//     if (!Array.isArray(types)) {
//       try {
//         types = JSON.parse(types);
//       } catch (error) {
//         types = types.split(',');
//       }
//     }
//     if (!Array.isArray(notes)) {
//       try {
//         types = JSON.parse(notes);
//       } catch (error) {
//         notes = notes.split(',');
//       }
//     }

//     const lead = await Lead.findByPk(id);
//     if (!lead || lead.assignedConsultant !== req.user.id) {
//       throw new AppError('Lead not found or not assigned to you', 404);
//     }

//     const documents = await notificationService.uploadLeadDocuments(
//       id,
//       lead.studentId,
//       files,
//       types,
//       notes
//     );

//     res.json(documents);
//   } catch (error) {
//     next(error);
//   }
// };

const uploadLeadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;
    let { types, notes } = req.body;

    if (!files || files.length === 0) {
      throw new AppError('File(s) required', 400);
    }

    // 🔄 Normalise both fields with one line each
    types = toArray(types);
    notes = toArray(notes);

    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id) {
      throw new AppError('Lead not found or not assigned to you', 404);
    }

    const documents = await notificationService.uploadLeadDocuments(
      id,
      lead.studentId,
      files,
      types,
      notes
    );

    res.json(documents);
  } catch (error) {
    next(error);
  }
};

const setFollowUpTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taskData = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id)
      throw new Error('Lead not found');
    await leadService.setFollowUpTask(lead.id, taskData, req.user.id);

    //
    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `Your consultant has scheduled a follow-up task.`,
      details: {
        leadId: lead.id,
      },
    });

    res.json({ message: 'Task set' });
  } catch (error) {
    next(error);
  }
};

const getStudentProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    let profile = await StudentProfile.findOne({
      where: {
        userId: lead.studentId,
      },
    });
    if (!profile) {
      profile = await StudentProfile.create({
        userId: id,
        personalInfo: {},
        educationalBackground: {},
        studyPreferences: {},
      });
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const requestProfileInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    await notificationService.requestProfileInfo(id, req.body);
    res.json({ message: 'Info requested' });
  } catch (error) {
    next(error);
  }
};

const sendReviewNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    await notificationService.sendReviewNotification(id, req.body);
    res.json({ message: 'Notification sent' });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    await notificationService.sendMessage({
      studentId: id,
      message: req.body.message,
      senderId: req.user.id,
      type: 'text',
    });
    res.json({ message: 'Message sent' });
  } catch (error) {
    next(error);
  }
};

const scheduleMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that the lead is assigned to this consultant
    const lead = await Lead.findOne({
      where: {
        studentId: id,
        assignedConsultant: req.user.id,
      },
    });

    if (!lead) throw new AppError('Student not found', 404);

    // Step 1: Determine officeId
    let officeId = req.user.officeId;

    if (!officeId) {
      // If not present on the user object, look it up from OfficeConsultant
      const officeConsultant = await OfficeConsultant.findOne({
        where: { userId: req.user.id },
      });

      if (!officeConsultant) {
        throw new AppError('Consultant is not associated with any office', 400);
      }

      officeId = officeConsultant.officeId;
    }

    // Step 2: Create Appointment
    const appointment = await Appointment.create({
      studentId: id,
      consultantId: req.user.id,
      officeId: officeId,
      ...req.body,
    });

    // Step 3: Send notification
    await notificationService.sendAppointmentConfirmation(id, appointment.id);

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const shareResources = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new AppError('Student not found', 404);
    await notificationService.shareResources(id, req.body.resources);
    res.json({ message: 'Resources shared' });
  } catch (error) {
    next(error);
  }
};

const getCommunicationHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    const history = await notificationService.getCommunicationHistory(
      id,
      req.user.id
    );
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const markMessagesAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new AppError('Student not found', 404);
    await notificationService.markMessagesAsRead(id, req.user.id);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
};

const createApplicationChecklist = async (req, res, next) => {
  try {
    const { id } = req.params; // id = studentId
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });

    if (!lead) throw new Error('Student not found');

    // Check if profile exists, create if not
    let profile = await StudentProfile.findOne({ where: { userId: id } });

    if (!profile) {
      // You can choose to pass in some sensible defaults or fetch them elsewhere
      profile = await StudentProfile.create({
        userId: id,
        personalInfo: {},
        educationalBackground: {},
        studyPreferences: {},
      });
    }

    // Update profile with checklist
    const checklist = { ...req.body, updatedAt: new Date() };
    await profile.update({
      additionalInfo: {
        ...(profile.additionalInfo || {}),
        checklist,
      },
    });

    res.json(checklist);
  } catch (error) {
    next(error);
  }
};

const trackDocumentSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;
    let { types, notes } = req.body;

    // console.log(types, ' sacnasncjascn, ', notes);

    if (!files || files.length === 0) {
      throw new AppError('At least one file is required', 400);
    }

    if (!Array.isArray(types)) {
      types = types.split(',');
    }
    if (!Array.isArray(notes)) {
      notes = notes.split(',');
    }

    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) {
      throw new AppError('Student not found', 404);
    }

    const documents = await notificationService.trackDocumentSubmission(
      id,
      files,
      types,
      notes
    );

    res.json(documents);
  } catch (error) {
    next(error);
  }
};

const setDeadlineReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new AppError('Student not found', 404);
    await notificationService.setDeadlineReminder(id, req.body);
    res.json({ message: 'Reminder set' });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    let profile = await StudentProfile.findOne({ where: { userId: id } });
    if (!profile) {
      // You can choose to pass in some sensible defaults or fetch them elsewhere
      profile = await StudentProfile.create({
        userId: id,
        personalInfo: {},
        educationalBackground: {},
        studyPreferences: {},
      });
    }
    await profile.update({
      additionalInfo: { ...profile.additionalInfo, applicationStatus: status },
    });

    await notificationService.sendNotification({
      userId: id,
      type: 'in_app',
      message: `Your application status has been updated to: ${status}.`,
      details: {
        leadId: lead.id,
        studentProfileId: profile.id,
      },
    });
    res.json({ message: 'Status updated' });
  } catch (error) {
    next(error);
  }
};

const getApplicationProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    const profile = await StudentProfile.findOne({ where: { userId: id } });
    res.json(profile.additionalInfo);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssignedLeads,
  updateLeadStatus,
  addConsultationNotes,
  uploadLeadDocument,
  setFollowUpTask,
  getStudentProfile,
  requestProfileInfo,
  sendReviewNotification,
  sendMessage,
  scheduleMeeting,
  shareResources,
  getCommunicationHistory,
  markMessagesAsRead,
  createApplicationChecklist,
  trackDocumentSubmission,
  setDeadlineReminder,
  updateApplicationStatus,
  getApplicationProgress,
  getLeadTasks,
  getLeadDocuments,
};
