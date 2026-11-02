/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-key */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import sale from "../../../assets/images/sale.png";
import { useMemo } from "react";
import creditNote from "../../../assets/images/creditNote.png";
import dashboard from "../../../assets/images/dashboard.png";
import PerformaInvoice from "../../../assets/images/bill.png";
import Quotation from "../../../assets/images/quotation.png";
import purchaseInvoice from "../../../assets/images/purchaseInvoice.png";
import paymentout from "../../../assets/images/paymentout.png";
import debitNote from "../../../assets/images/debitNote.png";
import expense from "../../../assets/images/expense.png";
import vanSale from "../../../assets/images/vanSale.png";
import stockTransfer from "../../../assets/images/stockTransfer.png";
import Daybook from "../../../assets/images/Daybook.png";
import statement from "../../../assets/images/statement.png";
import paymentIn from "../../../assets/images/paymentIn.png";
import salesSummary from "../../../assets/images/Untitled Project.jpg";
import purchaseSummary from "../../../assets/images/purchaseSummary.png";
import oderSummary from "../../../assets/images/oderSummary.png";
import reciptAandPayments from "../../../assets/images/reciptsandpayments.png";
import bank from "../../../assets/images/bank.png";
import outStanding from "../../../assets/images/outstanding.png";
import stockRegister from "../../../assets/images/clipboard.png";
import peding from "../../../assets/images/pending.png";

import { IoAlertCircle } from "react-icons/io5";
import { useSelector } from "react-redux";

const salesTiles = [
  {
    title: "Sales",
    icon: sale,
    to: "/sUsers/sales",
    active: true,
    subtitle: "Record sales transactions",
    voucherType: "sales",
  },
  {
    title: "Receipt",
    icon: paymentIn,
    to: "/sUsers/receipt ",
    active: true,
    subtitle: "Track received payments",
    voucherType: "receipt",
  },
  {
    title: "Credit Note",
    icon: creditNote,
    to: "/sUsers/creditNote",
    active: true,
    subtitle: "Issue and track credit adjustments",
    voucherType: "creditNote",
  },
  {
    title: "Proforma Invoice",
    icon: PerformaInvoice,
    to: "/sUsers/performaInvoice",
    active: true,
    subtitle: "Draft pre-invoice documents",
    voucherType: "performaInvoice",
  },
  {
    title: "Sale Order",
    icon: Quotation,
    to: "/sUsers/invoice",
    active: true,
    subtitle: "Document and track client quotations",
    voucherType: "saleOrder",
  },
  // Commented out tiles can be uncommented if needed
];

const purchaseTiles = [
  {
    title: "Purchase Invoice",
    icon: purchaseInvoice,
    to: "/sUsers/purchase",
    active: true,
    subtitle: "Track and document your purchases",
    voucherType: "purchase",
  },
  {
    title: "Payment",
    icon: paymentout,
    to: "/sUsers/paymentPurchase",
    active: true,
    subtitle: "Record all payment outflows",
    voucherType: "payment",
  },
  {
    title: "Debit Note",
    icon: debitNote,
    to: "/sUsers/debitNote",
    active: true,
    subtitle: "Adjust and manage account debits",
    voucherType: "debitNote",
  },

  // Commented out tiles can be uncommented if needed
];
const others = [
  {
    title: "Expence",
    icon: expense,
    to: "/sUsers/sales",
    active: false,
    subtitle: "Track and document your purchases",
    voucherType: "expense",
  },
  {
    title: "Van Sale",
    icon: vanSale,
    to: "/sUsers/vanSale",
    active: true,
    subtitle: "Document sales made during van routes",
    voucherType: "vanSale",
  },
  {
    title: "Stock Transfer",
    icon: stockTransfer,
    to: "/sUsers/stockTransfer",
    active: true,
    subtitle: "Track inventory transfers between locations",
    voucherType: "stockTransfer",
  },
  {
    title: "Order Pending",
    icon: peding,
    to: "/sUsers/orderPending/partyList",
    active: true,
    subtitle: "Convert pending orders to sales",
    voucherType: "orderPending",
  },

  // Commented out tiles can be uncommented if needed
];

