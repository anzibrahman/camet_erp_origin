/* eslint-disable react/jsx-key */
import React from "react";
import { IoFastFood } from "react-icons/io5";
import { MdFoodBank, MdCalculate  } from "react-icons/md";
import TitleDiv from "../../../../../components/common/TitleDiv";
import SettingsCard from "../../../../../components/common/SettingsCard";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { GrClipboard } from "react-icons/gr";
import { LiaMoneyCheckAltSolid } from "react-icons/lia";
import { updateConfiguration } from "../../../../../../slices/secSelectedOrgSlice.js";
import { useLocation } from "react-router-dom";
import { SiCashapp } from "react-icons/si";
import { TiPrinter } from "react-icons/ti";
import { IoCalculator } from "react-icons/io5";
import { BsFillPrinterFill } from "react-icons/bs";

import api from "@/api/api";

const restuarentSettings = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { pathname } = location;
  console.log(pathname);
  const { industry, _id, configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );
  console.log(configurations);
  const handleToggleChangeFromParent = async (data) => {
    console.log(data);
    let url;
    if (data?.title == "kotApproval") {
      url = `/api/sUsers/updateConfigurationForKotApproval/${_id}`;
    } else {
      url = `/api/sUsers/updateConfigurationForHotelAndRestaurant/${_id}`;
    }
    try {
      const response = await api.put(url, data, { withCredentials: true });

      if (response?.data?.success) {
        dispatch(updateConfiguration(response?.data?.organization));

        // Show appropriate success message
        if (data?.title?.includes("defaultPrint")) {
          const formatName =
            data?.title === "defaultPrint.print1" ? "Format 1" : "Format 2";
          toast.success(`Print format changed to ${formatName}`);
        } else {
          toast.success(response?.data?.message);
        }
      }
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  const settingsOptions = [
    {
      title: "Brand Management",
      description: "Manage restaurant and bar brands",
      icon: <MdFoodBank />,
      to: "/sUsers/restaurantBrand",
      active: true,
    },
    {
      title:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "food Category"
          : "Group Management",
      description:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "Manage your food category effectively"
          : " Manage your food item effectively",
      icon: <MdFoodBank />,
      to: "/sUsers/AddSubRestuarentCategory",
      active: true,
    },
    {
      title:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "Item Add"
          : "Group Management",
      description:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "Manage your food name effectively"
          : "Manage your food item effectively",
      icon: <MdFoodBank />,
      to: "/sUsers/itemList",
      active: true,
    },
    {
      title:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "Table Master"
          : "Group Management",
      description:
        industry === 6 || industry === 7 || industry === 8 || industry === 9
          ? "Manage your Table Entries here"
          : "Manage your Table Addition here",
      icon: <MdFoodBank />,
      to: "/sUsers/TableMaster",
      active: true,
    },
  ];

  if (industry === 7 || industry === 9 || industry === 6 || industry === 8) {
    settingsOptions.unshift({
      title: "Kot Default Print",
      description: "Select a default print format for kot",
      icon: <BsFillPrinterFill />,
      to: "/sUsers/kotPrinterSetting",
      active: true,
    });

    settingsOptions.unshift({
      title: "food Types",
      description: "Create different region wise category",
      icon: <IoFastFood />,
      to: "/sUsers/AddRestuarentCategory",
      active: true,
    });
    
    settingsOptions.push({
      title: "Auto approval for kot kitchen",
      description: "For better kot management",
      icon: <LiaMoneyCheckAltSolid />,
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.kotAutoApproval,
      dbField: "kotApproval",
    });
    settingsOptions.push({
      title: "Rate include tax (for entry).",
      description: "Rate shows with tax in entry",
      icon: <LiaMoneyCheckAltSolid />,
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.addRateWithTax?.restaurantSale,
      dbField: "restaurantSale",
    });
    settingsOptions.push({
      title: "Include tax with print",
      description: "In this option rate and amount will print with tax",
      icon: <IoCalculator />,
      active: true,
      toggle: true,
      toggleValue:
        configurations[0]?.defaultPrint?.showPrintWithTaxInRestaurant,
      dbField: "showPrintWithTaxInRestaurant",
    });
    settingsOptions.push({
      title: "Discount based on amount include tax.",
      description: "Better management of amount and discount",
      icon: <TiPrinter />,
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.discountBasedOnGrossAmount,
      dbField: "discountBasedOnGrossAmount",
    });

    settingsOptions.push({
      title: "show Print Option BeforeSale",
      description: "Better tax calculations for better organization",
      icon: <TiPrinter />,
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.defaultPrint?.showBeforeSaleInRestaurant,
      dbField: "restaurantPrint",
    });
    settingsOptions.push({
      title: "Default Print",
      description: "Select your default print options",
      icon: <GrClipboard />,
      to: "sec",
      active: true,
      checkboxGroup: true,
      checkboxes: [
        {
          label: "Format 1",
          checked: configurations?.[0]?.defaultPrint?.restaurantPrint1 ?? false, // Fixed access
          dbField: "defaultPrint.restaurantPrint1",
        },
        {
          label: "Format 2",
          checked: configurations?.[0]?.defaultPrint?.restaurantPrint2 ?? false, // Fixed access
          dbField: "defaultPrint.restaurantPrint2",
        },
      ],
      dbField: "restaurant",
    });
    settingsOptions.push({
  title: "Email Bill Paper Size",
  description: "Select paper size for emailed bill PDF",
  icon: <TiPrinter />,
  to: "sec",
  active: true,
  checkboxGroup: true,
  checkboxes: [
    {
      label: "A4",
      checked: configurations?.[0]?.defaultPrint?.emailBillSizeA4 ?? true,
      dbField: "defaultPrint.emailBillSizeA4",
    },
    {
      label: "A5",
      checked: configurations?.[0]?.defaultPrint?.emailBillSizeA5 ?? false,
      dbField: "defaultPrint.emailBillSizeA5",
    },
  ],
  dbField: "emailBillSize",
});
    settingsOptions.push({
      title: "Select complementary cash or bank",
      description: "For better restaurant management",
      icon: <SiCashapp />,
      to: "/sUsers/complementaryCashOrBank",
      active: true,
    });
    settingsOptions.push(
      {
        title: "Dine In",
        description: "Enable Dine In in restaurant dashboard",
        icon: <MdFoodBank />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.orderTypes?.dineIn ?? false,
        dbField: "orderTypes.dineIn",
      },
      {
        title: "Takeaway",
        description: "Enable Takeaway in restaurant dashboard",
        icon: <MdFoodBank />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.orderTypes?.takeaway ?? false,
        dbField: "orderTypes.takeaway",
      },
      {
        title: "Delivery",
        description: "Enable Delivery in restaurant dashboard",
        icon: <MdFoodBank />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.orderTypes?.delivery ?? false,
        dbField: "orderTypes.delivery",
      },
      {
        title: "Room Service",
        description: "Enable Room Service in restaurant dashboard",
        icon: <MdFoodBank />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.orderTypes?.roomService ?? false,
        dbField: "orderTypes.roomService",
      },
     
       {
        title: "Direct Sale",
        description: "Enable Direct Sale in restaurant dashboard",
        icon: <MdFoodBank />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.orderTypes?.directSale ?? false,
        dbField: "orderTypes.directSale",
      },
       {
        title: "Complementary include tax",
        description: "Management of complementary include tax",
        icon: <MdCalculate />,
        active: true,
        toggle: true,
        toggleValue: configurations[0]?.complementaryWithTax ?? false,
        dbField: "complementaryWithTax",
      },
    );
  }

  return (
    <div className="bg-white">
      <TitleDiv
        title={
          industry === 6 || industry === 7 || industry === 8 || industry === 9
            ? pathname === "/sUsers/restuarentSettings"
              ? "Restaurant Management"
              : "Room Management"
            : "Stock Item Settings"
        }
        from="/sUsers/StockItem"
      />
      <div className="space-y-4 b-white p-4   mx-1">
        {settingsOptions.map((option, index) => (
          <SettingsCard
            key={index}
            option={option}
            index={index}
            handleToggleChangeFromParent={handleToggleChangeFromParent}
          />
        ))}
      </div>
    </div>
  );
};

export default restuarentSettings;
