// routes/organiser.js 
import { Router } from "express";
import { getOrganiserDashboard, deleteCourse, addCourse, showEditCoursePage, updateCourse, viewParticipants, manageUsersPage, deleteUser, addSession, updateSession, deleteSession } from "../controllers/organiserController.js";

import { requireLogin, requireOrganiser } from "../middlewares/authMiddleware.js";

const router = Router();

// Restrict all organiser routes to authenticated staff users
router.use(requireLogin, requireOrganiser);

// Render the organiser dashboard
router.get("/", getOrganiserDashboard);

router.post("/delete/:id", deleteCourse);

// Course management routes
router.post("/add", addCourse);
router.get("/edit/:id", showEditCoursePage);
router.post("/edit/:id", updateCourse);

// Participant list route
router.get("/participants/:id", viewParticipants);

// User Management Routes
router.get("/users", manageUsersPage);
router.post("/users/delete/:id", deleteUser);

// Session management routes
router.post("/edit/:id/session", addSession);
router.post("/session/edit/:sessionId", updateSession);
router.post("/session/delete/:sessionId", deleteSession);

export default router;