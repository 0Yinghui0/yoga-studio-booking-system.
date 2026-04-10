// controllers/organiserController.js
import { CourseModel } from "../models/courseModel.js";

// Display organiser dashboard with all available courses
export const getOrganiserDashboard = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();

    res.render("organiser_dashboard", { 
        title: "Organiser Dashboard", 
        courses: courses 
    });
  } catch (err) {
    next(err);
  }
};

// Delete a course and update related bookings to preserve data consistency
export const deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { coursesDb, bookingsDb } = await import("../models/_db.js");

    const course = await coursesDb.findOne({ _id: courseId });
    if (!course) return res.send("<script>window.location.href = '/organiser';</script>");

    // Update existing bookings to reflect course deletion instead of removing them
    await bookingsDb.update(
      { courseId: courseId }, 
      { $set: { 
          status: "CANCELLED (Deleted by Staff)",
          courseTitle: course.title, 
          isDeleted: true
        } 
      }, 
      { multi: true }
    );

    await coursesDb.remove({ _id: courseId }, {});
    res.send("<script>window.location.href = '/organiser';</script>");
  } catch (err) {
    next(err);
  }
};

// Delete a session and update bookings with a descriptive snapshot
export const deleteSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;

    const { sessionsDb, bookingsDb, coursesDb } = await import("../models/_db.js");

    const session = await sessionsDb.findOne({ _id: sessionId });
    if (!session) {
      return res.send("<script>window.location.href = '/organiser';</script>");
    }
    const courseId = session.courseId;

    // Retrieve course title for booking history
    const course = await coursesDb.findOne({ _id: courseId });
    const courseName = course ? course.title : "Unknown Course";

    // Create a readable session description for cancelled bookings
    const dateStr = new Date(session.startDateTime).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
    const snapshotName = `${courseName} (Session: ${dateStr})`;

    // Update bookings instead of deleting them to maintain history
    await bookingsDb.update(
      { sessionIds: sessionId }, 
      { $set: { 
          status: "CANCELLED (Deleted by Organiser)",
          courseTitle: snapshotName,
          isDeleted: true
        } 
      }, 
      { multi: true }
    );

    await sessionsDb.remove({ _id: sessionId });

    res.send(`<script>window.location.href = '/organiser/edit/${courseId}';</script>`);
  } catch (err) {
    next(err);
  }
};

// Create a new course using form input data
export const addCourse = async (req, res, next) => {
  try {
    const newCourseData = {
      description: req.body.description, 
      title: req.body.title,
      level: req.body.level,
      startDate: req.body.startDate,
      endDate: req.body.endDate, 
      location: req.body.location, 
      price: req.body.price,       
      sessionPrice: req.body.sessionPrice,

      // Default values to ensure required fields exist
      type: "WEEKLY_BLOCK",  
      allowDropIn: true,
      sessionsCount: 0
    };

    const { CourseModel } = await import("../models/courseModel.js");
    await CourseModel.create(newCourseData);
    
    res.redirect("/organiser");
  } catch (err) {
    next(err);
  }
};

// Update an existing course with new form data
export const updateCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const updatedData = {
      title: req.body.title,
      description: req.body.description, 
      level: req.body.level,
      startDate: req.body.startDate,
      endDate: req.body.endDate, 
      location: req.body.location, 
      price: req.body.price,        
      sessionPrice: req.body.sessionPrice 
    };

    const { coursesDb } = await import("../models/_db.js");

    await coursesDb.update({ _id: courseId }, { $set: updatedData }, {});
    
    res.redirect("/organiser");
  } catch (err) {
    next(err);
  }
};

