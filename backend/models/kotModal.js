import mongoose from "mongoose";
const kitchenBatchSchema = new mongoose.Schema(
  {
    batchNo: {
      type: Number,
      required: true,
    },
    printedAt: {
      type: Date,
      default: Date.now,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item", // add your ref if needed
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        product_name: {
          type: String,
          required: true,
        },
        _id: false,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "printed", "completed"],
      default: "printed",
    },
  },
  { _id: false },
);

const kotSchema = new mongoose.Schema(
  {
    primary_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrimaryUser",
      required: true,
    },
    secondary_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecondaryUser",
    },
    cmp_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    items: [],

    voucherNumber: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    customer: {
      name: {
        type: String,
        trim: true,
      },
      guestName: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      tableNumber: {
        type: String,
        trim: true,
      },
      status: {
        type: String,
        trim: true,
      },
    },
    tableNumber: {
      type: String,
      trim: true,
    },

    serviceType: {
      type: String,
      enum: ["Restaurant", "Room Service", "Dine-in"],
      default: "Restaurant",
    },

    total: {
      type: Number,
      required: true,
      set: (val) => Math.round(val),
    },

    status: {
      type: String,
      default: "pending",
    },
    kitchenBatches: {
      type: [kitchenBatchSchema],
      default: [],
    },

    cancelReason: {
      type: String,
      trim: true,
    },

    cancelledAt: {
      type: Date,
    },

    cancelledBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "SecondaryUser",
},

cancelledByName: {
  type: String,
},
    paymentMethod: {
      type: String,
    },
    paymentCompleted: {
      type: Boolean,
      default: false,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    checkInNumber: {
      type: String,
      trim: true,
    },
    discount: { type: Number, default: 0, set: (val) => Math.round(val) },
    discountChargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalCharges",
    },
    note: { type: String },
    foodPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodPlan",
      default: null,
    },
    isParent: {
      type: Boolean,
      default: true,
    },

    foodPlanDetails: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "FoodPlan" },
        planType: String,
        amount: Number,
        isComplimentary: Boolean,
      },
    ],

    isManuallyComplimentary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

kotSchema.index({ cmp_id: 1, createdAt: 1 });

export default mongoose.model("Kot", kotSchema);
