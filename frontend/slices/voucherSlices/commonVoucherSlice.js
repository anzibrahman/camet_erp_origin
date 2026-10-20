import { createSlice } from "@reduxjs/toolkit";

const voucherTypeFormLocalStorage = localStorage.getItem("voucherType");

const initialState = {
  voucherNumber: voucherTypeFormLocalStorage ? voucherTypeFormLocalStorage : "",
  voucherType: "",
  voucherSeries: null,
  selectedVoucherSeries: null,
  selectedVoucherSeriesForEdit: null, /// for edit we need to track the voucher series which is selected while created the voucher
  mode: "create",
  initialized: false,
  date: "",
  convertedFrom: [],
  selectedSaleIds: [],
  products: [],
  page: 1,
  hasMore: true,
  priceLevels: null,
  party: {},
  items: [],
  selectedPriceLevel: "",
  additionalCharges: [],
  allAdditionalCharges: [],
  persistScrollId: "",
  brand: "",
  category: "",
  subcategory: "",
  id: "",
  despatchDetails: {
    challanNo: "",
    containerNo: "",
    despatchThrough: "",
    destination: "",
    vehicleNo: "",
    orderNo: "",
    termsOfPay: "",
    termsOfDelivery: "",
  },
  vanSaleGodown: {},
  stockTransferToGodown: null,
  billToParty: {},
  shipToParty: {},
  warrantyCardsList: null,
  note: null,
  isNoteOpen: false,
  paymentSplittingData: [
    { type: "cash", amount: 0, ref_id: null, ref_collection: "Cash" },
    { type: "upi", amount: 0, ref_id: null, ref_collection: "BankDetails" },
    { type: "cheque", amount: 0, ref_id: null, ref_collection: "BankDetails" },
    {
      type: "credit",
      amount: 0,
      ref_id: null,
      ref_collection: "Party",
      reference_name: "",
    },
  ],
  isScanOn: null,
  subTotal: 0,
  totalAdditionalCharges: 0,
  totalWithAdditionalCharges: 0,
  totalPaymentSplits: 0,
  finalAmount: 0,
  finalOutstandingAmount: 0,
};

