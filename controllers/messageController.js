const { Op } = require('sequelize');
const { Message, User, Lead } = require('../models');

// Service Functions
const createConversationHash = (senderId, recipientId) => {
  const ids = [senderId, recipientId].sort();
  return `${ids[0]}_${ids[1]}`;
};

const checkCommunicationPermission = async (sender, recipientId, models) => {
  if (!sender || !sender.role) {
    throw new Error('Invalid sender');
  }

  const recipient = await models.User.findByPk(recipientId);
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  if (sender.role === 'student') {
    const lead = await models.Lead.findOne({
      where: { studentId: sender.id, assignedConsultant: recipientId },
    });
    return !!lead && recipient.role === 'consultant';
  }

  if (sender.role === 'super_admin') {
    return ['manager', 'consultant', 'receptionist'].includes(recipient.role);
  }

  if (sender.role === 'manager') {
    const lead = await models.Lead.findOne({
      where: { studentId: recipientId, officeId: sender.officeId },
    });
    return !!lead && recipient.role === 'student';
  }

  if (sender.role === 'consultant') {
    const lead = await models.Lead.findOne({
      where: { studentId: recipientId, assignedConsultant: sender.id },
    });
    return !!lead && recipient.role === 'student';
  }

  return false;
};

const getConversationDisplayName = async (conversationHash, models) => {
  const [senderId, recipientId] = conversationHash.split('_');
  const [sender, recipient] = await Promise.all([
    models.User.findByPk(senderId, { attributes: ['name', 'role'] }),
    models.User.findByPk(recipientId, { attributes: ['name', 'role'] }),
  ]);

  if (!sender || !recipient) return null;

  const isStudentConsultant =
    (sender.role === 'student' &&
      ['consultant', 'manager'].includes(recipient.role)) ||
    (['consultant', 'manager'].includes(sender.role) &&
      recipient.role === 'student');

  if (isStudentConsultant) {
    return `${sender.role === 'student' ? recipient.name : sender.name} - ${
      sender.role === 'student' ? sender.name : recipient.name
    }`;
  }

  return `${sender.name} - ${recipient.name}`;
};

