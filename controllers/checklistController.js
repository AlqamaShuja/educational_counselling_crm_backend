const { Checklist, User, Lead, } = require('../models');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// Create a new checklist
const createChecklist = async (req, res, next) => {
  try {
    const consultantId = req.user.id;
    const { studentId } = req.params;
    const { title, description, dueDate, priority, items } = req.body;

    // Verify student exists
    const student = await User.findOne({
      where: { id: studentId, role: 'student' },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const checklist = await Checklist.create({
      studentId,
      consultantId,
      title,
      description,
      dueDate,
      priority,
      items,
    });

    // Notify student
    await notificationService.sendNotification({
      userId: studentId,
      type: 'in_app',
      message: `A new checklist "${title}" has been created for you`,
      details: { checklistId: checklist.id },
    });

    res.status(201).json({
      success: true,
      data: checklist,
    });
  } catch (error) {
    next(error);
  }
};

// Get all checklists for a student
const getStudentChecklists = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const checklists = await Checklist.findAll({
      where: { studentId },
      include: [
        {
          model: User,
          as: 'consultant',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: checklists,
    });
  } catch (error) {
    next(error);
  }
};

// Get all checklists created by consultant
const getConsultantChecklists = async (req, res, next) => {
  try {
    const consultantId = req.user.id;
    const checklists = await Checklist.findAll({
      where: { consultantId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: checklists,
    });
  } catch (error) {
    next(error);
  }
};


const updateChecklistItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const { items: itemUpdates } = req.body;

    if (!itemUpdates || !Array.isArray(itemUpdates)) {
      throw new AppError('Items array is required', 400);
    }

    // Find checklist and verify student ownership
    const checklist = await Checklist.findOne({
      where: { id, studentId },
    });

    if (!checklist) {
      throw new AppError('Checklist not found or unauthorized', 404);
    }

    // Update items based on title matching
    let updatedItems = [...checklist.items];
    let hasChanges = false;

    itemUpdates.forEach((updateItem) => {
      if (!updateItem.title) return;

      const itemIndex = updatedItems.findIndex(
        (item) =>
          item.title.toLowerCase().trim() ===
          updateItem.title.toLowerCase().trim()
      );

      if (itemIndex !== -1 && typeof updateItem.completed === 'boolean') {
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          completed: updateItem.completed,
          completedAt: updateItem.completed ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        };
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      return res.json({
        success: true,
        data: checklist,
        message: 'No items were updated',
      });
    }

    // Calculate progress
    const completedItems = updatedItems.filter((item) => item.completed).length;
    const totalItems = updatedItems.length;
    const progress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Determine status based on progress
    let status = checklist.status;
    if (progress === 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in_progress';
    }

    // Update checklist
    await checklist.update({
      items: updatedItems,
      progress,
      status,
    });

    let leadStatusUpdated = false;

    // Check if all checklists for this student are completed
    if (status === 'completed') {
      const allChecklists = await Checklist.findAll({
        where: { studentId },
      });

      const allCompleted = allChecklists.every((cl) =>
        cl.id === checklist.id ? true : cl.status === 'completed'
      );

      if (allCompleted) {
        // Find and update lead status to "project"
        const lead = await Lead.findOne({
          where: { studentId },
        });

        if (lead && lead.status !== 'project') {
          await lead.update({
            status: 'project',
            history: [
              ...(lead.history || []),
              {
                note: 'Lead status updated to project - All checklists completed',
                timestamp: new Date().toISOString(),
                userId: studentId,
                action: 'status_update_auto',
              },
            ],
          });
          leadStatusUpdated = true;

          // Notify consultant about lead status change
          if (lead.assignedConsultant) {
            await notificationService.sendNotification({
              userId: lead.assignedConsultant,
              type: 'in_app',
              message: `Lead status updated to "Project" - Student completed all checklists`,
              details: {
                leadId: lead.id,
                studentId,
                previousStatus: lead.status,
                newStatus: 'project',
              },
            });
          }
        }
      }
    }

    // Notify student about checklist completion
    if (status === 'completed') {
      await notificationService.sendNotification({
        userId: studentId,
        type: 'in_app',
        message: `Congratulations! You completed the checklist "${checklist.title}"`,
        details: { checklistId: checklist.id },
      });
    }

    // Notify consultant about progress update
    await notificationService.sendNotification({
      userId: checklist.consultantId,
      type: 'in_app',
      message: `Student updated checklist "${checklist.title}" - ${progress}% completed`,
      details: {
        checklistId: checklist.id,
        progress,
        status,
        studentId,
      },
    });

    res.json({
      success: true,
      data: checklist,
      leadStatusUpdated,
      message: `Checklist updated successfully. Progress: ${progress}%`,
    });
  } catch (error) {
    next(error);
  }
};

// Update checklist
const updateChecklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultantId = req.user.id;
    const updates = req.body;

    const checklist = await Checklist.findOne({
      where: { id, consultantId },
    });

    if (!checklist) {
      throw new AppError('Checklist not found or unauthorized', 404);
    }

    // Calculate progress if items are being updated
    if (updates.items) {
      const completedItems = updates.items.filter(
        (item) => item.completed
      ).length;
      updates.progress = Math.round(
        (completedItems / updates.items.length) * 100
      );
    }

    await checklist.update(updates);

    // If status is being updated to completed, notify student
    if (updates.status === 'completed') {
      await notificationService.sendNotification({
        userId: checklist.studentId,
        type: 'checklist_completed',
        title: 'Checklist Completed',
        message: `The checklist "${checklist.title}" has been marked as completed`,
        data: { checklistId: checklist.id },
      });
    }

    res.json({
      success: true,
      data: checklist,
    });
  } catch (error) {
    next(error);
  }
};

// Delete checklist
const deleteChecklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultantId = req.user.id;

    const checklist = await Checklist.findOne({
      where: { id, consultantId },
    });

    if (!checklist) {
      throw new AppError('Checklist not found or unauthorized', 404);
    }

    await checklist.destroy();

    res.json({
      success: true,
      message: 'Checklist deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChecklist,
  getStudentChecklists,
  getConsultantChecklists,
  updateChecklist,
  deleteChecklist,
  updateChecklistItems,
};
