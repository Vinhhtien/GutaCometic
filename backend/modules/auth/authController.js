const authService = require("./authService");

const requestRegistrationOtp = async (req, res, next) => {
  try {
    const result = await authService.requestRegistrationOtp(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyRegistrationOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyRegistrationOtp(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const loginWithGoogle = async (req, res, next) => {
  try {
    const result = await authService.loginWithGoogle(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

const requestPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordResetOtp(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyPasswordResetOtp(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  loginWithGoogle,
  me,
  requestPasswordResetOtp,
  requestRegistrationOtp,
  resetPassword,
  verifyPasswordResetOtp,
  verifyRegistrationOtp,
};
