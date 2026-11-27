import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import SecondaryUser from "../models/secondaryUserModel.js";
import {
  Brand,
  Category,
  Godown,
  PriceLevel,
  Subcategory,
} from "../models/subDetails.js";
import OragnizationModel from "../models/OragnizationModel.js";

// controllers/productController.js
import {
  extractRequestParams,
  buildDatabaseFilter,
  getSelectedGodowns,
  transformProducts,
  validateExcludeGodownId,
  fetchProductsFromDatabase,
  sendProductResponse,
} from "../helpers/productHelper.js";

// @desc adding new Product
// route POst/api/pUsers/addProduct

export const addProduct = async (req, res) => {
  try {
    const {
      body: {
        cmp_id,
        product_name,
        product_code,
        balance_stock,
        brand,
        category,
        batchEnabled,
        gdnEnabled,
        sub_category,
        unit,
        alt_unit,
        unit_conversion,
        alt_unit_conversion,
        hsn_code,
        cgst,
        sgst,
        igst,
        cess,
        addl_cess,
        purchase_price,
        item_mrp,
        purchase_cost,
        Priceleveles,
        GodownList,
      },
    } = req;

    // Check for existing product by name and cmp_id
    const existingProductByName = await productModel.findOne({
      product_name: { $regex: new RegExp(`^${product_name}$`, "i") },
      cmp_id,
    });

    if (existingProductByName) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists for this company.",
      });
    }

    // Check for existing product by code and cmp_id
    if (product_code) {
      const existingProductByCode = await productModel.findOne({
        product_code: { $regex: new RegExp(`^${product_code}$`, "i") },
        cmp_id,
      });

      if (existingProductByCode) {
        return res.status(400).json({
          success: false,
          message:
            "Product with this product code already exists for this company.",
        });
      }
    }

    // Prepare data to save
    const dataToSave = {
      cmp_id,

      product_name,
      Primary_user_id: req.pUserId || req.owner,
      product_code,
      balance_stock,
      brand,
      category,
      sub_category,
      batchEnabled,
      gdnEnabled,
      unit,
      alt_unit,
      unit_conversion,
      alt_unit_conversion,
      hsn_code,
      purchase_price,
      purchase_cost,
      item_mrp,
      Priceleveles,
      GodownList,
      cgst,
      sgst,
      igst,
      cess,
      addl_cess,
    };

    // Save the product
    const newProduct = await productModel.create(dataToSave);

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Product added successfully",
    });
  } catch (error) {
    console.error(error);

    // Return error response
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// @desc  edit product details
// route get/api/pUsers/editProduct
export const editProduct = async (req, res) => {
  const productId = req.params.id;

  try {
    const {
      body: {
        cmp_id,
        product_name,
        product_code,
        balance_stock,
        brand,
        category,
        sub_category,
        unit,
        alt_unit,
        unit_conversion,
        alt_unit_conversion,
        hsn_code,
        cgst,
        sgst,
        igst,
        cess,
        addl_cess,
        purchase_price,
        item_mrp,
        purchase_cost,
        Priceleveles,
        GodownList,
        batchEnabled,
        gdnEnabled,
      },
    } = req;

    // Check for existing product by name and cmp_id
    const existingProductByName = await productModel.findOne({
      _id: { $ne: productId }, // Exclude the current product
      cmp_id,
      product_name: { $regex: new RegExp(`^${product_name}$`, "i") },
    });

    // Check for existing product by code and cmp_id
    const existingProductByCode = await productModel.findOne({
      _id: { $ne: productId }, // Exclude the current product
      product_code: { $regex: new RegExp(`^${product_code}$`, "i") },
      cmp_id,
    });

    if (existingProductByName) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists for this company.",
      });
    }

    // Prepare data to save
    const dataToSave = {
      product_name,
      Primary_user_id: req.pUserId || req.owner,
      product_code,
      balance_stock,
      brand,
      category,
      sub_category,
      unit,
      alt_unit,
      unit_conversion,
      alt_unit_conversion,
      hsn_code,
      purchase_price,
      purchase_cost,
      item_mrp,
      Priceleveles,
      GodownList,
      cgst,
      sgst,
      igst,
      cess,
      addl_cess,
      batchEnabled,
      gdnEnabled,
    };

    const updateProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      dataToSave,
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updateProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// @desc  getting a single product detail for edit
// route get/api/sUsers/productDetails

