// controllers/courseApiController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export const getAllCourses = async (req, res) => {
  try {
    const courses = await CourseModel.list({});
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

export const createCourse = async (req, res) => {
  try {
    const course = await CourseModel.create(req.body);
    res.status(201).json({ course });
  } catch (err) {
    res.status(500).json({ error: "Failed to create course" });
  }
};