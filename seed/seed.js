// seed/seed.js
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import bcrypt from "bcrypt";

const iso = (d) => new Date(d).toISOString();

async function wipeAll() {
  // Remove all documents to guarantee a clean seed
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  // Compact files so you’re not looking at stale data on disk
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

async function ensureUsers() {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash("Sushi_143", saltRounds);

  const student = await UserModel.create({
    name: "Test Student",
    email: "student@test.com",
    password: hashedPassword,
    role: "student",
  });

  const admin = await UserModel.create({
    name: "Studio Admin",
    email: "admin@test.com",
    password: hashedPassword,
    role: "organiser",
  });

  return { student, admin };
}

async function createWeekendWorkshop() {
  const instructor = await UserModel.create({
    name: "Ava",
    email: "ava@yoga.local",
    password: "hashed_dummy_password", 
    role: "instructor",
  });
  const course = await CourseModel.create({
    title: "Winter Mindfulness Workshop",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-01-10",
    endDate: "2026-01-11",
    location: "Main Studio",
    price: 80.00,
    sessionPrice: 20.00, 
    instructorId: instructor._id,
    sessionIds: [],
    description: "Two days of breath, posture alignment, and meditation.",
  });

  const base = new Date("2026-01-10T09:00:00"); // Sat 9am
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(base.getTime() + i * 2 * 60 * 60 * 1000); 
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 20,
      price: 20.00, 
      bookedCount: 0,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, { sessionIds: sessions.map((s) => s._id) });
  return { course, sessions, instructor };
}

async function createWeeklyBlock() {
  const instructor = await UserModel.create({
    name: "Ben",
    email: "ben@yoga.local",
    password: "hashed_dummy_password",
    role: "instructor",
  });
  const course = await CourseModel.create({
    title: "12‑Week Vinyasa Flow",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    location: "Studio B",
    price: 120.00,
    sessionPrice: 12.00,
    instructorId: instructor._id,
    sessionIds: [],
    description: "Progressive sequences building strength and flexibility.",
  });

  const first = new Date("2026-02-02T18:30:00");  // Monday 6:30pm
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 75 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 18,
      price: 12.00,
      bookedCount: 0,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, { sessionIds: sessions.map((s) => s._id) });
  return { course, sessions, instructor };
}

async function createMorningAshtanga() {
  const instructor = await UserModel.create({
    name: "Chloe",
    email: "chloe@yoga.local",
    password: "hashed_dummy_password",
    role: "instructor",
  });
  const course = await CourseModel.create({
    title: "Morning Ashtanga Routine",
    level: "advanced",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-03-01",
    endDate: "2026-03-29",
    location: "Sunrise Room",
    price: 50.00,
    sessionPrice: 15.00,
    instructorId: instructor._id,
    sessionIds: [],
    description: "Start your day with an intense, fast-paced Ashtanga primary series.",
  });

  const first = new Date("2026-03-01T06:30:00"); 
  const sessions = [];
  for (let i = 0; i < 4; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 90 * 60 * 1000); 
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 15,
      price: 15.00,
      bookedCount: 0,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, { sessionIds: sessions.map((s) => s._id) });
  return { course, sessions, instructor };
}

async function verifyAndReport() {
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }
}

async function run() {
  console.log("Initializing DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  console.log("Creating Admin and Student accounts…");
  const accounts = await ensureUsers();

  console.log("Creating weekend workshop…");
  await createWeekendWorkshop();

  console.log("Creating weekly block…");
  await createWeeklyBlock();

  console.log("Creating morning ashtanga block…");
  await createMorningAshtanga();
  
  await verifyAndReport();

  console.log("\n✅ Seed complete. Ready for marking!");
  console.log("Student Email        :", accounts.student.email);
  console.log("Admin Email          :", accounts.admin.email);
  console.log("Passwords for both   : Sushi_143");
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});