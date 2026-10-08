const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const prisma = new PrismaClient();
const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 10 : 1000, // relaxed for development
  message: { error: { message: "Too many requests from this IP, please try again after 15 minutes" } }
});

router.post("/register", authLimiter, [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  body("full_name").notEmpty().withMessage("Full name is required")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fields = {};
    errors.array().forEach(e => fields[e.path] = e.msg);
    return res.status(400).json({ error: { message: "Validation failed", fields } });
  }

  const { email, password, full_name } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: { fields: { email: "Email already registered" } } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, fullName: full_name }
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      access_token: token,
      token_type: "bearer",
      user: { id: user.id, email: user.email, full_name: user.fullName }
    });
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.post("/login", authLimiter, [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required")
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: { message: "Validation failed" } });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: { message: "Incorrect email or password" } });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: { message: "Incorrect email or password" } });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      access_token: token,
      token_type: "bearer",
      user: { id: user.id, email: user.email, full_name: user.fullName }
    });
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.post("/logout", authMiddleware, (req, res) => {
  // Client is expected to discard token
  res.status(204).send();
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.fullName
  });
});

module.exports = router;
