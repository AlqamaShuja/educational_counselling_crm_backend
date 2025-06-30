const { Op, Sequelize } = require('sequelize');
// const { v4: uuidv4 } = require('uuid');
const {
  Office,
  User,
  Lead,
  LeadDistributionRule,
  Report,
  StudentProfile,
  OfficeConsultant,
  sequelize,
  Course,
  University,
} = require('../models');
const leadService = require('../services/leadService');
const reportService = require('../services/reportService');
const { parse } = require('csv-parse');
const bcrypt = require('bcryptjs');
const e = require('express');
const notificationService = require('../services/notificationService');

const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: StudentProfile,
          as: 'profile',
        },
        {
          model: Lead,
          as: 'studentLeads', // ✅ this matches User.hasMany(Lead, { as: 'studentLeads' })
          include: [
            {
              model: User,
              as: 'consultant', // ✅ this matches Lead.belongsTo(User, { as: 'consultant' })
              attributes: ['id', 'name', 'email', 'role'],
            },
            {
              model: Office,
              attributes: ['id', 'name', 'address'],
            },
          ],
        },
      ],
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    next(error);
  }
};

const getPendingUsers = async (req, res, next) => {
  try {
    const pendingUsers = await User.findAll({
      where: {
        status: 'pending',
        role: {
          [Op.ne]: 'student',
        },
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Office,
          as: 'office',
          required: false,
        },
      ],
    });

    res.json(pendingUsers);
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let { status } = req.body;

    status = status.toLowerCase();

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ status });

    // Notify user about their status update
    // await notificationService.sendNotification({
    //   userId: user.id,
    //   type: 'status_update',
    //   message: `Your account has been ${status}`,
    //   data: { status }
    // });

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    next(error);
  }
};

const getAllStaff = async (req, res, next) => {
  try {
    const staff = await User.findAll({
      where: {
        role: { [Op.not]: ['student', 'super_admin'] },
      },
      attributes: {
        exclude: ['password'],
      },
      include: [
        {
          model: Office,
          as: 'office', // manager's assigned office
          //   attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Office,
          as: 'consultantOffices', // must match your alias from belongsToMany
          through: { attributes: [] },
          //   attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.json(staff);
  } catch (error) {
    next(error);
  }
};

const createOffice = async (req, res, next) => {
  try {
    const { consultants, ...officeData } = req.body;

    const office = await Office.create(officeData);

    if (Array.isArray(consultants) && consultants.length > 0) {
      const validConsultants = await User.findAll({
        where: {
          id: consultants,
          role: 'consultant',
        },
      });

      const validIds = validConsultants.map((user) => user.id);

      if (validIds.length !== consultants.length) {
        return res.status(400).json({
          error: 'One or more userIds are not valid consultants.',
        });
      }

      const assignments = validIds.map((userId) => ({
        officeId: office.id,
        userId,
      }));

      await OfficeConsultant.bulkCreate(assignments);

      for (const userId of validIds) {
        await notificationService.sendNotification({
          userId,
          type: 'in_app',
          message: `You have been assigned to a new office.`,
          details: {
            officeId: office.id,
            assignedBy: req.user.id,
          },
        });
      }
    }

    // Fetch full office with manager and consultants
    const fullOffice = await Office.findByPk(office.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: {
            exclude: ['password'],
          },
        },
        {
          model: User,
          as: 'consultants', // ✅ matches belongsToMany alias
          attributes: {
            exclude: ['password'],
          },
          through: { attributes: [] }, // exclude join table fields
        },
      ],
    });

    res.status(201).json(fullOffice);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const message = 'Office Name Must be Unique';
      //error && error.length > 0 && error[0].message == 'name must be unique' ?  "Office Name Must be Unique": error[0].message;
      return res.status(400).json({ message, error: message });
    }
    next(error);
  }
};

const updateOffice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { consultants, ...updateData } = req.body;

    const office = await Office.findByPk(id);
    if (!office) return res.status(404).json({ error: 'Office not found' });

    // Update office core fields
    await office.update(updateData);

    // Update consultants
    if (Array.isArray(consultants)) {
      await OfficeConsultant.destroy({ where: { officeId: id } });

      if (consultants.length > 0) {
        const validConsultants = await User.findAll({
          where: {
            id: consultants,
            role: 'consultant',
          },
        });

        const validIds = validConsultants.map((user) => user.id);

        if (validIds.length !== consultants.length) {
          return res.status(400).json({
            error: 'One or more userIds are not valid consultants.',
          });
        }

        const newAssignments = validIds.map((userId) => ({
          officeId: id,
          userId,
        }));

        await OfficeConsultant.bulkCreate(newAssignments);

        for (const userId of validIds) {
          await notificationService.sendNotification({
            userId,
            type: 'in_app',
            message: `You have been assigned to an updated office.`,
            details: {
              officeId: id,
              updatedBy: req.user.id,
            },
          });
        }
      }
    }

    // Fetch updated office with manager + consultants
    // Corrected include
    const updatedOffice = await Office.findByPk(id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: {
            exclude: ['password'],
          },
        },
        {
          model: User,
          as: 'consultants', // ✅ matches belongsToMany alias
          attributes: {
            exclude: ['password'],
          },
          through: { attributes: [] }, // exclude join table fields
        },
      ],
    });

    res.json(updatedOffice);
  } catch (error) {
    next(error);
  }
};

const toggleOfficeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const office = await Office.findByPk(id);
    if (!office)
      res.status(404).json({
        message: `Office not found`,
      });
    await office.update({ isActive: !office.isActive });

    if (office.managerId) {
      await notificationService.sendNotification({
        userId: office.managerId,
        type: 'in_app',
        message: `Your office has been ${office.isActive ? 'activated' : 'deactivated'}.`,
        details: {
          officeId: office.id,
          updatedBy: req.user.id,
        },
      });
    }

    res.json({
      message: `Office ${office.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (error) {
    next(error);
  }
};

const getAllOffices = async (req, res, next) => {
  try {
    const offices = await Office.findAll({
      include: [
        {
          model: User,
          as: 'manager',
        },
        {
          model: User,
          as: 'consultants',
          through: {
            attributes: [], // This excludes the junction table attributes from the response
          },
          attributes: ['id', 'name', 'email', 'phone', 'role'], // Specify which consultant fields to include
        },
      ],
    });
    res.json(offices);
  } catch (error) {
    next(error);
  }
};

const getAllOfficeDetails = async (req, res, next) => {
  try {
    const offices = await Office.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'phone', 'role'],
        },
        {
          model: User,
          as: 'consultants',
          through: { attributes: [] },
          attributes: ['id', 'name', 'email', 'phone', 'role'],
        },
        {
          model: User,
          // Get receptionists using officeId relationship, no alias
          where: { role: 'receptionist' },
          required: false,
          attributes: ['id', 'name', 'email', 'phone', 'role'],
        },
        {
          model: Lead,
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'name', 'email', 'phone', 'role'],
              include: [
                {
                  model: StudentProfile,
                  as: 'profile',
                },
              ],
            },
            {
              model: User,
              as: 'consultant', // This is the assignedConsultant
              attributes: ['id', 'name', 'email', 'phone', 'role'],
            },
          ],
        },
      ],
    });

    res.json(offices);
  } catch (error) {
    next(error);
  }
};

const getOfficePerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const metrics = await reportService.getOfficePerformance(id);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const staffData = req.body;
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    const isAlreadyExist = await User.findOne({
      where: { email: req.body.email },
    });
    if (isAlreadyExist) {
      const err = 'User with this Email already exist';
      return res.status(400).send({ error: err, message: err });
    }
    const staff = await User.create({ ...staffData, password: hashedPassword });

    await notificationService.sendNotification({
      userId: staff.id,
      type: 'email',
      message: `Welcome to the CRM system! Your account has been created.`,
      details: {
        createdBy: req.user.id,
        role: staff.role,
        officeId: staff.officeId || null,
      },
    });

    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) throw new Error('User not found');
    await user.update(req.body);
    await notificationService.sendNotification({
      userId: user.id,
      type: 'in_app',
      message: `Your staff profile has been updated.`,
      details: {
        updatedFields: Object.keys(req.body),
        updatedBy: req.user.id,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) throw new Error('User not found');
    await user.update({
      status: user.status === 'active' ? 'inactive' : 'active',
    });

    await notificationService.sendNotification({
      userId: user.id,
      type: 'in_app',
      message: `Your account has been ${user.status}.`,
      details: {
        changedBy: req.user.id,
        newStatus: user.status,
      },
    });

    res.json({
      message: `User ${user.status === 'active' ? 'activated' : 'deactivated'}`,
    });
  } catch (error) {
    next(error);
  }
};

const importStaffCSV = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new Error('CSV file required');
    // Parse CSV and create users (simplified)
    const staff = []; // Process CSV with csv-parse
    for (const record of staff) {
      const hashedPassword = await bcrypt.hash(record.password, 10);
      await User.create({ ...record, password: hashedPassword });
    }
    res.json({ message: 'Staff imported successfully' });
  } catch (error) {
    next(error);
  }
};

const getStaffLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Assume activity logs are stored elsewhere (e.g., audit table)
    const logs = []; // Fetch logs (placeholder)
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

const createLeadRule = async (req, res, next) => {
  try {
    const ruleData = req.body;

    const rule = await LeadDistributionRule.create(ruleData);

    if (ruleData.consultantId) {
      await notificationService.sendNotification({
        userId: ruleData.consultantId,
        type: 'in_app',
        message: `A new lead distribution rule has been assigned to you.`,
        details: {
          ruleType: ruleData.type,
          ruleCriteria: ruleData.criteria,
          createdBy: req.user.id,
        },
      });
    }

    const fullRule = await LeadDistributionRule.findByPk(rule.id, {
      include: [
        {
          model: Office,
          //   attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'consultant',
          attributes: { exclude: ['password'] },
        },
      ],
    });

    res.status(201).json(fullRule);
  } catch (error) {
    next(error);
  }
};

const updateLeadRule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rule = await LeadDistributionRule.findByPk(id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    await rule.update(req.body);

    if (req.body.consultantId) {
      await notificationService.sendNotification({
        userId: req.body.consultantId,
        type: 'in_app',
        message: `A lead distribution rule assigned to you has been updated.`,
        details: {
          ruleId: id,
          updatedBy: req.user.id,
        },
      });
    }

    const updatedRule = await LeadDistributionRule.findByPk(id, {
      include: [
        {
          model: Office,
          //   attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'consultant',
          attributes: { exclude: ['password'] },
        },
      ],
    });

    res.json(updatedRule);
  } catch (error) {
    next(error);
  }
};

const getLeadRules = async (req, res, next) => {
  try {
    const rules = await LeadDistributionRule.findAll({
      include: [
        {
          model: Office,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'consultant',
        },
      ],
    });

    res.json(rules);
  } catch (error) {
    next(error);
  }
};

const getLeadRuleHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await leadService.getRuleHistory(id);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const getAllLeads = async (req, res, next) => {
  try {
    const leads = await Lead.findAll({
      include: [
        { model: User, as: 'student' },
        { model: User, as: 'consultant' },
        { model: Office },
      ],
    });
    res.json(leads);
  } catch (error) {
    next(error);
  }
};

const reassignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { officeId, consultantId } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead) throw new Error('Lead not found');
    await lead.update({ officeId, assignedConsultant: consultantId });
    await leadService.logLeadHistory(lead.id, 'reassigned', req.user.id);

    if (consultantId) {
      await notificationService.sendNotification({
        userId: consultantId,
        type: 'in_app',
        message: `You have been assigned a new lead.`,
        details: {
          leadId: lead.id,
          assignedBy: req.user.id,
        },
      });
    }

    if (lead.assignedConsultant && lead.assignedConsultant !== consultantId) {
      await notificationService.sendNotification({
        userId: lead.assignedConsultant,
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

const exportLeads = async (req, res, next) => {
  try {
    const leads = await Lead.findAll();
    const csv = reportService.generateCSV(leads);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

const getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await leadService.getLeadHistory(id);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await Report.findAll();
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

const createReport = async (req, res, next) => {
  try {
    const reportData = { ...req.body, createdBy: req.user.id };
    const report = await Report.create(reportData);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    if (!report) throw new Error('Report not found');
    const file = await reportService.exportReport(report);
    res.setHeader(
      'Content-Type',
      report.format === 'pdf' ? 'application/pdf' : 'text/csv'
    );
    res.send(file);
  } catch (error) {
    next(error);
  }
};

const scheduleReport = async (req, res, next) => {
  try {
    const reportData = { ...req.body, createdBy: req.user.id, scheduled: true };
    const report = await Report.create(reportData);
    await reportService.scheduleReport(report);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

const assignLeadToConsultant = async (req, res, next) => {
  try {
    const { leadId, consultantId = null, officeId = null } = req.body;

    // 1. Validate required fields
    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    if (!consultantId && !officeId) {
      return res
        .status(400)
        .json({ error: 'Either consultantId or officeId must be provided' });
    }

    if (consultantId == '') {
      consultantId = null;
    }
    if (officeId == '') {
      officeId = null;
    }

    // 2. Verify lead exists
    const lead = await Lead.findByPk(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Only check if both consultantId and officeId are provided
    if (consultantId && officeId) {
      let consultantOffice = await OfficeConsultant.findOne({
        where: { officeId, userId: consultantId },
      });

      if (!consultantOffice) {
        return res.status(400).json({
          error: 'Consultant is not assigned to the selected office',
        });
      }
    }

    // 4. Assign the lead
    await lead.update({ officeId, assignedConsultant: consultantId });

    // 5. Log history
    await leadService.logLeadHistory(leadId, 'assigned', req.user.id);

    // 6. Notify consultant
    await notificationService.sendNotification({
      userId: consultantId,
      type: 'in_app',
      message: 'A new lead has been assigned to you.',
      details: {
        leadId,
        assignedBy: req.user.id,
      },
    });

    res.json({ message: 'Lead assigned successfully', lead });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    // Get total counts
    const [
      totalOffices,
      totalStaff,
      totalStudents,
      totalCourses,
      totalLeads,
      totalUniversities,
      leadStatusBreakdown,
      officePerformance,
      recentActivities,
    ] = await Promise.all([
      // Total office count
      Office.count({ where: { isActive: true } }),

      // Total staff count (excluding students)
      User.count({
        where: {
          role: { [Op.ne]: 'student' },
          isActive: true,
        },
      }),

      // Total students count
      User.count({
        where: {
          role: 'student',
          isActive: true,
        },
      }),

      // Total courses count
      Course.count(),

      // Total leads count
      Lead.count(),

      // Total universities count
      University.count(),

      // Lead status breakdown
      Lead.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
        ],
        group: ['status'],
        raw: true,
      }),

      // Office performance - Fixed the table name reference
      Office.findAll({
        attributes: [
          'id',
          'name',
          [
            sequelize.fn('COUNT', sequelize.col('LeadDistributionRules.id')),
            'leadsCount',
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM "Leads" 
              WHERE "Leads"."officeId" = "Office"."id" 
              AND "Leads"."status" = 'converted'
            )`),
            'conversionsCount',
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM "Leads" 
              WHERE "Leads"."officeId" = "Office"."id"
            )`),
            'totalLeadsCount',
          ],
        ],
        include: [
          {
            model: LeadDistributionRule,
            attributes: [],
            required: false,
          },
        ],
        group: ['Office.id', 'Office.name'],
        raw: true,
      }),

      // Recent activities (last 10 lead updates)
      Lead.findAll({
        attributes: ['id', 'status', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['name', 'email'],
          },
          {
            model: Office,
            attributes: ['name'],
          },
        ],
        order: [['updatedAt', 'DESC']],
        limit: 10,
      }),
    ]);

    // Format lead status breakdown
    const statusBreakdown = {
      new: 0,
      in_progress: 0,
      converted: 0,
      lost: 0,
    };

    leadStatusBreakdown.forEach((item) => {
      statusBreakdown[item.status] = parseInt(item.count);
    });

    // Format recent activities
    const formattedActivities = recentActivities.map((lead) => ({
      id: lead.id,
      description: `Lead ${lead.student?.name || 'Unknown'} status: ${lead.status} (${lead.Office?.name || 'No Office'})`,
      createdAt: lead.updatedAt,
      type: 'lead_update',
    }));

    // Calculate additional metrics
    const totalConversions = statusBreakdown.converted;
    const conversionRate =
      totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;

    const activeOffices = totalOffices; // Already counted active offices
    const inactiveOffices = await Office.count({ where: { isActive: false } });

    res.json({
      success: true,
      data: {
        // Core metrics
        totalOffices,
        totalStaff,
        totalStudents,
        totalCourses,
        totalLeads,
        totalUniversities,

        // Calculated metrics
        conversionRate: parseFloat(conversionRate),
        totalConversions,
        activeOffices,
        inactiveOffices,

        // Breakdowns
        leadStatusBreakdown: statusBreakdown,
        officePerformance: officePerformance.map((office) => ({
          officeName: office.name,
          leadsCount: parseInt(office.totalLeadsCount || 0),
          conversionsCount: parseInt(office.conversionsCount || 0),
          conversionRate:
            office.totalLeadsCount > 0
              ? (
                  (office.conversionsCount / office.totalLeadsCount) *
                  100
                ).toFixed(1)
              : 0,
        })),

        // Activities
        recentActivities: formattedActivities,

        // Trends (mock data for now)
        monthlyGrowth: {
          leads: '+12.5%',
          conversions: '+8.3%',
          offices: '+2.1%',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getAllStaff,
  getPendingUsers,
  updateUserStatus,
  createOffice,
  updateOffice,
  toggleOfficeStatus,
  getAllOffices,
  getAllOfficeDetails,
  getOfficePerformance,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  importStaffCSV,
  getStaffLogs,
  createLeadRule,
  updateLeadRule,
  getLeadRules,
  getLeadRuleHistory,
  getAllLeads,
  reassignLead,
  exportLeads,
  getLeadHistory,
  getReports,
  createReport,
  exportReport,
  scheduleReport,
  assignLeadToConsultant,
  getDashboardStats,
};
