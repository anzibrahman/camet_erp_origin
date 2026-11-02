import { calculateVoucherItemTotal as calculateTotal } from "./calculateVoucherItemTotal";
// Import statements
import api from "@/api/api";
import TitleDiv from "@/components/common/TitleDiv";
import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addAllProducts,
  addAllPriceLevels,
  setPriceLevel,
  updateItem,
  addItem,
  updateIsScanOn,
} from "../../../../slices/voucherSlices/commonVoucherSlice";
import SearchBar from "@/components/common/SearchBar";
import VoucherProductLIst from "./VoucherProductLIst";
import Filter from "@/pages/voucher/voucherCreation/Filter";
import CustomBarLoader from "@/components/common/CustomBarLoader";
import { useNavigate } from "react-router-dom";
import { store } from "../../../../app/store";
import BarcodeScan from "@/components/secUsers/barcodeScanning/BarcodeScan";
import Decimal from "decimal.js";
import { MdOutlineQrCodeScanner } from "react-icons/md";

/**
 * VoucherAddCount Component
 *
 * This component manages product selection for vouchers, handling:
 * - Product data loading with pagination and search
 * - Price level selection and application
 * - State synchronization with Redux
 * - Updates to product quantities and stock balances
 */
function VoucherAddCount() {
  // ===================================
  // State Management
  // ===================================
  const [items, setItems] = useState([]); // Current displayed products
  const [priceLevels, setPriceLevels] = useState([]); // Available price levels
  const [loader, setLoader] = useState(false); // Main loading state
  const [refresh, setRefresh] = useState(false); // Trigger for component refresh
  const [page, setPage] = useState(1); // Current page for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more products can be loaded
  const [isLoading, setIsLoading] = useState(false); // Loading state for pagination
  const [searchTerm, setSearchTerm] = useState(""); // Current search term
  const [pricesLoaded, setPricesLoaded] = useState(false); // Whether price levels are loaded
  const [isScanOn, setIsScanOn] = useState(false); // Barcode scanning state

  const listRef = useRef(null);

  // Reference for search debounce
  const searchTimeoutRef = useRef(null);
  const limit = 30; // Number of products per page

  ////Navigation
  const navigate = useNavigate();

  // ===================================
  // Redux Integration
  // ===================================
  const dispatch = useDispatch();

  // Get organization data from Redux
  const {
    _id: cmp_id,
    configurations,
    type,
  } = useSelector((state) => state.secSelectedOrganization.secSelectedOrg);
  const { enableNegativeStockBlockForVanInvoice } = configurations[0];

  // Get sales data from Redux
  const {
    items: itemsFromRedux,
    selectedPriceLevel: selectedPriceLevelFromRedux,
    products: allProductsFromRedux,
    priceLevels: priceLevelsFromRedux,
    page: pageNumberFromRedux,
    hasMore: hasMoreFromRedux,
    voucherType: voucherTypeFromRedux,
    stockTransferToGodown,
    isScanOn: isScanOnFromRedux,
  } = useSelector((state) => state.commonVoucherSlice);

  // ===================================
  // Search Functionality
  // ===================================

  /**
   * Debounced search function
   * Waits 500ms after typing stops before applying search
   */
  const searchData = (data) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // First, update Redux to clear products
      dispatch(
        addAllProducts({
          page: 0, // Set to 0 not 1
          hasMore: true,
          products: [],
        })
      );

      // Then update component state
      setSearchTerm(data);
      setIsLoading(false);
      setPage(1);

      setItems([]);
      setHasMore(true);

      // Now fetch with a slight delay to ensure Redux state is updated
      setTimeout(() => {
        fetchProducts(1, data);
      }, 0);
    }, 500);
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ===================================
  // Data Fetching & Processing
  // ===================================

  /**
   * Fetch products with pagination and search support
   * Uses cached data from Redux when available
   */

  const fetchProducts = useCallback(
    async (pageNumber = 1, searchTerm = "") => {
      // Skip if already loading or price levels not yet loaded

      if (isLoading || !pricesLoaded) return;

      setLoader(pageNumber === 1);

      try {
        setIsLoading(true);

        // Get the CURRENT Redux state rather than using the closure value
        const currentReduxState = store.getState().commonVoucherSlice;
        const currentProducts = currentReduxState.products;
        const currentPageNumber = currentReduxState.page;

        // Use cached data from Redux if available for this page
        if (currentPageNumber >= pageNumber && currentProducts?.length > 0) {
          setItems(currentProducts);
          setHasMore(hasMoreFromRedux);
          processItemsWithRedux();
          setIsLoading(false);
          setLoader(false);
          return;
        }

        // Prepare query parameters
        const params = new URLSearchParams({
          page: pageNumber,
          limit,
          voucherType: voucherTypeFromRedux,
        });

        if (searchTerm) {
          params.append("search", searchTerm);
        }

        if (
          voucherTypeFromRedux === "stockTransfer" &&
          Object.keys(stockTransferToGodown)?.length > 0
        ) {
          params.append("excludeGodownId", stockTransferToGodown?._id);
        }

        ///// if voucher Type is sale order ,then we don not need to differentiate between has godown or batch or not
        //// all are considered as normal no godown and batch products so add it in params

        if (voucherTypeFromRedux === "saleOrder") {
          params.append("saleOrder", true);
        }

        // Fetch products from API
        const res = await api.get(
          `/api/sUsers/getProducts/${cmp_id}?${params}`,
          {
            withCredentials: true,
          }
        );

        const productData = res.data.productData;

        // Add selected price rate to each product
        const productsWithPriceRates = productData.map((productItem) => {
          const priceRate =
            productItem?.Priceleveles?.find(
              (priceLevelItem) =>
                priceLevelItem._id === selectedPriceLevelFromRedux?._id
            )?.pricerate || 0;

          const updatedGodownList = productItem.GodownList.map(
            (godownOrBatch) => ({
              ...godownOrBatch,
              selectedPriceRate: priceRate,
            })
          );

          return {
            ...productItem,
            GodownList: updatedGodownList,
          };
        });

        // Update state based on whether this is the first page or not
        if (pageNumber === 1) {
          setItems(productsWithPriceRates);
        } else {
          setItems((prevItems) => [...prevItems, ...productsWithPriceRates]);
        }

        // Store in Redux for future use
        dispatch(
          addAllProducts({
            products: productsWithPriceRates,
            page: pageNumber,
            hasMore: res.data.pagination.hasMore,
          })
        );

        // Update pagination state
        setHasMore(res.data.pagination.hasMore);
        setPage(pageNumber);

        // Process items with any existing Redux data
        processItemsWithRedux(productsWithPriceRates);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
        setLoader(false);
      }
    },
    [
      cmp_id,
      selectedPriceLevelFromRedux,
      dispatch,
      pageNumberFromRedux,
      allProductsFromRedux,
      hasMoreFromRedux,
      isLoading,
      pricesLoaded,
    ]
  );

  /**
   * Update fetched products with any existing data from Redux
   * Ensures selected quantities and other user selections are preserved
   */
  const processItemsWithRedux = () => {
    // Get the CURRENT Redux state rather than using the closure value
    const currentReduxState = store.getState().commonVoucherSlice;
    const itemsFromRedux = currentReduxState?.items || [];
    const productsFromRedux = currentReduxState?.products || [];
    if (itemsFromRedux?.length > 0) {
      const reduxItemIds = itemsFromRedux.map((item) => item?._id);
      const processedItems = productsFromRedux.map((product) => {
        // Skip items not in Redux (not selected by user)
        if (!reduxItemIds.includes(product._id)) {
          return product;
        }

        const reduxItem = itemsFromRedux.find(
          (item) => item._id === product._id
        );

        // Different handling based on whether item has batches/godowns
        if (reduxItem.hasGodownOrBatch) {
          return updateItemWithBatchOrGodown(reduxItem, product);
        } else {
          return updateSimpleItem(reduxItem, product);
        }
      });

      setItems(processedItems);
    }
  };

  /**
   * Update an item with batch or godown data from Redux
   * Preserves user selections while updating stock balances
   */
  const updateItemWithBatchOrGodown = (reduxItem, product) => {
    const updatedGodownList = reduxItem?.GodownList?.map((godown) => {
      let matchedGodown;

      // Find matching godown/batch based on different identifiers
      if (reduxItem?.batchEnabled && !reduxItem?.gdnEnabled) {
        matchedGodown = product?.GodownList?.find(
          (g) => g?.batch === godown?.batch
        );
      } else if (!reduxItem?.batchEnabled && reduxItem?.gdnEnabled) {
        matchedGodown = product?.GodownList?.find(
          (g) => g?.godownMongoDbId === godown?.godownMongoDbId
        );
      } else if (reduxItem?.batchEnabled && reduxItem?.gdnEnabled) {
        matchedGodown = product?.GodownList?.find(
          (g) =>
            g?.godownMongoDbId === godown?.godownMongoDbId &&
            g?.batch === godown?.batch
        );
      }

      // Update balance stock if match found
      if (matchedGodown) {
        return { ...godown, balance_stock: matchedGodown.balance_stock };
      }

      return godown;
    });

    return { ...reduxItem, GodownList: updatedGodownList };
  };

  /**
   * Update a simple item without batch/godown complexity
   * Only updates the stock balance
   */
  const updateSimpleItem = (reduxItem, product) => {
    const matchedGodown = product?.GodownList?.[0];
    const newBalanceStock = matchedGodown?.balance_stock;

    const updatedGodownList = reduxItem.GodownList.map((godown) => ({
      ...godown,
      balance_stock: newBalanceStock,
    }));

    return { ...reduxItem, GodownList: updatedGodownList };
  };

  // ===================================
  // Effects & Lifecycle Methods
  // ===================================

  // Sync page number with Redux on initial load
  useEffect(() => {
    if (pageNumberFromRedux > 0) {
      setPage(pageNumberFromRedux);
    }
  }, [pageNumberFromRedux]);
  /**
   * Fetch price levels from API or Redux
   * Price levels must be loaded before products can be fetched
   */
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoader(true);

        // Use price levels from Redux if available
        if (priceLevelsFromRedux !== null) {
          setPriceLevels(priceLevelsFromRedux);
          setPricesLoaded(true);
          setLoader(false);
          return;
        }

        // Select API endpoint based on organization type
        const endpoint = `/api/sUsers/fetchFilters/${cmp_id}`;

        const res = await api.get(endpoint, { withCredentials: true });

        const { priceLevels } = res?.data?.data || [];

        // Update state and Redux
        setPriceLevels(priceLevels);
        dispatch(addAllPriceLevels(priceLevels));

        // Set default price level
        let defaultPriceLevel;

        // purchase does not need the price level ,it is manually typed

        if (
          voucherTypeFromRedux === "purchase" ||
          voucherTypeFromRedux === "debitNote" ||
          voucherTypeFromRedux === "stockTransfer"
        ) {
          defaultPriceLevel = {
            _id: null,
            name: null,
          };
        } else {
          defaultPriceLevel = priceLevels[0];
        }

        if (selectedPriceLevelFromRedux === "") {
          dispatch(setPriceLevel(defaultPriceLevel));
        }

        setPricesLoaded(true);
        setLoader(false);
      } catch (error) {
        console.error("Error fetching filters:", error);
        setLoader(false);
      }
    };

    fetchFilters();
  }, [cmp_id, type, dispatch, priceLevelsFromRedux]);

  // Handle search term changes by resetting pagination
  useEffect(() => {
    /// no need to fetch if isScan is on
    if (pricesLoaded && !isScanOnFromRedux) {
      fetchProducts(1, "");
    }
  }, [pricesLoaded]);

  /**
   * Apply selected price level rates to all products
   * Updates displayed prices when price level changes
   */
  const addSelectedRate = (pricelevel) => {
    if (!items || items?.length === 0) return;

    const updatedItems = items.map((item) => {
      const newPriceRate =
        item?.Priceleveles?.find(
          (priceLevelItem) => priceLevelItem?._id === pricelevel?._id
        )?.pricerate || 0;

      // Clone the item deeply
      const itemToUpdate = { ...item, GodownList: [...item.GodownList] };

      // Update all godowns with new price rate
      itemToUpdate.GodownList = itemToUpdate.GodownList.map((godown) => ({
        ...godown,
        selectedPriceRate: newPriceRate,
      }));

      // If the item is added, also calculate totals
      if (item.added === true) {
        const totalData = calculateTotal(
          itemToUpdate,
          pricelevel,
          "priceLevelChange"
        );

        itemToUpdate.GodownList = itemToUpdate.GodownList.map((godown, idx) => {
          const matching = totalData.individualTotals.find(
            (el) => el.index === idx
          );

          if (!matching) {
            return {
              ...godown,
              individualTotal: 0,
            };
          }

          // eslint-disable-next-line no-unused-vars
          const { index: _, quantity: __, ...rest } = matching;

          return {
            ...godown,
            ...rest,
          };
        });

        itemToUpdate.total = totalData?.total || 0;
        itemToUpdate.totalCgstAmt = totalData?.totalCgstAmt || 0;
        itemToUpdate.totalSgstAmt = totalData?.totalSgstAmt || 0;
        itemToUpdate.totalIgstAmt = totalData?.totalIgstAmt || 0;
        itemToUpdate.totalCessAmt = totalData?.totalCessAmt || 0;
        itemToUpdate.totalAddlCessAmt = totalData?.totalAdditionalCessAmt || 0;
        dispatch(updateItem({ item: itemToUpdate }));
      }

      return itemToUpdate;
    });

    setItems(updatedItems);
  };
  // Update items when price level changes
  useEffect(() => {
    if (pricesLoaded) {
      addSelectedRate(selectedPriceLevelFromRedux);
    }
  }, [selectedPriceLevelFromRedux, refresh, pricesLoaded]);

  ("");

  // ===================================
  // Barcode Management
  // ===================================

  //// we are defining handle increment (which can be jst call it in child) in parent because we need to call it in parent for barcode scanning
  const handleIncrement = (_id, godownIndex = 0, moveToTop = false) => {
    const updatedItems = items.map((item) => {
      if (item._id !== _id) return item; // Skip if not the target item

      // Create a deep copy of the item
      const currentItem = structuredClone(item);
      // Handle godown/batch specific increment
      if (godownIndex !== null) {
        const godownOrBatch = { ...currentItem.GodownList[godownIndex] };

        // Increment count with Decimal.js for precision
        godownOrBatch.count = new Decimal(godownOrBatch.count)
          .add(1)
          .toNumber();
        godownOrBatch.actualCount = godownOrBatch.count;

        if (
          godownOrBatch?.count > godownOrBatch?.balance_stock &&
          voucherTypeFromRedux === "vanSale" &&
          enableNegativeStockBlockForVanInvoice
        ) {
          return currentItem; // Skip if balance stock is 0
        }

        // Update the specific godown/batch in the GodownList
        const updatedGodownList = currentItem.GodownList.map((godown, index) =>
          index === godownIndex ? godownOrBatch : godown
        );
        currentItem.GodownList = updatedGodownList;

        // Calculate the sum of all counts in the GodownList
        const sumOfCounts = updatedGodownList.reduce(
          (sum, godown) => sum + (godown.count || 0),
          0
        );
        const sumOfActualCounts = updatedGodownList.reduce(
          (sum, godown) => sum + (godown.actualCount || 0),
          0
        );

        // Update the item's overall counts
        currentItem.totalCount = sumOfCounts;
        currentItem.totalActualCount = sumOfActualCounts;

        // Calculate totals and update individual batch totals
        const totalData = calculateTotal(
          currentItem,
          selectedPriceLevelFromRedux
        );

        const updatedGodownListWithTotals = updatedGodownList.map(
          (godown, index) => {
            const matching = totalData.individualTotals.find(
              ({ index: i }) => i === index
            );

            if (!matching) {
              return {
                ...godown,
                individualTotal: 0,
              };
            }

            // eslint-disable-next-line no-unused-vars
            const { index: _, quantity: __, ...rest } = matching;

            return {
              ...godown,
              ...rest,
            };
          }
        );

        currentItem.GodownList = updatedGodownListWithTotals;
        currentItem.total = totalData?.total || 0;
        currentItem.totalCgstAmt = totalData?.totalCgstAmt || 0;
        currentItem.totalSgstAmt = totalData?.totalSgstAmt || 0;
        currentItem.totalIgstAmt = totalData?.totalIgstAmt || 0;
        currentItem.totalCessAmt = totalData?.totalCessAmt || 0;
        currentItem.totalAddlCessAmt = totalData?.totalAdditionalCessAmt || 0;
      } else {
        return currentItem; // If no godownIndex is provided, return the item as is
      }

      // Dispatch the updated item to Redux
      dispatch(updateItem({ item: currentItem, moveToTop }));
      return currentItem;
    });

    // Handle moving the updated item to the top of the list if requested
    if (moveToTop) {
      const updatedItemIndex = updatedItems.findIndex((el) => el._id === _id);
      if (updatedItemIndex !== -1) {
        const [updatedItem] = updatedItems.splice(updatedItemIndex, 1);
        setItems([updatedItem, ...updatedItems]); // Move to top
      } else {
        setItems(updatedItems);
      }
    } else {
      setItems(updatedItems);
    }
  };

  /// handling button click for toggling between scanning and not scanning

  const handleBarcodeButtonClick = () => {
    if (!isScanOn) {
      setIsScanOn(true);
      dispatch(updateIsScanOn(true));
      dispatch(
        addAllProducts({
          page: 1,
          hasMore: true,
          products: [],
        })
      );
      setItems(itemsFromRedux);
    } else {
      dispatch(updateIsScanOn(false));
      setIsScanOn(false);
      fetchProducts(1, "");
    }
  };

  //// Handling barcode scanned products

  const handleBarcodeScanProducts = (searchResult) => {
    if (searchResult?.length === 0) {
      return;
    }

    let scannedItem = structuredClone(searchResult[0]);

    // Finding price rate
    const priceRate =
      scannedItem?.Priceleveles?.find(
        (priceLevelItem) =>
          priceLevelItem?._id === selectedPriceLevelFromRedux?._id
      )?.pricerate || 0;

    if (scannedItem?.hasGodownOrBatch) {
      scannedItem.isExpanded = true;
      scannedItem?.GodownList.forEach(
        (godown) => (godown.selectedPriceRate = priceRate)
      );

      // Check if the item already exists
      let isItemExistIndex = items?.findIndex(
        (el) => el._id === scannedItem._id
      );

      /// if exists
      if (isItemExistIndex !== -1) {
        // Move the existing item to the top
        const [existingItem] = items.splice(isItemExistIndex, 1);

        // Create a new object with updated properties
        const updatedItem = { ...existingItem, isExpanded: true };
        setItems([updatedItem, ...items]);
        listRef.current.resetAfterIndex(0);
      } else {
        // Add the scanned item to the top if it doesn't exist
        setItems((prevResults) => [scannedItem, ...prevResults]);
      }
    } else {
      // Check if the item already exists
      let isItemExistIndex = items?.findIndex(
        (el) => el._id === scannedItem._id
      );

      if (isItemExistIndex !== -1) {
        // Increment the count and move to the top
        handleIncrement(scannedItem._id, 0, true);
      } else {
        // Add the new item

        const currentBatchOrGodown = { ...scannedItem.GodownList[0] };
        const balance_stock = currentBatchOrGodown?.balance_stock || 0;

        // Check if the  has no stock for van sale
        if (
          balance_stock <= 0 &&
          enableNegativeStockBlockForVanInvoice &&
          voucherTypeFromRedux === "vanSale"
        ) {
          return scannedItem;
        }

        // Toggle the added state or set to true if undefined
        currentBatchOrGodown.added = currentBatchOrGodown.added
          ? !currentBatchOrGodown.added
          : true;

        // Initialize count values
        currentBatchOrGodown.count = 1;
        currentBatchOrGodown.actualCount = 1;

        /// find the price rate and set it in the godown
        const priceRate =
          scannedItem?.Priceleveles?.find(
            (priceLevelItem) =>
              priceLevelItem?._id === selectedPriceLevelFromRedux?._id
          )?.pricerate || 0;
        currentBatchOrGodown.selectedPriceRate = priceRate;

        // Update the GodownList with the modified batch/godown
        scannedItem.GodownList[0] = currentBatchOrGodown;

        // Update the overall item count
        const totalOfCounts = scannedItem.GodownList.reduce(
          (sum, godown) => sum + (godown.count || 0),
          0
        );
        scannedItem.totalCount = totalOfCounts;
        scannedItem.totalActualCount = totalOfCounts;

        // Calculate totals for the item
        const totalData = calculateTotal(
          scannedItem,
          selectedPriceLevelFromRedux,
          "priceLevelChange"
        );

        // Update individual totals for each godown/batch
        const updatedGodownListWithTotals = scannedItem.GodownList.map(
          (godown, index) => {
            const matching = totalData.individualTotals.find(
              ({ index: i }) => i === index
            );
            if (!matching) return godown;

            // Destructure to exclude `index` and spread the rest
            // eslint-disable-next-line no-unused-vars
            const { index: _, quantity: __, ...rest } = matching;

            return {
              ...godown,
              ...rest,
            };
          }
        );

        scannedItem.GodownList = updatedGodownListWithTotals;
        // Update item total and added state
        scannedItem.total = totalData?.total || 0;
        scannedItem.totalCgstAmt = totalData?.totalCgstAmt || 0;
        scannedItem.totalSgstAmt = totalData?.totalSgstAmt || 0;
        scannedItem.totalIgstAmt = totalData?.totalIgstAmt || 0;
        scannedItem.totalCessAmt = totalData?.totalCessAmt || 0;
        scannedItem.totalAddlCessAmt = totalData?.totalAdditionalCessAmt || 0;
        scannedItem.added = true;

        // Dispatch to Redux store
        dispatch(addItem({ payload: scannedItem, moveToTop: true }));
        setItems((prevResults) => [scannedItem, ...prevResults]);

        // scannedItem.added = true;
        // scannedItem.GodownList[0].selectedPriceRate = Number(priceRate);
        // scannedItem.GodownList[0].individualTotal = Number(priceRate);
        // scannedItem.count = 1;
        // scannedItem.total = Number(priceRate);
        // setItems((prevResults) => [scannedItem, ...prevResults]);
        // dispatch(addItem({ payload: scannedItem, moveToTop: true }));
      }
    }
  };

  //// handle scan property on the page load

  useEffect(() => {
    if (isScanOnFromRedux) {
      // handleBarcodeButtonClick();
      setIsScanOn(true);
      dispatch(updateIsScanOn(true));
      dispatch(
        addAllProducts({
          page: 1,
          hasMore: true,
          products: [],
        })
      );

      setItems(itemsFromRedux);
    }
  }, [isScanOnFromRedux]);

  // ===================================
  // Render Component
  // ===================================

  return (
    <div className="h-screen overflow-y-auto">
      <TitleDiv
        title={"Add Item"}
        from="/sUsers/sales"
        rightSideContentOnClick={() => {
          handleBarcodeButtonClick();
        }}
        rightSideContent={<MdOutlineQrCodeScanner size={20} />}
      />
      {/* <SearchBar onType={searchData} /> */}
      {isScanOn ? (
        <div className="relative z-50">
          {" "}
          {/* Added z-index */}
          <BarcodeScan handleBarcodeScanProducts={handleBarcodeScanProducts} />
        </div>
      ) : (
        <SearchBar onType={searchData} />
      )}
      <Filter addAllProducts={addAllProducts} priceLevels={priceLevels} />

      {loader && <CustomBarLoader />}

      <VoucherProductLIst
        items={items}
        loader={loader}
        setItems={setItems}
        selectedPriceLevel={selectedPriceLevelFromRedux}
        hasMore={hasMore}
        isLoading={isLoading}
        page={page}
        fetchProducts={fetchProducts}
        searchTerm={searchTerm}
        setRefresh={setRefresh}
        calculateTotal={calculateTotal}
        handleIncrement={handleIncrement}
        isScanOn={isScanOn}
        listRef={listRef}
      />

      {items?.length > 0 && !loader && (
        <div className=" sticky bottom-0 bg-white  w-full flex justify-center p-3 border-t h-[70px] z-50 ">
          <button
            onClick={() => navigate(-1)}
            className="bg-violet-700  w-full  text-ld font-bold text-white p-2 rounded-sm "
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

export default VoucherAddCount;
