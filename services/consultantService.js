const { Lead, Appointment, Document, StudentProfile } = require('../models');
const AppError = require('../utils/appError');

const getAssignedLeads = async (consultantId) => {
  return Lead.findAll({ where: { assignedConsultant: consultantId } });
};

const updateLeadStatus = async (leadId, consultantId, status) => {
  const lead = await Lead.findOne({
    where: { id: leadId, assignedConsultant: consultantId },
  });
  if (!lead) {
    throw new AppError('Lead not found or not assigned to you', 404);
  }
  lead.status = status;
  await lead.save();
  return lead;
};

const scheduleAppointment = async ({
  leadId,
  consultantId,
  dateTime,
  type,
  notes,
}) => {
  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  return Appointment.create({
    studentId: lead.studentId,
    consultantId,
    officeId: lead.officeId,
    dateTime,
    type,
    notes,
  });
};

const reviewDocument = async (documentId, consultantId, { status, notes }) => {
  const document = await Document.findByPk(documentId);
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  document.status = status;
  document.notes = notes;
  await document.save();
  return document;
};

const requestProfileReview = async (studentId, comments) => {
  const profile = await StudentProfile.findOne({
    where: { userId: studentId },
  });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }
  profile.additionalInfo = {
    ...profile.additionalInfo,
    reviewStatus: 'pending',
    reviewComments: comments,
  };
  await profile.save();
  return profile;
};

const getCommunicationHistory = async (studentId) => {
  // Placeholder: Assumes a Communication model or logs stored elsewhere
  return []; // Implement based on actual storage
};

module.exports = {
  getAssignedLeads,
  updateLeadStatus,
  scheduleAppointment,
  reviewDocument,
  requestProfileReview,
  getCommunicationHistory,
};
