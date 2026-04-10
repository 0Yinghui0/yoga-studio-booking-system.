// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

// Attach the authenticated user to the request and response locals
export const attachUser = (req, res, next) => {
  res.locals.user = null;
  req.user = null;
  res.locals.isOrganiser = false;

  const accessToken = req.cookies?.jwt;
  
  if (!accessToken) {
    return next(); 
  }

  try {
    const decodedPayload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    
    req.user = decodedPayload;
    res.locals.user = decodedPayload; 
    res.locals.isOrganiser = decodedPayload.role === 'organiser';
    
  } catch (err) {
    console.error("Invalid JWT Token Detected");
  }
  
  next();
};

// Restrict organiser-only routes
export const requireOrganiser = (req, res, next) => {
  if (!req.user || req.user.role !== 'organiser') {
    return res.status(403).send("<div style='text-align:center; padding: 50px; font-family:sans-serif;'><h2>Access Denied 🛑</h2><p>You must be a staff member to view this page.</p><a href='/' style='color:#0D47A1; font-weight:bold;'>Go to Homepage</a></div>");
  }
  next();
};

// Restrict routes to authenticated users
export const requireLogin = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/auth/login');
  }
  next();
};