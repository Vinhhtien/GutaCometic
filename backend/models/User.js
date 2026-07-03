const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { USER_ROLES, values } = require("../constants/business");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email is invalid"],
    },
    password: {
      type: String,
      required() {
        return this.authProvider === "LOCAL";
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
    },
    phone: {
      type: String,
      required() {
        return this.authProvider === "LOCAL";
      },
      unique: true,
      sparse: true,
      trim: true,
      default: undefined,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE"],
      default: "LOCAL",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    avatarUrl: {
      type: String,
      default: "",
      trim: true,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    address: {
      type: String,
      required() {
        return this.authProvider === "LOCAL";
      },
      trim: true,
      default: undefined,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  if (this.$locals.passwordAlreadyHashed) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.pre("validate", function validateStoreAssignment(next) {
  if (
    [USER_ROLES.MANAGER, USER_ROLES.SALES].includes(this.role) &&
    !this.storeId
  ) {
    this.invalidate("storeId", "Manager and Sales users require a store");
  }

  if (
    [USER_ROLES.OWNER, USER_ROLES.CUSTOMER].includes(this.role) &&
    this.storeId
  ) {
    this.invalidate("storeId", "Owner and Customer users cannot have a store");
  }

  next();
});

module.exports = mongoose.model("User", userSchema);
