const { Lead, User, Appointment, OfficeConsultant } = require('../models');
const reportService = require('../services/reportService');
const leadService = require('../services/leadService');
const { v4: uuidv4 } = require('uuid');
const { sendNotification } = require('../services/notificationService');
const { where } = require('sequelize');

const createLead = async (req, res, next) => {
  try {
    const {
      studentData,
      studyPreferences,
      source = 'referral',
      assignedConsultant,
    } = req.body;

    if (!studentData || !studyPreferences) {
      return res.status(400).json({
        error: 'Missing student data or study preferences or officeId',
      });
    }

    if (!req.user.officeId) {
      return res.status(400).json({
        error:
          'Manager is not assign to any Office, Please contact ADMIN to Assign',
      });
    }

    // Check if student email already exists
    const isExist = await User.findOne({
      where: { email: studentData.email },
    });

    if (isExist) {
      return res.status(400).json({
        error: 'Email already exists, please use a different email address.',
      });
    }

    // ✅ If a consultant is selected, ensure they are assigned to this office
    if (assignedConsultant) {
      const consultantInOffice = await OfficeConsultant.findOne({
        where: {
          userId: assignedConsultant,
          officeId: req.user.officeId,
        },
      });

      if (!consultantInOffice) {
        return res.status(400).json({
          error: 'Assigned consultant is not part of your office',
        });
      }
    }

    // Create student user
    const student = await User.create({
      ...studentData,
      role: 'student',
      officeId: req.user.officeId,
    });

    // Create lead
    const lead = await Lead.create({
      id: uuidv4(),
      studentId: student.id,
      officeId: req.user.officeId,
      source,
      assignedConsultant: assignedConsultant || null,
      studyPreferences,
      history: [
        {
          timestamp: new Date().toISOString(),
          action: `Lead created by Manager`,
          managerId: req.user.id,
        },
      ],
    });

    // Send notification if consultant is assigned
    if (assignedConsultant) {
      await sendNotification({
        userId: assignedConsultant,
        type: 'in_app',
        message: `A new lead has been assigned to you.`,
        details: {
          leadId: lead.id,
          studentId: student.id,
          officeId: req.user.officeId,
          createdBy: req.user.id,
        },
      });
    }

    res.status(201).json({ message: 'Lead created successfully', lead });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const metrics = await reportService.getManagerDashboard(req.user.officeId);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

const getStaffSchedules = async (req, res, next) => {
  try {
    const schedules = await Appointment.findAll({
      where: { officeId: req.user.officeId },
      include: [{ model: User, as: 'consultant' }],
    });
    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

const getConsultantInteractions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interactions = await Lead.findAll({
      where: { assignedConsultant: id, officeId: req.user.officeId },
      include: [{ model: User, as: 'student' }],
    });
    res.json(interactions);
  } catch (error) {
    next(error);
  }
};

const getConsultationNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leads = await Lead.findAll({
      where: { assignedConsultant: id, officeId: req.user.officeId },
      attributes: ['id', 'history'],
    });
    const notes = leads.flatMap((lead) =>
      lead.history.filter((entry) => entry.note)
    );
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

const reassignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { consultantId } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');

    const previousConsultantId = lead.assignedConsultant;

    await lead.update({ assignedConsultant: consultantId });
    await leadService.logLeadHistory(lead.id, 'reassigned', req.user.id);

    await sendNotification({
      userId: consultantId,
      type: 'in_app',
      message: `You have been reassigned a new lead.`,
      details: {
        leadId: lead.id,
        reassignedBy: req.user.id,
        officeId: req.user.officeId,
      },
    });

    if (previousConsultantId && previousConsultantId !== consultantId) {
      await sendNotification({
        userId: previousConsultantId,
        type: 'in_app',
        message: `A lead previously assigned to you has been reassigned.`,
        details: {
          leadId: lead.id,
          reassignedBy: req.user.id,
          newConsultantId: consultantId,
        },
      });
    }

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const getStaffReports = async (req, res, next) => {
  try {
    const reports = await reportService.getStaffPerformance(req.user.officeId);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

const getOfficeLeads = async (req, res, next) => {
  try {
    const leads = await Lead.findAll({
      where: { officeId: req.user.officeId },
      include: [
        { model: User, as: 'student' },
        { model: User, as: 'consultant' },
      ],
    });
    res.json(leads);
  } catch (error) {
    next(error);
  }
};

const assignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { consultantId } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    await lead.update({ assignedConsultant: consultantId });
    await leadService.logLeadHistory(lead.id, 'assigned', req.user.id);

    await sendNotification({
      userId: consultantId,
      type: 'in_app',
      message: `You have been assigned a new lead.`,
      details: {
        leadId: lead.id,
        assignedBy: req.user.id,
        officeId: req.user.officeId,
      },
    });

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const setLeadReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reminderData = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    await leadService.setReminder(lead.id, reminderData, req.user.id);

    if (lead.assignedConsultant) {
      await sendNotification({
        userId: lead.assignedConsultant,
        type: 'in_app',
        message: `A new reminder has been set for one of your leads.`,
        details: {
          leadId: lead.id,
          reminder: reminderData,
          setBy: req.user.id,
        },
      });
    }

    res.json({ message: 'Reminder set' });
  } catch (error) {
    next(error);
  }
};

const addLeadNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    const history = [
      ...lead.history,
      { note, timestamp: new Date(), userId: req.user.id },
    ];
    await lead.update({ history });

    //
    if (lead.assignedConsultant) {
      await sendNotification({
        userId: lead.assignedConsultant,
        type: 'in_app',
        message: `A new note has been added to one of your leads.`,
        details: {
          leadId: lead.id,
          note,
          addedBy: req.user.id,
        },
      });
    }

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const getLeadProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    res.json({ id: lead.id, status: lead.status, history: lead.history });
  } catch (error) {
    next(error);
  }
};

const getOfficeConsultants = async (req, res, next) => {
  try {
    const officeId = req.user.officeId;

    if (!officeId) {
      return res.status(400).json({
        success: false,
        error: 'Manager is not assigned to any office.',
      });
    }

    const consultants = await User.findAll({
      where: {
        role: 'consultant',
        isActive: true,
      },
      include: [
        {
          association: 'consultantOffices',
          where: { id: officeId },
          attributes: [], // Do not include office details in response
        },
      ],
      attributes: { exclude: ['password'] },
    });

    res.json({
      success: true,
      count: consultants.length,
      data: consultants,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  getDashboard,
  getStaffSchedules,
  getConsultantInteractions,
  getConsultationNotes,
  reassignLead,
  getStaffReports,
  getOfficeLeads,
  assignLead,
  setLeadReminder,
  addLeadNotes,
  getLeadProgress,
  getOfficeConsultants,
};
