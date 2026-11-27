import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
  brand: { type: String, required: true  },
  under: { type: String },
  roomRent: { type: Number , default:0},
 
  brand_id: { type: String, required: true, index: true }, // Add index: true here
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
});

const categorySchema = new mongoose.Schema({
  category: { type: String, required: true },
  under:{type:String},
  category_id: { type: String, required: true, index: true }, // Add index: true here
  under: { type: String},
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
});

const subcategorySchema = new mongoose.Schema({
  subcategory: { type: String, required: true },
  under:{type:String},
  subcategory_id: { type: String, required: true, index: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
});

const godownScheme = new mongoose.Schema({
  godown: { type: String, required: true },
  godown_id: { type: String, required: true, index: true }, // Add index: true here
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
  defaultGodown: { type: Boolean, required: true, default: false },
});

const priceLevelSchema = new mongoose.Schema({
  pricelevel: { type: String, required: true },
  // pricelevel_id: { type: String }, // Add index: true here
  cmp_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  Primary_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PrimaryUser",
    required: true,
  },
    dineIn: {
    type: String,
    enum: ['enabled', ''],
    default: ''
  },
  takeaway: {
    type: String,
    enum: ['enabled', ''],
    default: ''
  },
  roomService: {
    type: String,
    enum: ['enabled', ''],
    default: ''
  },
  delivery: {
    type: String,
    enum: ['enabled', ''],
    default: ''
  },
});

export const Brand = mongoose.model("Brand", brandSchema);
export const Category = mongoose.model("Category", categorySchema);
export const Subcategory = mongoose.model("Subcategory", subcategorySchema);
export const Godown = mongoose.model("Godown", godownScheme);
export const PriceLevel = mongoose.model("PriceLevel", priceLevelSchema);
