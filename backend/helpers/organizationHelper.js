import VoucherSeries from "../models/VoucherSeriesModel.js";
import mongoose from "mongoose";
import { Godown } from "../models/subDetails.js";
import AccountGroup from "../models/accountGroup.js";
export const createDefaultVoucherSeries = async ({ companyId, ownerId, session }) => {
  const voucherTypes = [
    "sales",
    "saleOrder",
    "performaInvoice",
    "vanSale",
    "purchase",
    "creditNote",
    "debitNote",
    "stockTransfer",
    "receipt",
    "payment",
  ];

  const seriesDocs = voucherTypes.map((voucherType) => ({
    cmp_id: companyId,
    Primary_user_id: ownerId,
    voucherType,
    series: [
      {
        seriesName: "Default Series",
        prefix: "",
        suffix: "",
        currentNumber: 1,
        widthOfNumericalPart: 1,
        isDefault: true,
      },
    ],
  }));

  await VoucherSeries.insertMany(seriesDocs, { session });

  return true;
};


////// create account groups for organization
export const createAccountGroupsForOrganization = async ({
  type,
  accountGroups,
  organizationId,
  ownerId,
  session,
}) => {
  try {
    if (type === "self") {
      if (Array.isArray(accountGroups) && accountGroups.length > 0) {
        await Promise.all(
          accountGroups.map(async (group) => {
            // Generate a new ObjectId
            const generatedId = new mongoose.Types.ObjectId();

            const accountGroup = new AccountGroup({
              accountGroup: group,
              cmp_id: organizationId,
              Primary_user_id: ownerId,
              accountGroup_id: generatedId.toString(), // Assign before saving
              _id: generatedId, // Ensure _id and accountGroup_id are the same
            });

            await accountGroup.save({ session }); // Save with the session
          })
        );
      }
    }
    return true;
  } catch (error) {
    console.error("Error creating account groups:", error);
    return false;
  }
};

// Default configurations for organization
export const defaultConfigurations = [
  {
    bank: null,
    terms: [],
    enableBillToShipTo: true,
    enableActualAndBilledQuantity: false,
    batchEnabled: false,
    gdnEnabled: false,
    taxInclusive: false,
    addRateWithTax: {
      saleOrder: false,
      sale: false,
    },
    saveSaleBasedOn: {
      agent: true,
      guest: false,
    },
    emailConfiguration: null,
    despatchTitles: [
      {
        voucher: "saleOrder",
        challanNo: "Challan No",
        containerNo: "Container No",
        despatchThrough: "Despatch Through",
        destination: "Destination",
        vehicleNo: "Vehicle No",
        orderNo: "Order No",
        termsOfPay: "Terms Of Pay",
        termsOfDelivery: "Terms Of Delivery",
      },
      {
        voucher: "sale",
        challanNo: "Challan No",
        containerNo: "Container No",
        despatchThrough: "Despatch Through",
        destination: "Destination",
        vehicleNo: "Vehicle No",
        orderNo: "Order No",
        termsOfPay: "Terms Of Pay",
        termsOfDelivery: "Terms Of Delivery",
      },
      {
        voucher: "default",
        challanNo: "Challan No",
        containerNo: "Container No",
        despatchThrough: "Despatch Through",
        destination: "Destination",
        vehicleNo: "Vehicle No",
        orderNo: "Order No",
        termsOfPay: "Terms Of Pay",
        termsOfDelivery: "Terms Of Delivery",
      },
    ],
    printConfiguration: [
      {
        voucher: "saleOrder",
        printTitle: null,
        showCompanyDetails: true,
        showDiscount: false,
        showDiscountAmount: true,
        showHsn: false,
        showTaxPercentage: false,
        showInclTaxRate: false,
        showTaxAnalysis: false,
        showTeamsAndConditions: false,
        showBankDetails: false,
        showTaxAmount: true,
        showStockWiseTaxAmount: true,
        showRate: true,
        showQuantity: true,
        showStockWiseAmount: true,
        showNetAmount: true,
      },
      {
        voucher: "sale",
        printTitle: null,
        showCompanyDetails: true,
        showDiscount: false,
        showDiscountAmount: true,
        showHsn: false,
        showTaxPercentage: false,
        showInclTaxRate: false,
        showTaxAnalysis: false,
        showTeamsAndConditions: false,
        showBankDetails: false,
        showTaxAmount: true,
        showStockWiseTaxAmount: true,
        showRate: true,
        showQuantity: true,
        showStockWiseAmount: true,
        showNetAmount: true,
      },
    ],
  },
];

//create default godown for organization
export const createDefaultGodownForOrganization = async ({
  organizationId,
  ownerId,
  session,
  type,
}) => {
  try {
    if (type === "self") {
      const defaultGodownId = new mongoose.Types.ObjectId();
      const defaultGodown = new Godown({
        _id: defaultGodownId,
        godown_id: defaultGodownId.toString(),
        godown: "Main Location",
        cmp_id: organizationId,
        Primary_user_id: ownerId,
        defaultGodown: true,
      });

      await defaultGodown.save({ session });
      return defaultGodown;
    }
    return true;
  } catch (error) {
    console.error("Error creating default godown:", error);
    return null;
  }
};
