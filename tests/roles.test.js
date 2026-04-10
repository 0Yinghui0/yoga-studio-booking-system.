// tests/roles.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import jwt from "jsonwebtoken"; 

describe("Role-Based Access Control (RBAC) UI Tests", () => {
  let data;
  let studentCookie;
  let organiserCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    
    // Set a JWT secret for the test environment
    if (!process.env.ACCESS_TOKEN_SECRET) {
      process.env.ACCESS_TOKEN_SECRET = "test_environment_secret_key";
    }

    // Reset the database and seed test data
    await resetDb();
    data = await seedMinimal();

    // Create a test student and generate a JWT cookie
    const student = await UserModel.create({
      name: "Test Student", email: "student2@test.local", password: "hash", role: "student"
    });
    const studentToken = jwt.sign(
      { _id: student._id, role: student.role, name: student.name }, 
      process.env.ACCESS_TOKEN_SECRET
    );
    studentCookie = `jwt=${studentToken}`;

    // Create a test organiser and generate a JWT cookie
    const organiser = await UserModel.create({
      name: "Test Organiser", email: "admin@test.local", password: "hash", role: "organiser"
    });
    const organiserToken = jwt.sign(
      { _id: organiser._id, role: organiser.role, name: organiser.name }, 
      process.env.ACCESS_TOKEN_SECRET
    );
    organiserCookie = `jwt=${organiserToken}`;
  });

  // --- THE TESTS ---

  test("1. Organiser can access the main Organiser Dashboard", async () => {
    const res = await request(app).get("/organiser").set("Cookie", [organiserCookie]);
    expect(res.status).toBe(200);
  });

  test("2. Student is strictly blocked from the Organiser Dashboard", async () => {
    const res = await request(app).get("/organiser").set("Cookie", [studentCookie]);
    expect(res.status).toBe(403); 
  });

  test("3. Protected booking routes reject logged-out users with an error", async () => {
    const res = await request(app).post(`/bookings/course`).send({ courseId: data.course._id });
    expect(res.status).toBe(400); 
  });

  test("4. Logged-in student can access 'My Bookings' dashboard", async () => {
    const res = await request(app).get("/bookings/dashboard").set("Cookie", [studentCookie]);
    expect(res.status).toBe(200);
  });
});