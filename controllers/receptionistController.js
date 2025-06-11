const { Lead, User, Appointment } = require('../models');
const emailService = require('../services/emailService');
const leadService = require('../services/leadService');
const notificationService = require('../services/notificationService');

const registerWalkIn = async (req, res, next) => {
  try {
    const { studentData, appointmentData } = req.body;
    const student = await User.create({
      ...studentData,
      role: 'student',
      officeId: req.user.officeId,
    });
    const lead = await Lead.create({
      studentId: student.id,
      officeId: req.user.officeId,
      source: 'walk_in',
      studyPreferences: studentData.studyPreferences,
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Lead registered as walk-in',
          createdBy: req.user.id,
        },
      ],
    });

    //
    if (!appointmentData.consultantId) {
      const consultant = await User.findOne({
        where: {
          role: 'consultant',
          officeId: req.user.officeId,
          isActive: true,
        },
      });

      if (!consultant) throw new Error('No available consultant');

      appointmentData.consultantId = consultant.id;
    }

    const appointment = await Appointment.create({
      studentId: student.id,
      consultantId: appointmentData.consultantId,
      officeId: req.user.officeId,
      dateTime: appointmentData.dateTime,
      type: 'in_person',
    });
    await emailService.sendAppointmentConfirmation(student.id, appointment.id);

    await notificationService.sendNotification({
      userId: appointment.consultantId,
      type: 'in_app',
      message: `A walk-in student has been assigned to you.`,
      details: {
        studentId: student.id,
        leadId: lead.id,
        appointmentId: appointment.id,
        registeredBy: req.user.id,
        dateTime: appointment.dateTime,
      },
    });

    res.status(201).json({ student, lead, appointment });
  } catch (error) {
    next(error);
  }
};

const getAppointmentConfirmation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    const appointment = await Appointment.findOne({
      where: { studentId: lead.studentId },
    });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const getConsultantCalendars = async (req, res, next) => {
  try {
    const calendars = await Appointment.findAll({
      where: { officeId: req.user.officeId },
      include: [{ model: User, as: 'consultant' }],
    });
    res.json(calendars);
  } catch (error) {
    next(error);
  }
};

const bookAppointment = async (req, res, next) => {
  try {
    const appointmentData = { ...req.body, officeId: req.user.officeId };
    const appointment = await Appointment.create(appointmentData);
    await notificationService.sendAppointmentConfirmation(
      appointment.studentId,
      appointment.id
    );

    await notificationService.sendNotification({
      userId: appointment.consultantId,
      type: 'in_app',
      message: `A new appointment has been scheduled with a student.`,
      details: {
        studentId: appointment.studentId,
        appointmentId: appointment.id,
        officeId: appointment.officeId,
        scheduledBy: req.user.id,
        dateTime: appointment.dateTime,
      },
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    if (!appointment || appointment.officeId !== req.user.officeId)
      throw new Error('Appointment not found');
    await appointment.update(req.body);
    await notificationService.sendAppointmentConfirmation(
      appointment.studentId,
      appointment.id
    );

    await notificationService.sendNotification({
      userId: appointment.studentId,
      type: 'in_app',
      message: `Your appointment has been rescheduled.`,
      details: {
        appointmentId: appointment.id,
        updatedBy: req.user.id,
        newDateTime: appointment.dateTime,
      },
    });

    await notificationService.sendNotification({
      userId: appointment.consultantId,
      type: 'in_app',
      message: `An appointment has been rescheduled with a student.`,
      details: {
        appointmentId: appointment.id,
        updatedBy: req.user.id,
        newDateTime: appointment.dateTime,
      },
    });

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    if (!appointment || appointment.officeId !== req.user.officeId)
      throw new Error('Appointment not found');
    await appointment.update({ status: 'canceled' });
    await notificationService.notifyCancellation(
      appointment.studentId,
      appointment.id
    );
    res.json({ message: 'Appointment canceled' });
  } catch (error) {
    next(error);
  }
};

const sendAppointmentReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    if (!appointment || appointment.officeId !== req.user.officeId)
      throw new Error('Appointment not found');
    await notificationService.sendAppointmentReminder(
      appointment.studentId,
      appointment.id
    );
    res.json({ message: 'Reminder sent' });
  } catch (error) {
    next(error);
  }
};

const checkInStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    if (!appointment || appointment.officeId !== req.user.officeId)
      throw new Error('Appointment not found');
    await appointment.update({ status: 'completed' });

    await notificationService.sendNotification({
      userId: appointment.consultantId,
      type: 'in_app',
      message: `The student for your appointment has checked in.`,
      details: {
        appointmentId: appointment.id,
        checkedInBy: req.user.id,
      },
    });

    res.json({ message: 'Student checked in' });
  } catch (error) {
    next(error);
  }
};

const getWaitingList = async (req, res, next) => {
  try {
    const waitingList = await Appointment.findAll({
      where: { officeId: req.user.officeId, status: 'scheduled' },
    });
    res.json(waitingList);
  } catch (error) {
    next(error);
  }
};

const updateLeadContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    const student = await User.findByPk(lead.studentId);
    await student.update(req.body);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    await lead.update({ status });
    await leadService.logLeadHistory(lead.id, `status: ${status}`, req.user.id);

    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `Your lead status has been updated to: ${status}.`,
      details: {
        leadId: lead.id,
        updatedBy: req.user.id,
        status,
      },
    });

    res.json(lead);
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

    await notificationService.sendNotification({
      userId: lead.studentId,
      type: 'in_app',
      message: `A new note has been added to your file.`,
      details: {
        leadId: lead.id,
        note,
        addedBy: req.user.id,
      },
    });

    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead || lead.officeId !== req.user.officeId)
      throw new Error('Lead not found');
    res.json(lead.history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerWalkIn,
  getAppointmentConfirmation,
  getConsultantCalendars,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  sendAppointmentReminder,
  checkInStudent,
  getWaitingList,
  updateLeadContact,
  updateLeadStatus,
  addLeadNotes,
  getLeadHistory,
};