const popular = [
  {
    title: "Party Statement (Ledger)",
    icon: statement,
    to: "/sUsers/partyStatement/partyList",
    active: true,
    subtitle: "Track party-wise balances and history",
  },
  {
    title: "Day Book",
    icon: Daybook,
    to: "/sUsers/transaction",
    active: true,
    subtitle: "Daily transaction records and entries",
  },
  {
    title: "Sales Summary",
    icon: salesSummary,
    to: "/sUsers/summaryReport",
    summaryType: "Sales Summary",
    active: true,
    subtitle: "Overview of sales performance",
  },
  {
    title: "Purchase Summary",
    icon: purchaseSummary,
    to: "/sUsers/summaryReport",
    summaryType: "Purchase Summary",
    active: true,
    subtitle: "Overview of Purchase performance",
  },
  {
    title: "Order Summary",
    icon: oderSummary,
    to: "/sUsers/summaryReport",
    summaryType: "Order Summary",
    active: true,
    subtitle: "Track and manage order status",
  },
  {
    title: "Receipt and Payments",
    icon: reciptAandPayments,
    to: "/sUsers/vanSale",
    active: false,
    subtitle: "Monitor cash flow and payments",
  },
  {
    title: "Cash or Bank",
    icon: bank,
    to: "/sUsers/balancePage",
    active: true,
    subtitle: "Manage cash and bank transactions",
  },
  {
    title: "Outstanding",
    icon: outStanding,
    to: "/sUsers/outstanding",
    active: true,
    subtitle: "Track pending dues",
  },
  {
    title: "Stock Register",
    icon: stockRegister,
    to: "/sUsers/Inventory",
    active: true,
    subtitle: "Manage inventory records",
  },
  {
    title: "Stock Register Summary",
    icon: stockRegister,
    to: "/sUsers/InventoryDetails",
    active: true,
    subtitle: "Manage inventory details",
  },
];



const VoucherCards = ({ tab }) => {
  const { configurations,industry } = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg
  );


    const BasePopular = useMemo(() => {
    const popularItems = [...popular];
    
    // Add Hotel Summary only for industries 6 and 7
    if (industry === 6 || industry === 7) {
      popularItems.push({
        title: "Hotel Summary",
        icon: dashboard,
        to: "/sUsers/SummaryDashboard",
        active: true,
        subtitle: "Valuate Hotel and Restaurant Monthly, Daily growth",
      });
    }
    
    return popularItems;
  }, [industry]);

// if (industry === 6 || industry === 7) {
//   popular.push({
//     title: "Hotel Summary",
//     icon: dashboard,
//     to: "/sUsers/SummaryDashboard",
//     active: true,
//     subtitle: "Valuate Hotel and Restuarent Monthly,Daily growth",
//   });
// }
  



  const [selectedTab, setSelectedTab] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === "sales") {
      setSelectedTab(salesTiles);
    } else if (tab === "purchase") {
      setSelectedTab(purchaseTiles);
    } else if (tab === "popular") {
      setSelectedTab(BasePopular);
    } else {
      setSelectedTab(others);
    }
    // Add more conditions here if you have other tabs
  }, [tab,BasePopular]);

  const handleNavigate = (item) => {
    if (item.active) {
      if (
        item.voucherType === "stockTransfer" &&
        configurations[0]?.gdnEnabled === false
      ) {
        alert("Enable Godown to use this feature.");
        return;
      }

      navigate(item.to, {
        state: {
          voucherType: item.voucherType,
          summaryType: item?.summaryType,
        },
      });
    } else {
      alert("This feature is not available yet.");
    }
  };
  const CardContent = ({ item }) => (
    <div
      onClick={() => handleNavigate(item)}
      className="relative bg-slate-50 cursor-pointer flex gap-6 items-center p-3 md:p-4 hover:bg-slate-100 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1"
    >
      {!item.active && (
        <div className="absolute top-0 right-0 bg-[#7ecbaa] text-white text-xs font-bold px-1 py-1 md:px-2 md:py-1 rounded-bl-md flex justify-center items-center">
          <IoAlertCircle className="w-4 h-4 inline-block" />
        </div>
      )}

      <aside>
        <div className="bg-white p-2 rounded-lg flex justify-center items-center w-12 h-12 md:w-16 md:h-16 shadow-lg">
          <img src={item.icon} alt={item.title} />
        </div>
      </aside>
      <main>
        <h1 className="text-gray-700 md:text-lg font-medium">{item.title}</h1>
        <p className="text-sm md:text-md text-gray-500 mt-1">{item.subtitle}</p>
      </main>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-4 md:gap-y-8  p-2 md:p-4">
      {selectedTab &&
        selectedTab.map((item, index) =>
          item.active ? (
            <CardContent key={index} item={item} />
          ) : (
            <div key={index} className="">
              <CardContent item={item} />
            </div>
          )
        )}
    </div>
  );
};

export default VoucherCards;
