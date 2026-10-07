const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/auth");
const { updateProjectStatus } = require("../utils/projectSync");

const prisma = new PrismaClient();
const router = express.Router();
router.use(authMiddleware);

// Helper to format project output
const formatProject = (project) => {
  let pending_count = 0;
  let in_progress_count = 0;
  let completed_count = 0;

  if (project.tasks) {
    project.tasks.forEach((task) => {
      if (task.status === "Pending") pending_count++;
      else if (task.status === "In Progress") in_progress_count++;
      else if (task.status === "Completed") completed_count++;
    });
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: project.startDate,
    end_date: project.endDate,
    created_at: project.createdAt.toISOString(),
    task_count: project.tasks ? project.tasks.length : 0,
    pending_count,
    in_progress_count,
    completed_count
  };
};

router.get("/", async (req, res) => {
  const { search, status } = req.query;
  
  const where = { ownerId: req.user.id };
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }
  if (status) {
    where.status = status;
  }

  try {
    const projects = await prisma.project.findMany({
      where,
      include: { tasks: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    res.json(projects.map(formatProject));
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.post("/", [
  body("name").notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("description").optional().isLength({ max: 5000 }),
  body("status").optional().isIn(["Not Started", "In Progress", "Completed"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: { message: "Validation error" } });

  try {
    const project = await prisma.project.create({
      data: {
        name: req.body.name,
        description: req.body.description || null,
        status: req.body.status || "Not Started",
        startDate: req.body.start_date || null,
        endDate: req.body.end_date || null,
        ownerId: req.user.id
      },
      include: { tasks: true }
    });
    res.status(201).json(formatProject(project));
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tasks: true }
    });

    if (!project || project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    res.json(formatProject(project));
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing || existing.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    const { name, description, status, start_date, end_date } = req.body;
    if (name === null || status === null) return res.status(422).json({ error: { message: "Invalid null" } });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.startDate = start_date;
    if (end_date !== undefined) updateData.endDate = end_date;

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: updateData,
      include: { tasks: true }
    });

    res.json(formatProject(project));
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!existing || existing.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    await prisma.project.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

// Tasks sub-route
router.get("/:id/tasks", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!project || project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    const { search, status, priority } = req.query;
    const where = { projectId: project.id };
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    res.json(tasks.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.dueDate,
      project_id: t.projectId,
      created_at: t.createdAt.toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

router.post("/:id/tasks", [
  body("name").notEmpty().withMessage("Name is required").isLength({ max: 160 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: { message: "Validation error" } });

  try {
    const project = await prisma.project.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!project || project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Project not found" } });
    }

    const task = await prisma.task.create({
      data: {
        name: req.body.name,
        description: req.body.description || null,
        status: req.body.status || "Pending",
        priority: req.body.priority || "Medium",
        dueDate: req.body.due_date || null,
        projectId: project.id
      }
    });

    await updateProjectStatus(project.id);

    res.status(201).json({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
      project_id: task.projectId,
      created_at: task.createdAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

module.exports = router;
