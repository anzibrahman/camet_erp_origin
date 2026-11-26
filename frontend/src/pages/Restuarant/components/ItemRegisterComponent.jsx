import { useEffect, useState, useRef } from "react"
import { units } from "../../../../constants/units"
import { useLocation } from "react-router-dom"

import { toast } from "sonner"
import { MdPlaylistAdd, MdDelete, MdCloudUpload, MdImage } from "react-icons/md"
import uploadImageToCloudinary from "../../../../utils/uploadCloudinary"

function ItemRegisterComponent({
  pageName,
  optionsData,
  sendToParent,
  editData
}) {
console.log(optionsData)
  const [priceLevelRows, setPriceLevelRows] = useState([
    { pricelevel: "", pricerate: "" }
  ])
  const fileRef = useRef(null)

  const [roomData, setRoomData] = useState({
    itemName: "",
    itemCode: "",
    foodCategory: "",
    foodType: "",
    unit: "NOS",
    hsn: "",
    imageUrl: "" // Add image URL field
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (editData) {
      // console.log(editData);
      setRoomData({
        itemCode: editData.itemCode || "",
        itemName: editData.product_name,
        foodCategory: editData.category,
        foodType: editData.sub_category,
        unit: editData.unit,
        hsn: editData.hsn_code,
        imageUrl: editData.product_image || "" // Set existing image URL
      })
      const updatedPriceLevel = (Array.isArray(editData.Priceleveles)
        ? editData.Priceleveles
        : []
      ).map((item) => ({
        pricelevel: item.pricelevel?._id,
        pricerate: item.pricerate
      }))
      // console.log("updatedPriceLevel", updatedPriceLevel);
      setPriceLevelRows(
        updatedPriceLevel.length > 0
          ? updatedPriceLevel
          : [{ pricelevel: "", pricerate: "" }]
      )

      // Set image preview for existing data
      if (editData.product_image) {
        setImagePreview(editData.product_image)
      } else {
        setRoomData((prev) => ({
          ...prev,
          unit: "NOS"
        }))
      }
    }
  }, [editData])


  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
      ]
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image file (JPEG, PNG, WebP)")
        return
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        toast.error("Image size should be less than 5MB")
        return
      }

      setImageFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!imageFile) {
      toast.error("Please select an image first")
      return
    }

    setIsUploading(true)

    try {
      const imageUrl = await uploadImageToCloudinary(imageFile)
  
      setRoomData({ ...roomData, imageUrl })
      toast.success("Image uploaded successfully")
      setImageFile(null) // Clear the file after successful upload
    } catch (error) {
      console.error("Image upload error:", error)
      toast.error("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview("")
    setRoomData({ ...roomData, imageUrl: "" })
    //this is for reset fileref browser only allow once the same image so to clear while removing
    if (fileRef.current) {
      fileRef.current.value = ""
    }
  }

  const handleAddRow = () => {
    const lastRow = priceLevelRows[priceLevelRows.length - 1]

    // Check if fields are filled
    if (!lastRow?.pricelevel || !lastRow?.pricerate) {
      toast.error("Add Level name and Rate")
      return
    }

    // Check for duplicate pricelevel
    const isDuplicate = priceLevelRows
      .slice(0, -1) // exclude the last row being added
      .some((row) => row.pricelevel === lastRow.pricelevel)

    if (isDuplicate) {
      toast.error("This price level already exists")
      return
    }

    // Add new row if everything is valid
    setPriceLevelRows([...priceLevelRows, { pricelevel: "", pricerate: "" }])
  }

  const handleLevelChange = (index, value) => {
    const updatedRows = [...priceLevelRows]
    updatedRows[index].pricelevel = value
    setPriceLevelRows(updatedRows)
  }

  const handleRateChange = (index, value) => {
    const updatedRows = [...priceLevelRows]
    updatedRows[index].pricerate = value
    setPriceLevelRows(updatedRows)
  }

  const handleDeleteRow = (pricelevelId) => {
    setPriceLevelRows((prev) =>
      prev.filter((row) => row.pricelevel !== pricelevelId)
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    console.log(name, value)
    if (name === "itemCode") {
      setRoomData({ ...roomData, itemCode: value })
    } else if (name === "roomName") {
      setRoomData({ ...roomData, roomName: value })
    } else if (name === "hsn") {
      let selectedHsn = optionsData?.hsn?.find((hsn) => hsn.hsn == value)
      setRoomData({
        ...roomData,
        cgst: selectedHsn?.cgstRate,
        sgst: selectedHsn?.sgstUtgstRate,
        igst: selectedHsn?.igstRate,
        hsn: selectedHsn?.hsn
      })
    } else {
      setRoomData({ ...roomData, [name]: value })
    }
  }

  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim() !== ""

  const validDateFormData = () => {
    if (!isNonEmptyString(roomData?.itemName)) {
      toast.error("Item name is required")
      return false
    }

    if (!isNonEmptyString(roomData?.foodCategory)) {
      toast.error("Food category is required")
      return false
    }

    if (!isNonEmptyString(roomData?.foodType)) {
      toast.error("Food type is required")
      return false
    }

    if (!isNonEmptyString(roomData?.unit)) {
      toast.error("Unit is required")
      return false
    }

    if (!isNonEmptyString(roomData?.hsn)) {
      toast.error("HSN is required")
      return false
    }

    // Check if image is being uploaded
    if (imageFile && !roomData.imageUrl) {
      toast.error("Please upload the selected image before submitting")
      return false
    }

    return true // All fields valid
  }

  const submitHandler = () => {

    if (!validDateFormData(roomData)) {
      return
    }
    let newPriceLevelRows = priceLevelRows.filter(
      (item) => item.pricelevel !== ""
    )
    sendToParent(roomData, newPriceLevelRows)
  }
  const handleLabelClick = () => {
  
   
    fileRef.current.click() // 🔥 open file picker
  }

  console.log("optionsData",optionsData)

 
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
                Item Name
              </label>
              <input
                type="text"
                placeholder="Item Name"
                value={roomData.itemName}
                name="itemName"
                onChange={handleChange}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              />
            </div>
          </div>
          <div className="w-full lg:w-6/12 px-4">
            <div className="relative w-full mb-3">
              <label
                className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                htmlFor="item-code"
              >
                Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="item-code"
                placeholder="Enter unique item code (e.g., F001)"
                value={roomData.itemCode}
                name="itemCode"
                onChange={handleChange}
                maxLength={20}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="w-full lg:w-6/12 px-4">
            <div className="relative w-full mb-3">
              <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                Item Image
              </label>

              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded border shadow"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* File Input */}
              <div className="flex items-center space-x-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <div
                  onClick={handleLabelClick}//this is for contact in the handle change unless wont call handlechange
                  htmlFor="image-upload"
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200 text-sm"
                >
                  <MdImage className="mr-2" />
                  Choose Image
                </div>

                {imageFile && !roomData.imageUrl && (
                  <button
                    onClick={handleImageUpload}
                    disabled={isUploading}
                    className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 text-sm"
                    type="button"
                  >
                    <MdCloudUpload className="mr-2" />
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                )}
              </div>

              {roomData.imageUrl && (
                <p className="text-green-600 text-xs mt-1">
                  ✓ Image uploaded successfully
                </p>
              )}
            </div>
          </div>

          <div className="w-full lg:w-6/12 px-4">
            <div className="relative w-full mb-3">
              <label
                className="block uppercase text-blueGray-600 text-xs font-bold mb-2"
                htmlFor="grid-password"
              >
                Food Category
              </label>
              <select
                value={roomData.foodCategory}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="foodCategory"
                onChange={handleChange}
              >
                <option value="">Select food category</option>
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
                Food Type
              </label>
              <select
                type="text"
                value={roomData.foodType}
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="foodType"
                onChange={handleChange}
              >
                <option value="">Select food type</option>

{roomData.foodCategory &&
  optionsData?.subcategory
    ?.filter(
      (option) =>
        String(option?.category || option?.category_id) ===
        String(roomData.foodCategory)
    )
    .map((option, index) => (
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
                className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                name="hsn"
                value={roomData.hsn}
                onChange={handleChange}
              >
                <option value="">Select an HSN</option>

                {optionsData?.hsn?.map((el, index) => {
                  // Check if it's onItemRate (rows array) or onValue (direct property)
                  const igstRate =
                    el.tab === "onItemRate"
                      ? el?.rows?.[0]?.igstRate || ""
                      : el?.igstRate || ""

                  return (
                    <option key={index} value={el.hsn}>
                      {`${el.hsn} — ${
                        el.description || ""
                      } — IGST: ${igstRate}%`}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Price Level and Location Tabs */}
        <div className=" pointer-events-none?">
          <div className="relative flex flex-col min-w-0 break-words w-full pb-3 rounded-lg bg-blueGray-100 border-0">
            <div className="flex start mx-10 ">
              <div className="mt-[10px] border-b border-solid border-[#0066ff43]">
                <button
                  type="button"
                  className="y-2 px-5 mr-10 text-[16px] leading-7 text-headingColor font-semibold"
                >
                  Price Level
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-auto px-4 lg:px-10 pt-0">
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
                            value={row?.pricelevel}
                            onChange={(e) =>
                              handleLevelChange(index, e.target.value)
                            }
                            className="block w-full px-4 rounded-md text-sm focus:outline-none border-none"
                            style={{
                              boxShadow: "none",
                              borderColor: "#b6b6b6"
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
                            value={row?.pricerate}
                            onChange={(e) =>
                              handleRateChange(index, e.target.value)
                            }
                            className="w-full text-center py-1 px-4 border border-gray-400 border-x-0 border-t-0 text-sm focus:outline-none"
                            style={{
                              boxShadow: "none",
                              borderColor: "#b6b6b6"
                            }}
                          />
                        </td>

                        {/* Delete Button */}
                        <td className="px-4 sm:px-10 py-2">
                          <button
                            onClick={() => handleDeleteRow(row?.pricelevel)}
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
                  className="mt-4 px-3 py-1 bg-green-500 text-white rounded"
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
            disabled={isUploading}
            className="bg-pink-500 mt-4 ml-4 w-20 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 transform hover:scale-105 disabled:bg-pink-300"
            type="button"
          >
            {pageName == "Food item Registration" ? "Add" : "Update"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ItemRegisterComponent
