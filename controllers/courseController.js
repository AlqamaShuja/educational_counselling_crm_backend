const { Course, University } = require('../models');

const createCourse = async (req, res, next) => {
  try {
    const {
      name,
      duration,
      level,
      tuitionFee,
      creditHour,
      universityId,
      details,
    } = req.body;

    if (universityId){
        const university = await University.findByPk(universityId);
        if (!university)
          return res.status(404).json({ error: 'University not found' });
    }

    const course = await Course.create({
      name,
      duration,
      level,
      tuitionFee,
      creditHour,
      universityId,
      details: details || {},
    });

    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      include: {
        model: University,
        as: 'university',
        attributes: ['id', 'name', 'mouStatus'],
      },
    });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: {
        model: University,
        as: 'university',
        attributes: ['id', 'name', 'mouStatus'],
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const {
      name,
      duration,
      level,
      tuitionFee,
      creditHour,
      universityId,
      details,
    } = req.body;

    await course.update({
      name,
      duration,
      level,
      tuitionFee,
      creditHour,
      universityId,
      details: details || {},
    });

    res.json(course);
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await course.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
