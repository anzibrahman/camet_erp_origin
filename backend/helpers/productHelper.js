// helpers/productHelpers.js
import mongoose from "mongoose";
import productModel from "../models/productModel.js";

/**
 * Validates and normalizes godown IDs
 * Handles both string and array inputs, validates ObjectId format
 * @param {string|Array} godowns - Godown IDs to validate
 * @returns {Array} Array of valid ObjectId strings
 */
export const validateAndNormalizeGodowns = (godowns) => {
  if (!godowns) return [];

  let godownArray;

  /// if it is not array ,make it an array
  // if it is string ,split it by comma
  if (typeof godowns === "string") {
    godownArray = godowns.includes(",") ? godowns.split(",") : [godowns];
  } else if (Array.isArray(godowns)) {
    godownArray = godowns;
  } else {
    return [];
  }

  return godownArray
    .map((id) => (typeof id === "string" ? id.trim() : id))
    .filter((id) => {
      return (
        id &&
        id !== "" &&
        id !== null &&
        id !== undefined &&
        mongoose.Types.ObjectId.isValid(id)
      );
    });
};

/**
 * Extracts godown ID from godown item (handles populated and non-populated)
 * @param {Object} godownItem - Godown item object
 * @returns {string} Godown ID
 */
export const extractGodownId = (godownItem) => {
  /// since it is  possible that godownItem.godown is not populated
  return godownItem.godown?._id || godownItem.godown;
};

/**
 * Filters godown list based on allowed and excluded IDs
 * @param {Array} godownList - List of godown items
 * @param {Array} allowedIds - Array of allowed godown IDs
 * @param {string} excludedId - ID to exclude (optional)
 * @returns {Array} Filtered godown list
 */
export const filterGodownsByIds = (
  godownList,
  allowedIds = [],
  excludedId = null
) => {
  if (!godownList || godownList.length === 0) return [];

  return godownList.filter((godownItem) => {
    const godownId = extractGodownId(godownItem);
    if (!godownId && allowedIds.length > 0) {
      return false;
    }

    // Exclude specific godown if provided
    if (excludedId && godownId.toString() === excludedId.toString()) {
      return false;
    }

    // Include only allowed godowns if specified
    if (allowedIds.length > 0) {
      return allowedIds.some((id) => id.toString() === godownId.toString());
    }

    return true;
  });
};

/**
 * Filters out Primary Batch items with zero balance when multiple godowns exist
 * @param {Array} godownList - List of godown items
 * @returns {Array} Filtered godown list
 */
export const filterPrimaryBatchWithZeroBalance = (godownList) => {
  if (!godownList || godownList.length <= 1) return godownList;

  return godownList.filter((godownItem) => {
    return !(
      godownItem.batch === "Primary Batch" && godownItem.balance_stock === 0
    );
  });
};

/**
 * Flattens godown list structure for easier frontend consumption
 * @param {Array} godownList - List of godown items
 * @returns {Array} Flattened godown list
 */
export const flattenGodownList = (godownList) => {
  if (!godownList || godownList.length === 0) return godownList;

  return godownList.map((godownItem) => {
    if (!godownItem.godown) return godownItem;

    return {
      ...godownItem,
      godownMongoDbId: godownItem.godown._id,
      godown: godownItem.godown.godown,
      godown_id: godownItem.godown.godown_id,
      defaultGodown: godownItem.godown.defaultGodown,
    };
  });
};

/**
 * Flattens price levels structure for easier frontend consumption
 * @param {Array} priceLevels - List of price level items
 * @returns {Array} Flattened price levels list
 */
export const flattenPriceLevels = (priceLevels) => {
  if (!priceLevels || priceLevels.length === 0) return priceLevels;

  return priceLevels.map((priceLevel) => {
    if (!priceLevel.pricelevel) return priceLevel;

    return {
      ...priceLevel,
      _id: priceLevel.pricelevel._id,
      pricelevel: priceLevel?.pricelevel?.pricelevel,
    };
  });
};

/**
 * Extracts and validates request parameters
 * @param {Object} req - Express request object
 * @returns {Object} Validated parameters object
 */
export const extractRequestParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 0;

  /// in configuration sales is saved as sale,by mistake,so we need to convert it
  /// to sale if it is sales
  const voucherType =
    ["sales", "performaInvoice"].includes(req.query.voucherType) ? "sale" : req.query.voucherType || "all";

  /// in configuration sales is saved as sale,by mistake,so we need to convert it
  /// to sale if it is sales
  const type = req.query.type;
  const under = req.query.under;

  return {
    Secondary_user_id: req.sUserId,
    cmp_id: req.params.cmp_id,
    Primary_user_id: req.owner,
    isVanSale: voucherType === "vanSale",
    excludeGodownId: req.query.excludeGodownId,
    searchTerm: req.query.search || "",
    isSaleOrder: req.query.saleOrder === "true",
    page,
    limit,
    skip: limit > 0 ? (page - 1) * limit : 0,
    voucherType,
    type,
    under,
    arrivalDate: req.query?.arrivalDate,
    checkOutDate: req.query?.checkOutDate,
  };
};

/**
 * Builds MongoDB filter object based on parameters
 * @param {Object} params - Request parameters
 * @returns {Object} MongoDB filter object
 */
