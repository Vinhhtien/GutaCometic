const jwt = require("jsonwebtoken");
const authService = require("../modules/auth/authService");

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

    const passwordChangedAtSeconds = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : null;

    if (
      passwordChangedAtSeconds !== null &&
      payload.iat < passwordChangedAtSeconds
    ) {
      return res.status(401).json({
        message: "Password was changed. Please sign in again.",
      });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Authentication token is invalid or expired" });
  }
};

module.exports = protect;
