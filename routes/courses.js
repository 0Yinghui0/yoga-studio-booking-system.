// routes/courses.js
import { Router } from "express";
import { coursesListPage } from "../controllers/coursesListController.js";
import * as courseApiController from "../controllers/courseApiController.js";

const router = Router();

// Render the course listing page
router.get("/", coursesListPage);

// Create a new course through the API controller
router.post("/", courseApiController.createCourse);

export default router;