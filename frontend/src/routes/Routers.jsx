import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
const ProformaInvoicePage = lazy(() => import("../pages/voucher/voucherCreation/ProformaInvoicePage"));
const ProtectedSecRoute = lazy(() => import("./ProtectedSecRoute"));
import SuspenseLoader from "@/components/common/SuspenseLoader";
import { ErrorTestComponent } from "@/components/errorBoundaries/ErrorTestComponent";
import OutstandingListOfAccVoucherEdit from "@/pages/accountingVoucher/voucherCreation/OutstandingListOfAccVoucherEdit";
import MenuRightsSettingsPage from "@/pages/secUsers/settilngs/MenuRightsSettingsPage";

// Lazy load all components
const SecHome = lazy(() => import("../pages/secUsers/SecHome"));
const Outstanding = lazy(
  () => import("../pages/voucherReports/outstanding/Outstanding"),
);
const TouristReport = lazy(() => import("../pages/Hotel/Pages/TouristReport "));
const FoodPlanReportPage = lazy(
  () => import("../pages/Hotel/Pages/FoodPlanReportPage "),
);
const OccupancyCheckoutReport = lazy(
  () => import("../pages/Hotel/Pages/OccupancyCheckoutReport"),
);
const FOSalesSummaryReport = lazy(
  () => import("../pages/Hotel/Pages/FoSalesSummary"),
);

const OutstandingDetails = lazy(
  () => import("../pages/voucherReports/outstanding/OutstandingDetails"),
);
const PaymentSec = lazy(() => import("../pages/secUsers/Payment"));
const Transaction = lazy(
  () => import("../pages/voucherReports/DayBook/Transaction"),
);
const EditOrg = lazy(() => import("../pages/masters/organization/EditOrg"));
const DashboardSec = lazy(
  () => import("../pages/secUsers/dashboard/Dashboard"),
);
const Hsn = lazy(() => import("../pages/masters/hsn/Hsn"));
const Demo = lazy(() => import("../pages/secUsers/Demo"));
const RetailersList = lazy(
  () => import("../pages/masters/secondaryUsers/RetailersList"),
);
const HsnList = lazy(() => import("../pages/masters/hsn/HsnList"));
const EditHsn = lazy(() => import("../pages/masters/hsn/EditHsn"));
const PartyListSecondary = lazy(
  () => import("../pages/masters/party/PartyListSecondary"),
);
const AddPartySecondary = lazy(
  () => import("../pages/masters/party/AddPartySecondary"),
);
const ProductListSecondary = lazy(
  () => import("../pages/masters/product/ProductListSecondary"),
);
const EditPartySecondary = lazy(
  () => import("../pages/masters/party/EditPartySecondary"),
);
const AddProductSecondary = lazy(
  () => import("../pages/masters/product/AddProductSecondary"),
);
const EditProductSecondary = lazy(
  () => import("../pages/masters/product/EditProductSecondary"),
);
const EditSecUsers = lazy(
  () => import("../pages/masters/secondaryUsers/EditSecUsers"),
);
const AddChargesListSecondary = lazy(
  () =>
    import("../pages/secUsers/settilngs/serviceLedger/AddChargesListSecondary"),
);
const AdditionalChargesSecondary = lazy(
  () =>
    import("../pages/secUsers/settilngs/serviceLedger/AdditionalChargesSecondary"),
);
const OrderConfigurationsSecondary = lazy(
  () => import("../pages/secUsers/OrderConfigurationsSecondary"),
);
const SearchParty = lazy(() => import("../pages/secUsers/SearchParty"));

// Error Pages
const ErrorPage = lazy(() => import("../pages/errorPages/Notfound"));
const Notfound = lazy(() => import("../pages/errorPages/Notfound"));
const ServerError = lazy(() => import("../pages/errorPages/ServerError"));

// Product Sub Details
const AddBrand = lazy(
  () => import("../pages/masters/product/productSubDetails/AddBrand"),
);
const AddCategory = lazy(
  () => import("../pages/masters/product/productSubDetails/AddCategory"),
);
const AddRestuarentCategory = lazy(
  () =>
    import("@/pages/masters/product/productSubDetails/AddRestuarentCategory"),
);
const ComplementaryCashOrBank = lazy(
  () =>
    import("../pages/masters/product/productSubDetails/ComplementaryCashOrBank"),
);
const AddSubCategory = lazy(
  () => import("../pages/masters/product/productSubDetails/AddSubCategory"),
);
const AddGodown = lazy(
  () => import("../pages/masters/product/productSubDetails/AddGodown"),
);
const AddPriceLevel = lazy(
  () => import("../pages/masters/product/productSubDetails/AddPriceLevel"),
);
const SearchGodown = lazy(() => import("../pages/secUsers/SearchGodown"));
const AddbatchInPurchase = lazy(
  () => import("../pages/secUsers/AddbatchInPurchase"),
);
const ReceiptPrintOut = lazy(() => import("../pages/secUsers/ReceiptPrintOut"));
const SelectVouchers = lazy(() => import("../pages/secUsers/SelectVouchers"));
const PaymentPrintOut = lazy(() => import("../pages/secUsers/PaymentPrintOut"));
// const OutstandingListOfReceiptForEdit = lazy(() => import('../pages/secUsers/OutstandingListOfReceiptForEdit'))
const OutstandingListOfPaymentForEdit = lazy(
  () => import("../pages/secUsers/OutstandingListOfPaymentForEdit"),
);

