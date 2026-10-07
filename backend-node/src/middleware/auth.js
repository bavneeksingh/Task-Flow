const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: { code: "not_authenticated", message: "Not authenticated" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: { code: "invalid_token", message: "User no longer exists" } });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: { code: "token_expired", message: "Session expired or invalid token" } });
  }
};

module.exports = authMiddleware;
