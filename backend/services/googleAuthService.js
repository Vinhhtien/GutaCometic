const { OAuth2Client } = require("google-auth-library");
const AppError = require("../utils/AppError");

const client = new OAuth2Client();

const getClientIds = () =>
  (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const verifyGoogleIdToken = async (idToken) => {
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw new AppError(
      "Google ID token is required",
      400,
      "GOOGLE_TOKEN_REQUIRED"
    );
  }

  const audience = getClientIds();

  if (audience.length === 0) {
    throw new AppError(
      "Google Sign-In is not configured",
      503,
      "GOOGLE_AUTH_NOT_CONFIGURED"
    );
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Google account email is not verified");
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: payload.name || payload.email.split("@")[0],
      avatarUrl: payload.picture || "",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Google authentication failed",
      401,
      "INVALID_GOOGLE_TOKEN"
    );
  }
};

module.exports = {
  verifyGoogleIdToken,
};