export const productDetails = async (req, res) => {
  const productId = req.params.id;
  try {
    const productDetails = await productModel.findById(productId);
    res.status(200).json({ success: true, data: productDetails });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc delete product from  product list
// route delete/api/pUsers/deleteProduct

export const deleteProduct = async (req, res) => {
  const productId = req.params.id;

  try {
    const deletedProduct = await productModel.findByIdAndDelete(productId);
    if (deletedProduct) {
      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

/**
 * @desc  adding subDetails of product such as brand category subcategory etc
 * @route POST/api/pUsers/addProductSubDetails
 * @access public
 */

export const addProductSubDetails = async (req, res) => {
  try {
    const subDetails = req.body;
    const key = Object.keys(subDetails)[0];
    const orgId = req.params.orgId;

    let Model;
    let dataToSave;
    /// add godownEnabled tag to company
    const company = await OragnizationModel.findOne({ _id: orgId });
    const generatedId = new mongoose.Types.ObjectId();

    let findAlreadyNameExist = null;

    if (key === "roomType" || key === "brand") {
       findAlreadyNameExist = await Brand.findOne({
        brand: subDetails[key],
        cmp_id: orgId,
        ...(subDetails.under && { under: subDetails.under }),
      });
    } else if (key === "bedType" || key === "Regional Food Category") {
      console.log(subDetails[key],"dsssssssss");
      findAlreadyNameExist = await Category.findOne({
      category: subDetails[key],
      cmp_id: orgId,
      });
    } else if (key === "roomFloor" || key === "foodItems") {
      findAlreadyNameExist = await Subcategory.findOne({
        subcategory: subDetails[key],
        cmp_id: orgId,
      });
    }

    // Common validation
    if (findAlreadyNameExist) {
      return res.status(400).json({
        success: false,
        message: `${key} already exists`,
      });
    }


    switch (key) {
      case "brand":
      case "roomType":
        Model = Brand;
        dataToSave = {
          _id: generatedId,
          brand: subDetails[key],
          brand_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          ...(subDetails.under && { under: subDetails.under }),
          ...(Number(subDetails.price) > 0 && {
            roomRent: Number(subDetails.price),
          }),
        };
        break;
      case "Regional Food Category":
        Model = Category;
        dataToSave = {
          _id: generatedId,
          category: subDetails[key],
          category_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          under: "restaurant",
        };
        break;
      case "bedType":
      case "category":
        Model = Category;
        dataToSave = {
          _id: generatedId,
          category: subDetails[key],
          category_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
        };
        break;
      case "roomFloor":
      case "subcategory":
        Model = Subcategory;
        dataToSave = {
          _id: generatedId,
          subcategory: subDetails[key],
          subcategory_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
        };
        break;

      case "foodItems":
        Model = Subcategory;
        dataToSave = {
          _id: generatedId,
          subcategory: subDetails[key],
          category_id: subDetails.category_id,
          subcategory_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          under: "restaurant",
        };
        break;
      case "godown":
        Model = Godown;
        dataToSave = {
          _id: generatedId,
          godown: subDetails[key],
          godown_id: generatedId,
          address: subDetails.address,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          defaultGodown: false,
        };

        break;
      case "pricelevel":
        Model = PriceLevel;
        dataToSave = {
          _id: generatedId,
          pricelevel: subDetails[key],
          // pricelevel_id: generatedId,
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          dineIn: subDetails.dineIn || "", // store dropdown value
          takeaway: subDetails.takeaway || "", // store dropdown value
          roomService: subDetails.roomService || "", // store dropdown value
          delivery: subDetails.delivery || "", // store dropdown value
        };
        break;
      default:
        return res.status(400).json({ message: "Invalid sub-detail type" });
    }

    const newSubDetail = new Model(dataToSave);
    await newSubDetail.save();

    const companyUpdate = key === "godown" ? company : null;

    res
      .status(201)
      .json({ message: `${key} added successfully`, companyUpdate });
  } catch (error) {
    console.error("Error in addProductSubDetails:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the sub-detail" });
  }
};

/**
 * @desc  get subDetails of product such as brand category subcategory etc
 * @route GET/api/pUsers/getProductSubDetails
 * @access Public
 */

export const getProductSubDetails = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { type, under } = req.query; // 'type' can be 'brand', 'category', 'subcategory', 'godown', or 'pricelevel'
    const restrict = req.query.restrict === "true" ? true : false;
    const Primary_user_id = req.pUserId || req.owner;
    const secondaryUser = await SecondaryUser.findById(req.sUserId);
    const configuration = secondaryUser.configurations.find(
      (config) => config?.organization?.toString() === orgId,
    );

    let data;

    switch (type) {
      case "roomType":
      case "brand":
        data = await Brand.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
          ...(under && { under }),
        });
        break;
      case "bedType":
      case "category":
        data = await Category.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
        });
        break;
      case "Regional Food Category":
        data = await Category.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
          under: "restaurant",
        });
        break;
      case "foodItems":
        data = await Subcategory.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
          under: "restaurant",
        });
        break;
      case "roomFloor":
      case "group":
      case "subcategory":
        data = await Subcategory.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
        });
        break;
      case "godown":
        data = await Godown.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
        });

        if (configuration?.selectedGodowns.length > 0 && restrict) {
          console.log(data);
          data = data.filter((godown) =>
            configuration.selectedGodowns.includes(godown._id),
          );
        }

        break;
      case "pricelevel":
        data = await PriceLevel.find({
          cmp_id: orgId,
          Primary_user_id: Primary_user_id,
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid sub-detail type" });
    }

    res.status(200).json({
      message: `${type} details retrieved successfully`,
      data: data,
    });
  } catch (error) {
    console.error("Error in getProductSubDetails:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the sub-details" });
  }
};

