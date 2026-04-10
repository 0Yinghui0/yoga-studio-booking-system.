// controllers/bookingController.js
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";

export const bookCourse = async (req, res) => {
  try {

    // Get the authenticated user ID and target course ID
    const userId = req.user._id; 
    const courseId = req.params.id || req.body.courseId;

    // Check whether the user has already booked this course
    const { bookingsDb } = await import("../models/_db.js");
    const existingBooking = await bookingsDb.findOne({ userId: userId, courseId: courseId });

    if (existingBooking) {

      return res.status(400).send("<div style='text-align:center; padding: 50px; font-family:sans-serif;'><h2>Hold up! 🧘‍♀️</h2><p>You have already booked this course.</p><a href='/bookings/dashboard' style='color:#0D47A1; font-weight:bold;'>Go to My Dashboard</a></div>");
    }

    // Create the booking and redirect the user to their dashboard
    await bookCourseForUser(userId, courseId);
    res.redirect("/bookings/dashboard");
  } catch (err) {
    console.error(err);
    res.status(400).send("Error: " + err.message);
  }
};

export const bookSession = async (req, res) => {
  try {
    // Get the authenticated user ID and target session ID
    const userId = req.user._id;
    const sessionId = req.params.id || req.body.sessionId;
    // Check whether the user has already booked this session
    const { bookingsDb } = await import("../models/_db.js");
    const existingBooking = await bookingsDb.findOne({ userId: userId, sessionId: sessionId });

    if (existingBooking) {

      return res.status(400).send("<div style='text-align:center; padding: 50px; font-family:sans-serif;'><h2>Hold up! 🧘‍♀️</h2><p>You have already booked this specific session.</p><a href='/bookings/dashboard' style='color:#0D47A1; font-weight:bold;'>Go to My Dashboard</a></div>");
    }

    // Create the booking and redirect the user to their dashboard
    await bookSessionForUser(userId, sessionId);
    res.redirect("/bookings/dashboard");
  } catch (err) {
    console.error(err);
    res.status(err.code === "DROPIN_NOT_ALLOWED" ? 400 : 500).send("Error: " + err.message);
  }
};

// Render the authenticated user's booking dashboard
export const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { bookingsDb, coursesDb, sessionsDb } = await import("../models/_db.js");

    const myBookings = await bookingsDb.find({ userId: userId });

    const enrichedBookings = await Promise.all(myBookings.map(async (booking) => {
      // Use the stored course title when the original course record no longer exists
      let courseTitle = booking.courseTitle || "Unknown Course";
      let dateString = "N/A";

      if (booking.type === 'SESSION') {
        const targetSessionId = booking.sessionIds[0]; 
        const session = await sessionsDb.findOne({ _id: targetSessionId });
        
        if (session) {
          dateString = new Date(session.startDateTime).toLocaleString("en-GB", {
            weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
          });
          const course = await coursesDb.findOne({ _id: session.courseId });
          if (course) courseTitle = course.title;
        } else if (booking.status.includes('CANCELLED')) {

          dateString = "Session Cancelled";
        }
      } else {
        const course = await coursesDb.findOne({ _id: booking.courseId });
        if (course) {
          courseTitle = course.title;
          dateString = new Date(course.startDate).toLocaleDateString("en-GB", {
             day: "numeric", month: "short", year: "numeric"
          });
        } else if (booking.status.includes('CANCELLED')) {

          dateString = "Course Cancelled";
        }
      }

      return {
        _id: booking._id,
        courseTitle: courseTitle,
        type: booking.type === 'SESSION' ? 'Individual Session' : 'Full Course',
        date: dateString,
        status: booking.status
      };
    }));

    res.render("user_dashboard", { 
      title: "My Dashboard", 
      bookings: enrichedBookings, 
      user: req.user 
    });
  } catch (err) {
    next(err);
  }
};

// Cancel a booking that belongs to the authenticated user
export const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { bookingsDb } = await import("../models/_db.js");

    // Restrict deletion to the logged-in user's own booking
    await bookingsDb.remove({ _id: bookingId, userId: req.user._id }, {});

    res.redirect("/bookings/dashboard");
  } catch (err) {
    next(err);
  }
};