const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const { User, Lead, OfficeConsultant } = require('../models');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// Conversation creation validation
const validateConversation = [
  body('type')
    .optional()
    .isIn(['direct', 'group', 'support'])
    .withMessage('Invalid conversation type'),

  body('purpose')
    .isIn([
      'lead_consultant',
      'manager_consultant',
      'manager_receptionist',
      'manager_lead',
      'general',
      'support',
    ])
    .withMessage('Invalid conversation purpose'),

  body('participants')
    .isArray({ min: 1, max: 50 })
    .withMessage('Participants must be an array with 1-50 members'),

  body('participants.*')
    .isUUID()
    .withMessage('Each participant must be a valid user ID'),

  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be between 1 and 100 characters'),

  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),

  handleValidationErrors,

  // Validate conversation permissions based on user role and purpose
  async (req, res, next) => {
    try {
      const { participants, purpose } = req.body;
      const currentUser = req.user;

      // Get all participant users
      const participantUsers = await User.findAll({
        where: { id: participants },
        attributes: ['id', 'role', 'officeId'],
      });

      if (participantUsers.length !== participants.length) {
        return next(new AppError('One or more participants not found', 404));
      }

      // Validate conversation purpose based on roles
      const isValidConversation = await validateConversationPurpose(
        currentUser,
        participantUsers,
        purpose
      );

      if (!isValidConversation.valid) {
        return next(new AppError(isValidConversation.error, 403));
      }

      req.participantUsers = participantUsers;
      next();
    } catch (error) {
      next(error);
    }
  },
];

// Helper function to validate conversation purpose
const validateConversationPurpose = async (
  currentUser,
  participants,
  purpose
) => {
  const currentUserRole = currentUser.role;
  const currentUserOfficeId = currentUser.officeId;

  switch (purpose) {
    case 'lead_consultant':
      return await validateLeadConsultantConversation(
        currentUser,
        participants
      );

    case 'manager_consultant':
      return validateManagerConsultantConversation(currentUser, participants);

    case 'manager_receptionist':
      return validateManagerReceptionistConversation(currentUser, participants);

    case 'manager_lead':
      return await validateManagerLeadConversation(currentUser, participants);

    case 'general':
      return validateGeneralConversation(currentUser, participants);

    case 'support':
      return validateSupportConversation(currentUser, participants);

    default:
      return { valid: false, error: 'Invalid conversation purpose' };
  }
};

// Validate lead-consultant conversation
const validateLeadConsultantConversation = async (
  currentUser,
  participants
) => {
  // Only 2 participants allowed: lead and consultant
  if (participants.length !== 2) {
    return {
      valid: false,
      error: 'Lead-consultant conversations must have exactly 2 participants',
    };
  }

  const roles = participants.map((p) => p.role);
  const hasStudent = roles.includes('student');
  const hasConsultant = roles.includes('consultant');

  if (!hasStudent || !hasConsultant) {
    return {
      valid: false,
      error:
        'Lead-consultant conversations must include one student and one consultant',
    };
  }

  // Check if student is assigned to consultant
  const student = participants.find((p) => p.role === 'student');
  const consultant = participants.find((p) => p.role === 'consultant');

  const lead = await Lead.findOne({
    where: {
      studentId: student.id,
      assignedConsultant: consultant.id,
    },
  });

  if (!lead) {
    return {
      valid: false,
      error: 'Student is not assigned to this consultant',
    };
  }

  // Only involved parties can create this conversation
  if (![student.id, consultant.id].includes(currentUser.id)) {
    return {
      valid: false,
      error:
        'Only the student or assigned consultant can create this conversation',
    };
  }

  return { valid: true };
};

// Validate manager-consultant conversation
const validateManagerConsultantConversation = (currentUser, participants) => {
  if (participants.length !== 2) {
    return {
      valid: false,
      error:
        'Manager-consultant conversations must have exactly 2 participants',
    };
  }

  const roles = participants.map((p) => p.role);
  const hasManager = roles.includes('manager');
  const hasConsultant = roles.includes('consultant');

  if (!hasManager || !hasConsultant) {
    return {
      valid: false,
      error:
        'Manager-consultant conversations must include one manager and one consultant',
    };
  }

  // Check if they're in the same office
  const manager = participants.find((p) => p.role === 'manager');
  const consultant = participants.find((p) => p.role === 'consultant');

  if (manager.officeId !== consultant.officeId) {
    return {
      valid: false,
      error: 'Manager and consultant must be in the same office',
    };
  }

  // Only involved parties can create this conversation
  if (![manager.id, consultant.id].includes(currentUser.id)) {
    return {
      valid: false,
      error: 'Only the manager or consultant can create this conversation',
    };
  }

  return { valid: true };
};

