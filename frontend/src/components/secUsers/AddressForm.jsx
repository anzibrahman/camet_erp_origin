/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaLocationDot } from "react-icons/fa6";
import { BsPersonPlusFill } from "react-icons/bs";

/**
 * AddressForm Component
 * 
 * This component handles the collection and management of billing and shipping addresses.
 * It supports pre-filling data from various sources and validates required fields.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.getFormData - Callback function to pass form data to parent
 * @param {boolean} props.showShipTo - Flag to control visibility of shipping section
 */
function AddressForm({ getFormData, showShipTo = true, setLoading, loading, desktopLayout = false }) {
  // ================ STATE MANAGEMENT ================
  const [formData, setFormData] = useState({
    billToName: "",
    billToAddress: "",
    billToPin: "",
    billToGst: "",
    billToMobile: "",
    billToEmail: "",
    billToSupply: "",
    shipToName: "",
    shipToAddress: "",
    shipToPin: "",
    shipToGst: "",
    shipToMobile: "",
    shipToEmail: "",
    shipToSupply: "",
    billToParty: "",
    shipToParty: "",
  });
  
  // Loading state to control loader visibility
  // Timer to track form operations
  
  // ================ REDUX SELECTORS ================
  // Get party data from Redux store
  const {
    billToParty,
    shipToParty,
    party: partyDetails,
    voucherType
  } = useSelector((state) => state?.commonVoucherSlice);

  // Get new address data if available
  const newBillToShipTo =
    useSelector((state) => state?.commonVoucherSlice?.party.newAddress) || {};

  // Get company details from Redux store
  const {
    name: companyName,
    email: companyEmail,
    mobile: companyMobile,
    pin: companyPin,
    gstNum: companyGst,
    state: companyState,
    flat: companyFlat,
    landmark: companyLandmark,
    road: companyRoad,
  } = useSelector((state) => state?.secSelectedOrganization?.secSelectedOrg) || {};

  // ================ ROUTER HOOKS ================
  const navigate = useNavigate();
  
  // Check if we're in purchase bill mode to use company address
  let useCompanyAddress = false;
  if (voucherType==="purchase") {
    useCompanyAddress = true;
  }

  // ================ COMPONENT INITIALIZATION ================
  useEffect(() => {
    // Start timing when component mounts
    setLoading(true);
    
    // Timeout to simulate initial data loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 1000);

    // Case: No valid data available, navigate back
    if (partyDetails && Object.keys(partyDetails).length === 0) {
      navigate(-1);
      return;
    }

    // Check if billToParty and shipToParty exist
    const hasBillToParty = billToParty && Object.keys(billToParty).length > 0;
    const hasShipToParty = shipToParty && Object.keys(shipToParty).length > 0;
    const hasNewBillToShipTo =
      newBillToShipTo && Object.keys(newBillToShipTo).length > 0;

    // Case 1: Both parties exist - populate from parties
    if (hasBillToParty && hasShipToParty) {
      const {
        partyName,
        gstNo,
        emailID,
        mobileNumber,
        pin,
        billingAddress,
        state,
      } = billToParty;

      const {
        partyName: partyNameShipTo,
        gstNo: gstNoShipTo,
        emailID: emailIDShipTo,
        mobileNumber: mobileNumberShipTo,
        pin: pinShipTo,
        billingAddress: billingAddressShipTo,
        state: stateShipTo,
      } = shipToParty;

      if (useCompanyAddress) {
        // Using company address for shipping
        setFormData({
          ...formData,
          billToName: partyName,
          billToAddress: billingAddress,
          billToPin: pin,
          billToGst: gstNo,
          billToMobile: mobileNumber,
          billToEmail: emailID,
          billToSupply: state,
          shipToName: companyName,
          shipToAddress:
            companyFlat + "," + companyLandmark + "," + companyRoad,
          shipToPin: companyPin,
          shipToGst: companyGst,
          shipToMobile: companyMobile,
          shipToEmail: companyEmail,
          shipToSupply: companyState,
        });
      } else {
        // Using separate ship-to party
        setFormData({
          ...formData,
          billToName: partyName,
          billToAddress: billingAddress,
          billToPin: pin,
          billToGst: gstNo,
          billToMobile: mobileNumber,
          billToEmail: emailID,
          billToSupply: state,
          shipToName: partyNameShipTo,
          shipToAddress: billingAddressShipTo,
          shipToPin: pinShipTo,
          shipToGst: gstNoShipTo,
          shipToMobile: mobileNumberShipTo,
          shipToEmail: emailIDShipTo,
          shipToSupply: stateShipTo,
        });
      }
    }
    // Case 2: Use newBillToShipTo, but merge with updated party data if available
    else if (hasNewBillToShipTo) {
      const {
        billToName,
        billToAddress,
        billToPin,
        billToGst,
        billToMobile,
        billToEmail,
        billToSupply,
        shipToName,
        shipToAddress,
        shipToPin,
        shipToGst,
        shipToMobile,
        shipToEmail,
        shipToSupply,
        billToParty: newBillToParty,
        shipToParty: newShipToParty,
      } = newBillToShipTo;

      // Start with base data from newBillToShipTo
      const updatedFormData = {
        ...formData,
        billToName,
        billToAddress,
        billToPin,
        billToGst,
        billToMobile,
        billToEmail,
        billToSupply,
        shipToName,
        shipToAddress,
        shipToPin,
        shipToGst,
        shipToMobile,
        shipToEmail,
        shipToSupply,
      };

      // If billToParty has been updated, merge its data
      if (hasBillToParty && (!newBillToParty || billToParty !== newBillToParty)) {
        updatedFormData.billToName = billToParty.partyName;
        updatedFormData.billToAddress = billToParty.billingAddress;
        updatedFormData.billToPin = billToParty.pin;
        updatedFormData.billToGst = billToParty.gstNo;
        updatedFormData.billToMobile = billToParty.mobileNumber;
        updatedFormData.billToEmail = billToParty.emailID;
        updatedFormData.billToSupply = billToParty.state;
      }

      // If shipToParty has been updated, merge its data
      if (hasShipToParty && (!newShipToParty || shipToParty !== newShipToParty)) {
        updatedFormData.shipToName = shipToParty.partyName;
        updatedFormData.shipToAddress = shipToParty.billingAddress;
        updatedFormData.shipToPin = shipToParty.pin;
        updatedFormData.shipToGst = shipToParty.gstNo;
        updatedFormData.shipToMobile = shipToParty.mobileNumber;
        updatedFormData.shipToEmail = shipToParty.emailID;
        updatedFormData.shipToSupply = shipToParty.state;
      }

      setFormData(updatedFormData);
    }
    
    // Cleanup timer on component unmount
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [partyDetails, billToParty, shipToParty]);

  // ================ EVENT HANDLERS ================
  /**
   * Handle input field changes
   * @param {Object} e - Event object
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  /**
   * Navigate to party search screen
   * @param {string} type - Type of party to add (bill-to or ship-to)
   */
  const handleAddParty = (type) => {
    navigate("/sUsers/searchPartySales", {
      state: {
        from: "AddressForm",
        type: type,
      },
    });
  };

  /**
   * Handle form submission
   * Validates required fields and passes data to parent
   */
  const handleSubmit = () => {
    // Start loading and capture submission time
    setLoading(true);

    
    // Extract form fields for validation
    const {
      billToName,
      billToAddress,
      billToPin,
      billToGst,
      billToMobile,
      billToEmail,
      billToSupply,
      shipToName,
      shipToAddress,
      shipToPin,
      shipToGst,
      shipToMobile,
      shipToEmail,
      shipToSupply,
    } = formData;
    
    // Define required fields and their error messages
    const requiredFields = [
      { value: billToName, message: "Bill To Name is required" },
      { value: billToAddress, message: "Bill To Address is required" },
      { value: billToPin, message: "Bill To Pin is required" },
      { value: billToGst, message: "Bill To GST is required" },
      { value: billToMobile, message: "Bill To Mobile is required" },
      { value: billToEmail, message: "Bill To Email is required" },
      { value: billToSupply, message: "Bill To Supply is required" },
      { value: shipToName, message: "Ship To Name is required" },
      { value: shipToAddress, message: "Ship To Address is required" },
      { value: shipToPin, message: "Ship To Pin is required" },
      { value: shipToGst, message: "Ship To GST is required" },
      { value: shipToMobile, message: "Ship To Mobile is required" },
      { value: shipToEmail, message: "Ship To Email is required" },
      { value: shipToSupply, message: "Ship To Supply is required" },
    ];

    // Validate required fields
    for (const field of requiredFields) {
      if (field.value === null) {
        setFormData((prev) => ({
          ...prev,
          field: "",
        }));
        
        // Stop loading if validation fails
        setLoading(false);
        return;
      }
    }
    
    // Simulate API call or processing delay
    setTimeout(() => {
      // Pass data to parent component
      getFormData(formData);
    
      
      // End loading state
      setLoading(false);
    }, 1000); // Simulated processing time
  };


  return (
    <div className={`address-form ${desktopLayout ? "address-form-desktop" : ""} ${loading && "animate-pulse pointer-events-none opacity-80"} flex gap-6 md:px-10 pb-10`} >
      <div className="w-full  ">
        <div className="mt-5   shadow-lg p-3 sm:p-6 border">
          <div className="flex">
            <div className="flex gap-2 items-center py-5 pl-5 overflow-hidden">
              <FaLocationDot className="w-6 h-6 text-red-800" />
              <h1 className="inline text-2xl text-blue-400 font-bold  leading-none">
                Bill To
              </h1>
            </div>
          </div>

          <div className="px-5 pb-5">
            <label className="block text-sm font-medium text-gray-700">
              Party
            </label>
            <div
              onClick={() => {
                handleAddParty("billTo");
              }}
              className=" cursor-pointer mt-2 mb-3 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded-md "
            >
              <span className="text-gray-700 font-semibold text-sm">
                Change Party
              </span>
              <button
                type="button"
                className=" cursor-pointer font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm"
              >
                <BsPersonPlusFill size={17} />
              </button>
            </div>
            <label
              htmlFor="billToParty"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="billToName"
              name="billToName"
              value={formData.billToName}
              onChange={handleInputChange}
              placeholder="Name"
              className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base transition duration-500 ease-in-out transform border-b border-gray-400 rounded-none outline-none focus:border-b-black "
            />

            <label
              htmlFor="billToAddress"
              className="block text-sm font-medium text-gray-700 mt-4"
            >
              Address
            </label>
            <textarea
              id="billToAddress"
              name="billToAddress"
              value={formData.billToAddress}
              onChange={handleInputChange}
              placeholder="Address"
              className="text-black no-focus-box placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base border-0 border-b border-gray-400 focus:border-b-black "
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <div className=" w-full sm:w-2/4  pr-2">
                <label
                  htmlFor="billToPin"
                  className="block text-sm font-medium text-gray-700 mt-4"
                >
                  Pin
                </label>
                <input
                  id="billToPin"
                  name="billToPin"
                  type="number"
                  value={formData.billToPin}
                  onChange={handleInputChange}
                  placeholder="Pin"
                  className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base transition duration-500 ease-in-out transform border-0 border-b   no-focus-box border-gray-400 rounded-none outline-none focus:border-b-black "
                />
              </div>
              <div className="flex-grow w-full sm:w-2/4">
                <label
                  htmlFor="billToGst"
                  className="block text-sm font-medium text-gray-700 mt-4"
                >
                  Gst No.
                </label>
                <input
                  id="billToGst"
                  name="billToGst"
                  value={formData.billToGst}
                  onChange={handleInputChange}
                  placeholder="Gst No."
                  className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base transition duration-500 ease-in-out transform  no-focus-box   border-0 border-b outline-none "
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className=" w-full sm:w-2/4 pr-2">
                <label
                  htmlFor="billToMobile"
                  className="block text-sm font-medium text-gray-700 mt-4"
                >
                  Mobile
                </label>
                <input
                  id="billToMobile"
                  name="billToMobile"
                  value={formData.billToMobile}
                  onChange={handleInputChange}
                  placeholder="Mobile"
                  type="number"
                  className="text-black input-number placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none "
                />
              </div>
              <div className="w-full sm:w-2/4">
                <label
                  htmlFor="billToEmail"
                  className="block text-sm font-medium text-gray-700 mt-4"
                >
                  Email
                </label>
                <input
                  id="billToEmail"
                  name="billToEmail"
                  value={formData.billToEmail}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
                />
              </div>
            </div>
            <label
              htmlFor="billToSupply"
              className="block text-sm font-medium text-gray-700 mt-4"
            >
              Place Of Supply
            </label>
            <input
              id="billToSupply"
              name="billToSupply"
              value={formData.billToSupply}
              onChange={handleInputChange}
              placeholder="Place Of Supply"
              className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
            />
          </div>
        </div>

        {showShipTo && (
          <div className=" mt-6 border rounded-b-lg shadow-xl p-3 sm:p-6">
            <div className="flex">
              <div className="flex gap-2 items-center py-5 pl-5 overflow-hidden  ">
                <FaLocationDot className="w-6 h-6 text-red-800" />
                <h1 className="inline text-2xl text-blue-400 font-bold  leading-none">
                  Ship To
                </h1>
              </div>
            </div>
            <div className="px-5 pb-5">
              <label className="block text-sm font-medium text-gray-700">
                Party
              </label>
              <div
                onClick={() => {
                  handleAddParty("shipTo");
                }}
                className=" cursor-pointer  mt-2 mb-3 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded-md "
              >
                <span className="text-gray-700 font-semibold text-sm">
                  Change Party
                </span>
                <button
                  type="button"
                  className=" cursor-pointer font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm"
                >
                  <BsPersonPlusFill size={17} />
                </button>
              </div>
              <label
                htmlFor="shipToParty"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="shipToName"
                name="shipToName"
                value={formData.shipToName}
                onChange={handleInputChange}
                placeholder="Name"
                className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
              />
              <label
                htmlFor="shipToAddress"
                className="block text-sm font-medium text-gray-700 mt-4"
              >
                Address
              </label>
              <textarea
                id="shipToAddress"
                name="shipToAddress"
                value={formData.shipToAddress}
                onChange={handleInputChange}
                placeholder="Address"
                className="text-black placeholder-gray-600 w-full px-2 py-5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="  w-full sm:w-2/4 pr-2">
                  <label
                    htmlFor="shipToPin"
                    className="block text-sm font-medium text-gray-700 mt-4"
                  >
                    Pin
                  </label>
                  <input
                    id="shipToPin"
                    name="shipToPin"
                    type="number"
                    value={formData.shipToPin}
                    onChange={handleInputChange}
                    placeholder="Pin"
                    className="text-black input-number placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
                  />
                </div>
                <div className=" w-full sm:w-2/4">
                  <label
                    htmlFor="shipToGst"
                    className="block text-sm font-medium text-gray-700 mt-4"
                  >
                    Gst No.
                  </label>
                  <input
                    id="shipToGst"
                    name="shipToGst"
                    value={formData.shipToGst}
                    onChange={handleInputChange}
                    placeholder="Gst No."
                    className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className=" w-full sm:w-2/4 pr-2">
                  <label
                    htmlFor="shipToMobile"
                    className="block text-sm font-medium text-gray-700 mt-4"
                  >
                    Mobile
                  </label>
                  <input
                    id="shipToMobile"
                    name="shipToMobile"
                    type="number"
                    value={formData.shipToMobile}
                    onChange={handleInputChange}
                    placeholder="Mobile"
                    className="input-number input-number text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
                  />
                </div>
                <div className="w-full sm:w-2/4 pr-2">
                  <label
                    htmlFor="shipToEmail"
                    className="block text-sm font-medium text-gray-700 mt-4"
                  >
                    Email
                  </label>
                  <input
                    id="shipToEmail"
                    name="shipToEmail"
                    value={formData.shipToEmail}
                    onChange={handleInputChange}
                    placeholder="Email"
                    className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
                  />
                </div>
              </div>
              <label
                htmlFor="shipToSupply"
                className="block text-sm font-medium text-gray-700 mt-4"
              >
                Place Of Supply
              </label>
              <input
                id="shipToSupply"
                name="shipToSupply"
                value={formData.shipToSupply}
                onChange={handleInputChange}
                placeholder="Place Of Supply"
                className="text-black placeholder-gray-600 w-full px-2 py-2.5 mt-2 text-base no-focus-box border-0 border-b  outline-none"
              />
            </div>
          </div>
        )}
        <div className="pt-4 flex items-center space-x-4 mt-10">
          <button
            onClick={() => {
              navigate(-1);
            }}
            className="flex justify-center items-center w-full text-gray-900 px-2 py-3 rounded-md  border "
          >
            <svg
              className="w-6 h-6 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>{" "}
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-pink-500 flex justify-center items-center w-full text-white px-2 py-3 rounded-md focus:outline-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddressForm;
