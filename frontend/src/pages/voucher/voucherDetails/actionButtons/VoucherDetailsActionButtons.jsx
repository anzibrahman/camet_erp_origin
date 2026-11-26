/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { PiShareFatFill } from "react-icons/pi";
import { MdEdit, MdSms, MdPrint } from "react-icons/md";
import CancelButton from "@/components/common/CancelButton";
import { useNavigate } from "react-router-dom";
import RemoveReduxData from "@/components/secUsers/RemoveReduxData";
import { ShareFormatSelector } from "./ShareFormatSelector";
import { useSelector } from "react-redux";
import { industries } from "../../../../../constants/industries";
export default function VoucherDetailsActionButtons({
  data,
  reFetch,
  setActionLoading,
  actionLoading,
}) {
  console.log(industries);
  console.log(data);
  const navigate = useNavigate();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isneedReceipt, setisneedReceipt] = useState(false);
  const organization = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg,
  );
  const permission = useSelector((state) => state.permissionData?.permissions);
  const secondaryUserRole =
    JSON.parse(localStorage.getItem("sUserData"))?.role || "user";
  console.log(organization);

  const {
    _id,
    isCancelled,
    vanSale = false,
    isEditable,
    isConverted = false,
    voucherType,
    cancellationAllowed = true,
  } = data || {};
  useEffect(() => {
    if (organization.industry === 7 || organization.industry === 6) {
      console.log("h");
      setisneedReceipt(true);
    }
  }, []);
  const handleEditClick = () => {
    if (!voucherType) return;

    if (isCancelled || isConverted || isEditable === false) {
      window.alert(isCancelled ? "Cancelled vouchers cannot be edited" : isConverted ? "Converted vouchers cannot be edited" : "This voucher has payments applied and cannot be edited");
      return;
    }
    // if (isEditable !== undefined && isEditable === false) {
    //   window.alert(
    //     "You can't edit this voucher since it has been used to generate receipts or payments"
    //   );
    //   return;
    // }

    navigate(`/sUsers/edit${voucherType}/${_id}`, {
      state: {
        mode: "edit",
        voucherType: voucherType,
        data: data,
      },
    });
  };

  const handleShareClick = () => {
    setShareDialogOpen(true);
  };
  const handlereceipt = () => {
    console.log(data._id);
    navigate(`/sUsers/recietpprint/${data._id}`);
  };

  const handleSmsClick = () => {
    // Implement SMS functionality
    console.log("SMS clicked");
  };

  // Array of action buttons with their icons, titles, and handlers
  const actions = [
    {
      icon: MdPrint,
      title: "Print",
      color: "text-orange-600",
      active: isneedReceipt && voucherType !== "performaInvoice",
      onClick: handlereceipt,
    },

    {
      icon: MdEdit,
      title: "Edit",
      color: "text-blue-500",
      active: true,
      onClick: handleEditClick,
    },
    {
      icon: PiShareFatFill,
      title: "Share",
      color: "text-green-500",
      active: voucherType !== "receipt" && voucherType !== "payment",
      onClick: handleShareClick,
    },
    {
      icon: MdSms,
      title: "Sms",
      color: "text-yellow-500",
      active: true,
      onClick: handleSmsClick,
    },
  ];




  return (
    <div
      className={` ${
        isCancelled && "opacity-60 pointer-events-none"
      }  flex flex-col items-center`}
    >
      {/* some redux data is persisted in redux store so to remove it */}
      <RemoveReduxData />

      {/* Share Dialog Component */}
      <ShareFormatSelector
        open={shareDialogOpen}
        setOpen={setShareDialogOpen}
        voucherId={_id}
        voucherType={voucherType}
        data={data}
      />


      <div className="flex justify-center space-x-8">
        { (secondaryUserRole == "admin" ||
        (permission?.cancelSale && (voucherType == "sales" || voucherType == "performaInvoice")) ||
        (permission?.cancelReceipt && voucherType == "receipt")) && (
        <CancelButton
          id={_id}
          voucherType={voucherType}
          isCancelled={isCancelled}
          reFetch={reFetch}
          vanSale={vanSale}
          isEditable={isEditable}
          isConverted={isConverted}
          setActionLoading={setActionLoading}
          actionLoading={actionLoading}
          cancellationAllowed={cancellationAllowed}
        />
      )}
        {actions.map((action, index) => {
          if (!action.active) return null;
          const Icon = action.icon;
          return (
            <div
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div
                className={`p-2 rounded-full bg-gray-100 mb-2 ${action.color}`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-bold">{action.title}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
