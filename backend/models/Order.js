const mongoose = require("mongoose");
const {
  FULFILLMENT_TYPES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  values,
} = require("../constants/business");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: values(ORDER_STATUSES),
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    recipientName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    addressLine: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: values(ORDER_CHANNELS),
      required: true,
      index: true,
    },
    fulfillmentType: {
      type: String,
      enum: values(FULFILLMENT_TYPES),
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    shippingAddress: {
      type: addressSchema,
      default: null,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "Order must contain items"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: values(ORDER_STATUSES),
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.UNPAID,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: values(PAYMENT_METHODS),
      default: null,
    },
    paymentProvider: {
      type: String,
      enum: ["PAYOS"],
      default: null,
    },
    paymentOrderCode: {
      type: Number,
      unique: true,
      sparse: true,
      default: undefined,
    },
    paymentLinkId: {
      type: String,
      trim: true,
      default: "",
    },
    checkoutUrl: {
      type: String,
      trim: true,
      default: "",
    },
    qrCode: {
      type: String,
      trim: true,
      default: "",
    },
    paymentReference: {
      type: String,
      trim: true,
      default: "",
    },
    paymentProviderUpdatedAt: {
      type: Date,
      default: null,
    },
    paymentExpiresAt: {
      type: Date,
      default: null,
    },
    inventoryReserved: {
      type: Boolean,
      default: false,
    },
    createdBySalesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBySalesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    paidByManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    paidAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    isReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, status: 1, createdAt: -1 });

orderSchema.pre("validate", function validateOrder(next) {
  const calculatedSubtotal = this.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  this.items.forEach((item) => {
    item.lineTotal = item.unitPrice * item.quantity;
  });
  this.subtotal = calculatedSubtotal;
  this.totalPrice = Math.max(
    0,
    calculatedSubtotal + this.shippingFee - this.discountAmount
  );

  if (this.channel === ORDER_CHANNELS.ONLINE && !this.customerId) {
    this.invalidate("customerId", "Online orders require a customer account");
  }

  if (
    this.channel === ORDER_CHANNELS.OFFLINE &&
    this.fulfillmentType !== FULFILLMENT_TYPES.IN_STORE
  ) {
    this.invalidate(
      "fulfillmentType",
      "Offline orders must use in-store fulfillment"
    );
  }

  if (
    this.fulfillmentType === FULFILLMENT_TYPES.DELIVERY &&
    !this.shippingAddress?.addressLine
  ) {
    this.invalidate(
      "shippingAddress",
      "Delivery orders require a shipping address"
    );
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
