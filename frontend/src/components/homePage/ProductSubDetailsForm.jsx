/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "sonner";
import api from "../../api/api";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import Pagination from "../../components/common/Pagination";
import { useLocation } from "react-router-dom";
import { setSecSelectedOrganization } from "../../../slices/secSelectedOrgSlice";

const ProductSubDetailsForm = ({
  tab,
  handleLoader,
  isHotel,
  isRestaurants = false,
  categoriesData = [],
}) => {
  console.log(isHotel)
  const [value, setValue] = useState("");
  const [price, setPrice] = useState("");
  const [data, setData] = useState([]);
  const [reload, setReload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

   const [formsData, setFormsData] = useState({
    dineIn: "",
    takeaway: "",
    roomService: "",
    delivery: "",
  });
  const [edit, setEdit] = useState({
    id: "",
    enabled: false,
  });

  const location = useLocation();
  const dispatch = useDispatch();

  // Call useSelector hooks unconditionally
  const selectedOrgId = useSelector(
    (state) => state?.setSelectedOrganization?.selectedOrg?._id
  );
  const secSelectedOrgId = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg?._id
  );

  let user;
  let orgId;

  if (location?.pathname?.startsWith("/pUsers")) {
    user = "pUsers";
    orgId = selectedOrgId;
  } else {
    user = "sUsers";
    orgId = secSelectedOrgId;
  }

  useEffect(() => {
    getSubDetails();
    setValue("");
    setPrice("");
    setCategories("");
     setFormsData({
      dineIn: "",
      takeaway: "",
      roomService: "",
      delivery: "",
      serviceType:'',
    });
    setEdit({ id: "", enabled: false });
  }, [reload]);

  useEffect(() => {
    if (value === "") {
      setEdit(false);
    }
  }, [value]);
  console.log(tab);
  const getSubDetails = async (data) => {
    try {
      setLoading(true);
      handleLoader(true);
      const res = await api.get(
        `/api/${user}/getProductSubDetails/${orgId}?type=${tab}${
          isRestaurants ? "&under=restaurant" : ""
        }`,
        {
          withCredentials: true,
        }
      );
      setData(res?.data?.data);
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
      handleLoader(false);
    }
  };

  const handleSubmit = async (value) => {
    const formData = {
      [tab]: value,
      ...(isHotel && { price }),
      ...(isRestaurants && { under: "restaurant" }),
      ...(tab === "foodItems" && { category_id: categories , under: "restaurant"}),
      ...(tab === "pricelevel" && {
      dineIn: formsData.dineIn,
      takeaway: formsData.takeaway,
      roomService: formsData.roomService,
      delivery: formsData.delivery,
    }),
    };

    console.log(formData);
    try {
      setLoading(true);
      handleLoader(true);
      const res = await api.post(
        `/api/${user}/addProductSubDetails/${orgId}`,
        formData,
        {
          withCredentials: true,
        }
      );

      if (tab === "godown") {
        const companyUpdate = res.data.companyUpdate;
        if (companyUpdate) {
          dispatch(setSecSelectedOrganization(companyUpdate));
        }
      }

      toast.success(res.data.message);
      setReload(!reload);
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
      handleLoader(false);
    }
  };

  const deleteSubDetails = async (id, type) => {
    if (tab === "godown") {
      const isDefaultGodown = data.find((d) => d._id === id)?.defaultGodown;

      if (isDefaultGodown) {
        const result = await Swal.fire({
          title: "Cannot Delete",
          text: "Cannot delete default godown",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }
    }
    try {
      // Show a confirmation dialog
      const result = await Swal.fire({
        title: "Are you sure?",
        text: `You are about to delete this ${tab}. This action cannot be undone!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      // If the user confirms the deletion
      if (result.isConfirmed) {
        setLoading(true);
        handleLoader(true);
        const res = await api.delete(
          `/api/${user}/deleteProductSubDetails/${orgId}/${id}?type=${tab}`,
          {
            withCredentials: true,
          }
        );

        setReload(!reload);
        // Show a success message
        Swal.fire("Deleted!", `The ${tab} has been deleted.`, "success");

        // You might want to update your local state here
      }
    } catch (error) {
      console.log(error);

      // Show an error message
      Swal.fire(
        "Error",
        error.response?.data?.message || "An error occurred while deleting",
        "error"
      );
    } finally {
      setLoading(false);
      handleLoader(false);
    }
  };

const handleEdit = async (id, value, data, categoriesData) => {
  console.log("HandleEdit - Tab:", tab);
  console.log("HandleEdit - Value:", value);
  console.log("HandleEdit - Data:", data);
  
  if (tab === "bedType") {
    setValue(data?.category);
  } else if (tab === "roomFloor") {
    setValue(data?.subcategory);
  } else if (isHotel && tab === "roomType") {
    setPrice(data?.roomRent);
    setValue(data?.brand);
  } else if (tab === "Regional Food Category") {
    setValue(data?.category);
  } else if (tab === "foodItems") {
    setValue(data?.subcategory);
    setCategories(data?.category_id);
  } else if (tab === "pricelevel") {
    setValue(data?.pricelevel);
    
    console.log("All data fields:", Object.keys(data));
    console.log("Full data object:", data);
    
    // Get the actual values from the database
    const dineInValue = data.dineIn || "";
    const takeawayValue = data.takeaway || "";
    const deliveryValue = data.delivery || "";
    const roomServiceValue = data.roomService || "";
    
    console.log("Service values:", {
      dineIn: dineInValue,
      takeaway: takeawayValue,
      delivery: deliveryValue,
      roomService: roomServiceValue
    });
    
    // Check which service has "enabled" value (not just exists)
    let selectedService = "none";
    
    if (dineInValue === "enabled") {
      selectedService = "dinein";
    } else if (takeawayValue === "enabled") {
      selectedService = "takeaway";
    } else if (deliveryValue === "enabled") {
      selectedService = "delivery";
    } else if (roomServiceValue === "enabled") {
      selectedService = "roomservice";
    }
    
    console.log("Determined service type:", selectedService);
    
    // Set form data with the actual database values
    setFormsData({
      dineIn: dineInValue,
      takeaway: takeawayValue,
      roomService: roomServiceValue,
      delivery: deliveryValue,
      serviceType: selectedService
    });
  } else {
    setValue(value || data?.[tab]);
  }

  if (tab === "godown") {
    const isDefaultGodown = data?.defaultGodown;
    if (isDefaultGodown) {
      await Swal.fire({
        title: "Cannot Edit",
        text: "Cannot edit default godown",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }
  }
  
  setEdit({
    id,
    enabled: true,
  });
};
  // Edit subdetails
  const editSubDetails = async (id, data) => {
  // Build form data based on tab type
  let formData = {};
  
  if (tab === "pricelevel") {
    formData = {
      pricelevel: value, // Make sure we're sending the pricelevel name
      dineIn: formsData.dineIn,
      takeaway: formsData.takeaway,
      roomService: formsData.roomService,
      delivery: formsData.delivery,

    };
  } else if (tab === "roomType") {
    formData = {
      roomType: value,
      price: price,
    };
  } else if (tab === "foodItems") {
    formData = {
      foodItems: value,
      category_id: categories,
    };
  } else if (tab === "roomFloor") {
    formData = {
      roomFloor: value,
    };
  } else if (tab === "bedType") {
    formData = {
      bedType: value,
    };
  } else if (tab === "Regional Food Category") {
    formData = {
      "Regional Food Category": value,
    };
  } else {
    formData = {
      [tab]: value,
      ...(isHotel && { price }),
    };
  }

  console.log("Sending form data:", formData);
  console.log("Edit ID:", id);
  console.log("Tab:", tab);

  try {
    setLoading(true);
    handleLoader(true);
    
    const res = await api.put(
      `/api/${user}/editProductSubDetails/${orgId}/${id}?type=${tab}`,
      formData,
      {
        withCredentials: true,
      }
    );
    
    toast.success(res.data.message);
    setValue("");
    setPrice("");
    setCategories("");
    setFormsData({
      dineIn: "",
      takeaway: "",
      roomService: "",
      delivery: "",
    });
    setEdit({ id: "", enabled: false });
    setReload(!reload);
    
  } catch (error) {
    console.log(error);
    toast.error(error.response?.data?.message || "An error occurred");
  } finally {
    setLoading(false);
    handleLoader(false);
  }
};

  console.log(tab);
  return (
   // Replace your main container div with this fixed version

<div className={`${loading ? "opacity-50 animate-pulse" : ""} h-screen flex flex-col`}>
  {/* Fixed Header Section */}
  <div className="flex-shrink-0 sticky top-0 z-10">
    <div className="flex justify-center items-center flex-col bg-[#457b9d] py-8">
      <h2 className="font-bold uppercase text-white mb-4">
        ADD YOUR DESIRED {tab}
      </h2>
      
      <input
        type="text"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (edit?.enabled) {
              editSubDetails(edit.id, value);
            } else {
              handleSubmit(value);
            }
          }
        }}
        placeholder={`Enter your ${tab} name`}
        className="w-4/6 sm:w-2/6 p-2 text-black border border-gray-300 rounded-full mb-3 text-center"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      {isHotel && (tab !== "bedType" && tab !== "roomFloor") && (
        <input
          type="number"
          placeholder={`Enter your ${tab} price`}
          className="w-4/6 sm:w-2/6 p-2 text-black border border-gray-300 rounded-full mb-3 text-center"
          value={price}
          onKeyDown={(e) => {
            if (
              !/[0-9]/.test(e.key) &&
              e.key !== "Backspace" &&
              e.key !== "Delete" &&
              e.key !== "ArrowLeft" &&
              e.key !== "ArrowRight" &&
              e.key !== "Tab" &&
              e.key !== "Enter"
            ) {
              e.preventDefault();
            }
          }}
          onChange={(e) => setPrice(e.target.value)}
        />
      )}

      {tab === "foodItems" && (
        <select
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          className="w-4/6 sm:w-2/6 p-2 border border-gray-300 rounded-full mb-3 text-center"
        >
          <option value="">Select Category</option>
          {categoriesData.map((cat) => (
            <option className="text-black" key={cat._id} value={cat._id}>
              {cat.category}
            </option>
          ))}
        </select>
      )}

      {/* Enhanced PriceLevel Section - Compact for better scrolling */}
{tab === "pricelevel" && (
  <select
    value={formsData.serviceType || ""} // Add fallback to empty string
    onChange={(e) => {
      const selectedValue = e.target.value;
      console.log("Service type changed to:", selectedValue); // Debug log
      
      // Reset all services first
      const resetServices = {
        dineIn: "",
        takeaway: "",
        roomService: "",
        delivery: "",
        serviceType: selectedValue
      };
      
      // Set the selected service
      if (selectedValue === "dinein") resetServices.dineIn = "enabled";
      else if (selectedValue === "takeaway") resetServices.takeaway = "enabled";
      else if (selectedValue === "delivery") resetServices.delivery = "enabled";
      else if (selectedValue === "roomservice") resetServices.roomService = "enabled";
      
      setFormsData(resetServices);
    }}
    className="w-4/6 sm:w-2/6 p-2 border border-gray-300 rounded-full mt-3 text-center"
  >
    <option value="">Select Service Type</option>
    <option value="none">None</option>
    <option value="dinein">Dine-In</option>
    <option value="takeaway">Takeaway</option>
    <option value="delivery">Delivery</option>
    <option value="roomservice">Room Service</option>
  </select>
)}
      <button
        onClick={
          edit?.enabled
            ? () => editSubDetails(edit.id, value)
            : () => handleSubmit(value)
        }
        className="bg-gray-800 text-white px-6 py-2 rounded-full mt-4 text-sm font-bold hover:bg-gray-700 transition-colors"
      >
        {edit?.enabled ? "Update" : "Submit"}
      </button>
    </div>
    <div className="h-3 bg-gray-100"></div>
  </div>

  {/* Scrollable Content Section */}
  <div className="flex-1 overflow-hidden">
    <section className="h-full overflow-y-auto px-4 pb-14 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
      <div className="mt-2 w-full">
        {data?.length > 0 && !loading ? (
          data.map((el, index) => {
            if(isHotel && el.under == "restaurant"){
              return null
            }
            return (
              <div
                key={el._id}
                className="flex items-center justify-between border-t-0 align-middle whitespace-nowrap p-4 mb-2 border-b cursor-pointer hover:bg-slate-100 hover:translate-y-[1px] transition-all duration-200"
              >
                <div className="px-6 text-left text-wrap text-blueGray-700 text-sm font-bold text-gray-500 w-1/3">
                  {el[tab]
                    ? el[tab]
                    : el?.brand
                    ? el?.brand
                    : el?.category
                    ? el?.category
                    : el.subcategory}
                </div>
                
              {el?.roomRent !== undefined && el?.roomRent !== null && (
                  <div className="px-6 text-left  text-wrap text-blueGray-700 text-sm font-bold text-gray-500 w-1/3">
                    {el?.roomRent}
                  </div>
                )}

                {/* Enhanced PriceLevel Display */}
                {tab === "pricelevel" && (
                  <div className="flex flex-wrap gap-1 text-xs w-1/3">
                    {el?.dineIn && (
                      <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${
                        el.dineIn === 'enabled' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        🍽️ {el.dineIn}
                      </span>
                    )}
                    {el?.takeaway && (
                      <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${
                        el.takeaway === 'enabled' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        🥡 {el.takeaway}
                      </span>
                    )}
                    {el?.roomService && (
                      <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${
                        el.roomService === 'enabled' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        🏨 {el.roomService}
                      </span>
                    )}
                    {el?.delivery && (
                      <span className={`px-2 py-1 rounded-full text-white text-xs font-medium ${
                        el.delivery === 'enabled' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        🚚 {el.delivery}
                      </span>
                    )}
                  </div>
                )}

                {(el?.category_id && categoriesData.length > 0) && (
                  <div className="px-6 text-left text-wrap text-blueGray-700 text-sm font-bold text-gray-500 w-1/3">
                    {categoriesData?.find((cat) => cat._id === el?.category_id)?.category}
                  </div>
                )}

                <div className="flex items-end gap-4 text-xs w-1/3 justify-end">
                  <button
                    onClick={() => handleEdit(el._id, el[tab], el)}
                    className="cursor-pointer text-blue-500 hover:text-blue-700 transition-colors p-2"
                  >
                    <FaEdit size={15} />
                  </button>
                  <button
                    onClick={() => deleteSubDetails(el._id)}
                    className="cursor-pointer text-red-500 hover:text-red-700 transition-colors p-2"
                  >
                    <FaTrash size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 font-bold whitespace-nowrap p-4">
            {!loading && <p>Data not found</p>}
          </div>
        )}
      </div>
    </section>
  </div>
</div>
  );
};

export default ProductSubDetailsForm;
