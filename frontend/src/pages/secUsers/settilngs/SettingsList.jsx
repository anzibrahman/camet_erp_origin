/* eslint-disable react/jsx-key */
import TitleDiv from "../../../components/common/TitleDiv";
import { HiTemplate } from "react-icons/hi";
import { IoPersonSharp, IoPrint } from "react-icons/io5";
import { MdDataSaverOff } from "react-icons/md";
import { TbMoneybag } from "react-icons/tb";
import { MdHomeRepairService } from "react-icons/md";
import SettingsCard from "../../../components/common/SettingsCard";
import { useSelector } from "react-redux";
import { isAdminUser } from "@/utils/permissions";

const Settings = () => {
    const { industry } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );
  const secUserData = JSON.parse(localStorage.getItem("sUserData"));
  const isAdmin = isAdminUser(secUserData);

  const settingsOptions = [
    {
      title: industry === 6 || industry === 7 || industry === 8 || industry === 9 ? "SERVICE MANAGEMENT" : "STOCK ITEM",
      description: "Configure your stock item",
      icon: <HiTemplate />,
      to: "/sUsers/StockItem",
      active: true,
    },
    {
      title: industry === 6 || industry === 7 || industry === 8 || industry === 9 ? "PERMISSION SETTINGS" : "SECURITY",
      description: "make you permission settings",
      icon: <HiTemplate />,
      to: "/sUsers/MenuRightsSettingsPage",
      active: isAdmin,
      adminOnly: true,
    },
    {
      title: "PARTIES",
      description: "Configure your Parties",
      icon: <IoPersonSharp />,
      to: "/sUsers/partySettings",
      active: true,
    },
    {
      title: "DATA ENTRY",
      description: "Data entry settings",
      icon: <MdDataSaverOff />,
      to: "/sUsers/dataEntrySettings",
      active: true,

    },
    {
      title: "OUTSTANDING",
      description: "Enable you to configure outstanding",
      icon: <TbMoneybag />,
      to: "/sUsers/OutstandingSettings",
      active: true,

    },
    {
      title: "SERVICE / LEDGER",
      description: "Configure your Ledger",
      icon: <MdHomeRepairService />,
      to: "/sUsers/additionalChargesList",
      active: true,

    },
    {
      title: "Print Configuration",
      description: "Configure your print settings",
      icon: <IoPrint />,
      to: "/sUsers/printConfiguration",
      active: true,

    },
  ];

  return (
    <div className="bg-white">
      <TitleDiv title="Settings" from="/sUsers/dashboard" />
      <div className="space-y-4 b-white p-4   mx-1">
        {settingsOptions.map((option, index) => (
          <SettingsCard option={option} index={index} />
        ))}
      </div>
    </div>
  );
};

export default Settings;
