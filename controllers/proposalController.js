const { Proposal, Lead, User, StudentProfile } = require('../models');
const notificationService = require('../services/notificationService');
const AppError = require('../utils/appError');

// Create a new proposal for a lead
const createProposal = async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const {
      title,
      description,
      proposedProgram,
      proposedUniversity,
      estimatedCost,
      timeline,
      details,
      expiresAt,
    } = req.body;

    // Verify lead exists and is assigned to this consultant
    const lead = await Lead.findByPk(leadId);
    if (!lead || lead.assignedConsultant !== req.user.id) {
      throw new AppError('Lead not found or not assigned to you', 404);
    }

    // Check if there's already a pending proposal for this lead
    const existingProposal = await Proposal.findOne({
      where: {
        leadId,
        status: 'pending',
      },
    });

    if (existingProposal) {
      throw new AppError(
        'A pending proposal already exists for this lead',
        400
      );
    }

    // Create the proposal
    const proposal = await Proposal.create({
      leadId,
      consultantId: req.user.id,
      studentId: lead.studentId,
      title,
      description,
      proposedProgram,
      proposedUniversity,
      estimatedCost,
      timeline,
      details: details || {},
      expiresAt,
    });

    // Send notification to student
    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `You have received a new proposal: ${title}`,
      details: {
        proposalId: proposal.id,
        leadId,
        consultantId: req.user.id,
        proposalTitle: title,
      },
    });

    // Log in lead history
    const history = [
      ...lead.history,
      {
        note: `Proposal "${title}" sent to student`,
        timestamp: new Date(),
        userId: req.user.id,
      },
    ];
    await lead.update({ history });

    res.status(201).json({
      message: 'Proposal created successfully',
      proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Get all proposals created by the consultant
const getMyProposals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { consultantId: req.user.id };

    if (status) {
      where.status = status;
    }

    const proposals = await Proposal.findAll({
      where,
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'status', 'source', 'studyPreferences'],
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
          include: [
            {
              model: StudentProfile,
              as: 'profile',
              required: false,
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      message: 'Proposals retrieved successfully',
      count: proposals.length,
      proposals,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific proposal by ID
const getProposalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findByPk(id, {
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'status', 'source', 'studyPreferences'],
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
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

    if (!proposal || proposal.consultantId !== req.user.id) {
      throw new AppError('Proposal not found or not authorized', 404);
    }

    res.json({
      message: 'Proposal retrieved successfully',
      proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Update a proposal (only if status is pending)
const updateProposal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      proposedProgram,
      proposedUniversity,
      estimatedCost,
      timeline,
      details,
      expiresAt,
    } = req.body;

    const proposal = await Proposal.findByPk(id);

    if (!proposal || proposal.consultantId !== req.user.id) {
      throw new AppError('Proposal not found or not authorized', 404);
    }

    if (proposal.status !== 'pending') {
      throw new AppError('Can only update pending proposals', 400);
    }

    // Update the proposal
    await proposal.update({
      title,
      description,
      proposedProgram,
      proposedUniversity,
      estimatedCost,
      timeline,
      details: details || proposal.details,
      expiresAt,
    });

    // Send notification to student about the update
    await notificationService.sendNotification({
      userId: proposal.studentId,
      type: 'in_app',
      message: `Your proposal "${title}" has been updated`,
      details: {
        proposalId: proposal.id,
        consultantId: req.user.id,
      },
    });

    res.json({
      message: 'Proposal updated successfully',
      proposal,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a proposal (only if status is pending)
const deleteProposal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findByPk(id);

    if (!proposal || proposal.consultantId !== req.user.id) {
      throw new AppError('Proposal not found or not authorized', 404);
    }

    if (proposal.status !== 'pending') {
      throw new AppError('Can only delete pending proposals', 400);
    }

    // Send notification to student about the deletion
    await notificationService.sendNotification({
      userId: proposal.studentId,
      type: 'in_app',
      message: `A proposal has been withdrawn by your consultant`,
      details: {
        proposalId: proposal.id,
        consultantId: req.user.id,
        proposalTitle: proposal.title,
      },
    });

    await proposal.destroy();

    res.json({
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get proposals by lead ID
const getProposalsByLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    // Verify lead is assigned to this consultant
    const lead = await Lead.findByPk(leadId);
    if (!lead || lead.assignedConsultant !== req.user.id) {
      throw new AppError('Lead not found or not assigned to you', 404);
    }

    const proposals = await Proposal.findAll({
      where: { leadId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      message: 'Proposals retrieved successfully',
      count: proposals.length,
      proposals,
    });
  } catch (error) {
    next(error);
  }
};

// Get proposal statistics for the consultant
const getProposalStats = async (req, res, next) => {
  try {
    const consultantId = req.user.id;

    const stats = await Proposal.findAll({
      where: { consultantId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const total = await Proposal.count({
      where: { consultantId },
    });

    const formattedStats = {
      total,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat.status] = parseInt(stat.count);
    });

    res.json({
      message: 'Proposal statistics retrieved successfully',
      stats: formattedStats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProposal,
  getMyProposals,
  getProposalById,
  updateProposal,
  deleteProposal,
  getProposalsByLead,
  getProposalStats,
};
