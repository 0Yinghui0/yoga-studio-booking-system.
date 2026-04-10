
// routes/bookings.js
import { Router } from 'express';
import { bookCourse, bookSession, getUserDashboard, cancelBooking } from '../controllers/bookingController.js';

const router = Router();

router.post('/course', bookCourse);
router.post('/session', bookSession);

// Render the user's booking dashboard
router.get("/dashboard", getUserDashboard);

// Cancel an existing booking
router.post("/cancel/:id", cancelBooking);

export default router;
