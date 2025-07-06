'use strict';

const { Op, literal } = require('sequelize');
const { Message, User, Lead, Office, OfficeConsultant } = require('../models');
const { validate: isUUID } = require('uuid');

const createConversationHash = (senderId, recipientId) => {
  const ids = [senderId, recipientId].sort();
  return `${ids[0]}_${ids[1]}`;
};

// const checkCommunicationPermission = async (
//   user,
//   recipientId,
//   { User, Lead }
// ) => {
//   try {
//     const recipient = await User.findByPk(recipientId, {
//       attributes: ['id', 'role', 'officeId'],
//     });
//     if (!recipient) return false;

//     if (user.role === 'super_admin') {
//       return true; // Super admins can message anyone
//     }

//     if (user.role === 'manager') {
//       if (recipient.role === 'student') {
//         const lead = await Lead.findOne({
//           where: { studentId: recipientId, officeId: user.officeId },
//         });
//         return !!lead;
//       }
//       if (recipient.role === 'consultant') {
//         return recipient.officeId === user.officeId;
//       }
//       if (recipient.role === 'super_admin') {
//         return true;
//       }
//       return false;
//     }

//     if (user.role === 'consultant') {
//       if (recipient.role === 'student') {
//         const lead = await Lead.findOne({
//           where: { studentId: recipientId, assignedConsultant: user.id },
//         });
//         return !!lead;
//       }
//       if (recipient.role === 'manager') {
//         const officeConsultant = await OfficeConsultant.findOne({
//           where: { userId: user.id, officeId: recipient.officeId },
//         });
//         return !!officeConsultant;
//       }
//       if (['super_admin', 'receptionist'].includes(recipient.role)) {
//         return true;
//       }
//       return false;
//     }

//     if (user.role === 'student') {
//       if (['consultant', 'manager'].includes(recipient.role)) {
//         const lead = await Lead.findOne({
//           where: { studentId: user.id, assignedConsultant: recipientId },
//         });
//         return !!lead || recipient.role === 'manager';
//       }
//       return false;
//     }

//     if (user.role === 'receptionist') {
//       return recipient.role === 'super_admin';
//     }

//     return false;
//   } catch (error) {
//     console.error('Error in checkCommunicationPermission:', error);
//     return false;
//   }
// };