// Reports
const Reports = lazy(() => import("../pages/secUsers/Reports"));
const PartyStatement = lazy(
  () => import("../pages/voucherReports/PartyStatement/PartyStatement"),
);
const DateRange = lazy(() => import("../components/Filters/DateRange"));
const VouchersList = lazy(
  () => import("../components/common/Reports/VouchersList"),
);
const SalesSummary = lazy(
  () => import("../pages/secUsers/Reports/salesSummary/SalesSummary"),
);
const SummaryReport = lazy(
  () => import("@/pages/secUsers/Reports/SummaryReport"),
);
const SaleRegisterPage = lazy(
  () => import("@/pages/secUsers/Reports/SaleRegisterPage"),
);
const PartyFilterList = lazy(
  () => import("../components/Filters/party/PartyFilterList"),
);
const StatusFilterList = lazy(
  () => import("../components/Filters/status/StatusFilterList"),
);
const OrderSummary = lazy(
  () => import("../pages/secUsers/Reports/orderSummary/OrderSummary"),
);

const Categoryreportres = lazy(
  () => import("../pages/secUsers/Reports/Categoryreportres"),
);

const Itemwisereport = lazy(
  () => import("../pages/secUsers/Reports/Itemwisereport"),
);
// Cash/Bank Management
const BalancePage = lazy(
  () => import("../pages/masters/cashOrBank/BalancePage"),
);
const BalanceDetails = lazy(
  () => import("../pages/masters/cashOrBank/BalanceDetails"),
);
const SourceList = lazy(() => import("../pages/secUsers/SourceList"));
const SourceTransactions = lazy(
  () => import("../pages/masters/cashOrBank/SourceTransactions"),
);
const AddCash = lazy(() => import("../pages/masters/cashOrBank/AddCash"));
const BankingManagement = lazy(
  () => import("@/pages/masters/cashOrBank/BankingManagement"),
);

// Settings
const SettingsList = lazy(
  () => import("../pages/secUsers/settilngs/SettingsList"),
);


const StockItem = lazy(
  () => import("../pages/secUsers/settilngs/stockItem/StockItem"),
);
const PartySettings = lazy(
  () => import("../pages/secUsers/settilngs/PartySettings"),
);
const DateEntrySettings = lazy(
  () => import("../pages/secUsers/settilngs/DateEntrySettings"),
);
const OutstandingSettings = lazy(
  () => import("../pages/secUsers/settilngs/OutstandingSettings"),
);
const StockItemSettings = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/StockItemSettings"),
);
const VoucherSettings = lazy(
  () => import("../pages/secUsers/settilngs/dataEntry/VoucherSettings"),
);
const OrderSettings = lazy(
  () => import("../pages/secUsers/settilngs/dataEntry/OrderSettings"),
);
const InvoiceSettings = lazy(
  () => import("../pages/secUsers/settilngs/dataEntry/InvoiceSettings"),
);
const EmailSettings = lazy(
  () =>
    import("../pages/secUsers/settilngs/dataEntry/voucherSettings/EmailSettings"),
);

// Barcode
const BarcodeList = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/barcode/BarcodeList"),
);
const BarcodeCreationDetails = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/barcode/BarcodeCreationDetails"),
);
const BarcodePrintOn = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/barcode/BarcodePrintOn"),
);
const BarcodePrintOff = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/barcode/BarcodePrintOff"),
);
const BarcodeFormat = lazy(
  () =>
    import("../pages/secUsers/settilngs/stockItem/stockItemSettings/barcode/BarcodeFormat"),
);
const BarcodeScan = lazy(
  () => import("../components/secUsers/barcodeScanning/BarcodeScan"),
);

// Print Configuration
const PrintConfiguration = lazy(
  () =>
    import("../pages/secUsers/settilngs/PrintConfiguration/PrintConfiguration"),
);
const SaleOrderPrintConfiguration = lazy(
  () =>
    import("../pages/secUsers/settilngs/PrintConfiguration/SaleOrderPrintConfiguration"),
);
const SalePrintConfiguration = lazy(
  () =>
    import("../pages/secUsers/settilngs/PrintConfiguration/SalePrintConfiguration"),
);
const LetterHeadUploadPage = lazy(
  () =>
    import("@/pages/secUsers/settilngs/PrintConfiguration/LetterHeadUploadPage"),
);

// Invoice and Order Common Settings
const DespatchTitleSettings = lazy(
  () =>
    import("../pages/secUsers/settilngs/dataEntry/invoiceAndOrderCommon/DespatchTitleSettings"),
);
const TermsAndConditionSettings = lazy(
  () =>
    import("../pages/secUsers/settilngs/dataEntry/invoiceAndOrderCommon/TermsAndConditionSettings"),
);

// Orders and Sales
const PendingOrders = lazy(
  () => import("../pages/secUsers/orderPendings/PendingOrders"),
);
const SalesSummaryTable = lazy(
  () => import("../pages/secUsers/Reports/salesSummary/SalesSummaryTable"),
);
const KotRegisterPage = lazy(
  () => import("../pages/secUsers/Reports/KotRegisterPage"),
);

