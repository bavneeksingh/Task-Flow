const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const projectsCount = await prisma.project.count({
      where: { ownerId: req.user.id }
    });

    const tasksCountAgg = await prisma.task.groupBy({
      by: ['status'],
      where: { project: { ownerId: req.user.id } },
      _count: true
    });

    let pending_tasks = 0;
    let in_progress_tasks = 0;
    let completed_tasks = 0;

    tasksCountAgg.forEach(group => {
      if (group.status === "Pending") pending_tasks = group._count;
      else if (group.status === "In Progress") in_progress_tasks = group._count;
      else if (group.status === "Completed") completed_tasks = group._count;
    });

    res.json({
      total_projects: projectsCount,
      total_tasks: pending_tasks + in_progress_tasks + completed_tasks,
      pending_tasks,
      in_progress_tasks,
      completed_tasks
    });
  } catch (error) {
    res.status(500).json({ error: { message: "Server error" } });
  }
});

module.exports = router;
