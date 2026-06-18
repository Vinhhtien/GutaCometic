const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
};

const errorHandler = (error, _req, res, _next) => {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((item) => item.message)
      .join(", ");
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(error.keyValue).join(", ")} already exists`;
  }

  res.status(statusCode).json({ message });
};

module.exports = {
  errorHandler,
  notFound,
};
