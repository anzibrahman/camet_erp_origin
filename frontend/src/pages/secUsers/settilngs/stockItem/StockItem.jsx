import TitleDiv from "../../../../components/common/TitleDiv";
import SettingsCard from "../../../../components/common/SettingsCard";
import {
  FiDollarSign,
  FiMapPin,
  FiPlusCircle,
  FiSettings,
  FiTag,
} from "react-icons/fi";
import { IoBarcodeOutline } from "react-icons/io5";
import api from "@/api/api";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { updateConfiguration } from "../../../../../slices/secSelectedOrgSlice";
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
import { BsCalendar2Date } from "react-icons/bs";


const StockItem = () => {
  const [loading, setLoading] = useState(false);
  const [settingsOptions, setSettingsOptions] = useState([{}]);
  const [showGodownAlert, setShowGodownAlert] = useState(false);
  const [showGodownDeclineAlert, setShowGodownDeclineAlert] = useState(false);
  const [pendingGodownToggle, setPendingGodownToggle] = useState(null);

  const { _id: cmp_id, configurations ,industry } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );


  useEffect(() => {
  setSettingsOptions([
    {
      title: industry === 6 || industry === 7 || industry === 9 ? "Room Management" : "Stock Item Filter",
      description: "Filters only show product creation window if it's enabled",
      icon: <FiSettings />,
      to: "/sUsers/stockItemSettings",
      active: true,
    },

    // ✅ Conditionally add extra options
    ...(industry === 6 || industry === 7 || industry === 8 || industry === 9
      ? [
          {
            title: "Food Product Management",
            description: "Filters only show product creation window if it's enabled",
            icon: <FiSettings />,
            to: "/sUsers/restuarentSettings",
            active: true,
          },
         
        ]
      : []),

    {
      title: "Add Location",
      description: "Add location tracking for all vouchers",
      icon: <FiMapPin />,
      to: "/sUsers/godown",
      active: configurations[0]?.gdnEnabled,
    },
    {
      title: "Enable Location",
      description: "Enable location tracking for all vouchers",
      icon: <FiMapPin />,
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.gdnEnabled,
      dbField: "gdnEnabled",
    },
    {
      title: "Enable Batch",
      description: "Enable this to include batch while adding item in invoice",
      icon: <FiPlusCircle />,
      to: "/sUsers/addBatchSettings",
      active: true,
      toggle: true,
      toggleValue: configurations[0]?.batchEnabled,
      dbField: "batchEnabled",
    },
    {
      title: "Enable Manufacturing Date",
      description: "Enable this to include batch while adding item in invoice",
      icon: <BsCalendar2Date />,
      to: "/sUsers/addBatchSettings",
      active: configurations[0]?.batchEnabled,
      toggle: true,
      toggleValue: configurations[0]?.enableManufacturingDate || false,
      dbField: "enableManufacturingDate",
    },
    {
      title: "Enable Expiry Date",
      description: "Enable this to include batch while adding item in invoice",
      icon: <BsCalendar2Date />,
      to: "/sUsers/addBatchSettings",
      active: configurations[0]?.batchEnabled,
      toggle: true,
      toggleValue: configurations[0]?.enableExpiryDate || false,
      dbField: "enableExpiryDate",
    },
    {
      title: "Price Level",
      description: "Enable Multiple Price level for invoice",
      icon: <FiDollarSign />,
      to: "/sUsers/pricelevel",
      active: true,
    },
    {
      title: "Tax Classification",
      description: "Enable it to adding HSN and Tax details when creating a new stock item",
      icon: <FiTag />,
      to: "/sUsers/hsnList",
      active: true,
    },
    {
      title: "Barcode Management",
      description: "Manage your product barcode effectively",
      icon: <IoBarcodeOutline />,
      to: "/sUsers/barcodeList",
      active: true,
    },
  ]);
}, [configurations, industry]); // ✅ also add `industry` as a dependency


  const dispatch = useDispatch();

  const handleToggleChange = async (newState) => {
    const { title, checked } = newState;

    // Special handling for godown enable
    if (title === "gdnEnabled" && checked) {
      setPendingGodownToggle(newState);
      setShowGodownAlert(true);
      return;
    } else if (title === "gdnEnabled" && !checked) {
      console.log("here");

      setShowGodownDeclineAlert(true);
      return;
    }

    const apiData = {
      fieldToUpdate: title,
      value: checked,
    };

    try {
      setLoading(true);
      const res = await api.put(
        `/api/sUsers/updateFirstLayerConfiguration/${cmp_id}`,
        apiData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      // Update configurations only after successful API call
      dispatch(updateConfiguration(res?.data?.data));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update setting");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGodownConfirm = async () => {
    if (pendingGodownToggle) {
      try {
        setLoading(true);
        const apiData = {
          fieldToUpdate: pendingGodownToggle.title,
          value: pendingGodownToggle.checked,
        };

        const res = await api.put(
          `/api/sUsers/updateFirstLayerConfiguration/${cmp_id}`,
          apiData,
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: true,
          }
        );

        dispatch(updateConfiguration(res?.data?.data));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to enable godown");
        console.error(error);
      } finally {
        setLoading(false);
        setShowGodownAlert(false);
        setPendingGodownToggle(null);
      }
    }
  };

  const handleGodownCancel = () => {
    setShowGodownAlert(false);
    setPendingGodownToggle(null);
  };

  return (
    <div className="bg-white">
      <TitleDiv title="Stock Item " from="/sUsers/settings" loading={loading} />
      <div className="space-y-4 b-white p-4 mx-1">
        {settingsOptions.map((option, index) => (
          <SettingsCard
            key={index}
            option={option}
            index={index}
            handleToggleChangeFromParent={handleToggleChange}
          />
        ))}
      </div>

      {showGodownAlert && (
        <AlertDialog open={showGodownAlert} onOpenChange={setShowGodownAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Godown Tracking</AlertDialogTitle>
              <AlertDialogDescription>
                Once enabled, godown tracking will be applied to ALL products.
                This action cannot be undone,and this will take few seconds. Are
                you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleGodownCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleGodownConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showGodownAlert && (
        <AlertDialog open={showGodownAlert} onOpenChange={setShowGodownAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Godown Tracking</AlertDialogTitle>
              <AlertDialogDescription>
                Once enabled, godown tracking will be applied to ALL products.
                This action cannot be undone,and this will take few seconds. Are
                you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleGodownCancel}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleGodownConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showGodownDeclineAlert && (
        <AlertDialog
          open={showGodownDeclineAlert}
          onOpenChange={setShowGodownDeclineAlert}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Godown Tracking</AlertDialogTitle>
              <AlertDialogDescription>
                Disabling godown tracking is not allowed since enabling godown
                is permanent and cannot be undone
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGodownConfirm}>
                Okey
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default StockItem;
