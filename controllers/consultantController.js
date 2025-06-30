const {
  Lead,
  StudentProfile,
  Appointment,
  Document,
  OfficeConsultant,
  User,
  Task,
  sequelize,
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

const getAllLeadTasks = async (req, res, next) => {
  try {
    // Find all leads assigned to the consultant
    const leads = await Lead.findAll({
      where: {
        assignedConsultant: req.user.id,
      },
      attributes: ['id'], // Only need lead IDs for task filtering
    });

    if (leads.length === 0) {
      throw new AppError('No leads assigned to consultant', 404);
    }

    // Extract lead IDs
    const leadIds = leads.map((lead) => lead.id);

    // Fetch all tasks for the leads
    const tasks = await Task.findAll({
      where: { leadId: leadIds },
      order: [['createdAt', 'DESC']],
      // include: [
      //   {
      //     model: Lead,
      //     as: 'lead',
      //     attributes: [],
      //     include: [{ model: User, as: 'student', attributes: ['name', 'email', 'phone'] }],
      //   },
      // ],
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

const editLeadTask = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: taskId } = req.params;
    const { description, dueDate, status, leadId, notes } = req.body;

    // Validate input
    if (!description || !dueDate || !status || !leadId) {
      throw new AppError(
        'Description, due date, status, and lead ID are required',
        400
      );
    }

    if (
      !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
    ) {
      throw new AppError('Invalid status value', 400);
    }

    // Find the task and include the associated lead
    const task = await Task.findOne({
      where: { id: taskId },
      // include: [
      //   {
      //     model: Lead,
      //     as: 'lead',
      //     where: { assignedConsultant: req.user.id },
      //     attributes: ['id', 'studentId'],
      //   },
      // ],
      transaction,
    });

    if (!task) {
      throw new AppError(
        'Task not found or not associated with consultant’s lead',
        404
      );
    }

    // Verify the lead exists and matches
    const lead = await Lead.findOne({
      where: { id: leadId, assignedConsultant: req.user.id },
      attributes: ['id', 'studentId'],
      transaction,
    });

    if (!lead) {
      throw new AppError('Lead not found or not assigned to consultant', 404);
    }

    // Get the student
    const student = await User.findByPk(lead.studentId, { transaction });
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Update the task
    await task.update(
      {
        description,
        dueDate: new Date(dueDate),
        status,
        leadId,
        notes,
        updatedBy: req.user.id,
      },
      { transaction }
    );

    await transaction.commit();

    // Notify the student
    const preferences = student.notificationPreferences || {
      email: true,
      sms: true,
      in_app: true,
    };

    const notificationMessage = `Task "${description}" has been updated by your consultant.`;

    if (preferences.in_app) {
      await notificationService.sendNotification(
        {
          userId: student.id,
          type: 'in_app',
          message: notificationMessage,
          details: { taskId, leadId },
        }
      );
    }

    res.status(200).json(task);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const deleteLeadTask = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;

    // Find the task and include the associated lead
    const task = await Task.findOne({
      where: { id: taskId },
      // include: [
      //   {
      //     model: Lead,
      //     as: 'lead',
      //     where: { assignedConsultant: req.user.id }, // Ensure lead is assigned to consultant
      //     attributes: ['id', 'studentId'],
      //   },
      // ],
    });

    if (!task) {
      throw new AppError(
        'Task not found or not associated with consultant’s lead',
        404
      );
    }

    // Get the student (lead's associated user)
    const student = await User.findByPk(task.lead.studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Delete the task
    await task.destroy();

    // Notify the student
    const preferences = student.notificationPreferences || {
      email: true,
      sms: true,
      in_app: true,
    };

    const notificationMessage = `Task *${task.description}* has been deleted by your consultant.`;

    if (preferences.in_app) {
      await notificationService.sendNotification({
        userId: student.id,
        type: 'in_app',
        message: notificationMessage,
        taskDescription: task.description,
        details: { taskId, leadId: task.lead.id },
      });
    }

    if (preferences.email) {
      await sendNotification({
        userId: student.id,
        type: 'email',
        message: notificationMessage,
        details: { taskId, leadId: task.lead.id },
      });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
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

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateTime, type, status, notes } = req.body;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Verify this appointment belongs to the consultant
    if (appointment.consultantId !== req.user.id) {
      throw new AppError('Unauthorized to update this appointment', 403);
    }

    // Update appointment
    await appointment.update({
      dateTime: dateTime || appointment.dateTime,
      type: type || appointment.type,
      status: status || appointment.status,
      notes: notes !== undefined ? notes : appointment.notes,
    });

    // Send notification to student about the update
    await notificationService.sendNotification({
      userId: appointment.studentId,
      type: 'in_app',
      message: `Your appointment has been updated.`,
      details: {
        appointmentId: appointment.id,
        updatedBy: req.user.id,
        newDateTime: appointment.dateTime,
      },
    });

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Verify this appointment belongs to the consultant
    if (appointment.consultantId !== req.user.id) {
      throw new AppError('Unauthorized to delete this appointment', 403);
    }

    // Send notification to student about cancellation
    await notificationService.sendNotification({
      userId: appointment.studentId,
      type: 'in_app',
      message: `Your appointment has been cancelled.`,
      details: {
        appointmentId: appointment.id,
        cancelledBy: req.user.id,
        originalDateTime: appointment.dateTime,
      },
    });

    await appointment.destroy();

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { consultantId: req.user.id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: { exclude: ['password'] },
        },
      ],
      order: [['dateTime', 'ASC']],
    });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

const updateDocumentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Find the document and verify it belongs to a student assigned to this consultant
    const document = await Document.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          include: [
            {
              model: Lead,
              as: 'studentLeads',
              where: { assignedConsultant: req.user.id },
              required: true,
            },
          ],
        },
      ],
    });

    if (!document) {
      throw new AppError('Document not found or not authorized to update', 404);
    }

    // Update document status
    await document.update({
      status,
      notes: notes || document.notes,
    });

    // Send notification to student
    await notificationService.sendNotification({
      userId: document.userId,
      type: 'in_app',
      message: `Your document "${document.type}" status has been updated to: ${status}`,
      details: {
        documentId: document.id,
        status,
        notes,
        updatedBy: req.user.id,
      },
    });

    res.json({
      message: 'Document status updated successfully',
      document,
    });
  } catch (error) {
    next(error);
  }
};

// Add this new function to your existing consultantController.js

const updateLeadParkedStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parked } = req.body;

    // Validate parked value
    if (typeof parked !== 'boolean') {
      throw new AppError('Parked status must be a boolean value', 400);
    }

    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id) {
      throw new AppError('Lead not found or not assigned to you', 404);
    }

    // Update the parked status
    await lead.update({ parked });

    // Log in lead history
    const history = [
      ...lead.history,
      {
        note: `Lead ${parked ? 'parked' : 'unparked'} by consultant`,
        timestamp: new Date(),
        userId: req.user.id,
      },
    ];
    await lead.update({ history });

    // Send notification to student
    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `Your lead has been ${parked ? 'parked' : 'activated'} by your consultant.`,
      details: {
        leadId: lead.id,
        parked,
        consultantId: req.user.id,
      },
    });

    res.json({
      message: `Lead ${parked ? 'parked' : 'unparked'} successfully`,
      lead,
    });
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
  updateAppointment,
  deleteAppointment,
  getAppointments,
  updateDocumentStatus,
  getAllLeadTasks,
  deleteLeadTask,
  editLeadTask,
  updateLeadParkedStatus,
};
