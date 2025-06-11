const { Report, Lead, Office, User, Appointment } = require('../models');
const { createObjectCsvWriter } = require('csv-writer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const AppError = require('../utils/appError');

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../../reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const generateReport = async ({ type, parameters }) => {
  let data;
  const timestamp = Date.now();
  const report = await Report.create({ type, parameters, status: 'pending' });

  try {
    switch (type) {
      case 'performance':
        data = await generatePerformanceReport(parameters);
        break;
      case 'lead':
        data = await generateLeadReport(parameters);
        break;
      case 'financial':
        data = await generateFinancialReport(parameters);
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    // Generate PDF
    const pdfPath = path.join(reportsDir, `${report.id}_${timestamp}.pdf`);
    await generatePDF(data, pdfPath);

    report.status = 'generated';
    report.filePath = pdfPath;
    await report.save();
    return report;
  } catch (error) {
    report.status = 'failed';
    await report.save();
    throw error;
  }
};

const generatePerformanceReport = async ({ officeId, dateRange }) => {
  const where = {};
  if (officeId) where.officeId = officeId;
  if (dateRange) {
    where.createdAt = {
      [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)],
    };
  }

  const leads = await Lead.findAll({
    where,
    include: [{ model: Office }, { model: User, as: 'consultant' }],
  });
  const metrics = {
    totalLeads: leads.length,
    convertedLeads: leads.filter((lead) => lead.status === 'converted').length,
    byConsultant: leads.reduce((acc, lead) => {
      const consultantId = lead.assignedConsultant || 'unassigned';
      acc[consultantId] = (acc[consultantId] || 0) + 1;
      return acc;
    }, {}),
  };

  return { title: 'Performance Report', metrics };
};

const generateLeadReport = async ({ officeId, dateRange }) => {
  const where = {};
  if (officeId) where.officeId = officeId;
  if (dateRange) {
    where.createdAt = {
      [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)],
    };
  }

  const leads = await Lead.findAll({
    where,
    include: [{ model: User, as: 'student' }, { model: Office }],
  });
  return {
    title: 'Lead Report',
    leads: leads.map((lead) => ({
      id: lead.id,
      studentEmail: lead.student?.email,
      officeName: lead.office?.name,
      status: lead.status,
      source: lead.source,
    })),
  };
};

const generateFinancialReport = async ({ officeId, dateRange }) => {
  // Placeholder: Assumes financial data (e.g., from converted leads)
  const where = { status: 'converted' };
  if (officeId) where.officeId = officeId;
  if (dateRange) {
    where.createdAt = {
      [Op.between]: [new Date(dateRange.start), new Date(dateRange.end)],
    };
  }

  const leads = await Lead.findAll({ where });
  const revenue = leads.length * 1000; // Mock revenue calculation
  return { title: 'Financial Report', revenue, leadCount: leads.length };
};

const generatePDF = (data, pdfPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);
    doc.fontSize(20).text(data.title, { align: 'center' });
    doc.moveDown();

    if (data.metrics) {
      doc.fontSize(14).text('Metrics:');
      Object.entries(data.metrics).forEach(([key, value]) => {
        doc.text(`${key}: ${JSON.stringify(value)}`);
      });
    } else if (data.leads) {
      doc.fontSize(14).text('Leads:');
      data.leads.forEach((lead) => {
        doc.text(
          `ID: ${lead.id}, Email: ${lead.studentEmail}, Status: ${lead.status}`
        );
      });
    } else if (data.revenue) {
      doc.text(`Revenue: $${data.revenue}`);
      doc.text(`Converted Leads: ${data.leadCount}`);
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

const getReports = async () => {
  return Report.findAll();
};

const exportReport = async (reportId, format = 'pdf') => {
  const report = await Report.findByPk(reportId);
  if (!report) {
    throw new AppError('Report not found', 404);
  }
  if (report.status !== 'generated') {
    throw new AppError('Report not ready for export', 400);
  }

  if (format === 'pdf') {
    return report.filePath;
  } else if (format === 'csv') {
    const csvPath = path.join(
      reportsDir,
      `${report.id}_export_${Date.now()}.csv`
    );
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [], // Dynamic headers based on report type
    });

    let records = [];
    if (report.type === 'lead') {
      csvWriter.header = [
        { id: 'id', title: 'Lead ID' },
        { id: 'studentEmail', title: 'Student Email' },
        { id: 'officeName', title: 'Office Name' },
        { id: 'status', title: 'Status' },
        { id: 'source', title: 'Source' },
      ];
      const data = await generateLeadReport(report.parameters);
      records = data.leads;
    } else if (report.type === 'performance') {
      csvWriter.header = [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
      ];
      const data = await generatePerformanceReport(report.parameters);
      records = Object.entries(data.metrics).map(([metric, value]) => ({
        metric,
        value: JSON.stringify(value),
      }));
    }

    await csvWriter.writeRecords(records);
    return csvPath;
  } else {
    throw new AppError('Unsupported export format', 400);
  }
};

const scheduleReport = async ({ type, parameters, frequency }) => {
  // Placeholder: Implement cron job or queue system
  const report = await Report.create({
    type,
    parameters,
    status: 'pending',
    frequency,
  });
  // Mock: Assume scheduling logic (e.g., node-cron)
  return {
    message: `Report scheduled with frequency: ${frequency}`,
    reportId: report.id,
  };
};

const getManagerDashboard = async (officeId) => {
  // Validate office
  const office = await Office.findByPk(officeId);
  if (!office) {
    throw new AppError('Office not found', 404);
  }

  // Get total leads
  const totalLeads = await Lead.count({ where: { officeId } });

  // Get converted leads
  const convertedLeads = await Lead.count({
    where: { officeId, status: 'converted' },
  });

  // Calculate conversion rate
  const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;

  // Get pending appointments
  const pendingAppointments = await Appointment.count({
    where: { officeId, status: 'scheduled' },
  });

  return {
    totalLeads,
    convertedLeads,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    pendingAppointments,
  };
};

const getStaffPerformance = async (officeId) => {
  const consultants = await User.findAll({
    where: { officeId, role: 'consultant' },
    include: [{ model: Lead, as: 'consultantLeads' }],
  });
  return consultants.map((consultant) => ({
    consultantId: consultant.id,
    name: consultant.name,
    totalLeads: consultant.consultantLeads.length,
    convertedLeads: consultant.consultantLeads.filter(
      (lead) => lead.status === 'converted'
    ).length,
  }));
};

module.exports = {
  generateReport,
  getReports,
  exportReport,
  scheduleReport,
  getManagerDashboard,
  getStaffPerformance,
};