// Validate manager-receptionist conversation
const validateManagerReceptionistConversation = (currentUser, participants) => {
  if (participants.length !== 2) {
    return {
      valid: false,
      error:
        'Manager-receptionist conversations must have exactly 2 participants',
    };
  }

  const roles = participants.map((p) => p.role);
  const hasManager = roles.includes('manager');
  const hasReceptionist = roles.includes('receptionist');

  if (!hasManager || !hasReceptionist) {
    return {
      valid: false,
      error:
        'Manager-receptionist conversations must include one manager and one receptionist',
    };
  }

  // Check if they're in the same office
  const manager = participants.find((p) => p.role === 'manager');
  const receptionist = participants.find((p) => p.role === 'receptionist');

  if (manager.officeId !== receptionist.officeId) {
    return {
      valid: false,
      error: 'Manager and receptionist must be in the same office',
    };
  }

  // Only involved parties can create this conversation
  if (![manager.id, receptionist.id].includes(currentUser.id)) {
    return {
      valid: false,
      error: 'Only the manager or receptionist can create this conversation',
    };
  }

  return { valid: true };
};

// Validate manager-lead conversation
const validateManagerLeadConversation = async (currentUser, participants) => {
  if (participants.length !== 2) {
    return {
      valid: false,
      error: 'Manager-lead conversations must have exactly 2 participants',
    };
  }

  const roles = participants.map((p) => p.role);
  const hasManager = roles.includes('manager');
  const hasStudent = roles.includes('student');

  if (!hasManager || !hasStudent) {
    return {
      valid: false,
      error:
        'Manager-lead conversations must include one manager and one student',
    };
  }

  const manager = participants.find((p) => p.role === 'manager');
  const student = participants.find((p) => p.role === 'student');

  // Check if student has a lead in manager's office
  const lead = await Lead.findOne({
    where: {
      studentId: student.id,
      officeId: manager.officeId,
    },
  });

  if (!lead) {
    return {
      valid: false,
      error: "Student does not have a lead in manager's office",
    };
  }

  // Only manager can create this conversation
  if (currentUser.role !== 'manager' || currentUser.id !== manager.id) {
    return {
      valid: false,
      error: 'Only the office manager can create this conversation',
    };
  }

  return { valid: true };
};

// Validate general conversation
const validateGeneralConversation = (currentUser, participants) => {
  // General conversations can be created by any user with any participants
  // But ensure all participants are in related offices for staff members

  const currentUserRole = currentUser.role;

  if (['manager', 'consultant', 'receptionist'].includes(currentUserRole)) {
    // Staff members can only create general conversations with people in their office network
    const officeRelatedUsers = participants.filter(
      (p) => p.officeId === currentUser.officeId || p.role === 'student'
    );

    if (officeRelatedUsers.length !== participants.length) {
      return {
        valid: false,
        error:
          'Staff members can only create conversations with office colleagues and students',
      };
    }
  }

  return { valid: true };
};

// Validate support conversation
const validateSupportConversation = (currentUser, participants) => {
  // Support conversations can include support staff and any user
  const hasSupportStaff = participants.some((p) =>
    ['super_admin', 'manager'].includes(p.role)
  );

  if (!hasSupportStaff) {
    return {
      valid: false,
      error:
        'Support conversations must include at least one support staff member',
    };
  }

  return { valid: true };
};

// Conversation update validation
const validateConversationUpdate = [
  param('id').isUUID().withMessage('Valid conversation ID is required'),

  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be between 1 and 100 characters'),

  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),

  handleValidationErrors,
];

// Participant management validation
const validateParticipantAction = [
  param('id').isUUID().withMessage('Valid conversation ID is required'),

  body('userIds')
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage('User IDs must be an array with 1-20 items'),

  body('userIds.*')
    .optional()
    .isUUID()
    .withMessage('Each user ID must be a valid UUID'),

  param('userId').optional().isUUID().withMessage('Valid user ID is required'),

  handleValidationErrors,
];

// Archive conversation validation
const validateArchiveConversation = [
  param('id').isUUID().withMessage('Valid conversation ID is required'),

  body('archived').isBoolean().withMessage('Archived must be a boolean value'),

  handleValidationErrors,
];

// Typing indicator validation
const validateTypingIndicator = [
  param('id').isUUID().withMessage('Valid conversation ID is required'),

  body('isTyping').isBoolean().withMessage('isTyping must be a boolean value'),

  handleValidationErrors,
];

module.exports = {
  validateConversation,
  validateConversationUpdate,
  validateParticipantAction,
  validateArchiveConversation,
  validateTypingIndicator,
  validateConversationPurpose,
  handleValidationErrors,
};
