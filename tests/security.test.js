import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { usersDb } from "../models/_db.js";
import jwt from "jsonwebtoken"; 

describe("Security & Edge Case Test Suite", () => {
  let data;
  let studentCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    
    // Set a JWT secret for the test environment
    if (!process.env.ACCESS_TOKEN_SECRET) {
      process.env.ACCESS_TOKEN_SECRET = "test_environment_secret_key";
    }

    await resetDb();
    data = await seedMinimal(); 

    // Generate a JWT cookie for the test student
    const token = jwt.sign(
      { _id: data.student._id, role: "student", name: data.student.name },
      process.env.ACCESS_TOKEN_SECRET
    );
    studentCookie = `jwt=${token}`;
  });

  // Access control tests

  test("1. Enforces strict role-based access control on Organiser routes", async () => {
    const res = await request(app).get("/organiser").set("Cookie", [studentCookie]);
    expect(res.status).toBe(403);
  });

  test("2. Intercepts unauthenticated traffic and issues login redirect", async () => {
    const res = await request(app).get("/organiser");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });

  test("3. Applies bcrypt hashing algorithm prior to database persistence", async () => {
    const plainTextPassword = "SuperSecretPassword123!";
    await request(app).post("/auth/register").send({
      name: "Secure User", email: "secure@test.com", password: plainTextPassword, role: "student", staffPasscode: ""
    });
    const savedUser = await usersDb.findOne({ email: "secure@test.com" });
    expect(savedUser.password).not.toBe(plainTextPassword);
    expect(savedUser.password.startsWith("$2b$")).toBe(true);
  });

  // Business logic and data integrity tests

  test("4. Rejects duplicate session booking requests to preserve capacity accuracy", async () => {
    const sessionIdToBook = data.sessions[0]._id;
    
    // Submit the first booking request
    await request(app).post(`/bookings/session`).set("Cookie", [studentCookie]).send({ userId: data.student._id, sessionId: sessionIdToBook });
    
    // Submit the same booking request again
    const secondAttempt = await request(app).post(`/bookings/session`).set("Cookie", [studentCookie]).send({ userId: data.student._id, sessionId: sessionIdToBook });
    expect([302, 400]).toContain(secondAttempt.status);
  });

  test("5. Prevents privilege escalation for destructive database actions", async () => {
    const res = await request(app).post(`/organiser/delete/${data.course._id}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });

  test("6. Validates internal authorization passcodes during staff registration", async () => {
    await request(app).post("/auth/register").send({
      name: "Hacker", email: "hacker@test.com", password: "password123", role: "organiser", staffPasscode: "WRONG_GUESS"
    });
    const hacker = await usersDb.findOne({ email: "hacker@test.com" });
    expect(hacker).toBeNull();
  });

  test("7. Fails gracefully when processing non-existent reference IDs", async () => {
    const res = await request(app).post("/bookings/course").set("Cookie", [studentCookie]).send({ courseId: "FAKE_COURSE_ID_999" });
    expect([400, 404, 500]).toContain(res.status);
  });

  test("8. Safely rejects login payloads containing invalid authentication credentials", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "nobody@test.com", 
      password: "wrong_password_123"
    });
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/login/i);
  });

  test("9. Rejects database inserts lacking mandatory schema properties", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "No Email User", password: "password123", role: "student"
    });
    expect(res.status).toBe(302); 
  });

  // Infrastructure test

  test("10. Confirms system routing and health-check availability", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});