const checkCommunicationPermission = async (
  user,
  recipientId,
  { User, Lead }
) => {
  try {
    // Validate recipientId is a UUID
    if (!isUUID(recipientId)) {
      return false;
    }

    const recipient = await User.findByPk(recipientId, {
      attributes: ['id', 'role', 'officeId'],
    });
    if (!recipient) return false;

    // Rest of the permission logic remains the same
    if (user.role === 'super_admin') {
      return true; // Super admins can message anyone
    }

    if (user.role === 'manager') {
      if (recipient.role === 'student') {
        const lead = await Lead.findOne({
          where: { studentId: recipientId, officeId: user.officeId },
        });
        return !!lead;
      }
      if (recipient.role === 'consultant') {
        const fetchRecipientOffice = await OfficeConsultant.findOne({
          where: { userId: recipientId, officeId: user.officeId },
        });

        return !!fetchRecipientOffice;
      }
      if (recipient.role === 'super_admin') {
        return true;
      }
      return false;
    }

    if (user.role === 'consultant') {
      if (recipient.role === 'student') {
        const lead = await Lead.findOne({
          where: { studentId: recipientId, assignedConsultant: user.id },
        });
        return !!lead;
      }
      if (recipient.role === 'manager') {
        const officeConsultant = await OfficeConsultant.findOne({
          where: { userId: user.id, officeId: recipient.officeId },
        });
        return !!officeConsultant;
      }
      if (['super_admin', 'receptionist'].includes(recipient.role)) {
        return true;
      }
      return false;
    }

    if (user.role === 'student') {
      if (['consultant', 'manager'].includes(recipient.role)) {
        const lead = await Lead.findOne({
          where: { studentId: user.id, assignedConsultant: recipientId },
        });
        return !!lead || recipient.role === 'manager';
      }
      return false;
    }

    if (user.role === 'receptionist') {
      return recipient.role === 'super_admin';
    }

    return false;
  } catch (error) {
    console.error('Error in checkCommunicationPermission:', error);
    return false;
  }
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
    const recipientDetails = await User.findByPk(recipientId, {
      attributes: ['id', 'name', 'role'],
    });
    const messageWithDetails = {
      ...message.toJSON(),
      sender: senderDetails,
      recipient: recipientDetails,
    };

    io.to(recipientId).emit('newMessage', messageWithDetails);
    io.to(sender.id).emit('newMessage', messageWithDetails);

    return res
      .status(201)
      .json({ message: 'Message sent successfully', data: messageWithDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// const getMessages = async (req, res) => {
//   try {
//     const { user } = req;
//     const { recipientId, limit = 50, offset = 0 } = req.query;

//     if (recipientId) {
//       let conversationHash;
//       if (user.role === 'super_admin') {
//         // Super admin views conversation by conversationHash
//         conversationHash = recipientId;
//       } else {
//         // Other roles use user.id and recipientId
//         const hasPermission = await checkCommunicationPermission(
//           user,
//           recipientId,
//           { User, Lead }
//         );
//         if (!hasPermission) {
//           return res
//             .status(403)
//             .json({ message: 'Not authorized to view this conversation' });
//         }
//         conversationHash = createConversationHash(user.id, recipientId);
//       }

//       const messages = await Message.findAndCountAll({
//         where: { conversationHash, deletedAt: null },
//         include: [
//           { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
//           { model: User, as: 'recipient', attributes: ['id', 'name', 'role'] },
//         ],
//         order: [['createdAt', 'ASC']],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//       });

//       // Ensure absolute fileUrl for each message
//       const baseUrl = process.env.BASE_URL || 'http://localhost:5009';
//       const messagesWithAbsoluteUrls = messages.rows.map((msg) => ({
//         ...msg.toJSON(),
//         fileUrl:
//           msg.fileUrl && !msg.fileUrl.startsWith('http')
//             ? `${baseUrl}${msg.fileUrl}`
//             : msg.fileUrl,
//       }));

//       return res.status(200).json({
//         data: messagesWithAbsoluteUrls,
//         total: messages.count,
//       });
//     }

//     let conversationHashes = [];
//     if (user.role === 'super_admin') {
//       conversationHashes = await Message.findAll({
//         where: { deletedAt: null },
//         attributes: [
//           [literal('DISTINCT "conversationHash"'), 'conversationHash'],
//         ],
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: [],
//             where: { role: { [Op.in]: ['student', 'consultant', 'manager'] } },
//           },
//           {
//             model: User,
//             as: 'recipient',
//             attributes: [],
//             where: { role: { [Op.in]: ['student', 'consultant', 'manager'] } },
//           },
//         ],
//         where: {
//           [Op.or]: [
//             {
//               [Op.and]: [
//                 literal(`"sender"."role" = 'student'`),
//                 literal(`"recipient"."role" IN ('consultant', 'manager')`),
//               ],
//             },
//             {
//               [Op.and]: [
//                 literal(`"recipient"."role" = 'student'`),
//                 literal(`"sender"."role" IN ('consultant', 'manager')`),
//               ],
//             },
//           ],
//         },
//         raw: true,
//       });
//       conversationHashes = conversationHashes.map((row) => ({
//         conversationHash: row.conversationHash,
//       }));
//     } else if (user.role === 'manager') {
//       const leads = await Lead.findAll({ where: { officeId: user.officeId } });
//       const studentIds = leads.map((lead) => lead.studentId);
//       conversationHashes = await Message.findAll({
//         where: {
//           [Op.or]: [
//             { senderId: user.id, recipientId: { [Op.in]: studentIds } },
//             { recipientId: user.id, senderId: { [Op.in]: studentIds } },
//           ],
//           deletedAt: null,
//         },
//         attributes: ['conversationHash'],
//         group: ['conversationHash'],
//       });
//     } else {
//       conversationHashes = await Message.findAll({
//         where: {
//           [Op.or]: [{ senderId: user.id }, { recipientId: user.id }],
//           deletedAt: null,
//         },
//         attributes: ['conversationHash'],
//         group: ['conversationHash'],
//       });
//     }

//     const conversations = await Promise.all(
//       conversationHashes.map(async (msg) => {
//         const [senderId, recipientId] = msg.conversationHash.split('_');
//         const otherUserId = senderId === user.id ? recipientId : senderId;
//         const otherUser = await User.findByPk(otherUserId, {
//           attributes: ['id', 'name', 'role'],
//         });
//         const lastMessage = await Message.findOne({
//           where: { conversationHash: msg.conversationHash, deletedAt: null },
//           order: [['createdAt', 'DESC']],
//           include: [
//             { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
//             {
//               model: User,
//               as: 'recipient',
//               attributes: ['id', 'name', 'role'],
//             },
//           ],
//         });

//         // Ensure absolute fileUrl for lastMessage
//         const baseUrl = process.env.BASE_URL || 'http://localhost:5009';
//         if (
//           lastMessage &&
//           lastMessage.fileUrl &&
//           !lastMessage.fileUrl.startsWith('http')
//         ) {
//           lastMessage.fileUrl = `${baseUrl}${lastMessage.fileUrl}`;
//         }

//         let displayName;
//         if (user.role === 'super_admin') {
//           displayName = await getConversationDisplayName(msg.conversationHash, {
//             User,
//           });
//         } else {
//           displayName = otherUser ? otherUser.name : 'Unknown User';
//         }

//         return {
//           conversationHash: msg.conversationHash,
//           displayName,
//           lastMessage,
//           recipient: otherUser,
//         };
//       })
//     );

//     const sortedConversations = conversations
//       .filter((conv) => conv.displayName !== null)
//       .sort((a, b) => {
//         const aDate = a.lastMessage
//           ? new Date(a.lastMessage.createdAt)
//           : new Date(0);
//         const bDate = b.lastMessage
//           ? new Date(b.lastMessage.createdAt)
//           : new Date(0);
//         return bDate - aDate;
//       });

//     return res.status(200).json({
//       data: sortedConversations,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

const getMessages = async (req, res) => {
  try {
    const { user } = req;
    const { recipientId, limit = 50, offset = 0 } = req.query;

    if (recipientId) {
      // Prevent super admin from querying their own ID
      if (user.role === 'super_admin' && recipientId === user.id) {
        return res
          .status(403)
          .json({ message: 'Cannot view conversation with self' });
      }

      let conversationHash;
      if (user.role === 'super_admin') {
        conversationHash = recipientId.includes('_')
          ? recipientId
          : createConversationHash(user.id, recipientId);
      } else {
        const hasPermission = await checkCommunicationPermission(
          user,
          recipientId,
          { User, Lead }
        );
        if (!hasPermission) {
          return res
            .status(403)
            .json({ message: 'Not authorized to view this conversation' });
        }
        conversationHash = createConversationHash(user.id, recipientId);
      }

      const messages = await Message.findAndCountAll({
        where: { conversationHash, deletedAt: null },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'role'] },
        ],
        order: [['createdAt', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const baseUrl = process.env.BASE_URL || 'http://localhost:5009';
      const messagesWithAbsoluteUrls = messages.rows;
      // .map((msg) => ({
      //   ...msg.toJSON(),
      //   fileUrl:
      //     msg.fileUrl && !msg.fileUrl.startsWith('http')
      //       ? `${baseUrl}${msg.fileUrl}`
      //       : msg.fileUrl,
      // }));

      return res.status(200).json({
        data: messagesWithAbsoluteUrls,
        total: messages.count,
      });
    }

    let conversationHashes = [];
    if (user.role === 'super_admin') {
      conversationHashes = await Message.findAll({
        where: { deletedAt: null },
        attributes: [
          [literal('DISTINCT "conversationHash"'), 'conversationHash'],
        ],
        include: [
          {
            model: User,
            as: 'sender',
            attributes: [],
            where: {
              role: {
                [Op.in]: ['student', 'consultant', 'manager', 'receptionist'],
              },
            },
          },
          {
            model: User,
            as: 'recipient',
            attributes: [],
            where: {
              role: {
                [Op.in]: ['student', 'consultant', 'manager', 'receptionist'],
              },
            },
          },
        ],
        where: {
          [Op.or]: [
            {
              [Op.and]: [
                literal(`"sender"."role" = 'student'`),
                literal(
                  `"recipient"."role" IN ('consultant', 'manager', 'receptionist')`
                ),
              ],
            },
            {
              [Op.and]: [
                literal(`"recipient"."role" = 'student'`),
                literal(
                  `"sender"."role" IN ('consultant', 'manager', 'receptionist')`
                ),
              ],
            },
          ],
        },
        raw: true,
      });
      conversationHashes = conversationHashes.map((row) => ({
        conversationHash: row.conversationHash,
      }));
    } else if (user.role === 'manager') {
      const leads = await Lead.findAll({ where: { officeId: user.officeId } });
      const studentIds = leads.map((lead) => lead.studentId);
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [
            {
              senderId: user.id,
              recipientId: {
                [Op.in]: [
                  ...studentIds,
                  ...(
                    await User.findAll({
                      where: {
                        role: ['super_admin', 'consultant'],
                        officeId: user.officeId,
                      },
                      attributes: ['id'],
                    })
                  ).map((u) => u.id),
                ],
              },
            },
            {
              recipientId: user.id,
              senderId: {
                [Op.in]: [
                  ...studentIds,
                  ...(
                    await User.findAll({
                      where: {
                        role: ['super_admin', 'consultant'],
                        officeId: user.officeId,
                      },
                      attributes: ['id'],
                    })
                  ).map((u) => u.id),
                ],
              },
            },
          ],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
      });
    } else if (user.role === 'consultant') {
      const officeConsultants = await OfficeConsultant.findAll({
        where: { userId: user.id },
        attributes: ['officeId'],
      });
      const officeIds = officeConsultants.map((oc) => oc.officeId);
      const assignedStudents = await Lead.findAll({
        where: { assignedConsultant: user.id },
        attributes: ['studentId'],
      });
      const studentIds = assignedStudents.map((lead) => lead.studentId);
      const allowedUsers = await User.findAll({
        where: {
          [Op.or]: [
            { role: ['super_admin', 'receptionist'] },
            { role: 'manager', officeId: { [Op.in]: officeIds } },
            { id: studentIds },
          ],
        },
        attributes: ['id'],
      });
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [
            {
              senderId: user.id,
              recipientId: { [Op.in]: allowedUsers.map((u) => u.id) },
            },
            {
              recipientId: user.id,
              senderId: { [Op.in]: allowedUsers.map((u) => u.id) },
            },
          ],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
      });
    } else {
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

        const baseUrl = process.env.BASE_URL || 'http://localhost:5009';
        if (
          lastMessage &&
          lastMessage.fileUrl &&
          !lastMessage.fileUrl.startsWith('http')
        ) {
          lastMessage.fileUrl = `${baseUrl}${lastMessage.fileUrl}`;
        }

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

// const getUnreadMessageCount = async (req, res) => {
//   try {
//     const { user } = req;

//     let conversationHashes = [];
//     if (user.role === 'super_admin') {
//       conversationHashes = await Message.findAll({
//         // where: { deletedAt: null },
//         attributes: [
//           [literal('DISTINCT "conversationHash"'), 'conversationHash'],
//         ],
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: [],
//             where: {
//               role: {
//                 [Op.in]: ['student', 'consultant', 'manager', 'receptionist'],
//               },
//             },
//           },
//           {
//             model: User,
//             as: 'recipient',
//             attributes: [],
//             where: {
//               role: {
//                 [Op.in]: ['student', 'consultant', 'manager', 'receptionist'],
//               },
//             },
//           },
//         ],
//         where: {
//           [Op.or]: [
//             {
//               [Op.and]: [
//                 literal(`"sender"."role" = 'student'`),
//                 literal(
//                   `"recipient"."role" IN ('consultant', 'manager', 'receptionist')`
//                 ),
//               ],
//             },
//             {
//               [Op.and]: [
//                 literal(`"recipient"."role" = 'student'`),
//                 literal(
//                   `"sender"."role" IN ('consultant', 'manager', 'receptionist')`
//                 ),
//               ],
//             },
//           ],
//         },
//         raw: true,
//       });
//       conversationHashes = conversationHashes.map(
//         (row) => row.conversationHash
//       );
//     } else if (user.role === 'manager') {
//       const leads = await Lead.findAll({ where: { officeId: user.officeId } });
//       const studentIds = leads.map((lead) => lead.studentId);
//       conversationHashes = await Message.findAll({
//         where: {
//           [Op.or]: [
//             {
//               senderId: user.id,
//               recipientId: {
//                 [Op.in]: [
//                   ...studentIds,
//                   ...(
//                     await User.findAll({
//                       where: {
//                         role: ['super_admin', 'consultant'],
//                         officeId: user.officeId,
//                       },
//                       attributes: ['id'],
//                     })
//                   ).map((u) => u.id),
//                 ],
//               },
//             },
//             {
//               recipientId: user.id,
//               senderId: {
//                 [Op.in]: [
//                   ...studentIds,
//                   ...(
//                     await User.findAll({
//                       where: {
//                         role: ['super_admin', 'consultant'],
//                         officeId: user.officeId,
//                       },
//                       attributes: ['id'],
//                     })
//                   ).map((u) => u.id),
//                 ],
//               },
//             },
//           ],
//           deletedAt: null,
//         },
//         attributes: ['conversationHash'],
//         group: ['conversationHash'],
//         raw: true,
//       });
//       conversationHashes = conversationHashes.map(
//         (row) => row.conversationHash
//       );
//     } else if (user.role === 'consultant') {
//       const officeConsultants = await OfficeConsultant.findAll({
//         where: { userId: user.id },
//         attributes: ['officeId'],
//       });
//       const officeIds = officeConsultants.map((oc) => oc.officeId);
//       const assignedStudents = await Lead.findAll({
//         where: { assignedConsultant: user.id },
//         attributes: ['studentId'],
//       });
//       const studentIds = assignedStudents.map((lead) => lead.studentId);
//       const allowedUsers = await User.findAll({
//         where: {
//           [Op.or]: [
//             { role: ['super_admin', 'receptionist'] },
//             { role: 'manager', officeId: { [Op.in]: officeIds } },
//             { id: studentIds },
//           ],
//         },
//         attributes: ['id'],
//       });
//       conversationHashes = await Message.findAll({
//         where: {
//           [Op.or]: [
//             {
//               senderId: user.id,
//               recipientId: { [Op.in]: allowedUsers.map((u) => u.id) },
//             },
//             {
//               recipientId: user.id,
//               senderId: { [Op.in]: allowedUsers.map((u) => u.id) },
//             },
//           ],
//           deletedAt: null,
//         },
//         attributes: ['conversationHash'],
//         group: ['conversationHash'],
//         raw: true,
//       });
//       conversationHashes = conversationHashes.map(
//         (row) => row.conversationHash
//       );
//     } else {
//       conversationHashes = await Message.findAll({
//         where: {
//           [Op.or]: [{ senderId: user.id }, { recipientId: user.id }],
//           deletedAt: null,
//         },
//         attributes: ['conversationHash'],
//         group: ['conversationHash'],
//         raw: true,
//       });
//       conversationHashes = conversationHashes.map(
//         (row) => row.conversationHash
//       );
//     }

//     const unreadCounts = await Promise.all(
//       conversationHashes.map(async (conversationHash) => {
//         const count = await Message.count({
//           where: {
//             conversationHash,
//             recipientId: user.id,
//             readAt: null,
//             deletedAt: null,
//           },
//         });
//         return { conversationHash, unreadCount: count };
//       })
//     );

//     return res.status(200).json({
//       data: unreadCounts,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };

const getUnreadMessageCount = async (req, res) => {
  try {
    const { user } = req;

    let conversationHashes = [];
    if (user.role === 'super_admin') {
      conversationHashes = await Message.findAll({
        attributes: [
          [literal('DISTINCT "conversationHash"'), 'conversationHash'],
        ],
        where: {
          deletedAt: null,
          [Op.or]: [
            // Include conversations where super_admin is sender or recipient
            { senderId: user.id },
            { recipientId: user.id },
            // Include monitored conversations (e.g., student ↔ manager/consultant/receptionist)
            {
              [Op.and]: [
                literal(`"sender"."role" = 'student'`),
                literal(
                  `"recipient"."role" IN ('consultant', 'manager', 'receptionist')`
                ),
              ],
            },
            {
              [Op.and]: [
                literal(`"recipient"."role" = 'student'`),
                literal(
                  `"sender"."role" IN ('consultant', 'manager', 'receptionist')`
                ),
              ],
            },
          ],
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: [],
            where: {
              role: {
                [Op.in]: [
                  'student',
                  'consultant',
                  'manager',
                  'receptionist',
                  'super_admin',
                ],
              },
            },
          },
          {
            model: User,
            as: 'recipient',
            attributes: [],
            where: {
              role: {
                [Op.in]: [
                  'student',
                  'consultant',
                  'manager',
                  'receptionist',
                  'super_admin',
                ],
              },
            },
          },
        ],
        raw: true,
      });
      conversationHashes = conversationHashes.map(
        (row) => row.conversationHash
      );
    } else if (user.role === 'manager') {
      const leads = await Lead.findAll({ where: { officeId: user.officeId } });
      const studentIds = leads.map((lead) => lead.studentId);
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [
            {
              senderId: user.id,
              recipientId: {
                [Op.in]: [
                  ...studentIds,
                  ...(
                    await User.findAll({
                      where: {
                        role: ['super_admin', 'consultant'],
                        officeId: user.officeId,
                      },
                      attributes: ['id'],
                    })
                  ).map((u) => u.id),
                ],
              },
            },
            {
              recipientId: user.id,
              senderId: {
                [Op.in]: [
                  ...studentIds,
                  ...(
                    await User.findAll({
                      where: {
                        role: ['super_admin', 'consultant'],
                        officeId: user.officeId,
                      },
                      attributes: ['id'],
                    })
                  ).map((u) => u.id),
                ],
              },
            },
          ],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
        raw: true,
      });
      conversationHashes = conversationHashes.map(
        (row) => row.conversationHash
      );
    } else if (user.role === 'consultant') {
      const officeConsultants = await OfficeConsultant.findAll({
        where: { userId: user.id },
        attributes: ['officeId'],
      });
      const officeIds = officeConsultants.map((oc) => oc.officeId);
      const assignedStudents = await Lead.findAll({
        where: { assignedConsultant: user.id },
        attributes: ['studentId'],
      });
      const studentIds = assignedStudents.map((lead) => lead.studentId);
      const allowedUsers = await User.findAll({
        where: {
          [Op.or]: [
            { role: ['super_admin', 'receptionist'] },
            { role: 'manager', officeId: { [Op.in]: officeIds } },
            { id: studentIds },
          ],
        },
        attributes: ['id'],
      });
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [
            {
              senderId: user.id,
              recipientId: { [Op.in]: allowedUsers.map((u) => u.id) },
            },
            {
              recipientId: user.id,
              senderId: { [Op.in]: allowedUsers.map((u) => u.id) },
            },
          ],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
        raw: true,
      });
      conversationHashes = conversationHashes.map(
        (row) => row.conversationHash
      );
    } else {
      conversationHashes = await Message.findAll({
        where: {
          [Op.or]: [{ senderId: user.id }, { recipientId: user.id }],
          deletedAt: null,
        },
        attributes: ['conversationHash'],
        group: ['conversationHash'],
        raw: true,
      });
      conversationHashes = conversationHashes.map(
        (row) => row.conversationHash
      );
    }

    const unreadCounts = await Promise.all(
      conversationHashes.map(async (conversationHash) => {
        const count = await Message.count({
          where: {
            conversationHash,
            recipientId: user.id,
            readAt: null,
            deletedAt: null,
          },
        });
        return { conversationHash, unreadCount: count };
      })
    );

    return res.status(200).json({
      data: unreadCounts,
    });
  } catch (error) {
    console.error('Error in getUnreadMessageCount:', error);
    return res.status(500).json({ message: error.message });
  }
};

