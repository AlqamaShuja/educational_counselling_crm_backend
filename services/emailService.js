const nodemailer = require('nodemailer');
const { User, Appointment } = require('../models');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (to, token) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const mailOptions = {
    from: `"EduCRM Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ NEW FUNCTION: Send appointment confirmation email
const sendAppointmentConfirmation = async (studentId, appointmentId) => {
  const student = await User.findByPk(studentId);
  const appointment = await Appointment.findByPk(appointmentId, {
    include: [{ model: User, as: 'consultant' }],
  });

  if (!student || !appointment) {
    throw new Error('Invalid student or appointment');
  }

  const mailOptions = {
    from: `"EduCRM Support" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: 'Appointment Confirmation',
    html: `
      <p>Dear ${student.name},</p>
      <p>Your appointment has been confirmed with consultant <strong>${appointment.consultant?.name || 'N/A'}</strong>.</p>
      <p><strong>Date & Time:</strong> ${new Date(appointment.dateTime).toLocaleString()}</p>
      <p><strong>Type:</strong> ${appointment.type.replace('_', ' ')}</p>
      <p>Please arrive 10 minutes early if it's an in-person meeting.</p>
      <p>Thank you,<br/>EduCRM Team</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendPasswordResetEmail,
  sendAppointmentConfirmation,
};
