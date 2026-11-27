/* eslint-disable react/prop-types */
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { statesData } from "../../../../constants/states.js";
import useFetch from "../../../customHook/useFetch.jsx";
import countryList from "react-select-country-list";
import Select from "react-select";
function AddPartyForm({
  submitHandler,
  partyDetails = {},
  loading,
  setLoading,
  allowEditing = true,
}) {
  // const [tab, setTab] = useState("business");
  const [accountGroup, setAccountGroup] = useState("");
  const [subGroup, setSubGroup] = useState("");
  const [partyName, setPartyName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailID, setEmailID] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [panNo, setPanNo] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [creditPeriod, setCreditPeriod] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalanceType, setOpeningBalanceType] = useState("");
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState(0);
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Kerala");
  const [pin, setPin] = useState("");
  const [isHotelAgent, setIsHotelAgent] = useState(false);

  const options = useMemo(() => countryList().getData(), []);

  const selectedOrganization = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const { data: accountGroupList, loading: accountGroupLoading } = useFetch(
    `/api/sUsers/getAccountGroups/${selectedOrganization._id}`,
  );
  const { data: subGroupList, loading: subGroupLoading } = useFetch(
    `/api/sUsers/getSubGroup/${selectedOrganization._id}`,
  );

  const validAccountGroups = ["Sundry Creditors", "Sundry Debtors"];

  useEffect(() => {
    const loading = accountGroupLoading || subGroupLoading;
    setLoading(loading);
  }, [accountGroupLoading, subGroupLoading]);

  console.log(country);
  useEffect(() => {
    if (accountGroupList) {
      let findSpecificOne = accountGroupList.data?.find(
        (acc) => acc?.accountGroup == "Sundry Debtors",
      );
      setAccountGroup(findSpecificOne?._id);
    }
  }, [accountGroupList]);

  useEffect(() => {
    // setCmp_id(companytId);
    if (Object.entries(partyDetails)?.length > 0) {
      const {
        accountGroup,
        subGroup,
        partyName,
        mobileNumber,
        emailID,
        gstNo,
        panNo,
        billingAddress,
        shippingAddress,
        creditPeriod,
        creditLimit,
        openingBalanceType,
        openingBalanceAmount,
        country,
        state,
        pin,
        isHotelAgent,
      } = partyDetails;

      setAccountGroup(accountGroup?._id);
      setSubGroup(subGroup);
      setPartyName(partyName);
      setMobileNumber(mobileNumber);
      setEmailID(emailID);
      setGstNo(gstNo);
      setPanNo(panNo);
      setBillingAddress(billingAddress);
      setShippingAddress(shippingAddress);
      setCreditPeriod(creditPeriod);
      setOpeningBalanceAmount(openingBalanceAmount || 0);
      setOpeningBalanceType(openingBalanceType);
      setCreditLimit(creditLimit);
      setCountry(country);
      setState(state);
      setPin(pin);
      setIsHotelAgent(isHotelAgent);
    }
  }, [partyDetails]);

  const handleAccountGroup = (value) => {
    setAccountGroup(value);
    setSubGroup("");
  };
  const handleSubGroup = (value) => {
    setSubGroup(value);
  };

  const submitForm = async () => {
    if ([accountGroup, partyName].some((field) => field.trim() === "")) {
      toast.error("All fields are required");
      return;
    }

    if (
      selectedOrganization?.country === "India" &&
      mobileNumber &&
      !/^\d{10}$/.test(mobileNumber)
    ) {
      toast.error("Mobile number must be 10 digits");
      return;
    }

    const gstRegex = /^[0-9A-Za-z]{15}$/;

    if (gstNo && !gstRegex.test(gstNo)) {
      toast.error("Invalid GST number");
      return;
    }

    if (panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNo)) {
      toast.error("Invalid PAN number");
      return;
    }

    const formData = {
      accountGroup,
      partyName,
      mobileNumber,
      emailID,
      gstNo,
      panNo,
      billingAddress,
      shippingAddress,
      creditPeriod,
      creditLimit,
      openingBalanceType,
      openingBalanceAmount,
      country,
      state,
      pin,
      subGroup,
      isHotelAgent,
    };

    submitHandler(formData);
  };

  return (
    <div className={`${!allowEditing && "pointer-events-none opacity-50"}`}>
      <section
        className={` ${
          loading && "opacity-50 pointer-events-none"
        }  bg-blueGray-50`}
      >
        <div className="w-full px-4 mx-auto  pb-[30px] mt-5  ">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-blueGray-100 border-0">
            <div className="rounded-t bg-white mb-0 px-6 py-2">
              <div className="text-center flex justify-between"></div>
            </div>
            <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
              <form encType="multipart/form-data">
                <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
                  Add New Party Details
                </h6>

                <div className="flex flex-wrap">
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="account-group"
                      >
                        Account Group
                      </label>
                      <select
                        id="account-group"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        value={accountGroup}
                        onChange={(e) => handleAccountGroup(e.target.value)}
                      >
                        <option value="">Select Account Group</option>
                        {accountGroupList?.data
                          ?.filter((item) =>
                            validAccountGroups.includes(item.accountGroup),
                          )
                          .map((group, index) => (
                            <option key={index} value={group._id}>
                              {group?.accountGroup}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="account-group"
                      >
                        Sub Group
                      </label>
                      <select
                        disabled={!accountGroup}
                        id="sub-group"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        value={subGroup}
                        onChange={(e) => handleSubGroup(e.target.value)}
                      >
                        <option value="">Select Sub Group</option>
                        {subGroupList?.data
                          ?.filter(
                            (item) => item.accountGroup?._id === accountGroup,
                          )
                          ?.map((subGroup, index) => (
                            <option key={index} value={subGroup._id}>
                              {subGroup?.subGroup}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Party Name
                      </label>
                      <input
                        type="text"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        placeholder="Party Name"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Mobile Number
                      </label>
                      <input
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        type="number"
                        placeholder="Mobile Number"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Email ID
                      </label>
                      <input
                        value={emailID}
                        onChange={(e) => setEmailID(e.target.value)}
                        type="email"
                        placeholder="Email ID"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>
                  </div>
                  {(selectedOrganization?.industry == 6 ||
                    selectedOrganization?.industry == 7 ||
                    selectedOrganization?.industry == 9) && (
                    <div className="w-full lg:w-6/12 px-4">
                      <div className="relative w-full mb-3">
                        <label
                          className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                          htmlFor="hotel-agent"
                        >
                          Hotel Agent
                        </label>
                        <input
                          type="checkbox"
                          id="hotel-agent"
                          checked={isHotelAgent}
                          onChange={(e) => setIsHotelAgent(e.target.checked)}
                          className="form-checkbox h-5 w-5 text-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap">
                  {/* <div className="w-full lg:w-12/12 px-4"></div> */}
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Country
                      </label>
                      <Select
                        className="border-0 px-3 mr-12 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        options={options}
                        value={options.find((o) => o.label === country) || null}
                        onChange={(opt) => setCountry(opt?.label || "")}
                        placeholder="Select country"
                      />
                    </div>
                  </div>
                  {country === "India" ? (
                    <div className="w-full lg:w-6/12 px-4">
                      <div className="relative w-full mb-3">
                        <label
                          className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                          htmlFor="grid-password"
                        >
                          State
                        </label>
                        <select
                          className="border-0 px-2 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          onChange={(e) => {
                            setState(e.target.value);
                          }}
                          value={state}
                        >
                          <option value="" disabled>
                            Select a state
                          </option>
                          {statesData.map((indianState) => (
                            <option
                              key={indianState?.stateName}
                              value={indianState?.stateName}
                            >
                              {indianState?.stateName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full lg:w-6/12 px-4">
                      <div className="relative w-full mb-3">
                        <label
                          className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                          htmlFor="grid-password"
                        >
                          State
                        </label>
                        <input
                          className="border-0 px-2 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          onChange={(e) => {
                            setState(e.target.value);
                          }}
                          value={state}
                        ></input>
                      </div>
                    </div>
                  )}

                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Pin
                      </label>

                      <input
                        type={country == "India" ? "number" : "text"}
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        onChange={(e) => {
                          setPin(e.target.value);
                        }}
                        value={pin}
                        placeholder="Postal Code"
                      />
                    </div>
                  </div>
                </div>

                {/* {tab === "business" && ( */}
                <div className="flex flex-wrap mt-12">
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Gst.No
                      </label>
                      <input
                        type="text"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        value={gstNo}
                        onChange={(e) => setGstNo(e.target.value)}
                        placeholder="Gst.No"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Pan.No
                      </label>
                      <input
                        type="text"
                        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        value={panNo}
                        onChange={(e) => setPanNo(e.target.value)}
                        placeholder=" Pan.No"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Billing Address
                      </label>
                      <textarea
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        type="text"
                        placeholder={`street address\nCity`}
                        className="border-0 h-32 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-6/12 px-4">
                    <div className="relative w-full mb-3">
                      <label
                        className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                        htmlFor="grid-password"
                      >
                        Shipping Address
                      </label>
                      <textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder={`street address\nCity`}
                        className="border-0  h-32 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center  gap-0 mt-4 m-4 relative "></div>
                <button
                  disabled={loading}
                  className="bg-pink-500 mt-4 ml-4 w-20 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 transform hover:scale-105"
                  type="button"
                  onClick={submitForm}
                >
                  Update
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AddPartyForm;
