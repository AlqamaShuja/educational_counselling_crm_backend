const {
  Application,
  StudentProfile,
  Document,
  Lead,
  User,
  sequelize,
} = require('../models');
const notificationService = require('../services/notificationService');
const AppError = require('../utils/appError');

// Mock University Data
const MOCK_UNIVERSITIES = [
  {
    id: 1,
    universityName: 'University of Toronto',
    country: 'Canada',
    programs: [
      { id: 101, name: 'Computer Science', fees: '$45,000', duration: '4 years', intakes: ['Fall', 'Winter'] },
      { id: 102, name: 'Business Administration', fees: '$42,000', duration: '2 years', intakes: ['Fall', 'Spring'] }
    ]
  },
  {
    id: 2,
    universityName: 'Harvard University',
    country: 'USA',
    programs: [
      { id: 201, name: 'Engineering', fees: '$55,000', duration: '4 years', intakes: ['Fall'] },
      { id: 202, name: 'Medicine', fees: '$65,000', duration: '6 years', intakes: ['Fall'] }
    ]
  },
  {
    id: 3,
    universityName: 'University of Oxford',
    country: 'UK',
    programs: [
      { id: 301, name: 'Law', fees: '£35,000', duration: '3 years', intakes: ['September'] },
      { id: 302, name: 'Physics', fees: '£40,000', duration: '4 years', intakes: ['September'] }
    ]
  }
];

// ===========================
// STUDENT OPERATIONS
// ===========================

const checkEligibility = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await StudentProfile.findOne({ where: { userId } });
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const documents = await Document.findAll({ where: { userId } });
    
    // Check profile completion
    const requiredFields = ['personalInfo', 'educationalBackground', 'studyPreferences'];
    const missingFields = requiredFields.filter(field => !profile[field] || Object.keys(profile[field]).length === 0);
    
    // Check required documents
    const requiredDocuments = ['passport', 'transcript', 'test_score'];
    const submittedDocTypes = documents.map(doc => doc.type);
    const missingDocuments = requiredDocuments.filter(type => !submittedDocTypes.includes(type));
    
    const profileComplete = missingFields.length === 0;
    const documentsComplete = missingDocuments.length === 0;
    const eligible = profileComplete && documentsComplete;
    
    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length + 
       (requiredDocuments.length - missingDocuments.length) / requiredDocuments.length) * 50
    );

    res.json({
      eligible,
      completionPercentage,
      missingFields,
      missingDocuments,
      profile: profileComplete,
      documents: documentsComplete
    });
  } catch (error) {
    next(error);
  }
};

const createApplication = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { notes, initialStage, universitySelections, visaInfo } = req.body;

    // Check if student already has an active application
    const existingApplication = await Application.findOne({
      where: { 
        studentId,
        status: ['draft', 'in_review', 'submitted', 'offers_received']
      }
    });

    if (existingApplication) {
      return res.status(400).json({ 
        error: 'You already have an active application',
        applicationId: existingApplication.id 
      });
    }

    // Find assigned consultant
    const lead = await Lead.findOne({ where: { studentId } });
    const consultantId = lead?.assignedConsultant || null;

    // Validate initial stage if provided
    const validStages = ['profile_review', 'university_selection', 'document_preparation'];
    const stage = initialStage && validStages.includes(initialStage) ? initialStage : 'profile_review';

    // Validate universitySelections if provided
    let validatedUniversitySelections = [];
    if (universitySelections && Array.isArray(universitySelections)) {
      validatedUniversitySelections = universitySelections.map(selection => ({
        universityId: selection.universityId || null,
        programId: selection.programId || null,
        universityName: selection.universityName || '',
        programName: selection.programName || '',
        country: selection.country || '',
        applicationDeadline: selection.applicationDeadline || null,
        requirements: selection.requirements || [],
        notes: selection.notes || ''
      }));
    }

    // Default visaInfo structure
    const defaultVisaInfo = {
      visaType: '',
      country: '',
      applicationDate: null,
      interviewDate: null,
      documentsRequired: [],
      status: 'not_started',
      notes: ''
    };

    const application = await Application.create({
      studentId,
      consultantId,
      status: 'draft',
      stage,
      notes: notes || null,
      universitySelections: validatedUniversitySelections,
      visaInfo: visaInfo || defaultVisaInfo
    });

    await notificationService.sendNotification({
      userId: studentId,
      type: 'in_app',
      message: 'Your application has been created successfully.',
      details: { applicationId: application.id }
    });

    if (consultantId) {
      await notificationService.sendNotification({
        userId: consultantId,
        type: 'in_app',
        message: 'A new application has been created by your student.',
        details: { applicationId: application.id, studentId }
      });
    }

    res.status(201).json({
      message: 'Application created successfully',
      application
    });
  } catch (error) {
    next(error);
  }
};

const getUniversities = async (req, res, next) => {
  try {
    const { country, program } = req.query;
    
    let universities = MOCK_UNIVERSITIES;
    
    if (country) {
      universities = universities.filter(uni => 
        uni.country.toLowerCase().includes(country.toLowerCase())
      );
    }
    
    if (program) {
      universities = universities.map(uni => ({
        ...uni,
        programs: uni.programs.filter(prog => 
          prog.name.toLowerCase().includes(program.toLowerCase())
        )
      })).filter(uni => uni.programs.length > 0);
    }

    res.json({
      message: 'Universities retrieved successfully',
      universities
    });
  } catch (error) {
    next(error);
  }
};

