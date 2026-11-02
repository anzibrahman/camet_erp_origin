import { voucherCancelEndpoint } from "../../../utils/voucherEndpoints";
/* eslint-disable react/no-unescaped-entities */

/* eslint-disable react/prop-types */
import { useState } from "react";
import { MdCancel } from "react-icons/md";
import { toast } from "sonner";
import api from "../../api/api";

// Import Shadcn UI components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";

function CancelButton({
  id,
  voucherType,
  vanSale = false,
  // isEditable,
  isConverted = false,
  setActionLoading,
  reFetch,
  actionLoading,
  cancellationAllowed,
}) {
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [cancelReason, setCancelReason] = useState("");
  const queryClient = useQueryClient();

      //// check if the user is admin
  const isAdmin =
    JSON.parse(localStorage.getItem("sUserData")).role === "admin"
      ? true
      : false;

  // ///////////////////  redux details /////////////////////
  const cmp_id = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg._id
  );


  if (voucherType === "vanSale") {
    voucherType = "Sales";
    vanSale = true;
  }

  const handleCancelClick = () => {
    // if (isEditable !== undefined && isEditable === false) {
    //   window.alert(
    //     "You can't cancel this voucher since it has been used to generate receipts or payments"
    //   );
    //   return;
    // }
    if (isConverted !== undefined && isConverted === true) {
      window.alert(
        "You can't edit this voucher since it has been converted to sales"
      );
      return;
    }

    // Open the confirmation dialog
    setIsDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationAllowed) {
      window.alert(
        "Cancellation not allowed: This entry is associated with another voucher."
      );
      setIsDialogOpen(false);
      return;
    }
    try {
      setActionLoading(true);
      await api.put(
        `/api/sUsers/${voucherCancelEndpoint(voucherType)}/${id}?vanSale=${vanSale}`,
        {cancelReason},
        {
          withCredentials: true,
        }
      );

      toast.success("Your file has been cancelled successfully");
       queryClient.invalidateQueries({
        queryKey: ["todaysTransaction", cmp_id, isAdmin],
      })
      reFetch();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to cancel");
    } finally {
      setActionLoading(false);
    }

    // Close the dialog
    setIsDialogOpen(false);
  };

  return (
  <div className={`${actionLoading ? "pointer-events-none opacity-50" : ""}`}>
  <div
    onClick={() => {
      setCancelReason("");
      setIsDialogOpen(true);
    }}
    className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
  >
    <div className="p-2 rounded-full bg-gray-100 mb-2">
      <MdCancel className="text-red-500" />
    </div>
    <span className="text-[10px] font-bold">Cancel</span>
  </div>

  <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
    <AlertDialogContent className="bg-gray-900 text-white border-gray-800">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white">
          Are you sure?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-gray-300">
          You won't be able to revert this. Please enter a cancellation reason.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-200">
          Reason <span className="text-red-400">*</span>
        </label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Enter cancellation reason..."
          rows={4}
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-400 focus:border-red-500"
        />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel
          onClick={() => setCancelReason("")}
          className="bg-gray-800 text-white hover:bg-gray-700"
        >
          Go Back
        </AlertDialogCancel>

        <AlertDialogAction
          onClick={(e) => {
            if (!cancelReason.trim()) {
              e.preventDefault();
              return;
            }
            handleConfirmCancel(cancelReason);
            setCancelReason("");
          }}
          className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
        >
          Cancel it!
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
  );
}

export default CancelButton;