const OutstandingSummary = lazy(
  () => import("../pages/secUsers/OutstandingSummary"),
);
const SalesSummaryTransactions = lazy(
  () =>
    import("@/pages/secUsers/Reports/salesSummary/SalesSummaryTransactions"),
);

// Party and Organization Management
const AddSubGroup = lazy(
  () => import("../pages/secUsers/settilngs/partySettings/AddSubGroup"),
);
const AddOpening = lazy(
  () => import("@/pages/secUsers/openings/PartyOpening/AddOpening"),
);
const AddOrganisation = lazy(
  () => import("../pages/masters/organization/AddOrganisation"),
);
const OrganizationList = lazy(
  () => import("../pages/masters/organization/OrganisationList"),
);
const AddSecUsers = lazy(
  () => import("../pages/masters/secondaryUsers/AddSecUsers"),
);

// Voucher Management
const VoucherAddCount = lazy(
  () => import("@/pages/voucher/voucherCreation/VoucherAddCount"),
);
const VoucherInitialPage = lazy(
  () => import("@/pages/voucher/voucherCreation/voucherInitialPage"),
);
const VoucherDetails = lazy(
  () => import("@/pages/voucher/voucherDetails/VoucherDetails"),
);
const VoucherInitialPageEdit = lazy(
  () => import("@/pages/voucher/voucherCreation/voucherInitialPageEdit"),
);
const BillToVoucher = lazy(
  () => import("@/pages/voucher/voucherCreation/BillToVoucher"),
);
const EditItemVoucher = lazy(
  () => import("@/pages/voucher/voucherCreation/EditItemVoucher"),
);
const PaymentSplitting = lazy(
  () => import("@/pages/voucher/voucherCreation/PaymentSplitting"),
);

// Voucher PDF
const VoucherPdfInitiator = lazy(
  () => import("@/pages/voucher/voucherPdf/VoucherPdfInitiator"),
);
const VoucherPdfInitiatorThreeInch = lazy(
  () => import("@/pages/voucher/voucherPdf/VoucherPdfInitiatorThreeInch"),
);

const VoucherPdfInitiatorThreeInch2 = lazy(
  () =>
    import("@/pages/voucher/voucherPdf/threeInchPdf/VoucherThreeInchPdfFormat2"),
);

const WarrantyCard = lazy(
  () => import("@/pages/voucher/voucherPdf/warrantyCard/WarrantyCard"),
);

// Accounting Voucher
const AccVoucherInitialPage = lazy(
  () =>
    import("@/pages/accountingVoucher/voucherCreation/AccVoucherInitialPage"),
);
const OutstandingListOfAccVoucher = lazy(
  () =>
    import("@/pages/accountingVoucher/voucherCreation/OutstandingListOfAccVoucher"),
);
const AccVoucherDetails = lazy(
  () => import("@/pages/accountingVoucher/voucherDetails/AccVoucherDetails"),
);
const AccVoucherInitialPageEdit = lazy(
  () =>
    import("@/pages/accountingVoucher/voucherCreation/AccVoucherInitialPageEdit"),
);

// Stock Register
const StockRegister = lazy(
  () => import("@/pages/voucherReports/stockRegister/StockRegister"),
);
const StockRegisterDetails = lazy(
  () => import("@/pages/voucherReports/stockRegister/StockRegisterDetails"),
);

// Voucher Series Settings
const VoucherSeriesSettings = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/voucherSettings/VoucherSeriesSettings"),
);
const VoucherSeriesForm = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/voucherSettings/voucherSeries/VoucherSeriesForm"),
);
const VoucherSeriesList = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/voucherSettings/voucherSeries/VoucherSeriesList"),
);

// Hotel Management
const HotelDashboard = lazy(() => import("@/pages/Hotel/Pages/HotelDashboard"));
const AddAdditionalPax = lazy(
  () => import("@/pages/Hotel/Pages/AddAdditionalPax"),
);
const VisitOfPurpose = lazy(() => import("@/pages/Hotel/Pages/VisitOfPurpose"));
const IdProof = lazy(() => import("@/pages/Hotel/Pages/IdProof"));
const FoodPlan = lazy(() => import("@/pages/Hotel/Pages/FoodPlan"));
const RoomRegistration = lazy(
  () => import("@/pages/Hotel/Pages/RoomRegistration"),
);
const RoomList = lazy(() => import("@/pages/Hotel/Pages/RoomList"));
const EditRoom = lazy(() => import("@/pages/Hotel/Pages/EditRoom"));
const BookingPage = lazy(() => import("@/pages/Hotel/Pages/BookingPage"));
const CheckInPage = lazy(() => import("@/pages/Hotel/Pages/CheckInPage"));
const CheckOut = lazy(() => import("@/pages/Hotel/Pages/CheckOut"));
const BookingList = lazy(() => import("@/pages/Hotel/List/BookingList"));
const EditBooking = lazy(() => import("@/pages/Hotel/Pages/EditBooking"));
const EditChecking = lazy(() => import("@/pages/Hotel/Pages/EditChecking"));