const selectUniversities = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { universitySelections } = req.body;
    const studentId = req.user.id;

    const application = await Application.findOne({
      where: { id, studentId }
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    await application.update({
      universitySelections,
      stage: 'document_preparation'
    });

    await notificationService.sendNotification({
      userId: studentId,
      type: 'in_app',
      message: 'University selections have been saved.',
      details: { applicationId: application.id }
    });

    res.json({
      message: 'Universities selected successfully',
      application
    });
  } catch (error) {
    next(error);
  }
};

const submitApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const application = await Application.findOne({
      where: { id, studentId }
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (!application.universitySelections || application.universitySelections.length === 0) {
      return res.status(400).json({ error: 'Please select universities before submitting' });
    }

    await application.update({
      status: 'submitted',
      stage: 'submission',
      submissionDate: new Date()
    });

    await notificationService.sendNotification({
      userId: studentId,
      type: 'in_app',
      message: 'Your application has been submitted successfully.',
      details: { applicationId: application.id }
    });

    if (application.consultantId) {
      await notificationService.sendNotification({
        userId: application.consultantId,
        type: 'in_app',
        message: 'Student has submitted their application.',
        details: { applicationId: application.id, studentId }
      });
    }

    res.json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    next(error);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const applications = await Application.findAll({
      where: { studentId },
      include: [
        {
          model: User,
          as: 'consultant',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'Applications retrieved successfully',
      applications
    });
  } catch (error) {
    next(error);
  }
};

const manageOffers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, offerId, response } = req.body; // action: 'add', 'accept', 'reject'
    const studentId = req.user.id;

    const application = await Application.findOne({
      where: { id, studentId }
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    let offerLetters = application.offerLetters || [];

    if (action === 'add') {
      offerLetters.push({
        id: Date.now(),
        universityId: req.body.universityId,
        universityName: req.body.universityName,
        programName: req.body.programName,
        offerDate: new Date(),
        status: 'pending',
        conditions: req.body.conditions || []
      });
    } else if (action === 'accept' || action === 'reject') {
      offerLetters = offerLetters.map(offer => 
        offer.id === parseInt(offerId) 
          ? { ...offer, status: action === 'accept' ? 'accepted' : 'rejected', responseDate: new Date() }
          : offer
      );
    }

    const newStatus = offerLetters.some(offer => offer.status === 'accepted') ? 'accepted' : 'offers_received';
    const newStage = newStatus === 'accepted' ? 'visa_application' : 'offer_management';

    await application.update({
      offerLetters,
      status: newStatus,
      stage: newStage
    });

    res.json({
      message: 'Offers updated successfully',
      application
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// CONSULTANT OPERATIONS
// ===========================

const getAssignedApplications = async (req, res, next) => {
  try {
    const consultantId = req.user.id;

    const applications = await Application.findAll({
      where: { consultantId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'Assigned applications retrieved successfully',
      applications
    });
  } catch (error) {
    next(error);
  }
};

const reviewApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, stage } = req.body;
    const consultantId = req.user.id;

    const application = await Application.findOne({
      where: { id, consultantId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    await application.update({
      status: status || application.status,
      stage: stage || application.stage,
      notes: notes || application.notes
    });

    await notificationService.sendNotification({
      userId: application.studentId,
      type: 'in_app',
      message: 'Your application has been reviewed by your consultant.',
      details: { applicationId: application.id }
    });

    // Fetch the updated application with student data
    const updatedApplication = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: 'Application reviewed successfully',
      application: updatedApplication
    });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, stage, notes } = req.body;
    const consultantId = req.user.id;

    const application = await Application.findOne({
      where: { id, consultantId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    await application.update({
      status: status || application.status,
      stage: stage || application.stage,
      notes: notes || application.notes
    });

    await notificationService.sendNotification({
      userId: application.studentId,
      type: 'in_app',
      message: `Your application status has been updated to: ${status}`,
      details: { applicationId: application.id }
    });

    // Fetch the updated application with student data
    const updatedApplication = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    next(error);
  }
};

// ===========================
// SUPER ADMIN OPERATIONS
// ===========================

const getAllApplications = async (req, res, next) => {
  try {
    const { status, stage } = req.query;
    const where = {};
    
    if (status) where.status = status;
    if (stage) where.stage = stage;

    const applications = await Application.findAll({
      where,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'consultant',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: 'All applications retrieved successfully',
      count: applications.length,
      applications
    });
  } catch (error) {
    next(error);
  }
};

const getApplicationStats = async (req, res, next) => {
  try {
    const totalApplications = await Application.count();
    const statusStats = await Application.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status']
    });
    const stageStats = await Application.findAll({
      attributes: ['stage', [sequelize.fn('COUNT', sequelize.col('stage')), 'count']],
      group: ['stage']
    });

    res.json({
      message: 'Application statistics retrieved successfully',
      stats: {
        total: totalApplications,
        byStatus: statusStats,
        byStage: stageStats
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Student operations
  checkEligibility,
  createApplication,
  getUniversities,
  selectUniversities,
  submitApplication,
  getMyApplications,
  manageOffers,
  
  // Consultant operations
  getAssignedApplications,
  reviewApplication,
  updateApplicationStatus,
  
  // Super admin operations
  getAllApplications,
  getApplicationStats
};