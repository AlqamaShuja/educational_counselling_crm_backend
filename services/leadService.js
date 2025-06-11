const { Lead, User, Office, Task, } = require('../models');
const { createObjectCsvWriter } = require('csv-writer');
const AppError = require('../utils/appError');
const fs = require('fs');

const createLead = async ({
  email,
  source,
  studyPreferences,
  officeId,
  userId,
}) => {
  // Find or create student user
  let student = await User.findOne({ where: { email } });
  if (!student) {
    student = await User.create({
      email,
      password: await require('bcryptjs').hash('TempPassword123!', 10),
      role: 'student',
    });
  }

  // Validate office
  const office = await Office.findByPk(officeId);
  if (!office) {
    throw new AppError('Office not found', 404);
  }

  // Create lead
  const lead = await Lead.create({
    studentId: student.id,
    officeId,
    source,
    studyPreferences,
    status: 'new',
    history: [{ note: 'Lead created', timestamp: new Date(), userId }],
  });

  return lead;
};

const getLeadsByConsultant = async (consultantId) => {
  return Lead.findAll({ where: { assignedConsultant: consultantId } });
};

const getLeadsByOffice = async (officeId) => {
  return Lead.findAll({ where: { officeId } });
};

const getAllLeads = async () => {
  return Lead.findAll({
    include: [
      { model: User, as: 'student', attributes: ['id', 'email', 'name'] },
      { model: Office, attributes: ['id', 'name'] },
    ],
  });
};

const updateLeadStatus = async (leadId, consultantId, status) => {
  const lead = await Lead.findOne({
    where: { id: leadId, assignedConsultant: consultantId },
  });
  if (!lead) {
    throw new AppError('Lead not found or not assigned to you', 404);
  }
  lead.status = status;
  lead.history = [
    ...(lead.history || []),
    {
      note: `Status updated to ${status}`,
      timestamp: new Date(),
      userId: consultantId,
    },
  ];
  await lead.save();
  return lead;
};

const reassignLead = async (leadId, consultantId, reassignerId) => {
  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  const consultant = await User.findOne({
    where: { id: consultantId, role: 'consultant' },
  });
  if (!consultant) {
    throw new AppError('Consultant not found', 404);
  }
  lead.assignedConsultant = consultantId;
  lead.history = [
    ...(lead.history || []),
    {
      note: `Reassigned to consultant ${consultantId}`,
      timestamp: new Date(),
      userId: reassignerId,
    },
  ];
  await lead.save();
  return lead;
};

const exportLeads = async () => {
  const leads = await Lead.findAll({
    include: [
      { model: User, as: 'student', attributes: ['email'] },
      { model: Office, attributes: ['name'] },
    ],
  });

  const csvPath = `exports/leads_${Date.now()}.csv`;
  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'id', title: 'Lead ID' },
      { id: 'status', title: 'Status' },
      { id: 'source', title: 'Source' },
      { id: 'student.email', title: 'Student Email' },
      { id: 'office.name', title: 'Office' },
    ],
  });

  const records = leads.map((lead) => ({
    id: lead.id,
    status: lead.status,
    source: lead.source,
    'student.email': lead.student?.email,
    'office.name': lead.office?.name,
  }));

  await csvWriter.writeRecords(records);
  return csvPath;
};

const getLeadHistory = async (leadId) => {
  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  return lead.history || [];
};

const setReminder = async (leadId, reminderData, userId) => {
  if (!reminderData.message || !reminderData.dueDate) {
    throw new AppError('Message and dueDate are required for reminder', 400);
  }

  // Validate dueDate is a valid ISO date
  const dueDate = new Date(reminderData.dueDate);
  if (isNaN(dueDate.getTime())) {
    throw new AppError('Invalid dueDate format', 400);
  }

  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404); // Shouldn't occur due to controller check
  }

  // Append reminder to history
  const historyEntry = {
    note: `Reminder: ${reminderData.message}`,
    timestamp: new Date().toISOString(),
    userId,
    dueDate: reminderData.dueDate,
  };

  const updatedHistory = [...lead.history, historyEntry];
  await lead.update({ history: updatedHistory });
};

const logLeadHistory = async (leadId, note, userId) => {
  if (!note || typeof note !== 'string') {
    throw new AppError('Note is required and must be a string', 400);
  }
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const historyEntry = {
    note,
    timestamp: new Date().toISOString(),
    userId,
  };

  const updatedHistory = [...(lead.history || []), historyEntry];
  await lead.update({ history: updatedHistory });
};

const setFollowUpTask = async (leadId, taskData, userId) => {
  if (!taskData.description || !taskData.dueDate) {
    throw new AppError('Description and dueDate are required', 400);
  }
  const dueDate = new Date(taskData.dueDate);
  if (isNaN(dueDate.getTime())) {
    throw new AppError('Invalid dueDate format', 400);
  }
  const lead = await Lead.findByPk(leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  await Task.create({
    leadId,
    description: taskData.description,
    dueDate,
    createdBy: userId,
  });
};

module.exports = {
  createLead,
  getLeadsByConsultant,
  getLeadsByOffice,
  getAllLeads,
  updateLeadStatus,
  reassignLead,
  exportLeads,
  getLeadHistory,
  setReminder,
  logLeadHistory,
  setFollowUpTask,
};