export const buildDatabaseFilter = (params) => {
  const filter = {
    cmp_id: params.cmp_id,
    Primary_user_id: params.Primary_user_id,
  };

  // Add search functionality if search term is provided
  if (params.searchTerm) {
    filter.$or = [
      { product_name: { $regex: params.searchTerm, $options: "i" } },
      { product_code: params.searchTerm },
    ];
  }

  return filter;
};

/**
 * Gets selected godowns based on configuration and van sale flag
 * @param {Object} configuration - User configuration object
 * @param {boolean} isVanSale - Whether this is a van sale request
 * @returns {Array} Array of selected godown IDs
 */
export const getSelectedGodowns = (configuration, isVanSale) => {
  /// if it is van sale, use selectedVanSaleGodowns, otherwise use selectedGodowns
  if (isVanSale && configuration?.selectedVanSaleGodowns) {
    return validateAndNormalizeGodowns(configuration.selectedVanSaleGodowns);
  } else if (!isVanSale && configuration?.selectedGodowns) {
    return validateAndNormalizeGodowns(configuration.selectedGodowns);
  }
  return [];
};

/**
 * Transforms a single product object applying business logic
 * @param {Object} product - Product mongoose document
 * @param {Object} options - Transformation options
 * @returns {Object|null} Transformed product object or null if should be filtered out
 */
export const transformSingleProduct = (product, options) => {
  const {
    selectedGodowns = [],
    excludeGodownId,
    isSaleOrder = false,
    isTaxInclusive = false,
  } = options;

  const productObject = product.toObject();

  // Set business flags
  const batchEnabled = productObject.batchEnabled === true;
  const gdnEnabled = productObject.gdnEnabled === true;

  // Set hasGodownOrBatch flag based on context
  // it is true if it is not sale order and either batch or godown is enabled
  // otherwise it is false
  productObject.hasGodownOrBatch = isSaleOrder
    ? false
    : batchEnabled || gdnEnabled;
  productObject.isTaxInclusive = isTaxInclusive;

  // Process GodownList if it exists
  if (productObject.GodownList && productObject.GodownList.length > 0) {
    // Apply godown filtering
    let filteredGodownList = filterGodownsByIds(
      productObject.GodownList,
      selectedGodowns,
      excludeGodownId
    );

    // If no godowns remain after filtering, mark product for removal
    if (filteredGodownList.length === 0) {
      return null;
    }

    // Apply business rule: filter Primary Batch with zero balance
    filteredGodownList = filterPrimaryBatchWithZeroBalance(filteredGodownList);

    // Flatten the godown structure
    productObject.GodownList = flattenGodownList(filteredGodownList);
  }

  // Process and flatten PriceLevels
  productObject.Priceleveles = flattenPriceLevels(productObject.Priceleveles);

  return productObject;
};

/**
 * Transforms array of products applying business logic
 * @param {Array} products - Array of product mongoose documents
 * @param {Object} options - Transformation options
 * @returns {Array} Array of transformed products
 */
export const transformProducts = (products, options) => {
  /// here we exclude specific godown if it is provided
  /// here we return only specific godowns if they are provided (selectedGodowns)
  /// here we add hasGodownOrBatch flag to each product
  /// here we add isTaxInclusive flag to each product
  return products
    .map((product) => transformSingleProduct(product, options))
    .filter((product) => product && product.GodownList?.length > 0);
};

/**
 * Validates exclude godown ID format
 * @param {string} excludeGodownId - Godown ID to validate
 * @returns {boolean} Whether the ID is valid
 */
export const validateExcludeGodownId = (excludeGodownId) => {
  return excludeGodownId && mongoose.Types.ObjectId.isValid(excludeGodownId);
};

/**
 * Fetches products from database with pagination and population
 * @param {Object} filter - MongoDB filter object
 * @param {Object} params - Request parameters
 * @returns {Object} Object containing products array and total count
 */
export const fetchProductsFromDatabase = async (filter, params) => {
  // Count total products matching the filter for pagination
  const totalProducts = await productModel.countDocuments(filter);

  // Build query with pagination
  let query = productModel.find(filter);

  // Apply pagination if limit is specified
  if (params?.limit > 0) {
    query = query.skip(params?.skip).limit(params?.limit);
  }

  // Execute query with population and sorting
  const products = await query
    .sort({ product_name: 1 })
    .populate({
      path: "GodownList.godown",
      model: "Godown",
    })
    .populate({
      path: "Priceleveles.pricelevel",
      model: "PriceLevel",
    });

  return { products, totalProducts };
};

/**
 * Sends formatted response with products and pagination info
 * @param {Object} res - Express response object
 * @param {Array} transformedProducts - Array of transformed products
 * @param {number} totalProducts - Total count of products
 * @param {Object} params - Request parameters
 * @returns {Object} Express response
 */
export const sendProductResponse = (
  res,
  transformedProducts,
  totalProducts,
  params
) => {
  if (transformedProducts && transformedProducts.length > 0) {
    return res.status(200).json({
      productData: transformedProducts,
      pagination: {
        total: totalProducts,
        page: params.page,
        limit: params.limit,
        hasMore: params.skip + transformedProducts.length < totalProducts,
      },
      message: "Products fetched successfully",
    });
  } else {
    return res.status(404).json({
      message: "No products were found matching the criteria",
    });
  }
};
