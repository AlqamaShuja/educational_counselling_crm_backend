const { Lead, Appointment, User } = require('../models');
const AppError = require('../utils/appError');

const registerLead = async ({ email, source, studyPreferences, officeId }) => {
  let student = await User.findOne({ where: { email } });
  if (!student) {
    student = await User.create({
      email,
      password: await bcrypt.hash('TempPassword123!', 10), // Temporary password
      role: 'student',
    });
  }
  return Lead.create({
    studentId: student.id,
    officeId,
    source,
    studyPreferences,
    status: 'new',
  });
};

const getOfficeAppointments = async (officeId) => {
  return Appointment.findAll({ where: { officeId } });
};

const updateAppointmentStatus = async (appointmentId, status) => {
  const appointment = await Appointment.findByPk(appointmentId);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  appointment.status = status;
  await appointment.save();
  return appointment;
};

module.exports = {
  registerLead,
  getOfficeAppointments,
  updateAppointmentStatus,
};
