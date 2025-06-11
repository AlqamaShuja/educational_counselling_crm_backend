const { Notification } = require('../models');
const notificationService = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;
    if (status) where.status = status;

    const notifications = await Notification.findAll({ where });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

const setNotificationPreferences = async (req, res, next) => {
  try {
    await notificationService.setPreferences(req.user.id, req.body);
    res.json({ message: 'Preferences updated' });
  } catch (error) {
    next(error);
  }
};

const getNotificationHistory = async (req, res, next) => {
  try {
    const history = await Notification.findAll({
      where: { userId: req.user.id },
    });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification || notification.userId !== req.user.id)
      throw new Error('Notification not found');
    await notification.update({ readAt: new Date() });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { readAt: new Date() },
      {
        where: {
          userId: req.user.id,
          readAt: null,
        },
      }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification || notification.userId !== req.user.id)
      return res.status(404).json({ error: 'Notification not found' });
    await notification.destroy();
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification || notification.userId !== req.user.id)
      return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  setNotificationPreferences,
  getNotificationHistory,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationById,
};
