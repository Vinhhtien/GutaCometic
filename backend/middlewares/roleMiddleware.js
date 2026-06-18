const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../constants/business");

const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication is required", 401, "UNAUTHORIZED"));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError(
        "You do not have permission to perform this action",
        403,
        "FORBIDDEN"
      )
    );
  }

  next();
};

const requireAssignedStore = (req, _res, next) => {
  const storeRoles = [USER_ROLES.MANAGER, USER_ROLES.SALES];

  if (storeRoles.includes(req.user?.role) && !req.user.storeId) {
    return next(
      new AppError(
        "This staff account is not assigned to a store",
        403,
        "STORE_ASSIGNMENT_REQUIRED"
      )
    );
  }

  next();
};

const getRequestedStoreId = (req) =>
  req.params.storeId ||
  req.body?.storeId ||
  req.query.storeId ||
  req.order?.storeId;

const enforceStoreAccess = (req, _res, next) => {
  if (req.user?.role === USER_ROLES.OWNER) {
    return next();
  }

  if (![USER_ROLES.MANAGER, USER_ROLES.SALES].includes(req.user?.role)) {
    return next(
      new AppError(
        "Store-scoped access is only available to staff",
        403,
        "FORBIDDEN"
      )
    );
  }

  const requestedStoreId = getRequestedStoreId(req);

  if (!requestedStoreId) {
    return next(
      new AppError("Store ID is required", 400, "STORE_ID_REQUIRED")
    );
  }

  if (String(req.user.storeId) !== String(requestedStoreId)) {
    return next(
      new AppError(
        "You cannot access another store",
        403,
        "STORE_ACCESS_DENIED"
      )
    );
  }

  next();
};

module.exports = {
  authorize,
  enforceStoreAccess,
  requireAssignedStore,
};
