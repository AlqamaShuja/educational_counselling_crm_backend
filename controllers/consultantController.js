const {
  Lead,
  StudentProfile,
  Appointment,
  Document,
  User,
} = require('../models');
const leadService = require('../services/leadService');
const notificationService = require('../services/notificationService');
const AppError = require('../utils/appError');

const getAssignedLeads = async (req, res, next) => {
  try {
    const leads = await Lead.findAll({
      where: { assignedConsultant: req.user.id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: { exclude: ['password'] },
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

const uploadLeadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;
    const { type } = req.body;

    if (!files || files.length === 0) {
      throw new Error('File(s) required');
    }

    const lead = await Lead.findByPk(id);
    if (!lead || lead.assignedConsultant !== req.user.id) {
      throw new Error('Lead not found');
    }

    const documents = await Promise.all(
      files.map((file) =>
        Document.create({
          userId: lead.studentId,
          type,
          filePath: file.path,
        })
      )
    );

    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `New document(s) uploaded: ${type}`,
      details: {
        leadId: lead.id,
      },
    });

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
    const profile = await StudentProfile.findByPk(id);
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
    await notificationService.sendMessage(id, req.body.message);
    res.json({ message: 'Message sent' });
  } catch (error) {
    next(error);
  }
};

const scheduleMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new AppError('Student not found', 404);
    const appointment = await Appointment.create({
      studentId: id,
      consultantId: req.user.id,
      officeId: req.user.officeId,
      ...req.body,
    });
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
    if (!lead) throw new Error('Student not found');
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
    const history = await notificationService.getCommunicationHistory(id);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const createApplicationChecklist = async (req, res, next) => {
  try {
    const { id } = require('uuid');
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    const profile = await StudentProfile.findByPk(id);
    const checklist = { ...req.body, updatedAt: new Date() };
    await profile.update({
      additionalInfo: { ...profile.additionalInfo, checklist },
    });
    res.json(checklist);
  } catch (error) {
    next(error);
  }
};

const trackDocumentSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) throw new Error('File required');
    const lead = await Lead.findOne({
      where: { studentId: id, assignedConsultant: req.user.id },
    });
    if (!lead) throw new Error('Student not found');
    const document = await Document.create({
      userId: id,
      type: req.body.type,
      filePath: file.path,
    });

    await notificationService.sendNotification({
      userId: id,
      type: 'in_app',
      message: `Your document "${req.body.type}" has been submitted successfully.`,
      details: {
        leadId: lead.id,
      },
    });
    res.json(document);
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
    if (!lead) throw new Error('Student not found');
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
    const profile = await StudentProfile.findByPk(id);
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
    const profile = await StudentProfile.findByPk(id);
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
  createApplicationChecklist,
  trackDocumentSubmission,
  setDeadlineReminder,
  updateApplicationStatus,
  getApplicationProgress,
};
