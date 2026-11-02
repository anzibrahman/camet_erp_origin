import TitleDiv from "@/components/common/TitleDiv";
import { truncateText } from "../../../../../../backend/utils/textHelpers.js";
import { useEffect, useState } from "react";
import {
  HiCheck,
  HiX,
  HiSparkles,
  HiDocumentText,
  HiOfficeBuilding,
  HiHashtag,
} from "react-icons/hi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "@/api/api.js";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiCoupon3Fill } from "react-icons/ri";

const AllocateVoucherSeries = () => {
  const [selectedVoucherSeries, setSelectedVoucherSeries] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { voucherType } = useParams();

  const userId = location.state?.data?.userData?._id;

  // Voucher type display names
  const voucherTypeNames = {
    sales: "Sale",
    performaInvoice: "Proforma Invoice",
    purchase: "Purchase",
    vanSale: "Van Sale",
    receipt: "Receipt",
    payment: "Payment",
    stockTransfer: "Stock Transfer",
    creditNote: "Credit Note",
    debitNote: "Debit Note",
    saleOrder: "Sales Order",
  };

  // Check if userId exists, redirect if not
  useEffect(() => {
    if (!userId) {
      navigate(-1, { replace: true });
    }
  }, [userId, navigate]);

  // Validate voucher type
  useEffect(() => {
    if (voucherType && !voucherTypeNames[voucherType]) {
      toast.error("Invalid voucher type");
      navigate(-1, { replace: true });
    }
  }, [voucherType, navigate]);

  // Fetch secondary user details
  const {
    data: userDetailsData,
    isLoading: userDetailsLoading,
    error: userDetailsError,
  } = useQuery({
    queryKey: ["secUserDetails", userId],
    queryFn: async () => {
      const response = await api.get(
        `/api/sUsers/getSecUserDetails/${userId}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    enabled: !!userId, // Only fetch if userId exists
  });

  // Set default selected company when user details are loaded
  useEffect(() => {
    if (userDetailsData?.data?.userData?.organisation?.length > 0) {
      // Set the first organization as default if none is selected
      if (!selectedCompany) {
        setSelectedCompany(userDetailsData.data.userData.organisation[0]._id);
      }
    }
  }, [userDetailsData, selectedCompany]);

  // Fetch voucher series data based on selected company and voucher type
  const {
    data: voucherSeriesData,
    isLoading: voucherSeriesLoading,
    error: voucherSeriesError,
  } = useQuery({
    queryKey: ["voucherSeries", selectedCompany, voucherType],
    queryFn: async () => {
      const response = await api.get(
        `/api/sUsers/getSeriesByVoucher/${selectedCompany}?voucherType=${voucherType}`,
        {
          withCredentials: true,
        }
      );

      return response?.data?.series;
    },
    enabled: !!userId && !!selectedCompany && !!voucherType,
    staleTime: 30 * 1000,
  });

  // Allocate voucher series mutation
  const allocateMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.put(
        `/api/sUsers/allocateSubDetails/${selectedCompany}?voucherType=${voucherType}&subDetail=selectedVoucherSeries`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      navigate(-1);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "An error occurred");
      console.error(error);
    },
  });

  // Reset selected voucher series when company changes
  useEffect(() => {
    setSelectedVoucherSeries([]);
  }, [selectedCompany]);

  const voucherSeriesDataList = voucherSeriesData || [];
  const isLoading = voucherSeriesLoading || userDetailsLoading;
  const hasError = userDetailsError;
  const organisations = userDetailsData?.data?.organization || [];

  // Set pre-selected voucher series based on user configuration
  useEffect(() => {
    if (userDetailsData) {
      const configuration = userDetailsData?.data?.configurations?.find(
        (item) => item?.organization?.toString() === selectedCompany
      );

      const previouslySelectedSeries =
        configuration?.selectedVoucherSeries?.find(
          (item) => item?.voucherType === voucherType
        )?.selectedSeriesIds || [];

      setSelectedVoucherSeries(previouslySelectedSeries);
    }
  }, [userDetailsData, selectedCompany, voucherType]);

  const handleVoucherSeriesSelect = (voucherSeries) => {
    setSelectedVoucherSeries((prev) => {
      const isSelected = prev.includes(voucherSeries._id);
      if (isSelected) {
        return prev.filter((vs) => vs !== voucherSeries._id);
      } else {
        return [...prev, voucherSeries._id];
      }
    });
  };

  const removeSelectedVoucherSeries = (voucherSeriesId) => {
    setSelectedVoucherSeries((prev) =>
      prev.filter((vs) => vs !== voucherSeriesId)
    );
  };

  const isSelected = (voucherSeriesId) => {
    return selectedVoucherSeries.includes(voucherSeriesId);
  };

  const handleSubmit = async () => {
    if (selectedVoucherSeries.length === 0) {
      toast.warning("Please select at least one voucher series");
      return;
    }

    if (!selectedCompany) {
      toast.warning("Please select a company");
      return;
    }

    const formData = {
      userId,
      selectedItems: selectedVoucherSeries,
      selectedCompany: selectedCompany,
      voucherType: voucherType,
    };

    console.log("formData", formData);

    allocateMutation.mutate(formData);
  };

  const clearAllSelections = () => {
    setSelectedVoucherSeries([]);
  };

  const getSelectedCompanyName = () => {
    const company = organisations.find((org) => org._id === selectedCompany);
    return company?.name || "Select Company";
  };

  const getSelectedVoucherSeriesName = (voucherSeriesId) => {
    const voucherSeries = voucherSeriesDataList.find(
      (vs) => vs._id === voucherSeriesId
    );
    return voucherSeries?.seriesName || "Unknown Series";
  };

  const formatNumber = (num, width) => {
    return num.toString().padStart(width, "0");
  };

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-50 flex flex-col">
        <TitleDiv
          title={`Allocate ${voucherTypeNames[voucherType]} Series`}
          loading={false}
        />
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Data
            </h3>
            <p className="text-red-600">
              {voucherSeriesError?.message ||
                userDetailsError?.message ||
                "Failed to load required data. Please try again."}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <TitleDiv
        title={`Allocate ${voucherTypeNames[voucherType]} Series`}
        loading={isLoading || allocateMutation.isPending}
      />
      <div className="max-w-7xl mx-auto p-6">
        {/* Company Selection */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border-white/20 p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <HiOfficeBuilding className="text-2xl text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Select Company
            </h3>
          </div>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a company for configuration" />
            </SelectTrigger>
            <SelectContent>
              {organisations.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  <div className="flex items-center gap-2">
                    <HiOfficeBuilding className="text-sm text-gray-500" />
                    <span>{org.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCompany && (
            <p className="text-sm text-gray-600 mt-2">
              Configuring {voucherTypeNames[voucherType]} series for:{" "}
              <span className="font-semibold">{getSelectedCompanyName()}</span>
            </p>
          )}
        </div>

        {/* User Info Section */}
        {userDetailsData?.data?.userData && (
          <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-white/20 p-4 border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Allocating {voucherTypeNames[voucherType]} series to:{" "}
              {userDetailsData.data.userData.name || "User"}
            </h3>
            <p className="text-sm text-gray-600">
              Voucher Type:{" "}
              <span className="font-semibold">
                {voucherTypeNames[voucherType]}
              </span>
            </p>
          </div>
        )}

        {/* Show message if no company is selected */}
        {!selectedCompany && organisations.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <HiOfficeBuilding className="text-4xl mx-auto mb-2 text-amber-500" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">
              Select a Company
            </h3>
            <p className="text-amber-600">
              Please select a company from the dropdown above to view and
              allocate {voucherTypeNames[voucherType]} series.
            </p>
          </div>
        )}

        {/* Only show voucher series sections if a company is selected */}
        {selectedCompany && (
          <>
            {/* Selected Voucher Series Display */}
            <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-white/20 p-6 transition-all duration-300 border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Selected {voucherTypeNames[voucherType]} Series (
                  {selectedVoucherSeries.length})
                </h2>
                {selectedVoucherSeries.length > 0 && (
                  <button
                    onClick={clearAllSelections}
                    className="mt-2 sm:mt-0 text-sm text-gray-500 hover:text-red-500 transition-colors duration-200 flex items-center gap-1"
                  >
                    <HiX className="text-xs" />
                    Clear All
                  </button>
                )}
              </div>

              {selectedVoucherSeries.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {selectedVoucherSeries.map((voucherSeriesId, index) => (
                    <div
                      key={voucherSeriesId}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-gray-800 rounded-full text-sm font-medium shadow-lg transform hover:scale-105 transition-all duration-200 animate-in slide-in-from-left"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <HiCheck className="text-sm" />
                      <span
                        title={getSelectedVoucherSeriesName(voucherSeriesId)}
                      >
                        {truncateText(
                          getSelectedVoucherSeriesName(voucherSeriesId),
                          20
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedVoucherSeries(voucherSeriesId);
                        }}
                        className="ml-1 hover:bg-blue-200 rounded-full p-1 transition-colors duration-200"
                      >
                        <HiX className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <div className="text-center">
                    <HiDocumentText className="text-4xl mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No {voucherTypeNames[voucherType]} series selected yet
                    </p>
                    <p className="text-xs mt-1">
                      Click on series cards below to select them
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Voucher Series Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!isLoading &&
                voucherSeriesDataList.map((voucherSeries, index) => (
                  <div
                    key={voucherSeries._id}
                    onClick={() => handleVoucherSeriesSelect(voucherSeries)}
                    className={`group relative bg-white/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 transform hover:-translate-y-1 animate-in slide-in-from-bottom ${
                      isSelected(voucherSeries._id)
                        ? "border-blue-300 bg-blue-50/50"
                        : "border-white/30 hover:border-blue-50"
                    }`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {/* Selection Indicator */}
                    {isSelected(voucherSeries._id) && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-20">
                        <HiCheck className="text-white text-sm" />
                      </div>
                    )}

                    {/* Default Series Badge */}
                    {voucherSeries.isDefault && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full z-50">
                        Default
                      </div>
                    )}

                    <div className="relative p-6 z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                            isSelected(voucherSeries._id)
                              ? "bg-blue-100 shadow-lg"
                              : "bg-gray-100 group-hover:bg-blue-100"
                          }`}
                        >
                          <RiCoupon3Fill className="w-6 h-6 text-red-800" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-bold text-gray-900 transition-colors duration-300 leading-tight text-lg ${
                              isSelected(voucherSeries._id)
                                ? "text-blue-900"
                                : ""
                            }`}
                            title={voucherSeries.seriesName}
                          >
                            {truncateText(voucherSeries.seriesName, 20)}
                          </h3>
                        </div>
                      </div>

                      {/* Formatted Number Display */}
                      <div className="bg-slate-50 p-3 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HiHashtag className="text-gray-500 text-sm" />
                          <span className="text-gray-600 text-sm font-medium">
                            Current Format:
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 font-mono">
                          {/* {formatVoucherNumber(voucherSeries)} */}
                          {voucherSeries?.prefix}
                          {formatNumber(
                            voucherSeries?.currentNumber,
                            voucherSeries?.widthOfNumericalPart
                          )}
                          {voucherSeries?.suffix}
                        </div>
                      </div>

                      {/* Series Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Current Number:</span>
                          <span className="font-semibold text-gray-900">
                            {voucherSeries.currentNumber}
                          </span>
                        </div>
                        {/* <div className="flex justify-between">
                          <span className="text-gray-500">Last Used:</span>
                          <span className="font-semibold text-gray-900">
                            {voucherSeries.lastUsedNumber}
                          </span>
                        </div> */}
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ))}
            </div>

            {/* Action Buttons */}
            {!isLoading && voucherSeriesDataList.length > 0 && (
              <div className="w-full mt-12 flex flex-col sm:flex-row justify-start gap-4">
                <button
                  onClick={clearAllSelections}
                  className="sm:w-1/2 px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  disabled={selectedVoucherSeries.length === 0}
                >
                  <HiX className="text-sm" />
                  Clear Selection
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    selectedVoucherSeries.length === 0 ||
                    !selectedCompany ||
                    allocateMutation.isPending
                  }
                  className={`sm:w-1/2 px-8 py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-lg transform hover:-translate-y-0.5 ${
                    selectedVoucherSeries.length > 0 &&
                    selectedCompany &&
                    !allocateMutation.isPending
                      ? "bg-pink-500 text-white hover:bg-pink-600 hover:shadow-xl"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                  }`}
                >
                  <HiSparkles className="text-sm" />
                  {allocateMutation.isPending
                    ? "Allocating..."
                    : `Allocate to Staff (${selectedVoucherSeries.length})`}
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading &&
              voucherSeriesDataList.length === 0 &&
              selectedCompany && (
                <div className=" text-center">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12">
                    <HiDocumentText className="text-6xl mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      No {voucherTypeNames[voucherType]} Series Found
                    </h3>
                    <p className="text-gray-500">
                      There are no {voucherTypeNames[voucherType]} series
                      available for the selected company.
                    </p>
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllocateVoucherSeries;
