const {
  Lead,
  User,
  Appointment,
  Office,
  Task,
  OfficeConsultant,
  StudentProfile,
} = require('../models');
const reportService = require('../services/reportService');
const leadService = require('../services/leadService');
const { sendNotification } = require('../services/notificationService');
const { Op } = require('sequelize');

// Utility function to add hours to a date
const addHours = (date, hours) => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
};

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
        error: 'Missing student data or study preferences',
      });
    }

    if (!req.user.officeId) {
      return res.status(400).json({
        error: 'You are not assigned to any office, please contact ADMIN',
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

    // Validate assigned consultant
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

    // Create minimal StudentProfile
    await StudentProfile.create({
      userId: student.id,
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

// const getStaffSchedules = async (req, res, next) => {
//   try {
//     const schedules = await Appointment.findAll({
//       where: { officeId: req.user.officeId },
//       include: [{ model: User, as: 'consultant' }],
//     });
//     res.json(schedules);
//   } catch (error) {
//     next(error);
//   }
// };

const getStaffSchedules = async (req, res, next) => {
  try {
    if (!req.user.officeId) {
      return res.status(403).json({ message: 'No office assigned to manager' });
    }

    const schedules = await Appointment.findAll({
      where: { officeId: req.user.officeId },
      include: [
        {
          model: User,
          as: 'consultant',
          attributes: ['id', 'name'],
        },
      ],
    });

    const formattedSchedules = schedules.map((schedule) => ({
      id: schedule.id,
      staffId: schedule.consultantId,
      staffName: schedule.consultant?.name || 'Unknown',
      studentId: schedule.studentId,
      startTime: schedule.dateTime,
      endTime: schedule.endTime || addHours(new Date(schedule.dateTime), 1),
      type: schedule.type === 'in_person' ? 'meeting' : 'shift',
      status: schedule.status,
      notes: schedule.notes || '',
    }));

    res.json(formattedSchedules);
  } catch (error) {
    next(error);
  }
};

const createStaffSchedule = async (req, res, next) => {
  try {
    if (!req.user.officeId) {
      return res.status(403).json({ message: 'No office assigned to manager' });
    }

    let {
      studentId,
      consultantId,
      staffId,
      startTime,
      endTime,
      type,
      status,
      notes,
    } = req.body;

    if (!consultantId) {
      consultantId = staffId;
    }

    if (!studentId || !startTime || !type) {
      return res.status(400).json({
        message: 'Missing required fields: studentId, startTime, type',
      });
    }

    const validTypes = ['in_person', 'virtual'];
    const validStatuses = ['scheduled', 'completed', 'canceled', 'no_show'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (consultantId) {
      const consultant = await OfficeConsultant.findOne({
        where: { userId: consultantId, officeId: req.user.officeId },
      });
      if (!consultant) {
        return res
          .status(400)
          .json({ message: 'Consultant not found in your office' });
      }
    }

    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(400).json({ message: 'Student not found' });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : addHours(start, 1);
    if (isNaN(start.getTime()) || (endTime && isNaN(end.getTime()))) {
      return res
        .status(400)
        .json({ message: 'Invalid startTime or endTime format' });
    }
    if (end <= start) {
      return res
        .status(400)
        .json({ message: 'endTime must be after startTime' });
    }

    const schedule = await Appointment.create({
      studentId,
      consultantId: consultantId || null,
      officeId: req.user.officeId,
      dateTime: startTime,
      endTime: endTime || null,
      type,
      status,
      notes: notes || null,
    });

    const consultant = consultantId
      ? await User.findByPk(consultantId, { attributes: ['name'] })
      : null;

    res.status(201).json({
      id: schedule.id,
      staffId: schedule.consultantId,
      staffName: consultant?.name || 'Unknown',
      studentId: schedule.studentId,
      startTime: schedule.dateTime,
      endTime: schedule.endTime || addHours(new Date(schedule.dateTime), 1),
      type: schedule.type === 'in_person' ? 'meeting' : 'shift',
      status: schedule.status,
      notes: schedule.notes || '',
    });
  } catch (error) {
    next(error);
  }
};

const updateStaffSchedule = async (req, res, next) => {
  try {
    if (!req.user.officeId) {
      return res.status(403).json({ message: 'No office assigned to manager' });
    }

    const { id } = req.params;
    const { studentId, consultantId, dateTime, endTime, type, status, notes } =
      req.body;

    if (!studentId || !dateTime || !type) {
      return res.status(400).json({
        message: 'Missing required fields: studentId, dateTime, type',
      });
    }

    const validTypes = ['in_person', 'virtual'];
    const validStatuses = ['scheduled', 'completed', 'canceled', 'no_show'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const schedule = await Appointment.findOne({
      where: { id, officeId: req.user.officeId },
    });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    if (consultantId) {
      const consultant = await User.findOne({
        where: { id: consultantId, officeId: req.user.officeId },
      });
      if (!consultant) {
        return res
          .status(400)
          .json({ message: 'Consultant not found in your office' });
      }
    }

    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(400).json({ message: 'Student not found' });
    }

    const start = new Date(dateTime);
    const end = endTime ? new Date(endTime) : addHours(start, 1);
    if (isNaN(start.getTime()) || (endTime && isNaN(end.getTime()))) {
      return res
        .status(400)
        .json({ message: 'Invalid dateTime or endTime format' });
    }
    if (end <= start) {
      return res
        .status(400)
        .json({ message: 'endTime must be after dateTime' });
    }

    await schedule.update({
      studentId,
      consultantId: consultantId || null,
      officeId: req.user.officeId,
      dateTime,
      endTime: endTime || null,
      type,
      status,
      notes: notes || null,
    });

    const consultant = consultantId
      ? await User.findByPk(consultantId, { attributes: ['name'] })
      : null;

    res.json({
      id: schedule.id,
      staffId: schedule.consultantId,
      staffName: consultant?.name || 'Unknown',
      studentId: schedule.studentId,
      startTime: schedule.dateTime,
      endTime: schedule.endTime || addHours(new Date(schedule.dateTime), 1),
      type: schedule.type === 'in_person' ? 'meeting' : 'shift',
      status: schedule.status,
      notes: schedule.notes || '',
    });
  } catch (error) {
    next(error);
  }
};

const deleteStaffSchedule = async (req, res, next) => {
  try {
    if (!req.user.officeId) {
      return res.status(403).json({ message: 'No office assigned to manager' });
    }

    const { id } = req.params;

    const schedule = await Appointment.findOne({
      where: { id, officeId: req.user.officeId },
    });
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    await schedule.destroy();

    res.status(204).send();
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
    if (!req.user.officeId) {
      return res
        .status(400)
        .send({ error: 'Office not assign', message: 'Office not assign' });
    }
    const leads = await Lead.findAll({
      where: { officeId: req.user.officeId },
      include: [
        {
          model: User,
          as: 'student',
          include: [
            {
              model: StudentProfile,
              as: 'profile',
            },
          ],
        },
        {
          model: User,
          as: 'consultant',
          attributes: ['id', 'name', 'email'],
        },
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

// const getOfficeConsultants = async (req, res, next) => {
//   try {
//     const managerId = req.user.id;

//     // Find the office managed by this manager
//     const office = await Office.findOne({ where: { managerId } });

//     if (!office) {
//       return res.status(400).json({
//         success: false,
//         error: 'Manager is not assigned to any office.',
//       });
//     }

//     // Fetch consultants linked via OfficeConsultants
//     const consultants = await User.findAll({
//       where: {
//         role: 'consultant',
//         // isActive: true,
//       },
//       include: [
//         {
//           association: 'consultantOffices',
//           where: { id: office.id },
//           attributes: [],
//           through: { attributes: [] }, // hide join table fields
//         },
//       ],
//       attributes: { exclude: ['password'] },
//     });

//     res.json({
//       success: true,
//       count: consultants.length,
//       data: consultants,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const getOfficeConsultants = async (req, res, next) => {
  try {
    const managerId = req.user.id;

    const office = await Office.findOne({
      where: { managerId },
    });

    if (!office) {
      return res.status(400).json({
        success: false,
        error: 'Manager is not assigned to any office.',
      });
    }

    // Fetch consultants with lead and student details
    const consultants = await User.findAll({
      where: { role: 'consultant' },
      include: [
        {
          association: 'consultantOffices',
          where: { id: office.id },
          through: { attributes: [] },
          attributes: [],
        },
        {
          association: 'consultantLeads',
          required: false,
          include: [
            {
              model: Task,
              as: 'tasks',
              required: false,
              where: {
                dueDate: { [Op.gte]: new Date() }, // future tasks only
              },
            },
            {
              model: User,
              as: 'student',
              include: [
                {
                  model: StudentProfile,
                  as: 'profile',
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      attributes: {
        exclude: ['password'],
      },
    });

    const consultantStats = consultants.map((consultant) => {
      const leads = consultant.consultantLeads || [];

      const totalLeads = leads.length;
      const convertedLeads = leads.filter(
        (lead) => lead.status === 'converted'
      ).length;
      const pendingTasks = leads.reduce(
        (count, lead) => count + (lead.tasks?.length || 0),
        0
      );

      return {
        id: consultant.id,
        consultantId: consultant.id,
        name: consultant.name,
        email: consultant.email,
        phone: consultant.phone,
        totalLeads,
        convertedLeads,
        pendingTasks,
        leads: leads.map((lead) => ({
          id: lead.id,
          status: lead.status,
          source: lead.source,
          student: lead.student
            ? {
                id: lead.student.id,
                name: lead.student.name,
                email: lead.student.email,
                phone: lead.student.phone,
                profile: lead.student.profile || null,
              }
            : null,
        })),
      };
    });

    return res.json({
      success: true,
      count: consultantStats.length,
      data: consultantStats,
    });
  } catch (error) {
    next(error);
  }
};

const getOfficeReceptionists = async (req, res, next) => {
  try {
    const managerId = req.user.id;

    const office = await Office.findOne({
      where: { managerId },
    });

    if (!office) {
      return res.status(400).json({
        success: false,
        error: 'Manager is not assigned to any office.',
      });
    }

    // Fetch consultants with lead and student details
    const receptionists = await User.findAll({
      where: { role: 'receptionist', officeId: office.id },
      attributes: {
        exclude: ['password'],
      },
    });

    return res.json({
      success: true,
      count: receptionists.length,
      data: receptionists,
    });
  } catch (error) {
    next(error);
  }
};

const createStaffMember = async (req, res) => {
  try {
    const { id, role, name, email, phone, password } = req.body;
    const allowedRoles = ['consultant', 'receptionist', 'student'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be consultant, receptionist, or student.',
      });
    }

    // Get manager's office
    const manager = req.user;
    const office = await Office.findOne({ where: { managerId: manager.id } });

    if (!office) {
      return res.status(400).json({
        success: false,
        message: 'Manager is not assigned to any office.',
      });
    }

    let user;

    if (id) {
      // Update existing user if ID is passed
      user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with provided ID.',
        });
      }

      await user.update({
        role,
        name,
        email,
        phone,
        password, // Should hash in production
        officeId: office.id,
        isActive: true,
      });

      if (role === 'consultant') {
        await OfficeConsultant.findOrCreate({
          where: { userId: user.id, officeId: office.id },
          defaults: { userId: user.id, officeId: office.id },
        });
      }

      return res.status(200).json({
        success: true,
        message: `${role} updated and assigned to manager's office`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // Create new user if ID is not provided
    user = await User.create({
      role,
      name,
      email,
      phone,
      password, // Should hash in production
      officeId: office.id,
      isActive: true,
    });

    if (role === 'consultant') {
      await OfficeConsultant.create({
        userId: user.id,
        officeId: office.id,
      });
    }

    res.status(201).json({
      success: true,
      message: `${role} created and assigned to manager's office`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const disconnectStaffMember = async (req, res) => {
  try {
    const managerId = req.user.id;
    const userId = req.params.id;

    // Get manager's office
    const office = await Office.findOne({ where: { managerId } });

    if (!office) {
      return res.status(400).json({
        success: false,
        message: 'Manager is not assigned to any office.',
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Ensure user belongs to the same office
    const isConsultant = user.role === 'consultant';

    if (isConsultant) {
      // Remove entry from OfficeConsultants
      await OfficeConsultant.destroy({
        where: {
          userId: user.id,
          officeId: office.id,
        },
      });
    }

    if (user.officeId === office.id) {
      // Nullify officeId for any role if they belong to the manager's office
      user.officeId = null;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `${user.role} disconnected from manager's office.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error while disconnecting user.',
    });
  }
};

const getStudents = async (req, res, next) => {
  try {
    if (!req.user.officeId) {
      return res.status(403).json({ message: 'No office assigned to manager' });
    }

    const students = await User.findAll({
      where: {
        officeId: req.user.officeId,
        role: 'student',
      },
      attributes: ['id', 'name', 'email', 'phone'],
      include: [
        {
          model: Lead,
          as: 'studentLeads',
          attributes: ['id', 'assignedConsultant', 'status'],
        },
      ],
    });

    res.json(students);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  getDashboard,
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
  createStaffMember,
  disconnectStaffMember,
  getStaffSchedules,
  createStaffSchedule,
  updateStaffSchedule,
  deleteStaffSchedule,
  getStudents,
  getOfficeReceptionists,
};
