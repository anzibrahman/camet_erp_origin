import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    flat: { type: String },
    road: { type: String },
    landmark: { type: String },
    email: { type: String },
    mobile: { type: Number },
    senderId: { type: String },
    username: { type: String },
    password: { type: String },
    pin: { type: String },
    gstNum: { type: String },
    website: { type: String },
    pan: { type: String },
    industry: { type: Number },
    financialYear: { type: String },
    country: { type: String },
    currency: { type: String },
    currencyName: { type: String },
    logo: { type: String },
    state: { type: String },
    isBlocked: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "PrimaryUser" },
    brands: { type: Array },
    categories: { type: Array },
    subcategories: { type: Array },
    levelNames: { type: Array },
    locations: { type: Array },
    type: { type: String, default: "self" },
    currency: { type: String },
    currencyName: { type: String },
    subunit: { type: String },
    symbol: { type: String },
    batchEnabled: { type: Boolean, default: false, required: true },
    gdnEnabled: { type: Boolean, default: false, required: true },
    configurations: [
      {
        bank: { type: mongoose.Schema.Types.ObjectId, ref: "Party" },
        terms: { type: Array },
        enableBillToShipTo: { type: Boolean, default: true },
        batchEnabled: { type: Boolean, default: false, required: true },
        gdnEnabled: { type: Boolean, default: false, required: true },
        enableManufacturingDate: { type: Boolean, default: false },
        enableExpiryDate: { type: Boolean, default: false },

        despatchDetails: { type: Object },
        taxInclusive: { type: Boolean, default: false },
        emailConfiguration: {
          email: { type: String },
          appPassword: { type: String },
        },
        enableActualAndBilledQuantity: {
          type: Boolean,
          default: false,
        },
        kotAutoApproval: { type: Boolean, default: false },
        foodPlaWithRoomRate: {
          type: Boolean,
          default: true,
        },
        additionalPaxWithRoomRate: {
          type: Boolean,
          default: true,
        },
        addRateWithTax: {
          type: Object,
          default: {
            sale: false,
            saleOrder: false,
            restaurantSale: false,
            hotelSales: false,
          },
        },
        saveSaleBasedOn: {
          type: Object,
          default: {
            agent: true,
            guest: false,
          },
        },
        kotPrinter : {
          type: String,
        },
        defaultPrint: {
          type: Object,
          default: {
            print1: true,
            print2: false,
            restaurantPrint1: true,
            restaurantPrint2: false,
            showBeforeSaleInRestaurant: false,
            showPrintWithTaxInRestaurant: true,
          },
        },
        orderTypes: {
          type: Object,
          default: {
            dineIn: false,
            takeaway: false,
            delivery: false,
            roomService: false,
            directSale: false,
          },
        },
        showDescription: {
          type: Object,
          default: {
            sale: false,
            saleOrder: false,
          },
        },

        enableNegativeStockBlockForVanInvoice: {
          type: Boolean,
          default: false,
        },
        enablePaymentSplittingAsCompulsory: {
          type: Boolean,
          default: false,
        },
        enableShipTo: {
          type: Object,
          default: {
            sale: false,
            saleOrder: false,
          },
        },

        despatchTitles: [
          {
            voucher: { type: String, default: "saleOrder" },
            challanNo: { type: String, default: "Challan No" },
            containerNo: { type: String, default: "Container No" },
            despatchThrough: { type: String, default: "Despatch Through" },
            destination: { type: String, default: "Destination" },
            vehicleNo: { type: String, default: "Vehicle No" },
            orderNo: { type: String, default: "Order No" },
            termsOfPay: { type: String, default: "Terms Of Pay" },
            termsOfDelivery: { type: String, default: "Terms Of Delivery" },
          },
        ],

        printConfiguration: [
          {
            voucher: { type: String, default: "saleOrder" }, // Define the type for clarity
            printTitle: { type: String },
            showCompanyDetails: { type: Boolean, default: true },
            showDiscount: { type: Boolean, default: false },
            showDiscountAmount: { type: Boolean, default: true },
            showHsn: { type: Boolean, default: false },
            showTaxPercentage: { type: Boolean, default: false },
            showInclTaxRate: { type: Boolean, default: false },
            showTaxAnalysis: { type: Boolean, default: false },
            showTeamsAndConditions: { type: Boolean, default: false },
            showBankDetails: { type: Boolean, default: false },
            showTaxAmount: { type: Boolean, default: true },
            showStockWiseTaxAmount: { type: Boolean, default: true },
            showRate: { type: Boolean, default: true },
            showQuantity: { type: Boolean, default: true },
            showStockWiseAmount: { type: Boolean, default: true },
            showNetAmount: { type: Boolean, default: true },
            showLetterHead: { type: Boolean, default: false },
            letterHeadUrl: { type: String, default: null },
            letterHeadPublicId: { type: String, default: null },
            letterHeadUploadedAt: { type: Date, default: null },
            showUnit: { type: Boolean, default: false },
            printFormat: { type: String, enum: ["a4", "thermal"], default: "a4" },
          },
        ],

        discountBasedOnGrossAmount: {
          type: Boolean,
          default: true,
        },
        discountBasedOnGrossAmountInHotel: {
          type: Boolean,
          default: true,
        },

        complementaryWithTax: {
          type: Boolean,
          default: true,
        },

        termsAndConditions: [
          {
            voucher: { type: String, default: "saleOrder" }, // Define the type for clarity
            terms: { type: Array },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

organizationSchema.index({ owner: 1, name: 1 }, { unique: true });
organizationSchema.index({ owner: 1 });

export default mongoose.model("Organization", organizationSchema);
