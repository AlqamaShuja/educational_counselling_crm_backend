const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/appError');

const signup = async ({ email, password, role, name, phone, officeId }) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    password: hashedPassword,
    role,
    name,
    phone,
    officeId,
  });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  return { user: { id: user.id, email: user.email, role: user.role }, token };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  return { user: { id: user.id, email: user.email, role: user.role }, token };
};

const getCurrentUser = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password'] },
  });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

module.exports = { signup, login, getCurrentUser };