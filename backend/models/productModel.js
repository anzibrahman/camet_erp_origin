import mongoose from "mongoose";
import { convertToUTCMidnight } from "../utils/dateHelpers.js";
 // No separate _id for sub-document

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true,
  },
  itemCode: {
  type: String,
 
  unique: true, // Optional: if you want unique item codes per company
  trim: true,
 
},

  product_image: {
    type: String, // Store Cloudinary URL
    default: "",
  },
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  product_code: {
    type: String,
  },
  balance_stock: {
    type: Number,
    default: 0,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
  Secondary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SecondaryUser",
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  sub_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subcategory",
  },
  unit: {
    type: String,
    required: true,
  },
  alt_unit: {
    type: String,
  },
  unit_conversion: {
    type: Number,
  },
  alt_unit_conversion: {
    type: Number,
  },
  unitConversions: [{
    fromUnit: String,
    fromQuantity: Number,
    toUnit: String,
    toQuantity: Number,
  }],
  isBeverage: {
    type: Boolean,
    default: false,
  },

  hsn_code: {
    type: String,
  },
  purchase_price: {
    type: Number,
  },
  purchase_cost: {
    type: Number,
  },
  item_mrp: {
    type: Number,
  },
  Priceleveles: [
    {
      pricelevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PriceLevel", // Reference to the Pricelevel model
        // required: true,
      },
      pricerate: {
        type: Number,
        required: true,
      },
      priceDisc: {
        type: Number,
        default: 0,
      },
      applicabledt: {
        type: String,
      },
      
      
    }
  ],

  GodownList: [
    {
      godown: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Godown", // Reference to the Godown model
        // required: true,
      },
      balance_stock: {
        type: Number,
        default: 0,
      },
      batch: {
        type: String,
      },
      mfgdt: {
        type: Date,
        default: null,
        set: convertToUTCMidnight,
      },
      expdt: {
        type: Date,
        default: null,
        set: convertToUTCMidnight,

      },

      warrantyCardNo: {
        type: String,
      },
      supplierName: {
        type: String,
      },
      voucherNumber: {
        type: String,
      },
      purchase_price: {
        type: Number,
      },
      purchase_cost: {
        type: Number,
      },
      mrp: {
        type: Number,
      },
      newBatch: {
        type: Boolean,
      },
      created_by: {
        voucherType: {
          type: String,
        },
        voucherNumber: {
          type: String,
        },
        voucher_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "purchase",
        },
      },
    },
  ],

  cgst: {
    type: Number,
  },
  sgst: {
    type: Number,
  },
  igst: {
    type: Number,
  },
  cess: {
    type: Number,
  },
  addl_cess: {
    type: Number,
  },
  state_cess: {
    type: Number,
  },
  product_master_id: {
    type: String,
  },

  batchEnabled: {
    type: Boolean,
    default: false,
  },
  gdnEnabled: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Product", productSchema);
