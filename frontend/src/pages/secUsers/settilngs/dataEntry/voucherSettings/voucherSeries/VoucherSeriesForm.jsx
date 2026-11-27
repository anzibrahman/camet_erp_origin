import TitleDiv from "@/components/common/TitleDiv";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatVoucherType } from "../../../../../../../utils/formatVoucherType";
import api from "@/api/api";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// Mock TitleDiv component

const VoucherSeriesForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    seriesName: "",
    prefix: "",
    suffix: "",
    currentNumber: "1",
    widthOfNumericalPart: "1",
  });
  const [errors, setErrors] = useState({});

  let organization = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );


  const location = useLocation();
  const navigate = useNavigate();

  const { from: voucherType, series = {}, mode = "add" } = location.state;
  console.log(voucherType);

  useEffect(() => {
    if (mode === "edit") {
      console.log(series);
      setFormData((prev) => ({
        ...prev,
        seriesName: series.seriesName || "",
        prefix: series.prefix || "",
        suffix: series.suffix || "",
        currentNumber: series.currentNumber || "1",
        widthOfNumericalPart: series.widthOfNumericalPart || "1",
        under: series?.under,
      }));
    }
  }, [mode, series]);

  const cmp_id = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg._id
  );

  const validateForm = () => {
    const newErrors = {};

    if (!formData.seriesName.trim()) {
      newErrors.seriesName = "Series name is required";
    }

    if (!formData.currentNumber || formData.currentNumber < 1) {
      newErrors.currentNumber =
        "Current number is required and must be at least 1";
    }

    if (!formData.widthOfNumericalPart || formData.widthOfNumericalPart < 1) {
      newErrors.widthOfNumericalPart =
        "Width is required and must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    if (field === "widthOfNumericalPart") {
      value = parseInt(value);
      if (value > 9) {
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const generatePreview = () => {
    const { prefix, currentNumber, suffix, widthOfNumericalPart } = formData;

    if (!currentNumber || !widthOfNumericalPart) {
      return "Enter values to see preview";
    }

    const paddedNumber = currentNumber
      .toString()
      .padStart(parseInt(widthOfNumericalPart) || 1, "0");
    return `${prefix || ""}${paddedNumber}${suffix || ""}`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    let payload = {};
    let url = "";
    let method = "post"; // default is POST

    if (mode === "add") {
      payload = {
        voucherType: voucherType,
        newSeries: formData,
      };
      url = `/api/sUsers/createVoucherSeries/${cmp_id}`;
    } else {
      payload = {
        seriesId: series._id,
        updatedSeries: formData,
      };
      url = `/api/sUsers/editVoucherSeriesById/${cmp_id}`;
      method = "put";
    }

    try {
      console.log("Submitting:", payload);

      await api[method](url, payload, { withCredentials: true });

      toast.success(
        `Series ${mode === "add" ? "created" : "updated"} successfully`
      );

      navigate("/sUsers/voucherSeriesList", {
        state: { from: voucherType },
        replace: true,
      });
    } catch (err) {
      console.error("Error submitting form", err);
      toast.error(err?.response?.data?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TitleDiv title={`${formatVoucherType(voucherType)} Series`} />
      <div className="min-h-screen bg-gradient-to-br p-4 flex items-center justify-center">
        <div className="w-full bg-white shadow-xl border border-slate-300 overflow-hidden ">
          {/* Header */}
          <div className="bg-gradient-to-r px-6 py-4 border-b border-slate-200">
            <p className="mt-1 capitalize text-lg font-bold text-gray-700">
              Configure series for {formatVoucherType(voucherType)}
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            <div onSubmit={onSubmit} className="space-y-6">
              {/* Series Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Series Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    value={formData.seriesName}
                    onChange={(e) =>
                      handleInputChange("seriesName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-sm focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-400  no-focus-box ${
                      errors.seriesName
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-300 focus:border-blue-500"
                    }`}
                    placeholder="E.g., Sales Invoice Series 2025"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                {errors.seriesName && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {errors.seriesName}
                  </p>
                )}
              </div>

              {/* Prefix and Suffix Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Prefix
                  </label>
                  <div className="relative">
                    <input
                      value={formData.prefix}
                      onChange={(e) =>
                        handleInputChange("prefix", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-slate-400  no-focus-box"
                      placeholder="E.g., SL-"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Suffix
                  </label>
                  <div className="relative">
                    <input
                      value={formData.suffix}
                      onChange={(e) =>
                        handleInputChange("suffix", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-slate-400  no-focus-box"
                      placeholder="E.g., -2025"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Number and Width Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Current Number
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.currentNumber}
                      onChange={(e) =>
                        handleInputChange("currentNumber", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-sm focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-400 no-focus-box ${
                        errors.currentNumber
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-300 focus:border-blue-500"
                      }`}
                      placeholder="Enter starting number"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                        />
                      </svg>
                    </div>
                  </div>
                  {errors.currentNumber && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {errors.currentNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Width of Numerical Part
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.widthOfNumericalPart}
                      onChange={(e) =>
                        handleInputChange(
                          "widthOfNumericalPart",
                          e.target.value
                        )
                      }
                      className={`w-full px-4 py-3 border rounded-sm focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-400  no-focus-box ${
                        errors.widthOfNumericalPart
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-300 focus:border-blue-500"
                      }`}
                      placeholder="E.g., 4 for 0001"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  {errors.widthOfNumericalPart && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {errors.widthOfNumericalPart}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Current Number
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.currentNumber}
                      onChange={(e) =>
                        handleInputChange("currentNumber", e.target.value)
                      }
                      className={`w-full px-4 py-3 border rounded-sm focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-400 no-focus-box ${
                        errors.currentNumber
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-300 focus:border-blue-500"
                      }`}
                      placeholder="Enter starting number"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                        />
                      </svg>
                    </div>
                  </div>
                  {errors.currentNumber && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {errors.currentNumber}
                    </p>
                  )}
                </div>
                {(organization?.industry == 6 ||
                  organization?.industry == 7 || organization?.industry == 8 || organization?.industry == 9 ) && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">
                        Under
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <select
                          type="number"
                          value={formData.under}
                          onChange={(e) =>
                            handleInputChange("under", e.target.value)
                          }
                          className={`w-full px-4 py-3 border rounded-sm focus:ring-2 focus:ring-blue-500 transition-colors placeholder-slate-400  no-focus-box ${
                            errors.under
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : "border-slate-300 focus:border-blue-500"
                          }`}
                          placeholder="E.g., 4 for 0001"
                        >
                          <option value="">Select Under</option>
                          <option value="hotel">Hotel</option>
                          <option value="restaurant">Restaurant</option>
                        </select>
                      </div>
                      {errors.under && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {errors.widthOfNumericalPart}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Live Preview Section */}
              <div className="bg-gray-300  p-6 border shadow">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Live Preview : {generatePreview()}
                </h3>
              </div>

              {/* Submit Button */}
              <div className="flex justify-start pt-4">
                <button
                  type="button"
                  onClick={onSubmit}
                  className=" w-full  flex justify-center items-center bg-pink-500 text-white font-semibold px-8 py-2 rounded transition-all duration-200 transform hover:scale-[1.005] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none gap-2 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Update Series</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VoucherSeriesForm;
