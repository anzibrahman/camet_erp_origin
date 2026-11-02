import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const secondaryUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: Number },
    password: { type: String },
    organization: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    ],
    primaryUser: { type: mongoose.Schema.Types.ObjectId, ref: "PrimaryUser" },
    role: { type: String, default: "user" },
    otp: { type: Number },
    permissions: {
      type: Object,
      default: () => ({
        hotelManagement: true,
        restaurantManagement: true,
        voucher: true,
        reports: true,

        hotelDashboard: true,
        bookingList: true,
        checkinList: true,
        checkoutList: true,
        editTariffRate: true,
        swapRoom: true,
        roomShift: true,
        guestLedger: true,

        restaurantDashboard: true,
        kotPage: true,
        restaurantPayment: true,
        restaurantDailySales: true,
        categoryWiseSales: true,
        itemWiseSales: true,
        kotRegister: true,
        restaurantReceiptReport: true,
        saleRegister: true,

        hotelReports: true,
        restaurantReports: true,
        voucherReports: true,

        dailySalesReport: true,
        foDailyStatement: true,
        flashReport: true,
        paxReport: true,
        foodPlanReport: true,
        occupancyReport: true,
        roomSummaryReport: true,
        receiptReport: true,
        travelAgentReport: true,
        foBillSummary: true,
        cancellationReport: true,
        nightAudit: true,
        cancelBooking:true,
        cancelChecking: true,
        cancelSale: true,
        cancelReceipt: true,
        settings: true,
        loginReport: true,
        editPaymentTypes: false,
      }),
    },
    userType: {
      type: String,
      default: "user",
    },
    configurations: [
      {
        organization: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Organization",
        },
        selectedGodowns: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Godown",
          },
        ],
        selectedPriceLevels: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PriceLevel",
          },
        ],
        selectedVanSaleGodowns: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Godown",
          },
        ],

        selectedVoucherSeries: [
          {
            voucherType: { type: String },
            selectedSeriesIds: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: "VoucherSeries",
              },
            ],
          },
        ],

        selectedSubGroups: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubGroup",
          },
        ],

        selectedVanSaleSubGroups: { type: Array },
        salesConfiguration: { type: Object },
        salesOrderConfiguration: { type: Object },
        receiptConfiguration: { type: Object },
        paymentConfiguration: { type: Object },
        purchaseConfiguration: { type: Object },
        vanSaleConfiguration: { type: Object },
        stockTransferConfiguration: { type: Object },
        creditNoteConfiguration: { type: Object },
        debitNoteConfiguration: { type: Object },
        vanSale: { type: Boolean },

        orderNumber: { type: Number },
        salesNumber: { type: Number },
        purchaseNumber: { type: Number },
        receiptNumber: { type: Number },
        paymentNumber: { type: Number },
        vanSalesNumber: { type: Number },
        stockTransferNumber: { type: Number },
        creditNoteNumber: { type: Number },
        debitNoteNumber: { type: Number },
        ownTransactions: { type: Boolean, default: false },
        allTransactions: { type: Boolean, default: false },
        // vanSaleGodown:{type:String}
      },
    ],
    isBlocked: { type: Boolean, default: false },
    // orderNumber: { type: Number, default: 1 },
    // salesNumber: { type: Number, default: 1 },
    // vanSalesNumber: { type: Number, default: 1 },
    // purchaseNumber: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

secondaryUserSchema.index({ email: 1 }, { unique: true, sparse: true, collation: { locale: "en", strength: 2 } });

secondaryUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model("SecondaryUser", secondaryUserSchema);
