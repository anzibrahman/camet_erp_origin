/* eslint-disable react/prop-types */
import ReturnSourcesControl from "./ReturnSourcesControl";
import { IoIosArrowDown, IoMdAdd } from "react-icons/io";
import { MdCancel } from "react-icons/md";
import { Link } from "react-router-dom";
import { resetPaymentSplit } from "../../../../slices/voucherSlices/commonVoucherSlice";

function AddItemTile({
  items,
  handleAddItem,
  dispatch,
  removeItem,
  removeGodownOrBatch,
  navigate,
  subTotal,
  type,
  urlToAddItem,
  urlToEditItem,
  convertedFrom = [],
}) {
  const getDiscountValue = (godown) => {
    const { discountType, discountAmount, discountPercentage } = godown;

    if (discountType === "amount") {
      return `₹ ${discountAmount}` || "0";
    } else {
      return `${discountPercentage} %` || "0 %";
    }
  };

  return (
    <div>
      {items?.length == 0 && (
        <div className="bg-white p-4 pb-6  drop-shadow-lg mt-2 md:mt-3 mb-2">
          <div className="flex gap-2 ">
            <p className="font-bold uppercase text-sm">Items</p>
            <span className="text-red-500 mt-[-4px] font-bold">*</span>
          </div>

          <div className="   mt-3 p-6 border border-gray-300 h-10 rounded-md flex  cursor-pointer justify-center   items-center font-medium text-violet-500 ">
            <div
              onClick={handleAddItem}
              className="flex justify-center gap-2 hover_scale items-center "
            >
              <IoMdAdd className="text-2xl" />
              <p className="text-sm">Add Item</p>
            </div>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div>
            <div className="flex justify-between mt-2 bg-white p-3 px-4 w-full  ">
              <div className="flex  items-center gap-1 font-bold">
                <IoIosArrowDown className="font-bold text-xs sm:text-lg" />
                <p className="text-xs sm:text-md">Items ({items.length})</p>
              </div>

              <div
                className={` ${
                  convertedFrom.length > 0 && "pointer-events-none"
                }  `}
                // to={urlToAddItem}
                onClick={() => {
                  navigate(urlToAddItem);
                  dispatch(resetPaymentSplit());
                }}
              >
                <div
                  className={` ${
                    convertedFrom.length > 0 && "opacity-50"
                  }  flex items-center gap-2 font-bold text-violet-500`}
                >
                  <IoMdAdd className="text-lg sm:text-2xl" />
                  <p className="text-xs sm:text-md">Add Item</p>
                </div>
              </div>
            </div>
            {items.map((el, index) => (
              <div key={index}>
                <div className="py-3 mt-0 px-5 md:px-6 bg-white flex items-center gap-1.5 md:gap-4">
                  {!el?.hasGodownOrBatch && !el._importedReturn && (
                    <div
                      onClick={() => {
                        dispatch(removeItem(el?._voucherLineId || el?._id));
                        dispatch(resetPaymentSplit());
                      }}
                      className={`text-gray-500 text-sm cursor-pointer ${el._importedReturn ? "hidden" : ""}`}
                    >
                      <MdCancel />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between font-bold text-xs gap-10 ">
                      <p className="text-[10px] sm:text-xs">
                        {el._importedReturn && <ReturnSourcesControl item={el} disabled={convertedFrom.length > 0} />} {el.product_name} {el._importedReturn && <span className="sales-import-return-badge">Return{el._returnSaved ? ` · ${el._returnNoteNumber}` : ""}</span>}
                      </p>
                      <p className="text-nowrap">
                        ₹{" "}
                        {Number(
                          el?.GodownList.reduce((acc, curr) => {
                            if (el?.hasGodownOrBatch) {
                              if (curr?.added) {
                                return (acc += Number(
                                  curr.individualTotal?.toFixed(2) || 0
                                ));
                              } else {
                                return acc;
                              }
                            } else {
                            

                              return (
                                (acc += Number(
                                  curr.individualTotal?.toFixed(2) || 0
                                )) || el?.total
                              );
                            }
                          }, 0)
                        )?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-1 text-xs mt-1">
                      <p className="text-nowrap">Tax</p>
                      <p className="text-nowrap">({el.igst} %)</p>
                    </div>
                    {el.hasGodownOrBatch ? (
                      el.GodownList.map((godownOrBatch, idx) =>
                        godownOrBatch.added ? (
                          <div key={idx}>
                            <div className="flex items-center gap-2">
                              <MdCancel
                                onClick={() => {
                                  dispatch(
                                    removeGodownOrBatch({
                                      id: el?._voucherLineId || el?._id,
                                      idx: idx,
                                    })
                                  );

                                  dispatch(resetPaymentSplit());
                                }}
                                className={`text-gray-500 text-sm cursor-pointer ${el._importedReturn ? "hidden" : ""}`}
                              />
                              <div
                                key={idx}
                                className="flex justify-between items-center mt-5 flex-1 "
                              >
                                <div className="w-3/5 md:w-2/5 font-semibold text-gray-500 text-xs flex flex-col gap-2">
                                  {godownOrBatch.batch && el?.batchEnabled ? (
                                    <div className="flex justify-between">
                                      <p className="text-nowrap text-violet-500 text-bold">
                                        Batch: {godownOrBatch.batch}
                                      </p>
                                      <p className="text-nowrap ">
                                        {godownOrBatch.count} {el.unit} X{" "}
                                        {/* {el.Priceleveles.find(
                                            (item) =>
                                              item.pricelevel ===
                                              priceLevelFromRedux
                                          )?.pricerate || 0} */}
                                        {godownOrBatch?.selectedPriceRate || 0}
                                      </p>
                                    </div>
                                  ) : (
                                    godownOrBatch.godown && (
                                      <div className="flex justify-between ">
                                        <p className="text-nowrap text-violet-500 text-bold">
                                          Godown: {godownOrBatch.godown}
                                        </p>
                                        <p className="text-nowrap">
                                          {godownOrBatch.count} {el.unit} X{" "}
                                          {/* {el.Priceleveles.find(
                                              (item) =>
                                                item.pricelevel ===
                                                priceLevelFromRedux
                                            )?.pricerate || 0} */}
                                          {godownOrBatch?.selectedPriceRate ||
                                            0}
                                        </p>
                                      </div>
                                    )
                                  )}

                                  {(godownOrBatch.discount > 0 ||
                                    godownOrBatch.discountPercentage > 0) && (
                                    <div className="flex justify-between">
                                      <p className="text-nowrap">Discount</p>
                                      <div className="flex items-center">
                                        <p className="text-nowrap">
                                          {getDiscountValue(godownOrBatch)}
                                          {/* {godownOrBatch.discount > 0
                                            ? `₹ ${godownOrBatch.discount}`
                                            : `${godownOrBatch.discountPercentage}%`} */}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <p className="text-nowrap">Total</p>
                                    <p className="text-nowrap">
                                      ₹ {godownOrBatch.individualTotal ?? 0}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p
                                    onClick={() => {
                                      navigate(
                                        `${urlToEditItem}/${el._voucherLineId || el._id}/${idx}`,
                                        {
                                          state: { from: type },
                                        }
                                      );
                                    }}
                                    className={`
                                       ${
                                         (convertedFrom.length > 0 || el._importedReturn) &&
                                         "opacity-50 pointer-events-none"
                                       }
                                      text-violet-500 text-xs md:text-base font-bold p-1 px-4 border border-1 border-gray-300 rounded-2xl cursor-pointer`}
                                  >
                                    Edit
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null
                      )
                    ) : (
                      <div className="flex justify-between items-center ">
                        <div className="w-3/5 md:w-2/5 font-semibold text-gray-500 text-xs flex flex-col gap-2">
                          <div className="flex justify-between">
                            <p className="text-nowrap">
                              Qty <span className="text-xs">x</span> Rate
                            </p>
                            <p className="text-nowrap">
                              {el.GodownList[0]?.count} {el.unit} X{" "}
                              {el?.GodownList[0]?.selectedPriceRate || 0}
                            </p>
                          </div>

                          {(el?.GodownList[0]?.discount > 0 ||
                            el?.GodownList[0]?.discountPercentage > 0) && (
                            <div className="flex justify-between">
                              <p className="text-nowrap">Discount</p>
                              <div className="flex items-center">
                                <p className="text-nowrap">
                                  {getDiscountValue(el.GodownList[0])}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <p
                            onClick={() => {
                              navigate(`${urlToEditItem}/${el._voucherLineId || el._id}/null`, {
                                state: { from: "sales" },
                              });
                            }}
                            className={` ${
                              (convertedFrom.length > 0 || el._importedReturn) &&
                              "opacity-50 pointer-events-none"
                            } text-violet-500 text-xs md:text-base font-bold p-1 px-4 border border-1 border-gray-300 rounded-2xl cursor-pointer`}
                          >
                            Edit
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <hr />
              </div>
            ))}
          </div>
          {type !== "stockTransfer" && (
            <div className="flex  justify-between items-center bg-white p-2 px-4">
              <p className="text-sm md:text-base font-bold">Items Subtotal:</p>
              <p className="text-sm md:text-base font-bold">{` ₹ ${subTotal.toFixed(
                2
              )}`}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AddItemTile;
