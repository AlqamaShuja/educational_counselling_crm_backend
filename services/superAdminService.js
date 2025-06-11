const { Office, User, Lead, LeadRule, Report } = require('../models');
const { createObjectCsvWriter } = require('csv-writer');
const pdfkit = require('pdfkit');
const fs = require('fs');
const AppError = require('../utils/appError');

const createOffice = async ({ name, location, contactInfo, managerId }) => {
  return Office.create({ name, location, contactInfo, managerId });
};

const createStaff = async ({ email, role, officeId, name, phone }) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already exists', 400);
  }
  return User.create({
    email,
    password: await bcrypt.hash('TempPassword123!', 10),
    role,
    officeId,
    name,
    phone,
  });
};

const importStaffCSV = async (filePath) => {
  const csv = require('csv-parse');
  const results = [];
  fs.createReadStream(filePath)
    .pipe(csv({ columns: true }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const staff of results) {
        await createStaff({
          email: staff.email,
          role: staff.role,
          officeId: staff.officeId,
          name: staff.name,
          phone: staff.phone,
        });
      }
    });
  return { count: results.length };
};

const createLeadRule = async ({ criteria, priority, targetConsultantIds }) => {
  return LeadRule.create({ criteria, priority, targetConsultantIds });
};

const getAllLeads = async () => {
  return Lead.findAll();
};

const exportLeads = async () => {
  const leads = await Lead.findAll();
  const csvWriter = createObjectCsvWriter({
    path: 'leads_export.csv',
    header: [
      { id: 'id', title: 'ID' },
      { id: 'status', title: 'Status' },
      { id: 'source', title: 'Source' },
    ],
  });
  await csvWriter.writeRecords(leads);
  return 'leads_export.csv';
};

const createReport = async ({ type, parameters }) => {
  const report = await Report.create({ type, parameters, status: 'pending' });
  // Placeholder: Generate report content
  report.status = 'generated';
  report.filePath = `/uploads/reports/${report.id}.pdf`;
  await report.save();
  return report;
};

module.exports = {
  createOffice,
  createStaff,
  importStaffCSV,
  createLeadRule,
  getAllLeads,
  exportLeads,
  createReport,
};
