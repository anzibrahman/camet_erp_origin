import { useEffect, useState } from "react";
import { units } from "../../../../constants/units";
import { toast } from "sonner";
import { MdPlaylistAdd, MdDelete } from "react-icons/md";
function RoomRegisterComponent({ pageName, optionsData, sendToParent , editData }) {
  const [priceLevelRows, setPriceLevelRows] = useState([
    { priceLevel: "", priceRate: "" },
  ]);
  const [roomData, setRoomData] = useState({
    roomName: "",
    roomType: "",
    bedType: "",
    roomFloor: "",
    unit: "DAY",
    hsn: "",
  });
 useEffect(() => {
  if (editData) {
    setRoomData({
      roomName: editData.roomName,
      roomType: editData.roomType?._id || "",
      bedType: editData.bedType || "",
      roomFloor: editData.roomFloor || "",
      unit: editData.unit || "DAY",
      // FIX: editData.hsn is already the full HSN object, just use its _id
      hsn: editData.hsn?._id || "",
    });
    
    // Keep one editable row when the room does not yet have a price level.
    // Mapping an empty array directly would render no row, leaving nothing to select.
    if (Array.isArray(editData.priceLevel)) {
      const existingPriceLevels = editData.priceLevel.map((item) => ({
        priceLevel: item.priceLevel?._id || "",
        priceRate: item.priceRate || "",
      }));

      setPriceLevelRows(
        existingPriceLevels.length > 0
          ? existingPriceLevels
          : [{ priceLevel: "", priceRate: "" }],
      );
    }
    
    console.log("Edit data loaded:", editData);
  }
}, [editData, optionsData]);

  const handleAddRow = () => {
    const lastRow = priceLevelRows[priceLevelRows.length - 1];

    // Check if fields are filled
    if (!lastRow?.priceLevel || !lastRow?.priceRate) {
      toast.error("Add Level name and Rate");
      return;
    }

    // Check for duplicate pricelevel
    const isDuplicate = priceLevelRows
      .slice(0, -1) // exclude the last row being added
      .some((row) => row.priceLevel === lastRow.priceLevel);

    if (isDuplicate) {
      toast.error("This price level already exists");
      return;
    }

    // Add new row if everything is valid
    setPriceLevelRows([...priceLevelRows, { priceLevel: "", priceRate: "" }]);
  };

  const handleLevelChange = (index, value) => {
    console.log(value);
    const updatedRows = [...priceLevelRows];
    updatedRows[index].priceLevel = value;
    setPriceLevelRows(updatedRows);
  };

  const handleRateChange = (index, value) => {
    const updatedRows = [...priceLevelRows];
    updatedRows[index].priceRate = value;
    setPriceLevelRows(updatedRows);
  };

 const handleDeleteRow = (index) => {
  // Use index instead of priceLevelId for consistency
  setPriceLevelRows(prev => {
    const newRows = [...prev];
    newRows.splice(index, 1);
    return newRows.length === 0 
      ? [{ priceLevel: "", priceRate: "" }] 
      : newRows;
  });
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "roomName") {
      setRoomData({ ...roomData, roomName: value});
    } else {
      setRoomData({ ...roomData, [name]: value });
    }
  };

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const validDateFormData = () => {
  if (!isNonEmptyString(roomData?.roomName)) {
    toast.error("Room name is required");
    return false;
  }

  if (!isNonEmptyString(roomData?.roomType)) {
    toast.error("Room type is required");
    return false;
  }

  if (!isNonEmptyString(roomData?.bedType)) {
    toast.error("Bed type is required");
    return false;
  }

  if (!isNonEmptyString(roomData?.roomFloor)) {
    toast.error("Room floor is required");
    return false;
  }

  if (!isNonEmptyString(roomData?.unit)) {
    toast.error("Unit is required");
    return false;
  }

  if (!isNonEmptyString(roomData?.hsn)) {
    toast.error("HSN is required");
    return false;
  }
  return true; // All fields valid
};


  const submitHandler = () => {
    if (!validDateFormData(roomData)) {
      return;
    }
    let newPriceLevelRows = priceLevelRows.filter(
      (item) => item.priceLevel !== ""
    );
    console.log("newPriceLevelRows", newPriceLevelRows);
    console.log("roomData", roomData);
    sendToParent(roomData, newPriceLevelRows);
  };
  
  return (
    <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
      <div>
        <h6 className="text-blueGray-400 text-sm mt-3 mb-6 font-bold uppercase">
          {pageName}
        </h6>
        <div className="flex flex-wrap">
          <div className="w-full lg:w-6/12 px-4">
            <div className="relative w-full mb-3">
              <label
                className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                htmlFor="grid-password"
              >
                Room Name
              </label>
              <input
                type="text"
                placeholder="Room Name"
                value={roomData.roomName}
                name="roomName"
                onChange={handleChange}
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
                Room Type
              </label>
              <select
                type="text"
                value={roomData.roomType}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="roomType"
                onChange={handleChange}
              >
                <option value="">Select Room Type</option>
                {optionsData?.brand?.map((option, index) => (
                  <option key={index} value={option?._id}>
                    {option?.name}
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
                Bed Type
              </label>
              <select
                type="text"
                value={roomData.bedType}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="bedType"
                onChange={handleChange}
              >
                <option value="">Select Bed Type</option>
                {optionsData?.category?.map((option, index) => (
                  <option key={index} value={option?._id}>
                    {option?.name}
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
                Room Floor
              </label>
              <select
                type="text"
                value={roomData.roomFloor}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="roomFloor"
                onChange={handleChange}
              >
                <option value="">Select Room Floor</option>
                {optionsData?.subcategory?.map((option, index) => (
                  <option key={index} value={option?._id}>
                    {option?.name}
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
                Unit
              </label>
              <select
                type="text"
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="unit"
                value={roomData.unit}
                onChange={handleChange}
              >
                <option value="">Select a unit</option>
                {units.map((el, index) => (
                  <option key={index} value={el?.shortForm}>
                    {el?.fullForm}
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
                HSN
              </label>
              <select
                type="text"
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="hsn"
                value={roomData.hsn}
                onChange={handleChange}
              >
                <option value="">Select a hsn</option>
                {optionsData?.hsn?.map((el, index) => (
                  <option key={index} value={el?._id}>
                    {el?.hsn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Price Level and Location Tabs */}
        {/* <div className={` ${loading && "opacity-50 pointer-events-none "} `}> */}
        <div className="opacity-50 pointer-events-none?">
          <div className="relative flex flex-col min-w-0 break-words w-full  pb-3 rounded-lg bg-blueGray-100 border-0">
            <div className="flex start mx-10 ">
              <div className="mt-[10px]  border-b border-solid border-[#0066ff43]  ">
                <button
                  type="button"
                  // onClick={() => setTab("priceLevel")}
                  className="y-2 px-5 mr-10   text-[16px] leading-7 text-headingColor font-semibold"
                >
                  Price Level
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-auto px-4 lg:px-10 pt-0">
              {/* {tab === "priceLevel" && ( */}
              <div className="container mx-auto mt-2">
                <table className="table-fixed w-full bg-white shadow-md">
                  <thead className="bg-[#EFF6FF] border">
                    <tr>
                      <th className="w-1/2 px-4 py-1 border-r">Level Name</th>
                      <th className="w-1/2 px-4 py-1 border-r">Rate</th>
                      <th className="w-2/12 px-4 py-1"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {priceLevelRows?.map((row, index) => (
                      <tr key={row?.id || index} className="border w-full">
                        {/* Level Name Dropdown */}
                        <td className="px-4 py-2 border-r">
                          <select
                            value={row?.priceLevel}
                            onChange={(e) =>
                              handleLevelChange(index, e.target.value)
                            }
                            className="block w-full px-4 rounded-md text-sm focus:outline-none border-none"
                            style={{
                              boxShadow: "none",
                              borderColor: "#b6b6b6",
                            }}
                          >
                            <option value="">Select Level</option>
                            {optionsData.priceLevel?.map((el) => (
                              <option key={el?._id} value={el?._id}>
                                {el?.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Rate Input */}
                        <td className="px-4 border-r">
                          <input
                            type="number"
                            value={row?.priceRate}
                            onChange={(e) =>
                              handleRateChange(index, e.target.value)
                            }
                            className="w-full text-center py-1 px-4 border border-gray-400 border-x-0 border-t-0 text-sm focus:outline-none"
                            style={{
                              boxShadow: "none",
                              borderColor: "#b6b6b6",
                            }}
                          />
                        </td>

                        {/* Delete Button */}
                        <td className="px-4 sm:px-10 py-2">
                         <button
  onClick={() => handleDeleteRow(index)} // Pass index instead of row.priceLevel
  className="text-red-600 hover:text-red-800"
>
  <MdDelete />
</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  onClick={handleAddRow}
                  className="mt-4 px-3  py-1 bg-green-500 text-white rounded"
                >
                  <MdPlaylistAdd />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={submitHandler}
            className="bg-pink-500 mt-4 ml-4 w-20 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 transform hover:scale-105"
            type="button"
          >
           {pageName == "Room Registration" ? "Add" : "Update"} 
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomRegisterComponent;