// Warranty Card Settings
const WarrantyCardList = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/invoiceSettings/WarrantyCard/WarrantyCardList"),
);
const AddWarrantyCard = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/invoiceSettings/WarrantyCard/AddWarrantyCard"),
);
const EditWarrantyCard = lazy(
  () =>
    import("@/pages/secUsers/settilngs/dataEntry/invoiceSettings/WarrantyCard/EditWarrantyCard "),
);

// Retailer Configuration
const ConfigureRetailer = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/ConfigureRetailer"),
);
const AllocateCompany = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocateCompany"),
);
const AllocateTransaction = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocateTransaction"),
);
const AllocatePriceLevel = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocatePriceLevel"),
);
const AllocateGodown = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocateGodown"),
);
const AllocationSeriesList = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocationSeriesList"),
);
const AllocateVoucherSeries = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocateVoucherSeries"),
);
const AllocateSubGroup = lazy(
  () =>
    import("@/pages/masters/secondaryUsers/RetailerConfiguration/AllocateSubGroup"),
);

// Restaurant Management
const RestaurantDashboard = lazy(
  () => import("@/pages/Restuarant/Pages/RestaurantDashboard"),
);
const KotPage = lazy(() => import("@/pages/Restuarant/Pages/KotPage"));
const RestuarentSettings = lazy(
  () =>
    import("@/pages/secUsers/settilngs/stockItem/stockItemSettings/RestuarentSettings"),
);
const AddSubRestuarentCategory = lazy(
  () =>
    import("@/pages/masters/product/productSubDetails/AddsubRestuarentCategory"),
);

const EditCheckOut = lazy(() => import("@/pages/Hotel/Pages/EditCheckOut"));
const ItemList = lazy(() => import("@/pages/Restuarant/Pages/ItemList"));
const EditItem = lazy(() => import("@/pages/Restuarant/Pages/EditItem"));
const ItemRegistration = lazy(
  () => import("@/pages/Restuarant/Pages/ItemRegistration"),
);
const TableMaster = lazy(
  () => import("@/pages/Restuarant/Masters/TableMaster"),
);
const TableSelection = lazy(
  () => import("@/pages/Restuarant/Pages/TableSelection"),
);
const CheckOutPrint = lazy(() => import("@/pages/Hotel/Pages/CheckOutPrint"));
const BillPrint = lazy(() => import("@/pages/Hotel/Pages/BillPrint"));
const HotelFlashReport = lazy(
  () => import("@/pages/Hotel/Pages/HotelFlashReport"),
);
const SummaryDashboard = lazy(
  () => import("@/pages/Hotel/Pages/SummaryDashboard")
)
const BillSummary = lazy(() => import("@/pages/Hotel/Pages/BillSummary"))
const CancellationReport=lazy(()=>import("@/pages/Hotel/Pages/CancellationReport"))
const LoginReport = lazy(() => import("@/pages/Hotel/Pages/LoginReport"))
const Receiptreport = lazy(() => import("@/pages/Hotel/Pages/Receiptreport"))
const TravelAgentReport = lazy(() => import("@/pages/Hotel/Pages/TravelAgentReport"))
const CheckInPrint = lazy(() => import("@/pages/Hotel/Pages/CheckInPrint"))
const ViewReport = lazy(() => import("@/pages/Hotel/Pages/viewReport"))
const Checkoutpdf = lazy(() => import("@/pages/Hotel/Pages/Checkoutpdf"))
const ReceiptInvoicepage = lazy(
  () => import("@/pages/Hotel/Pages/ReceiptInvoicepage"),
);

