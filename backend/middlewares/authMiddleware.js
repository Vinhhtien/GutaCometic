const jwt = require("jsonwebtoken");
const authService = require("../services/authService");

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication token is required" });
    }

    const token = authorization.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await authService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User is unavailable" });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Authentication token is invalid or expired" });
  }
};

module.exports = protect;
