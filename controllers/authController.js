import bcrypt from 'bcrypt'; 
import jwt from "jsonwebtoken"; 

export const showLoginPage = (req, res) => {
  res.render("login", { title: "Login" });
};

export const showRegisterPage = (req, res) => {
  res.render("register", { title: "Register" });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, staffPasscode } = req.body;
    const { usersDb } = await import("../models/_db.js");

    // Only users with the correct staff passcode can register as organisers
    if (role === "organiser") {
      if (staffPasscode !== "YOGA_STAFF_2026") {
        return res.render("register", { 
          title: "Register",
          error: "Invalid staff passcode. You cannot register as an organiser." 
        });
      }
    }

    // Prevent duplicate accounts from being created with the same email
    const existingUser = await usersDb.findOne({ email });
    if (existingUser) {
      return res.render("register", { error: "That email is already in use." });
    }

    // Hash the password before storing it in the database
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await usersDb.insert({ 
      name, 
      email, 
      password: hashedPassword, 
      role 
    });

    // Generate a signed token containing the user's identity and role
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const payload = { _id: newUser._id, role: newUser.role, name: newUser.name };
    const accessToken = jwt.sign(payload, secret, { expiresIn: '1h' });

    // Store the token in an HTTP-only cookie to reduce client-side access
    res.cookie("jwt", accessToken, { httpOnly: true, sameSite: "lax" });
    res.redirect("/");
    
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { usersDb } = await import("../models/_db.js");

    const user = await usersDb.findOne({ email });
    if (!user) {
      return res.render("login", { error: "Invalid email or password." });
    }

    // Compare the submitted password with the stored password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { error: "Invalid email or password." });
    }

    // Generate a signed token after successful authentication
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const payload = { _id: user._id, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, secret, { expiresIn: '1h' });

    res.cookie("jwt", accessToken, { httpOnly: true, sameSite: "lax" });

    // Redirect users to the correct area based on their role
    if (user.role === "organiser") {
      res.redirect("/organiser");
    } else {
      res.redirect("/");
    }
  } catch (err) {
    next(err);
  }
};

export const logoutUser = (req, res) => {

  // Clear the authentication cookie when the user logs out
  res.clearCookie("jwt"); 
  res.redirect("/");
};