const KotPrinterSetting = lazy(
  () => import("@/pages/secUsers/settilngs/KotPrinterSetting"),
)
const Routers = () => {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        <Route path="*" element={<Notfound />}></Route>
        <Route
          path="/sUsers/home"
          element={
            <ProtectedSecRoute>
              <SecHome />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/outstandingDetails/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/payment"
          element={
            <ProtectedSecRoute>
              <PaymentSec />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/transaction"
          element={
            <ProtectedSecRoute>
              <Transaction />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/recietpprint/:id"
          element={
            <ProtectedSecRoute>
              <ReceiptInvoicepage />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* <Route path='/sUsers/receiptDetails/:id' element={<ProtectedSecRoute><SecReceptionDetails/></ProtectedSecRoute>}></Route> */}
        <Route
          path="/sUsers/dashboard"
          element={
            <ProtectedSecRoute>
              <DashboardSec />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/hotelDashBoard"
          element={
            <ProtectedSecRoute>
              <HotelDashboard />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/RestaurantDashboard"
          element={
            <ProtectedSecRoute>
              <RestaurantDashboard />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/invoice"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartysaleOrder"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/partyList"
          element={
            <ProtectedSecRoute>
              <PartyListSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addParty"
          element={
            <ProtectedSecRoute>
              <AddPartySecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/productList"
          element={
            <ProtectedSecRoute>
              <ProductListSecondary />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/editParty/:id"
          element={
            <ProtectedSecRoute>
              <EditPartySecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addProduct"
          element={
            <ProtectedSecRoute>
              <AddProductSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editProduct/:id"
          element={
            <ProtectedSecRoute>
              <EditProductSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/saleOrderDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editSaleOrder/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareSaleOrder/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/sharesaleOrderThreeInch/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiatorThreeInch />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/additionalChargesList"
          element={
            <ProtectedSecRoute>
              <AddChargesListSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/additionalCharges"
          element={
            <ProtectedSecRoute>
              <AdditionalChargesSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editAdditionalCharge/:id"
          element={
            <ProtectedSecRoute>
              <AdditionalChargesSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/OrderConfigurations"
          element={
            <ProtectedSecRoute>
              <OrderConfigurationsSecondary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/Inventory"
          element={
            <ProtectedSecRoute>
              <StockRegister />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/InventoryDetails"
          element={
            <ProtectedSecRoute>
              <StockRegisterDetails />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route path="/sUsers/performaInvoice" element={<ProtectedSecRoute><ProformaInvoicePage /></ProtectedSecRoute>} />
        <Route path="/sUsers/searchPartyperformaInvoice" element={<ProtectedSecRoute><SearchParty /></ProtectedSecRoute>} />
        <Route path="/sUsers/performaInvoiceDetails/:id" element={<ProtectedSecRoute><VoucherDetails /></ProtectedSecRoute>} />
        <Route path="/sUsers/editperformaInvoice/:id" element={<ProtectedSecRoute><ProformaInvoicePage /></ProtectedSecRoute>} />
        <Route path="/sUsers/shareperformaInvoice/:id" element={<ProtectedSecRoute><VoucherPdfInitiator /></ProtectedSecRoute>} />
        <Route path="/sUsers/shareperformaInvoiceThreeInch/:id" element={<ProtectedSecRoute><VoucherPdfInitiatorThreeInch /></ProtectedSecRoute>} />
        <Route
          path="/sUsers/sales"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartySales"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyvanSale"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addItemSales"
          element={
            <ProtectedSecRoute>
              <VoucherAddCount />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editItemVoucher/:id/:index"
          element={
            <ProtectedSecRoute>
              <EditItemVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/salesDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/vanSaleDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareSales/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareVanSale/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareSalesThreeInch/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiatorThreeInch />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareSalesThreeInch2/:isFinalized"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiatorThreeInch2 />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareVanSaleThreeInch/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiatorThreeInch />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareSalesWarrantyCard/:id"
          element={
            <ProtectedSecRoute>
              <WarrantyCard />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/sales/paymentSplitting"
          element={
            <ProtectedSecRoute>
              <PaymentSplitting />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* <Route path='/sUsers/editSale/:id/paymentSplitting' element={<ProtectedSecRoute><PaymentSplitting/></ProtectedSecRoute>}></Route>  */}

        {/* purchase */}
        <Route
          path="/sUsers/purchase"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyPurchase"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/billToPurchase/:id"
          element={
            <ProtectedSecRoute>
              <BillToVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/purchaseDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/sharePurchase/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addBatchPurchase/:id"
          element={
            <ProtectedSecRoute>
              <AddbatchInPurchase />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editPurchase/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/editsales/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editVanSale/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/billToSales/:id"
          element={
            <ProtectedSecRoute>
              <BillToVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/billToSalesOrder/:id"
          element={
            <ProtectedSecRoute>
              <BillToVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/vanSale"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/stockTransfer"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchGodown"
          element={
            <ProtectedSecRoute>
              <SearchGodown />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/StockTransferDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editStockTransfer/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/selectVouchers"
          element={
            <ProtectedSecRoute>
              <SelectVouchers />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* receipt */}
        <Route
          path="/sUsers/receipt"
          element={
            <ProtectedSecRoute>
              <AccVoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyReceipt"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/receipt/addAmount/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingListOfAccVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/receipt/sourceList/:source"
          element={
            <ProtectedSecRoute>
              <SourceList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/receipt/details/:id"
          element={
            <ProtectedSecRoute>
              <AccVoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/receiptPrintOut"
          element={
            <ProtectedSecRoute>
              <ReceiptPrintOut />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editReceipt/:id"
          element={
            <ProtectedSecRoute>
              <AccVoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/receipt/editAmount/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingListOfAccVoucherEdit />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* payment */}
        <Route
          path="/sUsers/paymentPurchase"
          element={
            <ProtectedSecRoute>
              <AccVoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyPayment"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/payment/addAmount/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingListOfAccVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/payment/editAmount/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingListOfAccVoucherEdit />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/payment/sourceList/:source"
          element={
            <ProtectedSecRoute>
              <SourceList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/payment/details/:id"
          element={
            <ProtectedSecRoute>
              <AccVoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/paymentPrintOut"
          element={
            <ProtectedSecRoute>
              <PaymentPrintOut />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editPayment/:id"
          element={
            <ProtectedSecRoute>
              <AccVoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/payment/edit/addAmount/:party_id"
          element={
            <ProtectedSecRoute>
              <OutstandingListOfPaymentForEdit />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* bank payment */}
        {/* creditNote */}
        <Route
          path="/sUsers/creditNote"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyCreditNote"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/billToCreditNote/:id"
          element={
            <ProtectedSecRoute>
              <BillToVoucher />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/creditNoteDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editCreditNote/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareCreditNote/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* debitNote */}
        <Route
          path="/sUsers/debitNote"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/searchPartyDebitNote"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/billToDebitNote/:id"
          element={
            <ProtectedSecRoute>
              <BillToVoucher />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/debitNoteDetails/:id"
          element={
            <ProtectedSecRoute>
              <VoucherDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editDebitNote/:id"
          element={
            <ProtectedSecRoute>
              <VoucherInitialPageEdit />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/shareDebitNote/:id"
          element={
            <ProtectedSecRoute>
              <VoucherPdfInitiator />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* inventory secondary */}
        {/* we are using the same page of primary to avoid page repetition */}
        <Route
          path="/sUsers/brand"
          element={
            <ProtectedSecRoute>
              <AddBrand />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/category"
          element={
            <ProtectedSecRoute>
              <AddCategory />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/AddRestuarentCategory"
          element={
            <ProtectedSecRoute>
              <AddRestuarentCategory />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/complementaryCashOrBank"
          element={
            <ProtectedSecRoute>
              <ComplementaryCashOrBank />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/subcategory"
          element={
            <ProtectedSecRoute>
              <AddSubCategory />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/godown"
          element={
            <ProtectedSecRoute>
              <AddGodown />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/pricelevel"
          element={
            <ProtectedSecRoute>
              <AddPriceLevel />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/AddSubRestuarentCategory"
          element={
            <ProtectedSecRoute>
              <AddSubRestuarentCategory />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* hsn */}
        {/* we are using the same page of primary to avoid page repetition */}
        <Route
          path="/sUsers/hsnList"
          element={
            <ProtectedSecRoute>
              <HsnList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/hsn"
          element={
            <ProtectedSecRoute>
              <Hsn />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editHsn/:id"
          element={
            <ProtectedSecRoute>
              <EditHsn />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* report */}
        <Route
          path="/sUsers/reports"
          element={
            <ProtectedSecRoute>
              <Reports />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* party statement  */}

        {/* we are using the same page of party list of sales to avoid page repetition */}
        <Route
          path="/sUsers/partyStatement/partyList"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/partyStatement"
          element={
            <ProtectedSecRoute>
              <PartyStatement />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* sales summary */}
        <Route
          path="/sUsers/salesSummary"
          element={
            <ProtectedSecRoute>
              <SalesSummary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/summaryReport"
          element={
            <ProtectedSecRoute>
              <SummaryReport />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/salesSummaryDetails"
          element={
            <ProtectedSecRoute>
              <SalesSummaryTable />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/salesSummaryTransactions"
          element={
            <ProtectedSecRoute>
              <SalesSummaryTransactions />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* order summary */}
        <Route
          path="/sUsers/orderSummary"
          element={
            <ProtectedSecRoute>
              <OrderSummary />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* cash or bank */}
        <Route
          path="/sUsers/balancePage"
          element={
            <ProtectedSecRoute>
              <BalancePage />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/balanceDetails/:accGroup"
          element={
            <ProtectedSecRoute>
              <BalanceDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/sourceTransactions/:id/:accGroup"
          element={
            <ProtectedSecRoute>
              <SourceTransactions />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addBank"
          element={
            <ProtectedSecRoute>
              <BankingManagement />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addBankOD"
          element={
            <ProtectedSecRoute>
              <BankingManagement />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editBankOD/:id"
          element={
            <ProtectedSecRoute>
              <BankingManagement />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editBank/:id"
          element={
            <ProtectedSecRoute>
              <BankingManagement />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addBankOD"
          element={
            <ProtectedSecRoute>
              <BankingManagement />
            </ProtectedSecRoute>
          }
        ></Route>

        <Route
          path="/sUsers/addCash"
          element={
            <ProtectedSecRoute>
              <AddCash />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editCash/:id"
          element={
            <ProtectedSecRoute>
              <AddCash />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* filters */}
        <Route
          path="/sUsers/dateRange"
          element={
            <ProtectedSecRoute>
              <DateRange />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/vouchersLIst"
          element={
            <ProtectedSecRoute>
              <VouchersList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/partyFilterList"
          element={
            <ProtectedSecRoute>
              <PartyFilterList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/statusFilterList"
          element={
            <ProtectedSecRoute>
              <StatusFilterList />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* barcode scanning */}
        <Route
          path="/sUsers/sales/scanProduct"
          element={
            <ProtectedSecRoute>
              <BarcodeScan />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* settings */}
        <Route
          path="/sUsers/settings"
          element={
            <ProtectedSecRoute>
              <SettingsList />
            </ProtectedSecRoute>
          }
        ></Route>
 <Route
          path="/sUsers/MenuRightsSettingsPage"
          element={
            <ProtectedSecRoute>
              <MenuRightsSettingsPage />
            </ProtectedSecRoute>
          }
        ></Route>
     
        <Route
          path="/sUsers/StockItem"
          element={
            <ProtectedSecRoute>
              <StockItem />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/partySettings"
          element={
            <ProtectedSecRoute>
              <PartySettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/dataEntrySettings"
          element={
            <ProtectedSecRoute>
              <DateEntrySettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/OutstandingSettings"
          element={
            <ProtectedSecRoute>
              <OutstandingSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* stock item settings */}
        <Route
          path="/sUsers/restuarentSettings"
          element={
            <ProtectedSecRoute>
              <RestuarentSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/StockItemSettings"
          element={
            <ProtectedSecRoute>
              <StockItemSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/barcodeList"
          element={
            <ProtectedSecRoute>
              <BarcodeList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/barcodeCreationDetails"
          element={
            <ProtectedSecRoute>
              <BarcodeCreationDetails />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/barcodePrintOn"
          element={
            <ProtectedSecRoute>
              <BarcodePrintOn />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/barcodePrintOff"
          element={
            <ProtectedSecRoute>
              <BarcodePrintOff />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/barcodeFormat"
          element={
            <ProtectedSecRoute>
              <BarcodeFormat />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* date entry settings */}
        <Route
          path="/sUsers/VoucherSettings"
          element={
            <ProtectedSecRoute>
              <VoucherSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/VoucherSeriesSettings"
          element={
            <ProtectedSecRoute>
              <VoucherSeriesSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/createVoucherSeries"
          element={
            <ProtectedSecRoute>
              <VoucherSeriesForm />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editVoucherSeries"
          element={
            <ProtectedSecRoute>
              <VoucherSeriesForm />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/voucherSeriesList"
          element={
            <ProtectedSecRoute>
              <VoucherSeriesList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/OrderSettings"
          element={
            <ProtectedSecRoute>
              <OrderSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/InvoiceSettings"
          element={
            <ProtectedSecRoute>
              <InvoiceSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/warrantyCardList"
          element={
            <ProtectedSecRoute>
              <WarrantyCardList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addWarrantyCard"
          element={
            <ProtectedSecRoute>
              <AddWarrantyCard />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editWarrantyCard"
          element={
            <ProtectedSecRoute>
              <EditWarrantyCard />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* voucher settings */}
        <Route
          path="/sUsers/emailSettings"
          element={
            <ProtectedSecRoute>
              <EmailSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* despatch title */}
        <Route
          path="/sUsers/order/customDespatchTitle"
          element={
            <ProtectedSecRoute>
              <DespatchTitleSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/invoice/customDespatchTitle"
          element={
            <ProtectedSecRoute>
              <DespatchTitleSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        {/* terms and conditions */}
        <Route
          path="/sUsers/order/termsAndConditions"
          element={
            <ProtectedSecRoute>
              <TermsAndConditionSettings />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/invoice/termsAndConditions"
          element={
            <ProtectedSecRoute>
              <TermsAndConditionSettings />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* printConfiguration */}
        <Route
          path="/sUsers/printConfiguration"
          element={
            <ProtectedSecRoute>
              <PrintConfiguration />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/saleOrderPrintConfiguration"
          element={
            <ProtectedSecRoute>
              <SaleOrderPrintConfiguration />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/salePrintConfiguration"
          element={
            <ProtectedSecRoute>
              <SalePrintConfiguration />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/sale/upLoadLetterHead"
          element={
            <ProtectedSecRoute>
              <LetterHeadUploadPage />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* order pending */}
        <Route
          path="/sUsers/orderPending/partyList"
          element={
            <ProtectedSecRoute>
              <SearchParty />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/pendingOrders/:partyId"
          element={
            <ProtectedSecRoute>
              <PendingOrders />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* company secondary user */}
        <Route
          path="/sUsers/company/list"
          element={
            <ProtectedSecRoute>
              <OrganizationList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addOrganization"
          element={
            <ProtectedSecRoute>
              <AddOrganisation />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editOrg/:id"
          element={
            <ProtectedSecRoute>
              <EditOrg />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* adding sec users */}
        <Route
          path="/sUsers/retailers"
          element={
            <ProtectedSecRoute>
              <RetailersList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/addSecUsers"
          element={
            <ProtectedSecRoute>
              <AddSecUsers />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/editUser/:id"
          element={
            <ProtectedSecRoute>
              <EditSecUsers />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/configureUser/:userId"
          element={
            <ProtectedSecRoute>
              <ConfigureRetailer />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateCompany"
          element={
            <ProtectedSecRoute>
              <AllocateCompany />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/AllocateTransaction"
          element={
            <ProtectedSecRoute>
              <AllocateTransaction />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocatePriceLevel"
          element={
            <ProtectedSecRoute>
              <AllocatePriceLevel />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateGodown"
          element={
            <ProtectedSecRoute>
              <AllocateGodown />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateVanSaleGodown"
          element={
            <ProtectedSecRoute>
              <AllocateGodown />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateSeries"
          element={
            <ProtectedSecRoute>
              <AllocationSeriesList />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateSeries/:voucherType"
          element={
            <ProtectedSecRoute>
              <AllocateVoucherSeries />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/allocateSubGroups"
          element={
            <ProtectedSecRoute>
              <AllocateSubGroup />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* outstanding  */}
        <Route
          path="/sUsers/outstandingSummary"
          element={
            <ProtectedSecRoute>
              <OutstandingSummary />
            </ProtectedSecRoute>
          }
        ></Route>
        <Route
          path="/sUsers/outstanding"
          element={
            <ProtectedSecRoute>
              <Outstanding />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* sub groups */}
        <Route
          path="/sUsers/addSubGroup"
          element={
            <ProtectedSecRoute>
              <AddSubGroup />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* party opening */}
        <Route
          path="/sUsers/addOpening"
          element={
            <ProtectedSecRoute>
              <AddOpening />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* errorPage */}
        <Route path="/errorPage" element={<ErrorPage />} />
        <Route path="/serverError" element={<ServerError />} />
        <Route
          path="/sUsers/demo"
          element={
            <ProtectedSecRoute>
              <Demo />
            </ProtectedSecRoute>
          }
        ></Route>

        {/* Hotel route */}
        <Route
          path="/sUsers/addAdditionalPax"
          element={
            <ProtectedSecRoute>
              {" "}
              <AddAdditionalPax />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/visitOfPurpose"
          element={
            <ProtectedSecRoute>
              <VisitOfPurpose />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/idProof"
          element={
            <ProtectedSecRoute>
              <IdProof />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/foodPlan"
          element={
            <ProtectedSecRoute>
              <FoodPlan />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/roomRegistration"
          element={
            <ProtectedSecRoute>
              <RoomRegistration />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/roomList"
          element={
            <ProtectedSecRoute>
              <RoomList />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/editRoom"
          element={
            <ProtectedSecRoute>
              <EditRoom />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/bookingPage"
          element={
            <ProtectedSecRoute>
              <BookingPage />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/checkInPage"
          element={
            <ProtectedSecRoute>
              <CheckInPage />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/checkOutPage"
          element={
            <ProtectedSecRoute>
              <CheckOut />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/BookingList"
          element={
            <ProtectedSecRoute>
              <BookingList />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/checkInList"
          element={
            <ProtectedSecRoute>
              <BookingList />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/CheckOutList"
          element={
            <ProtectedSecRoute>
              <BookingList />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/EditBooking"
          element={
            <ProtectedSecRoute>
              <EditBooking />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/EditChecking"
          element={
            <ProtectedSecRoute>
              <EditChecking />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/EditCheckOut"
          element={
            <ProtectedSecRoute>
              <EditCheckOut />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/itemList"
          element={
            <ProtectedSecRoute>
              <ItemList />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/KotPage"
          element={
            <ProtectedSecRoute>
              <KotPage />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/editItem"
          element={
            <ProtectedSecRoute>
              <EditItem />
            </ProtectedSecRoute>
          }
        />

        <Route
          path="/sUsers/itemRegistration"
          element={
            <ProtectedSecRoute>
              <ItemRegistration />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/TableMaster"
          element={
            <ProtectedSecRoute>
              <TableMaster />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/TableSelection"
          element={
            <ProtectedSecRoute>
              <TableSelection />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/CheckOutPrint"
          element={
            <ProtectedSecRoute>
              <CheckOutPrint />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/test-error-boundary"
          element={
            <ProtectedSecRoute>
              <ErrorTestComponent />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/BillPrint"
          element={
            <ProtectedSecRoute>
              <BillPrint />
            </ProtectedSecRoute>
          }
        />

        <Route
          path="/sUsers/HotelFlashReport"
          element={
            <ProtectedSecRoute>
              <HotelFlashReport />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/SummaryDashboard"
          element={
            <ProtectedSecRoute>
              <SummaryDashboard />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/BillSummary"
          element={
            <ProtectedSecRoute>
              <BillSummary />
            </ProtectedSecRoute>
          }
        />
         <Route
          path="/sUsers/CancellationReport"
          element={
            <ProtectedSecRoute>
              <CancellationReport />
            </ProtectedSecRoute>
          }
        />
          <Route
          path="/sUsers/LoginReport"
          element={
            <ProtectedSecRoute>
              <LoginReport />
            </ProtectedSecRoute>
          }
        />
         <Route
          path="/sUsers/Receiptreport"
          element={
            <ProtectedSecRoute>
              <Receiptreport />
            </ProtectedSecRoute>
          }
        />
         <Route
          path="/sUsers/TravelAgentReport"
          element={
            <ProtectedSecRoute>
              <TravelAgentReport />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/CheckInPrint"
          element={
            <ProtectedSecRoute>
              <CheckInPrint />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/Checkoutpdf"
          element={
            <ProtectedSecRoute>
              <Checkoutpdf />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/categoryprint"
          element={
            <ProtectedSecRoute>
              <Categoryreportres />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/itemwisereport"
          element={
            <ProtectedSecRoute>
              <Itemwisereport />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/tourist-report"
          element={
            <ProtectedSecRoute>
              <TouristReport />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/foodplan-report"
          element={
            <ProtectedSecRoute>
              <FoodPlanReportPage />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/occupancy-checkout-report"
          element={
            <ProtectedSecRoute>
              <OccupancyCheckoutReport />
            </ProtectedSecRoute>
          }
        />
          <Route
          path="/sUsers/FOSalesSummaryReport"
          element={
            <ProtectedSecRoute>
              <FOSalesSummaryReport />
            </ProtectedSecRoute>
          }
        />
      
        <Route
          path="/sUsers/register"
          element={
            <ProtectedSecRoute>
              <KotRegisterPage />
            </ProtectedSecRoute>
          }
        />

        <Route
          path="/sUsers/sales-register"
          element={
            <ProtectedSecRoute>
              <SaleRegisterPage />
            </ProtectedSecRoute>
          }
        />
        <Route
          path="/sUsers/viewReport"
          element={
            <ProtectedSecRoute>
              <ViewReport />
            </ProtectedSecRoute>
          }
        />
           <Route
          path="/sUsers/kotPrinterSetting"
          element={
            <ProtectedSecRoute>
              <KotPrinterSetting />
            </ProtectedSecRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default Routers;