export const commonVoucherSlice = createSlice({
  name: "commonVoucher",
  initialState,
  reducers: {
    setSelectedSaleIds: (state, action) => { state.selectedSaleIds = action.payload; },
    addParty: (state, action) => {
      if (String(state.party?._id) !== String(action.payload?._id)) state.selectedSaleIds = [];
      state.party = action.payload;
      state.newBillToShipTo = {};
    },
    removeParty: (state) => {
      state.selectedSaleIds = [];
      state.party = {};
    },

    addAllProducts: (state, action) => {
      const { page, hasMore, products } = action.payload;
      state.page = page;
      state.hasMore = hasMore;
      if (page === 1) {
        state.products = products;
      } else {
        state.products = state.products.concat(products);
      }
    },

    addAllProductsOnly: (state, action) => {
      state.products = action.payload;
    },

    addAllPriceLevels: (state, action) => {
      state.priceLevels = action.payload;
    },

    removeItem: (state, action) => {
      const id = action.payload;

      const index = state.items.findIndex((el) => (el._voucherLineId || el._id) === id);
      console.log(index);

      if (index !== -1) state.items.splice(index, 1);
    },
    changeCount: (state, action) => {
      const id = action.payload._id;
      const newCount = action.payload?.count;
      const indexToUpdate = state.items.findIndex((el) => el._id === id);
      if (indexToUpdate !== -1) {
        state.items[indexToUpdate].count = newCount;
      }
    },
    changeGodownCount: (state, action) => {
      const id = action.payload._id;
      const indexToUpdate = state.items.findIndex((el) => el._id == id);
      if (indexToUpdate !== -1) {
        state.items[indexToUpdate].GodownList = action.payload.GodownList;
      }
    },
    changeTotal: (state, action) => {
      const id = action.payload._id;
      const newTotal = action.payload?.total || 0;
      const indexToUpdate = state.items.findIndex((el) => el._id == id);
      if (indexToUpdate !== -1) {
        state.items[indexToUpdate].total = newTotal;
      }
    },

    addPriceRate: (state, action) => {
      const id = action.payload._id;
      const selectedPriceRate = action.payload?.selectedPriceRate || 0;
      console.log(selectedPriceRate);
      const indexToUpdate = state.items.findIndex((el) => el._id == id);
      if (indexToUpdate !== -1) {
        state.items[indexToUpdate].selectedPriceRate = selectedPriceRate;
      }
    },

    changeIgstAndDiscount: (state, action) => {
      const id = action.payload._id;
      const igst = action.payload?.igst || 0;
      const count = action.payload?.count || 0;
      const discount = action.payload?.discount || 0;
      const discountPercentage = action.payload?.discountPercentage || 0;
      const newTotal = action.payload?.total.toFixed(2) || 0;
      const godownList = action.payload?.GodownList;
      const isTaxInclusive = action.payload?.isTaxInclusive || false;

      const indexToUpdate = state.items.findIndex((el) => el._id === id);
      if (indexToUpdate !== -1) {
        state.items[indexToUpdate].total = newTotal;
        state.items[indexToUpdate].discount = discount;
        state.items[indexToUpdate].igst = igst;
        state.items[indexToUpdate].discountPercentage = discountPercentage;
        state.items[indexToUpdate].count = count;
        state.items[indexToUpdate].GodownList = godownList;
        state.items[indexToUpdate].isTaxInclusive = isTaxInclusive;
      }
    },

    addAdditionalCharges: (state, action) => {
      // state.items.additionalCharges=action.payload
      const { index, row } = action.payload;
      state.additionalCharges[index] = row;
    },
    removeAdditionalCharge: (state) => {
      state.additionalCharges = [];
    },
    deleteRow(state, action) {
      const index = action.payload;
      state.additionalCharges.splice(index, 1);
    },
    AddFinalAmount: (state, action) => {
      state.finalAmount = action.payload;
    },
    setPriceLevel: (state, action) => {
      state.selectedPriceLevel = action.payload;
    },
    removeAll: (state) => {
      Object.assign(state, initialState);
    },
    persistScroll: (state, action) => {
      state.persistScrollId = action.payload;
    },
    setBrandInRedux: (state, action) => {
      state.brand = action.payload;
    },
    setCategoryInRedux: (state, action) => {
      state.category = action.payload;
    },
    setSubCategoryInRedux: (state, action) => {
      state.subcategory = action.payload;
    },
    setParty: (state, action) => {
      if (String(state.party?._id) !== String(action.payload?._id)) state.selectedSaleIds = [];
      state.party = action.payload;
    },
    setItem: (state, action) => {
      state.items = action.payload.map((item, index, items) =>
        items.filter(value => value._id === item._id).length > 1
          ? { ...item, _voucherLineId: item._voucherLineId || "voucher-line-" + index }
          : item);
    },
    setSelectedPriceLevel: (state, action) => {
      state.selectedPriceLevel = action.payload;
    },
    setAdditionalCharges: (state, action) => {
      state.additionalCharges = action.payload;
    },
    setFinalAmount: (state, action) => {
      state.finalAmount = action.payload;
    },
    setTotalAfterAdditionalCharges: (state, action) => {
      state.totalAfterAdditionalCharges = action.payload;
    },

    saveId: (state, action) => {
      state.id = action.payload;
    },
    removeAllSales: (state) => {
      Object.assign(state, initialState);
    },

    addItem: (state, action) => {
      const { payload, moveToTop } = action.payload;

      const index = state.items.findIndex((el) => payload._voucherLineId
        ? el._voucherLineId === payload._voucherLineId : el?._id === payload?._id);

      if (index !== -1) {
        // If the item already exists, update it
        state.items[index] = payload;

        if (moveToTop) {
          // Remove the item from its current position and move it to the top
          const [updatedItem] = state.items.splice(index, 1);
          state.items.unshift(updatedItem);
        }
      } else {
        // If the item doesn't exist, add it
        if (moveToTop) {
          state.items.unshift(payload);
        } else {
          state.items.push(payload);
        }
      }
    },

    // updateItem: (state, actions) => {
    //   const index = state.items.findIndex(
    //     (el) => el._id === actions.payload._id
    //   );
    //   if (index !== -1) {
    //     state.items[index] = actions.payload;
    //   }
    // },
    updateItem: (state, actions) => {
      const { item, moveToTop = false } = actions.payload;

      const index = state.items.findIndex((el) => (el._voucherLineId || el._id) === (item._voucherLineId || item._id));

      if (index !== -1) {
        state.items[index] = item;
        const currentItem = state.items[index];
        if (
          currentItem?.GodownList?.every(
            (el) => el.added === false || el.added == undefined
          )
        ) {
          //// remove that item from item array
          state.items.splice(index, 1);
        }
      }
      if (moveToTop) {
        // Remove the item from its current position and move it to the top
        const [updatedItem] = state.items.splice(index, 1);
        state.items.unshift(updatedItem);
      }
    },

    removeGodownOrBatch: (state, action) => {
      const id = action.payload.id;
      const idx = action.payload.idx;

      const index = state.items.findIndex((el) => (el._voucherLineId || el._id) === id);
      if (index !== -1) {
        const currentItem = state.items[index];
        const currentBatch = currentItem.GodownList[idx];
        const {
          count = 0,
          actualCount = 0,
          individualTotal = 0,
          cgstAmount = 0,
          sgstAmount = 0,
          igstAmount = 0,
          cessAmount = 0,
          additionalCessAmount = 0,
        } = currentBatch || {};

        // Update all the totals on the referenced item
        currentItem.totalCount -= count;
        currentItem.totalActualCount -= actualCount;
        currentItem.total -= individualTotal;
        currentItem.totalCgstAmt -= cgstAmount;
        currentItem.totalSgstAmt -= sgstAmount;
        currentItem.totalIgstAmt -= igstAmount;
        currentItem.totalCessAmt -= cessAmount;
        currentItem.totalAddlCessAmt -= additionalCessAmount;

        currentItem.GodownList.splice(idx, 1);

        if (
          currentItem?.GodownList?.every(
            (godown) => godown.added === false || godown.added == undefined
          )
        ) {
          if (index !== -1) state.items.splice(index, 1);
        }
      }
    },

    addDespatchDetails: (state, action) => {
      return {
        ...state,
        despatchDetails: action.payload,
      };
    },
    changeDate: (state, action) => {
      // Convert Date object to ISO string if it's a Date, otherwise use the payload as is
      state.date =
        action.payload instanceof Date
          ? action.payload.toISOString()
          : action.payload;
    },

    changeTaxInclusive: (state, action) => {
      const id = action.payload;

      // const isTaxInclusive = action.payload?.isTaxInclusive || false;
      const indexToUpdate = state.items.findIndex((el) => el._id === id);

      if (indexToUpdate !== -1) {
        const item = state.items[indexToUpdate];
        console.log("Item:", JSON.parse(JSON.stringify(item)));

        // item.isTaxInclusive = isTaxInclusive;

        item.GodownList.forEach((godown) => {
          if (godown.added) {
            if (item.isTaxInclusive) {
              godown.individualTotal = godown.selectedPriceRate * godown.count;
            } else {
              const taxAmount =
                (parseFloat(item?.igst) / 100) *
                (godown.selectedPriceRate * godown.count);
              godown.individualTotal =
                godown.selectedPriceRate * godown.count + taxAmount;
            }
          }
        });

        item.total = item.GodownList.reduce((acc, curr) => {
          const individualTotal = parseFloat(curr?.individualTotal) || 0;
          return acc + individualTotal;
        }, 0);
      }
    },

    addOrderConversionDetails: (state, action) => {
      const {
        party,
        items,
        additionalCharges,
        convertedFrom,
        despatchDetails,
      } = action.payload;

      state.items = items;
      state.party = party;
      state.additionalCharges = additionalCharges;
      state.convertedFrom = convertedFrom;
      state.despatchDetails = despatchDetails;
    },

    addConvertedFrom: (state, action) => {
      state.convertedFrom = action.payload;
    },

    updateAllItem: (state, action) => {
      state.items = action.payload;
    },

    addVoucherType: (state, action) => {
      state.voucherType = action.payload;
      localStorage.setItem("voucherType", action.payload);
    },
    addAllAdditionalCharges: (state, action) => {
      state.allAdditionalCharges = action.payload;
    },
    addVoucherNumber: (state, action) => {
      state.voucherNumber = action.payload;
    },
    addVansSaleGodown: (state, action) => {
      state.vanSaleGodown = action.payload;
    },
    addMode: (state, action) => {
      state.mode = action.payload;
    },
    setInitialized: (state, action) => {
      state.initialized = action.payload;
    },

    addBatch: (state, action) => {
      const { _id, GodownList } = action.payload;

      // Find the current product and current item
      const currentProduct = state.products.find((el) => el?._id === _id);
      const currentItem = state.items.find((el) => el._id === _id);

      if (currentProduct) {
        // Check if the batch already exists in the current product's GodownList
        const existingBatchIndex = currentProduct.GodownList.findIndex(
          (batch) =>
            batch.batch === GodownList[0]?.batch &&
            batch.godownMongoDbId === GodownList[0]?.godownMongoDbId
        );

        if (existingBatchIndex !== -1) {
          // Overwrite the existing batch
          currentProduct.GodownList[existingBatchIndex] = GodownList[0];
        } else {
          // Add the new batch if it doesn't already exist
          currentProduct.GodownList.unshift(GodownList[0]);
        }

        currentProduct.isExpanded = true;
        currentProduct.isExpanded = true;
      }

      if (currentItem) {
        // Check if the batch already exists in the current item's GodownList
        const existingBatchIndex = currentItem.GodownList.findIndex(
          (batch) =>
            batch.batch === GodownList[0]?.batch &&
            batch.godownMongoDbId === GodownList[0]?.godownMongoDbId
        );

        if (existingBatchIndex !== -1) {
          // Overwrite the existing batch
          currentItem.GodownList[existingBatchIndex] = GodownList[0];
        } else {
          // Add the new batch if it doesn't already exist
          currentItem.GodownList.unshift(GodownList[0]);
        }

        currentItem.added = true;
        currentItem.isExpanded = true;
      } else {
        state.items.push(currentProduct);
      }
    },
    addStockTransferToGodown: (state, action) => {
      state.products = [];
      state.items = [];
      state.stockTransferToGodown = action.payload;
    },

    removeStockTransferToGodown: (state) => {
      state.stockTransferToGodown = {};
    },
    addNewAddress: (state, action) => {
      state.party.newAddress = action.payload;
      state.billToParty = {};
      state.shipToParty = {};
    },
    addBillToParty: (state, action) => {
      state.billToParty = action.payload;
    },
    addShipToParty: (state, action) => {
      state.shipToParty = action.payload;
    },

    addVoucherSeries: (state, action) => {
      state.voucherSeries = action.payload;
    },

    addSelectedVoucherSeries: (state, action) => {
      state.selectedVoucherSeries = action.payload;
    },
    addSelectedVoucherSeriesForEdit: (state, action) => {
      state.selectedVoucherSeriesForEdit = action.payload;
    },

    addWarrantyCardsList: (state, action) => {
      state.warrantyCardsList = action.payload;
    },
    addNote: (state, action) => {
      state.note = action.payload;
    },

    addIsNoteOpen: (state, action) => {
      state.isNoteOpen = action.payload;
    },

    addPaymentSplits: (state, action) => {
      const { changeFinalAmount, paymentSplits, totalPaymentSplits } =
        action.payload;

      state.paymentSplittingData = paymentSplits;
      state.totalPaymentSplits = totalPaymentSplits;

      if (changeFinalAmount) {
        const total = paymentSplits?.reduce(
          (acc, curr) => acc + parseInt(curr?.amount || 0),
          0
        );

        const creditAmount =
          paymentSplits?.find((split) => split.type === "credit")?.amount || 0;

        console.log(total);

        state.totalAfterPaymentSplit = Number(
          state.totalAfterAdditionalCharges - total
        );
        state.finalOutstandingAmount = creditAmount;
      }
    },
    addCreditInPaymentSplit: (state, action) => {
      const { reference_name, ref_id, credit_reference_type } = action.payload;

      // Ensure paymentSplittingData exists and is an array
      if (
        !state.paymentSplittingData ||
        !Array.isArray(state.paymentSplittingData)
      ) {
        return;
      }

      // Find the index of the credit payment split
      const creditIndex = state.paymentSplittingData.findIndex(
        (el) => el.type === "credit"
      );

      if (creditIndex !== -1) {
        // Update the existing credit entry
        state.paymentSplittingData[creditIndex] = {
          ...state.paymentSplittingData[creditIndex],
          ref_id: ref_id,
          reference_name: reference_name,
          credit_reference_type: credit_reference_type,
        };
      } else {
        // If no credit entry exists, create one
        const updatedData = {
          type: "credit",
          amount: 0,
          ref_id: ref_id,
          ref_collection: "Party",
          reference_name: reference_name,
          credit_reference_type: credit_reference_type,
        };
        state.paymentSplittingData.push(updatedData);
      }
    },

    updateIsScanOn: (state, action) => {
      state.isScanOn = action.payload;
    },

    updateTotalValue: (state, action) => {
      const { field, value } = action.payload;
      if (field in state) {
        state[field] = value;
      }

      // Always recalc dependent values
      state.totalWithAdditionalCharges =
        state.subTotal + (state.totalAdditionalCharges || 0);

      state.finalAmount = state.totalWithAdditionalCharges;

      const creditAmount =
        state.paymentSplittingData.find((split) => split.type === "credit")
          ?.amount || 0;

      state.finalOutstandingAmount =
        state.totalWithAdditionalCharges -
        ((state.totalPaymentSplits || 0) - creditAmount);
      state.totalAfterPaymentSplit =
        state.totalWithAdditionalCharges - (state.totalPaymentSplits || 0);
    },

    resetPaymentSplit: (state) => {
      state.totalPaymentSplits = 0;
      state.paymentSplittingData = [
        { type: "cash", amount: 0, ref_id: null, ref_collection: "Cash" },
        {
          type: "upi",
          amount: 0,
          ref_id: null,
          ref_collection: "BankDetails",
        },
        {
          type: "cheque",
          amount: 0,
          ref_id: null,
          ref_collection: "BankDetails",
        },
        {
          type: "credit",
          amount: 0,
          ref_id: null,
          ref_collection: "Party",
          reference_name: "",
          credit_reference_type: "",
        },
      ];
      state.totalAfterPaymentSplit = state.totalWithAdditionalCharges;
      state.finalOutstandingAmount = state.totalWithAdditionalCharges;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setSelectedSaleIds,
  addParty,
  removeParty,
  addItem,
  removeItem,
  changeCount,
  setPriceLevel,
  changeTotal,
  changeIgstAndDiscount,
  addAdditionalCharges,
  AddFinalAmount,
  deleteRow,
  removeAll,
  removeAdditionalCharge,
  persistScroll,
  setBrandInRedux,
  setCategoryInRedux,
  setSubCategoryInRedux,
  setParty,
  setItem,
  setSelectedPriceLevel,
  setFinalAmount,
  setAdditionalCharges,
  saveId,
  removeAllSales,
  changeGodownCount,
  addAllProducts,
  updateItem,
  setBatchHeight,
  removeGodownOrBatch,
  addAllFieldsFromEditSalesPage,
  addPriceRate,
  addNewAddress,
  addDespatchDetails,
  changeDate,
  changeTaxInclusive,
  addOrderConversionDetails,
  addConvertedFrom,
  addAllPriceLevels,
  addAllProductsOnly,
  updateAllItem,
  addAllAdditionalCharges,
  addVoucherType,
  addVoucherNumber,
  addVansSaleGodown,
  addMode,
  setInitialized,
  addBatch,
  addStockTransferToGodown,
  removeStockTransferToGodown,
  addBillToParty,
  addShipToParty,
  addVoucherSeries,
  addSelectedVoucherSeries,
  addSelectedVoucherSeriesForEdit,
  addWarrantyCardsList,
  addNote,
  addIsNoteOpen,
  addPaymentSplits,
  updateIsScanOn,
  addCreditInPaymentSplit,
  setTotalAfterAdditionalCharges,
  updateTotalValue,
  resetPaymentSplit,
} = commonVoucherSlice.actions;

export default commonVoucherSlice.reducer;
