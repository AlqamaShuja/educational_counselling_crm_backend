const Joi = require('joi');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[source], { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((detail) => detail.message),
      });
    }
    next();
  };
};

// Schemas for common validations
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid('super_admin', 'manager', 'consultant', 'receptionist', 'student')
    .required(),
  officeId: Joi.string().uuid().optional().allow(null),
  name: Joi.string().required(),
  phone: Joi.string().optional().allow(null),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// const officeSchema = Joi.object({
//   name: Joi.string().required(),
//   address: Joi.object({
//     street: Joi.string().required(),
//     city: Joi.string().required(),
//     country: Joi.string().required(),
//   }).required(),
//   contact: Joi.object({
//     phone: Joi.string().required(),
//     email: Joi.string().email().required(),
//   }).required(),
//   officeHours: Joi.object().pattern(
//     Joi.string(), // e.g., 'Monday'
//     Joi.string().pattern(/^\d{1,2}(am|pm)-\d{1,2}(am|pm)$/) // e.g., "9am-5pm"
//   ).required(),
//   workingDays: Joi.array().items(
//     Joi.string().valid(
//       'Monday',
//       'Tuesday',
//       'Wednesday',
//       'Thursday',
//       'Friday',
//       'Saturday',
//       'Sunday'
//     )
//   ).required(),
//   serviceCapacity: Joi.object({
//     maxAppointments: Joi.number().required(),
//     maxConsultants: Joi.number().required(),
//   }).required(),
//   isActive: Joi.boolean().optional(),
// });

const officeSchema = Joi.object({
  name: Joi.string().required(),

  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    country: Joi.string().required(),
    state: Joi.string().optional().allow(''),
    postalCode: Joi.string().optional().allow(''),
  }).required(),

  region: Joi.string().optional().allow(''),

  contact: Joi.object({
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    website: Joi.string().uri().optional().allow(''),
  }).required(),

  officeHours: Joi.object()
    .pattern(
      Joi.string().valid(
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ),
      Joi.string()
        .pattern(
          /^((\d{1,2})(:\d{2})?\s*(AM|PM)\s*-\s*(\d{1,2})(:\d{2})?\s*(AM|PM)|Closed)$/i
        )
        .allow('')
    )
    .required(),

  workingDays: Joi.array()
    .items(
      Joi.string().valid(
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      )
    )
    .required(),

  serviceCapacity: Joi.object({
    maxAppointments: Joi.number().required(),
    maxConsultants: Joi.number().required(),
  }).required(),

  managerId: Joi.string().uuid().optional().allow(null),
  consultants: Joi.array().items(Joi.string().uuid()).optional(),
  isActive: Joi.boolean().optional(),
  isBranch: Joi.boolean().optional(),
});

const leadSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  officeId: Joi.string().uuid().required(),
  assignedConsultant: Joi.string().uuid().optional().allow(null),
  status: Joi.string()
    .valid('new', 'in_progress', 'converted', 'lost')
    .required(),
  source: Joi.string().valid('walk_in', 'online', 'referral').required(),
  studyPreferences: Joi.object({
    destination: Joi.string().required(),
    level: Joi.string().required(),
    budget: Joi.number().required(),
    fields: Joi.array().items(Joi.string()).required(),
  }).required(),
  languagePreference: Joi.string().valid('english', 'urdu').optional(),
});

const appointmentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  consultantId: Joi.string().uuid().required(),
  officeId: Joi.string().uuid().required(),
  dateTime: Joi.date().iso().required(),
  type: Joi.string().valid('in_person', 'virtual').required(),
  status: Joi.string()
    .valid('scheduled', 'completed', 'canceled', 'no_show')
    .optional(),
  notes: Joi.string().optional().allow(null),
});

const documentSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(
      'passport',
      'cnic',
      'transcript',
      'test_score',
      'degree',
      'experience_letter',
      'bank_statement',
      'photo',
      'other'
    )
    .required(),
  filePath: Joi.string().required(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  expiryDate: Joi.date().iso().optional().allow(null),
  notes: Joi.string().optional().allow(null),
});

const notificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string().valid('email', 'sms', 'in_app').required(),
  message: Joi.string().required(),
  status: Joi.string().valid('sent', 'pending', 'failed').optional(),
});

const checklistSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  dueDate: Joi.date().iso().optional().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  items: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional().allow(''),
      completed: Joi.boolean().default(false),
      dueDate: Joi.date().iso().optional().allow(null)
    }).unknown(),
  ).required(),
  status: Joi.string().valid('pending', 'in_progress', 'completed').default('pending'),
  additionalData: Joi.object().optional().default({})
});

const reportSchema = Joi.object({
  type: Joi.string()
    .valid(
      'office_performance',
      'consultant_productivity',
      'lead_conversion',
      'revenue',
      'student_demographics',
      'study_destinations'
    )
    .required(),
  data: Joi.object().required(),
  format: Joi.string().valid('pdf', 'excel').required(),
  scheduled: Joi.boolean().optional(),
});

const leadRuleSchema = Joi.object({
  criteria: Joi.object({
    location: Joi.string().optional(),
    studyDestination: Joi.string().optional(),
    budget: Joi.number().optional(),
    academicLevel: Joi.string().optional(),
    language: Joi.string().optional(),
    consultantSpecialization: Joi.string().optional(),
  }).required(),
  priority: Joi.number().required(),
  officeId: Joi.string().uuid().optional().allow(null),
  consultantId: Joi.string().uuid().optional().allow(null),
});

const studentProfileSchema = Joi.object({
  personalInfo: Joi.object({
    name: Joi.string().required(),
    cnic: Joi.string().optional(),
    dob: Joi.date().iso().required(),
    gender: Joi.string().required(),
    maritalStatus: Joi.string().optional(),
    nationality: Joi.string().required(),
    addresses: Joi.array().items(Joi.object()).required(),
    phone: Joi.string().required(),
    email: Joi.string().email().required(),
    emergencyContact: Joi.object().optional(),
  }).required(),
  educationalBackground: Joi.array().items(Joi.object()).required(),
  testScores: Joi.object().optional(),
  studyPreferences: Joi.object().required(),
  workExperience: Joi.array().items(Joi.object()).optional(),
  financialInfo: Joi.object().optional(),
  additionalInfo: Joi.object().optional(),
});

module.exports = {
  validate,
  userSchema,
  officeSchema,
  leadSchema,
  appointmentSchema,
  documentSchema,
  notificationSchema,
  reportSchema,
  leadRuleSchema,
  checklistSchema,
  studentProfileSchema
};
