
// routes/auth.js
import { Router } from "express";
import { showLoginPage, showRegisterPage, registerUser, loginUser, logoutUser } from "../controllers/authController.js";

const router = Router();

// Render authentication pages
router.get("/login", showLoginPage);
router.get("/register", showRegisterPage);

export default router;

// Handle authentication form submissions
router.post("/register", registerUser);
router.post("/login", loginUser);

// Log out the current user
router.get("/logout", logoutUser);