// Display participant list for a course, including booking details
export const viewParticipants = async (req, res, next) => {
  try {
    const courseId = req.params.id;
  
    const { coursesDb, bookingsDb, usersDb, sessionsDb } = await import("../models/_db.js");

    const course = await coursesDb.findOne({ _id: courseId });
    if (!course) return res.status(404).send("Course not found");

    const bookings = await bookingsDb.find({ courseId: courseId });

    // Match bookings to users and format booking details
    const participants = await Promise.all(bookings.map(async (booking) => {
      const user = await usersDb.findOne({ _id: booking.userId });
      
      let bookingTypeLabel = "Full Course";
      
      if (booking.type === 'SESSION') {
         const sessionId = booking.sessionIds[0];
         const session = await sessionsDb.findOne({ _id: sessionId });
         if (session) {
            const dateStr = new Date(session.startDateTime).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            bookingTypeLabel = `Session: ${dateStr}`;
         } else {
            bookingTypeLabel = "Individual Session";
         }
      }

      return {
        name: user ? user.name : "Unknown User",
        email: user ? user.email : "N/A",
        bookingType: bookingTypeLabel, 
        date: new Date(booking.createdAt).toLocaleDateString("en-GB"),
        status: booking.status
      };
    }));

    res.render("organiser_participants", {
      title: "Class List",
      course: course,
      participants: participants
    });
  } catch (err) {
    next(err);
  }
};

// Display all registered users for organiser management
export const manageUsersPage = async (req, res, next) => {
  try {
    const { usersDb } = await import("../models/_db.js");
    const allUsers = await usersDb.find({}); 
    
    res.render("organiser_users", { 
      title: "Manage Users", 
      users: allUsers 
    });
  } catch (err) {
    next(err);
  }
};

// Delete a user account (with safety check)
export const deleteUser = async (req, res, next) => {
  try {
    const userIdToDelete = req.params.id;
    
    // Prevent organiser from deleting their own account
    if (userIdToDelete === req.user._id) {
      return res.status(400).send("You cannot delete your own account.");
    }
    
    const { usersDb } = await import("../models/_db.js");
    await usersDb.remove({ _id: userIdToDelete }, {});
    
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
};

// Add a new session to a course
export const addSession = async (req, res, next) => {
  try {
    const courseId = req.params.id; 
    const { startDateTime, endDateTime, capacity, price } = req.body;

    // Validate required input fields
    if (!startDateTime || !endDateTime || !capacity || !price) {
      return res.status(400).send(`
        <div style="text-align: center; padding: 50px; font-family: sans-serif;">
          <div style="font-size: 3em; margin-bottom: 20px;">⚠️</div>
          <h2 style="color: #b91c1c;">Missing Information</h2>
          <p style="color: #64748b;">You must provide a Start Date, End Date, Capacity, and Price to create a session.</p>
          <a href="/organiser/edit/${courseId}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #0D47A1; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go Back</a>
        </div>
      `);
    }

    const { sessionsDb } = await import("../models/_db.js");

    const newSession = {
      courseId: courseId,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      capacity: parseInt(capacity),
      price: parseFloat(price), 
      booked: 0, 
      remaining: parseInt(capacity) 
    };

    await sessionsDb.insert(newSession);
    res.redirect(`/organiser/edit/${courseId}`);
  } catch (err) {
    next(err);
  }
};

// Update an existing session
export const updateSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;

    const { startDateTime, endDateTime, capacity, price, courseId } = req.body;
    const { sessionsDb } = await import("../models/_db.js");

    await sessionsDb.update(
      { _id: sessionId },
      { $set: { 
          startDateTime: startDateTime, 
          endDateTime: endDateTime, 
          capacity: parseInt(capacity),
          price: parseFloat(price) 
        } 
      }
    );

    res.send(`<script>window.location.href = '/organiser/edit/${courseId}';</script>`);
  } catch (err) {
    next(err);
  }
};

// Display edit page for a course, including its sessions
export const showEditCoursePage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { coursesDb, sessionsDb } = await import("../models/_db.js"); // Make sure sessionsDb is here!

    const course = await coursesDb.findOne({ _id: courseId });
    
    const sessions = await sessionsDb.find({ courseId: courseId }); 

    res.render("organiser_edit", { course, sessions, user: req.user });
    
  } catch (err) {
    next(err);
  }
};