/**
 * @desc  delete subDetails of product such as brand category subcategory etc
 * @route DELETE/api/pUsers/deleteProductSubDetails
 * @access Public
 */
export const deleteProductSubDetails = async (req, res) => {
  try {
    const { orgId, id } = req.params;
    const { type } = req.query;

    let Model;
    switch (type) {
      case "roomType":
      case "brand":
        Model = Brand;
        break;
      case "bedType":
      case "category":
      case "Regional Food Category":
        Model = Category;
        break;
      case "roomFloor":
      case "subcategory":
      case "foodItems":
        Model = Subcategory;
        break;
      case "godown":
        Model = Godown;
        break;
      case "pricelevel":
        Model = PriceLevel;
        break;
      default:
        return res.status(400).json({ message: "Invalid sub-detail type" });
    }

    const deletedItem = await Model.findOneAndDelete({
      _id: id,
      cmp_id: orgId,
    });

    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: `${type} deleted successfully` });
  } catch (error) {
    console.error("Error in deleteProductSubDetails:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the sub-detail" });
  }
};

/**
 * @desc  edit subDetails of product such as brand category subcategory etc
 * @route PUT/api/pUsers/editProductSubDetails
 * @access Public
 */
export const editProductSubDetails = async (req, res) => {
  try {
    const { orgId, id } = req.params;
    const { type } = req.query;

    let findAlreadyNameExist = null;

    if (type === "roomType") {
      findAlreadyNameExist = await Brand.findOne({
        brand: req.body.roomType,
        cmp_id: orgId,
        _id: { $ne: id },
      });
    } else if (type === "bedType" || type === "Regional Food Category") {
      findAlreadyNameExist = await Category.findOne({
        category: req.body.bedType || req.body["Regional Food Category"],
        cmp_id: orgId,
        _id: { $ne: id },
      });
    } else if (type === "roomFloor" || type === "foodItems") {
      findAlreadyNameExist = await Subcategory.findOne({
        subcategory: req.body.roomFloor || req.body.foodItems,
        cmp_id: orgId,
        _id: { $ne: id },
      });
    }

    // Common validation
    if (findAlreadyNameExist) {
      return res.status(400).json({
        success: false,
        message: `${type} already exists with in the restaurant or hotel`,
      });
    }

    let Model;
    switch (type) {
      case "roomType":
      case "brand":
        Model = Brand;
        break;
      case "bedType":
      case "Regional Food Category":
      case "category":
        Model = Category;
        break;
      case "roomFloor":
      case "foodItems":
      case "subcategory":
        Model = Subcategory;
        break;
      case "godown":
        Model = Godown;
        break;
      case "pricelevel":
        Model = PriceLevel;
        break;
      default:
        return res.status(400).json({ message: "Invalid sub-detail type" });
    }

    const queryConditions = { _id: id, cmp_id: orgId };
    let result;

    // Check if item exists first
    const existingItem = await Model.findOne(queryConditions);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    console.log("Existing item:", existingItem);

    if (type === "roomType") {
      result = await Model.updateOne(queryConditions, {
        brand: req.body.roomType,
        roomRent: req.body.price,
      });
    } else if (type === "roomFloor") {
      result = await Model.updateOne(queryConditions, {
        subcategory: req.body.roomFloor,
      });
    } else if (type === "bedType") {
      result = await Model.updateOne(queryConditions, {
        category: req.body.bedType,
      });
    } else if (type === "Regional Food Category") {
      result = await Model.updateOne(queryConditions, {
        category: req.body["Regional Food Category"],
      });
    } else if (type === "foodItems") {
      result = await Model.updateOne(queryConditions, {
        subcategory: req.body["foodItems"],
        category_id: req.body["category_id"],
      });
    } else if (type === "pricelevel") {
      // Build update object dynamically, only including changed fields
      const updateFields = {};

      if (req.body.pricelevel !== undefined) {
        updateFields.pricelevel = req.body.pricelevel;
      }
      if (req.body.dineIn !== undefined) {
        updateFields.dineIn = req.body.dineIn;
      }
      if (req.body.takeaway !== undefined) {
        updateFields.takeaway = req.body.takeaway;
      }
      if (req.body.roomService !== undefined) {
        updateFields.roomService = req.body.roomService;
      }
      if (req.body.delivery !== undefined) {
        updateFields.delivery = req.body.delivery;
      }

      console.log("PriceLevel update fields:", updateFields);

      result = await Model.updateOne(queryConditions, updateFields);
    } else {
      const updateOperation = { [type]: req.body[type] };
      result = await Model.updateOne(queryConditions, updateOperation);
    }

    console.log("Update result:", result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    // For pricelevel, we might not have modifiedCount if values are the same
    // So we'll consider it successful if matchedCount > 0
    if (type === "pricelevel" || result.modifiedCount > 0) {
      const updatedItem = await Model.findOne(queryConditions);

      return res.status(200).json({
        message: `${type} updated successfully`,
        data: updatedItem,
      });
    } else {
      return res.status(200).json({
        message: `${type} is already up to date`,
        data: existingItem,
      });
    }
  } catch (error) {
    console.error("Error in editProductSubDetails:", error);
    res.status(500).json({
      message: "An error occurred while updating the sub-detail",
      error: error.message,
    });
  }
};
/**
 * Get products with filtering, pagination, and transformation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProducts = async (req, res) => {
  try {
    // Extract and validate request parameters
    const params = extractRequestParams(req);

    // Validate secondary user exists
    const secUser = await SecondaryUser.findById(params.Secondary_user_id);
    if (!secUser) {
      return res.status(404).json({ message: "Secondary user not found" });
    }

    // Get user configuration for the specified organization
    const configuration = secUser.configurations.find(
      (item) => item.organization == params.cmp_id,
    );

    /// to find if tax inclusive is enabled
    const company = await OragnizationModel.findById(params.cmp_id).lean();
    const isTaxInclusive =
      company?.configurations?.[0]?.addRateWithTax[params?.voucherType] ??
      false;

    // Validate exclude godown ID if provided
    if (
      params.excludeGodownId &&
      !validateExcludeGodownId(params.excludeGodownId)
    ) {
      return res.status(400).json({
        message: "Invalid excludeGodownId format",
      });
    }

    // Build database filter with name or product code search
    const filter = buildDatabaseFilter(params);

    // Get selected godowns based on configuration
    const selectedGodowns = getSelectedGodowns(configuration, params.isVanSale);

    // Apply godown filter to database query if we have selected godowns
    if (selectedGodowns.length > 0) {
      filter["GodownList.godown"] = { $in: selectedGodowns };
    }

    // Enable godown filtering for exclude functionality
    /// if excludeGodownId is provided, we only want products with godown functionality enabled,means excludeGodownId is used with stock transfer,so a godown is need in stock transfer
    // This ensures we only fetch products that can be filtered by godown

    if (params.excludeGodownId || params.isVanSale) {
      filter.gdnEnabled = true;
    }

    // Execute database operations
    const { products, totalProducts } = await fetchProductsFromDatabase(
      filter,
      params,
    );

    // Transform products according to business rules
    const transformedProducts = transformProducts(products, {
      selectedGodowns,
      excludeGodownId: params.excludeGodownId,
      isSaleOrder: params.isSaleOrder,
      isTaxInclusive,
    });

    // Send response
    return sendProductResponse(res, transformedProducts, totalProducts, params);
  } catch (error) {
    console.error("Error in getProducts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

export const getAllProductsForExcel = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { search } = req.query;

    // Build match stage for aggregation
    let matchStage = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    if (search) {
      matchStage.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { product_code: { $regex: search, $options: "i" } },
        { hsn_code: { $regex: search, $options: "i" } },
      ];
    }

    // Create aggregation pipeline
    const aggregationPipeline = [
      // Stage 1: Match - Filter early to reduce data processing
      {
        $match: matchStage,
      },
      // Stage 2: Project only required fields early to reduce memory usage
      {
        $project: {
          product_name: 1,
          product_code: 1,
          balance_stock: 1,
          unit: 1,
          purchase_price: 1,
          purchase_cost: 1,
          item_mrp: 1,
          cgst: 1,
          sgst: 1,
          igst: 1,
          hsn_code: 1,
          batchEnabled: 1,
          gdnEnabled: 1,
          addl_cess: 1,
          cess: 1,
          alt_unit: 1,
          alt_unit_conversion: 1,
          unit_conversion: 1,
          brand: 1,
          category: 1,
          sub_category: 1,
        },
      },
      // Stage 3: Lookup Brand data
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandData",
        },
      },
      // Stage 4: Lookup Category data
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryData",
        },
      },
      // Stage 5: Lookup Subcategory data
      {
        $lookup: {
          from: "subcategories",
          localField: "sub_category",
          foreignField: "_id",
          as: "subCategoryData",
        },
      },
      // Stage 6: Final projection with flattened data
      {
        $project: {
          product_name: 1,
          product_code: 1,
          balance_stock: 1,
          unit: 1,
          purchase_price: 1,
          purchase_cost: 1,
          item_mrp: 1,
          cgst: 1,
          sgst: 1,
          igst: 1,
          hsn_code: 1,
          batchEnabled: 1,
          gdnEnabled: 1,
          addl_cess: 1,
          cess: 1,
          alt_unit: 1,
          alt_unit_conversion: 1,
          unit_conversion: 1,
          brandName: {
            $ifNull: [{ $arrayElemAt: ["$brandData.brand", 0] }, ""],
          },
          categoryName: {
            $ifNull: [{ $arrayElemAt: ["$categoryData.category", 0] }, ""],
          },
          subCategoryName: {
            $ifNull: [
              { $arrayElemAt: ["$subCategoryData.subcategory", 0] },
              "",
            ],
          },
        },
      },
    ];

    // Execute aggregation with proper options
    const products = await productModel
      .aggregate(aggregationPipeline)
      .allowDiskUse(true)
      .exec();

    // Transform data for Excel export
    const excelData = products.map((product) => ({
      "Product Name": product.product_name || "",
      "Product Code": product.product_code || "",
      "HSN Code": product.hsn_code || "",
      Brand: product.brandName || "",
      Category: product.categoryName || "",
      "Sub Category": product.subCategoryName || "",
      Unit: product.unit || "",
      "Balance Stock": product.balance_stock || 0,
      "Purchase Price": product.purchase_price || 0,
      "Purchase Cost": product.purchase_cost || 0,
      MRP: product.item_mrp || 0,
      "CGST %": product.cgst || 0,
      "SGST %": product.sgst || 0,
      "IGST %": product.igst || 0,
      "CESS %": product.cess || 0,
      "Additional CESS %": product.addl_cess || 0,
      "Batch Enabled": product.batchEnabled ? "Yes" : "No",
      "Godown Enabled": product.gdnEnabled ? "Yes" : "No",
      "Alt Unit": product.alt_unit || "",
      "Alt Unit Conversion": product.alt_unit_conversion || "",
      "Unit Conversion": product.unit_conversion || "",
    }));

    res.json({
      success: true,
      data: excelData,
      totalCount: products.length,
      message: "Products fetched successfully for Excel export",
    });
  } catch (error) {
    console.error("Error fetching products for Excel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products for Excel export",
      error: error.message,
    });
  }
};