// Controller Functions
const createMessage = async (req, res) => {
  try {
    const {
      recipientId,
      content,
      type = 'text',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId,
    } = req.body;
    const sender = req.user;
    const io = req.app.get('io');

    if (!content && type === 'text') {
      return res
        .status(400)
        .json({ message: 'Content is required for text messages' });
    }

    const hasPermission = await checkCommunicationPermission(
      sender,
      recipientId,
      { User, Lead }
    );
    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: 'Not authorized to send message to this recipient' });
    }

    const messageData = {
      senderId: sender.id,
      recipientId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId,
      conversationHash: createConversationHash(sender.id, recipientId),
    };

    const message = await Message.create(messageData);

    const senderDetails = await User.findByPk(sender.id, {
      attributes: ['id', 'name', 'role'],
    });
    io.to(recipientId).emit('newMessage', {
      ...message.toJSON(),
      sender: senderDetails,
    });

    return res
      .status(201)
      .json({ message: 'Message sent successfully', data: message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { user } = req;
    const { recipientId, limit = 50, offset = 0 } = req.query;

    if (recipientId) {
      const hasPermission = await checkCommunicationPermission(
        user,
        recipientId,
        { User, Lead }
      );
      if (!hasPermission && user.role !== 'super_admin') {
        return res
          .status(403)
          .json({ message: 'Not authorized to view this conversation' });
      }

      const conversationHash = createConversationHash(user.id, recipientId);
      const messages = await Message.findAndCountAll({
        where: { conversationHash, deletedAt: null },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'role'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return res.status(200).json({
        data: messages.rows,
        total: messages.count,
      });
    }

    let conversationHashes = [];
    if (user.role === 'super_admin') {
      // Fetch all student-consultant/manager conversations
      conversationHashes = await Message.findAll({
        where: { deletedAt: null },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
        include: [
          { model: User, as: 'sender', attributes: ['role'] },
          { model: User, as: 'recipient', attributes: ['role'] },
        ],
        having: {
          [Op.or]: [
            {
              '$sender.role$': 'student',
              '$recipient.role$': { [Op.in]: ['consultant', 'manager'] },
            },
            {
              '$recipient.role$': 'student',
              '$sender.role$': { [Op.in]: ['consultant', 'manager'] },
            },
          ],
        },
      });
    } else if (user.role === 'manager') {
      // Fetch conversations for leads in the manager's office
      const leads = await Lead.findAll({ where: { officeId: user.officeId } });
      const studentIds = leads.map((lead) => lead.studentId);
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [
            { senderId: user.id, recipientId: { [Op.in]: studentIds } },
            { recipientId: user.id, senderId: { [Op.in]: studentIds } },
          ],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
      });
    } else {
      // For consultants and students, fetch their conversations
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [{ senderId: user.id }, { recipientId: user.id }],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
      });
    }

    const conversations = await Promise.all(
      conversationHashes.map(async (msg) => {
        const [senderId, recipientId] = msg.conversationHash.split('_');
        const otherUserId = senderId === user.id ? recipientId : senderId;
        const otherUser = await User.findByPk(otherUserId, {
          attributes: ['id', 'name', 'role'],
        });
        const lastMessage = await Message.findOne({
          where: { conversationHash: msg.conversationHash, deletedAt: null },
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
            {
              model: User,
              as: 'recipient',
              attributes: ['id', 'name', 'role'],
            },
          ],
        });

        let displayName;
        if (user.role === 'super_admin') {
          displayName = await getConversationDisplayName(msg.conversationHash, {
            User,
          });
        } else {
          displayName = otherUser ? otherUser.name : 'Unknown User';
        }

        return {
          conversationHash: msg.conversationHash,
          displayName,
          lastMessage,
          recipient: otherUser,
        };
      })
    );

    const sortedConversations = conversations
      .filter((conv) => conv.displayName !== null)
      .sort((a, b) => {
        const aDate = a.lastMessage
          ? new Date(a.lastMessage.createdAt)
          : new Date(0);
        const bDate = b.lastMessage
          ? new Date(b.lastMessage.createdAt)
          : new Date(0);
        return bDate - aDate;
      });

    return res.status(200).json({
      data: sortedConversations,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { user } = req;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.senderId !== user.id) {
      return res
        .status(403)
        .json({ message: 'Not authorized to edit this message' });
    }

    await message.update({
      content,
      isEdited: true,
      editedAt: new Date(),
    });

    return res
      .status(200)
      .json({ message: 'Message updated successfully', data: message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    const io = req.app.get('io');

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.recipientId !== user.id) {
      return res
        .status(403)
        .json({ message: 'Not authorized to mark this message as read' });
    }

    await message.update({ readAt: new Date() });

    const senderDetails = await User.findByPk(message.senderId, {
      attributes: ['id', 'name', 'role'],
    });
    io.to(message.senderId).emit('messageRead', {
      messageId: message.id,
      readAt: message.readAt,
      recipientId: user.id,
    });

    return res
      .status(200)
      .json({ message: 'Message marked as read', data: message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllowedRecipients = async (req, res) => {
  const { user } = req;
  let recipients = [];
  let attributes = ['id', 'name', 'role', 'email',];
  try {
    if (user.role === 'student') {
      const lead = await Lead.findOne({ where: { studentId: user.id } });
      if (lead && lead.assignedConsultant) {
        const consultant = await User.findByPk(lead.assignedConsultant, {
          attributes: attributes,
        });
        recipients = consultant
          ? [{ id: consultant.id, name: consultant.name }]
          : [];
      }
    } else if (user.role === 'super_admin') {
      recipients = await User.findAll({
        where: { role: ['manager', 'consultant', 'receptionist', 'student'] },
        attributes: attributes,
      });
    } else if (user.role === 'manager') {
      const leads = await Lead.findAll({ where: { officeId: user.officeId } });
      const studentIds = leads.map((lead) => lead.studentId);
      recipients = await User.findAll({
        where: { id: studentIds, role: 'student' },
        attributes: attributes,
      });
    } else if (user.role === 'consultant') {
      const leads = await Lead.findAll({
        where: { assignedConsultant: user.id },
      });
      const studentIds = leads.map((lead) => lead.studentId);
      recipients = await User.findAll({
        where: { id: studentIds, role: 'student' },
        attributes: attributes,
      });
    }
    res.status(200).json({ data: recipients });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMessage,
  getMessages,
  updateMessage,
  // deleteMessage,
  markMessageAsRead,
  getAllowedRecipients,
};