const markConversationMessagesAsRead = async (req, res) => {
  try {
    const { user } = req;
    const { conversationHash } = req.params;

    // Verify permission to access the conversation
    const hasPermission = await checkCommunicationPermission(
      user,
      conversationHash.split('_').find((id) => id !== user.id),
      { User, Lead }
    );
    if (!hasPermission && user.role !== 'super_admin') {
      return res.status(403).json({
        message: 'Not authorized to mark messages as read in this conversation',
      });
    }

    // Update all unread messages where the user is the recipient
    const [updatedCount] = await Message.update(
      { readAt: new Date() },
      {
        where: {
          conversationHash,
          recipientId: user.id,
          readAt: null,
          deletedAt: null,
        },
      }
    );

    // Emit socket event for each updated message to notify the sender
    const updatedMessages = await Message.findAll({
      where: {
        conversationHash,
        recipientId: user.id,
        readAt: { [Op.ne]: null },
        deletedAt: null,
      },
    });

    const io = req.app.get('io');
    updatedMessages.forEach((message) => {
      io.to(message.senderId).emit('messageRead', {
        messageId: message.id,
        readAt: message.readAt,
        recipientId: user.id,
      });
    });

    return res
      .status(200)
      .json({ message: `${updatedCount} messages marked as read` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllowedRecipients = async (req, res) => {
  try {
    const { user } = req;

    let recipients = [];
    if (user.role === 'super_admin') {
      recipients = await User.findAll({
        where: {
          role: ['consultant', 'manager', 'receptionist', 'student'],
          isActive: true,
        },
        attributes: ['id', 'name', 'role'],
      });
    } else if (user.role === 'manager') {
      const office = await Office.findOne({ where: { managerId: user.id } });
      if (!office) {
        return res
          .status(404)
          .json({ message: 'Office not found for manager' });
      }
      const consultantIds = await OfficeConsultant.findAll({
        where: { officeId: office.id },
        attributes: ['userId'],
      });
      let recipients1 = await User.findAll({
        where: {
          [Op.or]: [
            { role: 'super_admin', },
            { id: consultantIds.map((oc) => oc.userId) },
          ],
          isActive: true,
        },
        attributes: ['id', 'name', 'role'],
      });
      let leads = await Lead.findAll({
        where: {
          officeId: office.id,
        },
        attributes: ['studentId'],
      });
      const stdIds = leads.map(lead => lead.studentId);
      let recipients2 = await User.findAll({
        where: {
          id: stdIds,
        },
        attributes: ['id', 'name', 'role'],
      });
      // Merge recipients1 and recipients2, removing duplicates by id
      const allRecipients = [...recipients1, ...recipients2];
      const uniqueIds = new Set(allRecipients.map((user) => user.id));
      recipients = Array.from(uniqueIds).map((id) =>
        allRecipients.find((user) => user.id === id)
      );
    } else if (user.role === 'consultant') {
      const officeConsultants = await OfficeConsultant.findAll({
        where: { userId: user.id },
        attributes: ['officeId'],
      });
      const officeIds = officeConsultants.map((oc) => oc.officeId);
      const assignedStudents = await Lead.findAll({
        where: { assignedConsultant: user.id },
        attributes: ['studentId'],
      });
      const studentIds = assignedStudents.map((lead) => lead.studentId);
      if (officeIds.length === 0) {
        recipients = await User.findAll({
          where: {
            [Op.or]: [
              { role: ['super_admin', 'receptionist'] },
              { id: studentIds },
            ],
            isActive: true,
          },
          attributes: ['id', 'name', 'role'],
        });
      } else {
        recipients = await User.findAll({
          where: {
            [Op.or]: [
              { role: ['super_admin', 'receptionist'] },
              { role: 'manager', officeId: { [Op.in]: officeIds } },
              { id: studentIds },
            ],
            isActive: true,
          },
          attributes: ['id', 'name', 'role'],
        });
      }
    } else if (user.role === 'receptionist') {
      recipients = await User.findAll({
        where: {
          role: ['super_admin'],
          isActive: true,
        },
        attributes: ['id', 'name', 'role'],
      });
    } else if (user.role === 'student') {
      recipients = await User.findAll({
        where: {
          role: ['consultant', 'manager'],
          isActive: true,
        },
        attributes: ['id', 'name', 'role'],
      });
    }

    return res.status(200).json({ data: recipients });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMessage,
  getMessages,
  updateMessage,
  markMessageAsRead,
  getAllowedRecipients,
  getUnreadMessageCount,
  markConversationMessagesAsRead,
};
