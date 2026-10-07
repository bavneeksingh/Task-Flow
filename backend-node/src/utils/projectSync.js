const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const updateProjectStatus = async (projectId) => {
  const tasks = await prisma.task.findMany({ where: { projectId } });
  
  if (tasks.length === 0) {
    // If all tasks are deleted, maybe revert to Not Started
    await prisma.project.update({ where: { id: projectId }, data: { status: "Not Started" } });
    return;
  }

  const allCompleted = tasks.every(t => t.status === "Completed");
  const anyInProgressOrCompleted = tasks.some(t => t.status === "In Progress" || t.status === "Completed");

  let newStatus = "Not Started";
  if (allCompleted) {
    newStatus = "Completed";
  } else if (anyInProgressOrCompleted) {
    newStatus = "In Progress";
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: newStatus } });
};

module.exports = { updateProjectStatus };
