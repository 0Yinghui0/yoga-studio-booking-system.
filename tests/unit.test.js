import { requireOrganiser, requireLogin } from "../middlewares/authMiddleware.js";
import { jest } from "@jest/globals";

describe("Unit Tests: Core Functions (Middleware)", () => {
  
  test("1. FUNCTION: requireOrganiser allows access if user is an organiser", () => {
    // Create a request for an authenticated organiser
    const req = { user: { role: "organiser" } };
    const res = {};
    const next = jest.fn(); 

    requireOrganiser(req, res, next);

    expect(next).toHaveBeenCalled(); 
  });

  test("2. FUNCTION: requireOrganiser blocks access if user is a student", () => {
    // Create a request for an authenticated student
    const req = { user: { role: "student" } };
    
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    const next = jest.fn();

    requireOrganiser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Access Denied"));
    
    expect(next).not.toHaveBeenCalled(); 
  });

  test("3. FUNCTION: requireLogin redirects logged-out users to the login page", () => {
    // Create a request with no authenticated user
    const req = { user: null };
    const res = {
      redirect: jest.fn()
    };
    const next = jest.fn();

    requireLogin(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
    expect(next).not.toHaveBeenCalled();
  });
});