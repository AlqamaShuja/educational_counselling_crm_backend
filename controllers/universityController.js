const { University, Course, } = require('../models');

const createUniversity = async (req, res, next) => {
  try {
    const { name, country, city, website, mouStatus, details } = req.body;

    const university = await University.create({
      name,
      country,
      city,
      website,
      mouStatus,
      details: details || {},
    });

    res.status(201).json(university);
  } catch (error) {
    next(error);
  }
};

const getAllUniversities = async (req, res, next) => {
  try {
    const universities = await University.findAll();
    res.json(universities);
  } catch (error) {
    next(error);
  }
};

const getUniversityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const university = await University.findByPk(id);
    if (!university)
      return res.status(404).json({ error: 'University not found' });

    res.json(university);
  } catch (error) {
    next(error);
  }
};

const updateUniversity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const university = await University.findByPk(id);
    if (!university)
      return res.status(404).json({ error: 'University not found' });

    const { name, country, city, website, mouStatus, details } = req.body;

    await university.update({
      name,
      country,
      city,
      website,
      mouStatus,
      details: details || {},
    });

    res.json(university);
  } catch (error) {
    next(error);
  }
};

const deleteUniversity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const university = await University.findByPk(id);
    if (!university)
      return res.status(404).json({ error: 'University not found' });

    await university.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getCoursesByUniversityId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const university = await University.findByPk(id);
    if (!university)
      return res.status(404).json({ error: 'University not found' });

    const courses = await Course.findAll({
      where: { universityId: id },
    });

    res.json(courses);
  } catch (error) {
    next(error);
  }
};

const getUnAssignCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      where: { universityId: null },
    });

    res.json(courses);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUniversity,
  getAllUniversities,
  getUniversityById,
  updateUniversity,
  deleteUniversity,
  getCoursesByUniversityId,
  getUnAssignCourses,
};
