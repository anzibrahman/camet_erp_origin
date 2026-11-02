import SettingsCard from "@/components/common/SettingsCard";
import TitleDiv from "@/components/common/TitleDiv";
import { IoFastFoodSharp } from "react-icons/io5";
import { GiStorkDelivery } from "react-icons/gi";
import {
  TbFileInvoice,
  TbShoppingCart,
  TbTruckDelivery,
  TbShoppingBag,
  TbArrowBigUpLines,
  TbArrowBigDownLines,
  TbArrowsExchange,
} from "react-icons/tb";
import { IoReceiptSharp } from "react-icons/io5";
import { MdReceipt } from "react-icons/md";



const VoucherSeriesSettings = () => {
  const voucherOptions = [
    { title: "Proforma Invoice", description: "Configure voucher series for Proforma Invoices", icon: <TbFileInvoice />, to: "/sUsers/voucherSeriesList", active: true, from: "performaInvoice" },
    {
      title: "Sale Order",
      description: "Configure voucher series for Sale Orders",
      icon: <TbFileInvoice />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "saleOrder",
    },
    {
      title: "Sale",
      description: "Configure voucher series for Sales",
      icon: <TbShoppingCart />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "sales",
    },
    {
      title: "Van Sale",
      description: "Configure voucher series for Van Sales",
      icon: <TbTruckDelivery />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "vanSale",
    },
    {
      title: "Purchase",
      description: "Configure voucher series for Purchases",
      icon: <TbShoppingBag />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "purchase",
    },
    {
      title: "Credit Note",
      description: "Configure voucher series for Credit Notes",
      icon: <TbArrowBigUpLines />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "creditNote",
    },
    {
      title: "Debit Note",
      description: "Configure voucher series for Debit Notes",
      icon: <TbArrowBigDownLines />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "debitNote",
    },
    {
      title: "Receipt",
      description: "Configure voucher series for Receipts",
      icon: <IoReceiptSharp />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "receipt",
    },
    {
      title: "Payment",
      description: "Configure voucher series for payments",
      icon: <MdReceipt />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "payment",
    },
    {
      title: "Stock Transfer",
      description: "Configure voucher series for Stock Transfers",
      icon: <TbArrowsExchange />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "stockTransfer",
    },
     {
      title: "Delivery Notes",
      description: "Configure voucher series for Delivery Notes",
      icon: <GiStorkDelivery />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "deliveryNote",
    },
    {
      title: "Memo Random",
      description: "Configure voucher series for Delivery Notes",
      icon: <IoFastFoodSharp />,
      to: "/sUsers/voucherSeriesList",
      active: true,
      from: "memoRandom",
    },
  ];

  return (
    <div className="bg-white">
      <TitleDiv title="Voucher Series" from="/sUsers/dataEntrySettings" />
      <div className={`space-y-4 bg-white p-4 mx-1`}>
        {voucherOptions.map((option, index) => (
          <SettingsCard key={index} option={option} index={index} />
        ))}
      </div>
    </div>
  );
};

export default VoucherSeriesSettings;
