// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          location: c.location, 
          price: c.price        
        };
      })
    );
    res.render("home", { title: "Yoga Courses", courses: cards });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course) return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    let sessions = await SessionModel.listByCourse(courseId);
    let hasBookedFullCourse = false;

    if (req.user) {
      const { bookingsDb } = await import("../models/_db.js");
      const userId = req.user._id;

       // Retrieve all bookings for this user and course
      const userBookings = await bookingsDb.find({ userId: userId, courseId: courseId });
      
      // Check whether the user has already booked the full course
      if (userBookings.some(b => b.type !== 'SESSION')) {
        hasBookedFullCourse = true;
      }
      // Enrich each session with booking state for the current user
      sessions = await Promise.all(sessions.map(async (s) => {
        const sessionBooking = await bookingsDb.findOne({ userId: userId, sessionIds: s._id });
        
        return {
          id: s._id,
          start: fmtDate(s.startDateTime),
          end: fmtDate(s.endDateTime),
          capacity: s.capacity,
          price: s.price, 
          booked: s.bookedCount ?? 0,
          remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
          isBooked: hasBookedFullCourse || (sessionBooking ? true : false), 
          isFull: (s.bookedCount >= s.capacity) ? true : false
        };
      }));
    } else {
      // Render sessions without booking state for guest users
      sessions = sessions.map((s) => ({
        id: s._id, start: fmtDate(s.startDateTime), end: fmtDate(s.endDateTime),
        capacity: s.capacity, price: s.price, booked: s.bookedCount ?? 0,
        remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        isBooked: false, isFull: (s.bookedCount >= s.capacity) ? true : false
      }));
    }

    res.render("course", {
      title: course.title,
      course: {
        id: course._id, title: course.title, level: course.level, type: course.type, allowDropIn: course.allowDropIn,
        location: course.location, price: course.price, 
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
      },
      sessions: sessions, user: req.user, hasBookedFullCourse: hasBookedFullCourse 
    });
  } catch (err) { next(err); }
};

// Process booking for a full course
export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id; 
    
    const { bookingsDb } = await import("../models/_db.js");
    
    // Prevent duplicate full-course bookings
    const userBookings = await bookingsDb.find({ userId: userId, courseId: courseId });
    const alreadyBookedFull = userBookings.some(b => b.type !== 'SESSION');

    if (alreadyBookedFull) {
      return res.status(400).send("<div style='text-align:center; padding: 50px; font-family:sans-serif;'><h2>Hold up! 🧘‍♀️</h2><p>You have already booked this entire course.</p><a href='/bookings/dashboard' style='color:#0D47A1; font-weight:bold;'>Go to My Dashboard</a></div>");
    }

    const booking = await bookCourseForUser(userId, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res.status(400).render("error", { title: "Booking failed", message: err.message });
  }
};

// Process booking for an individual session
export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user._id; 
    
    const { bookingsDb } = await import("../models/_db.js");
    const existingBooking = await bookingsDb.findOne({ userId: userId, sessionIds: sessionId });
    
    if (existingBooking) {
      return res.status(400).send("<div style='text-align:center; padding: 50px; font-family:sans-serif;'><h2>Hold up! 🧘‍♀️</h2><p>You have already booked this specific session.</p><a href='/bookings/dashboard' style='color:#0D47A1; font-weight:bold;'>Go to My Dashboard</a></div>");
    }

    const booking = await bookSessionForUser(userId, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message = err.code === "DROPIN_NOT_ALLOWED" ? "Drop-ins are not allowed for this course." : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

// Render booking confirmation page with course name
export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return res.status(404).render("error", { title: "Not found", message: "Booking not found" });

    let courseTitle = "Unknown Course";
    const { coursesDb, sessionsDb } = await import("../models/_db.js");
    
    if (booking.type === 'SESSION') {
      // Resolve course title through the booked session
      const targetSessionId = booking.sessionIds[0];
      const session = await sessionsDb.findOne({ _id: targetSessionId });
      if (session) {
        const course = await coursesDb.findOne({ _id: session.courseId });
        if (course) courseTitle = course.title;
      }
    } else {
      const course = await coursesDb.findOne({ _id: booking.courseId });
      if (course) courseTitle = course.title;
    }

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
        courseName: courseTitle
      },
    });
  } catch (err) { next(err); }
};