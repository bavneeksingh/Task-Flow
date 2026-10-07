require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

// Trust proxy is required if running behind a reverse proxy for express-rate-limit to work correctly
app.set("trust proxy", 1);

app.use(cors({ origin: "*" })); // Allow all origins for the web/mobile app domains
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: { message: "Internal Server Error" } });
});

if (process.env.NODE_ENV !== "production" || process.env.RUN_LOCAL) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Node.js Backend listening on port ${PORT}`);
  });
}

module.exports = app;
