const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // throw new Error('No token provided');
      return res.status(400).send({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'role', 'officeId', 'isActive'],
    });

    if (!user) {
      return res.status(400).send({ error: 'User not found' });
    }

    if (!user.isActive) {
      // throw new Error('User account is inactive');
      return res.status(400).send({ error: 'User account is inactive' });
    }

    req.user = { id: user.id, role: user.role, officeId: user.officeId };
    next();
  } catch (error) {
    res.status(401).send({ error: 'Authentication failed: ' + error.message });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .send({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
