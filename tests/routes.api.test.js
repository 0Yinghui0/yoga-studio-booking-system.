import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import jwt from "jsonwebtoken"; 

describe("Fixed AI Integration Routes", () => {
  let data;
  let student;
  let studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    // Set a JWT secret for the test environment
    if (!process.env.ACCESS_TOKEN_SECRET) {
      process.env.ACCESS_TOKEN_SECRET = "test_environment_secret_key";
    }

    await resetDb();
    data = await seedMinimal();
    
    // Create a test student and generate a JWT cookie
    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      password: "hashedpassword",
      role: "student",
    });

    const token = jwt.sign(
      { _id: student._id, role: student.role, name: student.name }, 
      process.env.ACCESS_TOKEN_SECRET
    );
    studentCookie = `jwt=${token}`; 
  });

  // Course page routes
  test("GET /courses returns the HTML courses page", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /courses/:id returns the specific course HTML page", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  // Booking routes
  test("POST /bookings/course creates a course booking and redirects", async () => {
    const res = await request(app)
      .post("/bookings/course")
      .set("Cookie", [studentCookie]) 
      .send({ courseId: data.course._id });
    
    expect(res.status).toBe(302); 
  });

  test("POST /bookings/session creates a session booking and redirects", async () => {
    const res = await request(app)
      .post("/bookings/session")
      .set("Cookie", [studentCookie])
      .send({ sessionId: data.sessions[0]._id });
    
    expect(res.status).toBe(302); 
  });

  test("DELETE /bookings/:id cancels a booking", async () => {
    // Create a booking before attempting cancellation
    const create = await request(app)
      .post("/bookings/session")
      .set("Cookie", [studentCookie])
      .send({ sessionId: data.sessions[1]._id });
    
    // // Retrieve the booking ID from the database
    const { bookingsDb } = await import("../models/_db.js");
    const myBooking = await bookingsDb.findOne({ userId: student._id });

    // Cancel the booking as the authenticated user
    const del = await request(app)
      .post(`/bookings/cancel/${myBooking._id}`)
      .set("Cookie", [studentCookie]);
      
    expect(del.status).toBe(302);
  });
});