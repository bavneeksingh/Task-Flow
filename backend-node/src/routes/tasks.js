const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/auth");
const { updateProjectStatus } = require("../utils/projectSync");

const prisma = new PrismaClient();
const router = express.Router();
router.use(authMiddleware);

// Tasks are primarily fetched and created via the projects route 
// (e.g. GET /api/projects/:id/tasks and POST /api/projects/:id/tasks)
// But the assignment requires: GET /api/tasks, GET /api/tasks/{id}, etc.

router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { project: { ownerId: req.user.id } },
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

router.get("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true }
    });

    if (!task || task.project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Task not found" } });
    }

    res.json({
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

router.post("/", [
  body("project_id").isInt().withMessage("Project ID is required"),
  body("name").notEmpty().withMessage("Name is required").isLength({ max: 160 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ error: { message: "Validation error" } });

  try {
    const project = await prisma.project.findUnique({ where: { id: parseInt(req.body.project_id) } });
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

router.patch("/:id", async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true }
    });

    if (!existing || existing.project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Task not found" } });
    }

    const { name, description, status, priority, due_date } = req.body;
    if (name === null || status === null || priority === null) {
      return res.status(422).json({ error: { message: "Invalid null" } });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.dueDate = due_date;

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: updateData
    });

    await updateProjectStatus(existing.projectId);

    res.json({
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

router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true }
    });

    if (!existing || existing.project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Task not found" } });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description || null,
      status: req.body.status || "Pending",
      priority: req.body.priority || "Medium",
      dueDate: req.body.due_date || null
    };

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: updateData
    });

    await updateProjectStatus(existing.projectId);

    res.json({
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

router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true }
    });

    if (!existing || existing.project.ownerId !== req.user.id) {
      return res.status(404).json({ error: { message: "Task not found" } });
    }

    await prisma.task.delete({ where: { id: existing.id } });
    
    await updateProjectStatus(existing.projectId);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

module.exports = router;
