/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import numberToWords from "number-to-words";
import VoucherPdfFooter from "./VoucherPdfFooter";
import VoucherPdfHeader from "./VoucherPdfHeader";
import { defaultPrintSettings } from "../../../../../utils/defaultConfigurations";

function VoucherPdf({
  data,
  org,
  contentToPrint,
  bank,
  tab,
  isPreview = false,
  sendToParent,
}) {
  const [subTotal, setSubTotal] = useState("");
  const [additinalCharge, setAdditinalCharge] = useState("");
  const [inWords, setInWords] = useState("");
  const selectedOrganization = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );

  const getVoucherType = () => {
    const currentVoucherType = data?.voucherType;

    if (currentVoucherType === "sales" || currentVoucherType === "vanSale" || currentVoucherType === "performaInvoice") {
      return "sale";
    } else if (currentVoucherType === "saleOrder") {
      return "saleOrder";
    } else {
      return "default";
    }
  };

  const allPrintConfigurations = useSelector(
    (state) =>
      state.secSelectedOrganization?.secSelectedOrg?.configurations[0]
        ?.printConfiguration
  );
  const voucherType = getVoucherType();
  const matchedConfiguration = allPrintConfigurations?.find(
    (item) => item.voucher === voucherType
  );
  const configurations =
    voucherType && voucherType !== "default" && matchedConfiguration
      ? matchedConfiguration
      : defaultPrintSettings;

  const calculateTotalTax = () => {
    const totalTax = data?.items?.reduce(
      (acc, curr) => (acc += curr?.totalIgstAmt || 0),
      0
    );

    return totalTax;
  };
  const calculateTotalCess = () => {
    const totalTax = data?.items?.reduce(
      (acc, curr) =>
        (acc += (curr?.totalCessAmt || 0) + (curr?.totalAddlCessAmt || 0)),
      0
    );

    return totalTax;
  };

  const calculateTotalQunatity = () => {
    return data?.items?.reduce((acc, curr) => {
      // Ensure curr.count is a number, defaulting to 0 if not
      curr.count = Number(curr?.totalCount) || 0;
      // Add curr.count to the accumulator
      return acc + curr?.count;
    }, 0);
  };
  const calculateTotalTaxableQAmount = () => {
    const taxableAmounts = data?.items?.map((item) => {
      return item?.GodownList?.reduce((acc, curr) => {
        curr.taxableAmount = Number(curr?.taxableAmount) || 0;
        return acc + curr.taxableAmount;
      }, 0);
    });

    const totalTaxableQAmount = taxableAmounts?.reduce(
      (acc, curr) => acc + curr,
      0
    );
    return totalTaxableQAmount;
  };

  useEffect(() => {
    if (data && data.items) {
      const subTotal = data.items
        .reduce((acc, curr) => acc + parseFloat(curr?.total), 0)
        .toFixed(2);
      setSubTotal(subTotal);

      const addiTionalCharge = data?.additionalCharges
        ?.reduce((acc, curr) => {
          let value = curr?.finalValue === "" ? 0 : parseFloat(curr.finalValue);
          if (curr?.action === "add") {
            return acc + value;
          } else if (curr?.action === "sub") {
            return acc - value;
          }
          return acc;
        }, 0)

        ?.toFixed(2);
      setAdditinalCharge(addiTionalCharge);

      const [integerPart, decimalPart] = data.finalAmount.toString().split(".");
      const integerWords = numberToWords.toWords(parseInt(integerPart, 10));
      const decimalWords = decimalPart
        ? ` and ${numberToWords.toWords(parseInt(decimalPart, 10))} `
        : " and Zero ";

      const mergedWord = [
        ...(integerWords + " "),
        (selectedOrganization?.currencyName ?? "") + " ",
        ...decimalWords,
        (selectedOrganization?.subunit ?? "") + " ",
      ].join("");

      setInWords(mergedWord);
    }
  }, [data]);

  const party = data?.party;
  const despatchDetails = data?.despatchDetails;

  let address;

  console.log(address);

  if (party?.newAddress && Object.keys(party?.newAddress).length > 0) {
    address = party?.newAddress;
  } else {
    if (party) {
      const {
        partyName,
        mobileNumber,
        emailID,
        gstNo,
        state_reference,
        billingAddress,
        shippingAddress,
        pincode,
      } = party;

      address = {
        billToName: partyName,
        billToAddress: billingAddress,
        billToPin: pincode,
        billToGst: gstNo,
        billToMobile: mobileNumber,
        billToEmail: emailID,
        billToSupply: state_reference,
        shipToName: partyName,
        shipToAddress: shippingAddress,
        shipToPin: pincode,
        shipToGst: gstNo,
        shipToMobile: mobileNumber,
        shipToEmail: emailID,
        shipToSupply: state_reference,
      };
    }
  }

  // const findRate = (rate, isTaxInclusive, igst) => {
  //   let newRate;

  //   if (configurations?.showInclTaxRate && !isTaxInclusive) {
  //     ///add tax amount with respect to base price
  //     newRate = Number((rate + rate * (Number(igst / 100) || 0)).toFixed(2));
  //   } else if (!configurations?.showInclTaxRate && isTaxInclusive) {
  //     ///add tax amount with respect to base price
  //     newRate = Number((rate / (1 + Number(igst / 100) || 0)).toFixed(2));
  //   } else {
  //     newRate = rate;
  //   }

  //   return newRate;
  // };

  // Check if this is a godown-only item (no batches)
  const isGodownOnlyItem = (item) => {
    const result = item?.gdnEnabled === true && item?.batchEnabled === false;

    return result;
  };

  function getDiscountDisplay(el, configurations, type, index = 0) {
    const godownList = el?.GodownList;
    const hasGodown = Array.isArray(godownList) && godownList.length > 0;
    if (!hasGodown) return null;

    // =========================
    // Case: itemWise + hasGodownOrBatch
    // =========================
    if (type === "itemWise" && el?.hasGodownOrBatch === true) {
      // If it's not a godown-only item, return null
      if (!isGodownOnlyItem?.(el)) return null;

      // Show discount as total amount if configured
      if (configurations?.showDiscountAmount === true) {
        return godownList?.reduce((acc, curr) => {
          const discountAmount = Number(curr?.discountAmount) || 0;
          return acc + discountAmount;
        }, 0);
      } else {
        // Default to showing first godown's percentage or total amount
        const godown = godownList?.[0];

        if (godown?.discountType === "percentage") {
          return `${godown?.discountPercentage ?? 0} %`;
        } else if (godown?.discountType === "amount") {
          return godownList?.reduce((acc, curr) => {
            const discountAmount = Number(curr?.discountAmount) || 0;
            return acc + discountAmount;
          }, 0);
        }
      }
    }

    // =========================
    // Case: itemWise + NO godown/batch (flat item level)
    // =========================
    if (type === "itemWise" && el?.hasGodownOrBatch === false) {
      const godown = godownList?.[0];

      // Show flat amount if configured
      if (configurations?.showDiscountAmount === true) {
        return godown?.discountAmount || 0;
      }

      // Show based on discount type
      if (godown?.discountType === "percentage") {
        return `${godown?.discountPercentage ?? 0} %`;
      } else if (godown?.discountType === "amount") {
        return godown?.discountAmount || 0;
      }
    }

    // =========================
    // Case: godownOrBatchWise
    // =========================
    if (type === "godownOrBatchWise") {
      const godown = godownList?.[index];

      if (configurations?.showDiscountAmount === true) {
        return godown?.discountAmount || 0;
      }

      if (godown?.discountType === "percentage") {
        return `${godown?.discountPercentage ?? 0} %`;
      } else if (godown?.discountType === "amount") {
        return godown?.discountAmount || 0;
      }
    }

    return null;
  }

  const handlePrint = () => {
    contentToPrint.current
  };  



  return (
    <div>
      {/* <style dangerouslySetInnerHTML={{ __html: `
        tbody::after {
          content: "";
          display: block;
          height: 10px; 
          width: 100%;
          background-color: white;
        }
      ` }} /> */}
      <div className="flex-1">
        <div
          ref={contentToPrint}
          className="pdf-content rounded-lg px-3 max-w-3xl mx-auto md:block"
        >
          <div className="pdf-page">
            <VoucherPdfHeader
              configurations={configurations}
              data={data}
              org={org}
              address={address}
              despatchDetails={despatchDetails}
              tab={tab}
              voucherType={data?.voucherType}
              configVoucherType={voucherType}
            />
            <table className="w-full text-left bg-slate-200">
              <thead className="border-b-2 border-t-2 border-black text-[10px] text-right ">
                <tr>
                  <th className="text-gray-700 font-bold uppercase py-2 px-1 text-left">
                    No
                  </th>
                  <th className="text-gray-700 font-bold uppercase py-2 px-1 text-left">
                    Items
                  </th>
                  {configurations?.showHsn && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      HSN
                    </th>
                  )}

                  {configurations?.showTaxPercentage && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Tax %
                    </th>
                  )}
                  {configurations?.showTaxPercentage && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Cess %
                    </th>
                  )}

                  {configurations?.showQuantity && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Qty
                    </th>
                  )}
                  {configurations?.showRate && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Rate
                    </th>
                  )}
                  {
                    configurations?.showDiscount && (
                      // configurations?.showDiscountAmount && (
                      <th className="text-gray-700 font-bold uppercase p-2">
                        Disc
                      </th>
                    )
                    // )
                  }

                  <th className="text-gray-700 font-bold uppercase p-2">Amt</th>
                  {/* {configurations?.showDiscount &&
                    !configurations?.showDiscountAmount && (
                      <th className="text-gray-700 font-bold uppercase p-2">
                        Disc{" "}
                      </th>
                    )} */}
                  {configurations?.showStockWiseTaxAmount && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Tax
                    </th>
                  )}
                  {configurations?.showStockWiseTaxAmount && (
                    <th className="text-gray-700 font-bold uppercase p-2">
                      Cess
                    </th>
                  )}
                  {configurations?.showStockWiseAmount && (
                    <th className="text-gray-700 font-bold uppercase p-2 pr-0 ">
                      Net Amt
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="">
                {data?.items?.length > 0 &&
                  data?.items.map((el, index) => {
                    return (
                      <React.Fragment key={index}>
                        <tr className={`text-[9px] bg-white `}>
                          <td className="w-2 py-0.5 ">{index + 1}</td>
                          <td className="   text-black pr-2 font-bold ">
                            {el.product_name}{" "}
                          </td>

                          {/* hsn */}

                          {configurations?.showHsn && (
                            <td className=" text-black text-right pr-2">
                              {el?.hsn_code || ""}
                            </td>
                          )}

                          {/* tax */}

                          {configurations?.showTaxPercentage && (
                            <td className=" text-black text-right pr-2">
                              {el?.igst || ""}
                            </td>
                          )}

                          {/* cess */}

                          {configurations?.showTaxPercentage && (
                            <td className=" text-black text-right pr-2 ">
                              {" "}
                              {el?.cess} & {el?.addl_cess}/{el.unit}
                            </td>
                          )}

                          {/* quantity */}
                          {configurations?.showQuantity && (
                            <td className=" text-black text-right pr-2 font-bold">
                              {el?.totalCount} {el?.unit.split("-")[0]}
                            </td>
                          )}

                          {/* rate */}

                          {configurations?.showRate && (
                            <td className=" text-black text-right pr-2 text-nowrap ">
                              {!el?.hasGodownOrBatch ? (
                                el?.GodownList[0]?.selectedPriceRate.toFixed(2)
                              ) : isGodownOnlyItem(el) ? (
                                el?.GodownList[0]?.selectedPriceRate.toFixed(2)
                              ) : (
                                <td></td>
                              )}
                            </td>
                          )}
                          {configurations?.showDiscount && (
                            <td className=" text-black text-right pr-2">
                              {getDiscountDisplay(
                                el,
                                configurations,
                                "itemWise"
                              )}
                            </td>
                          )}

                          <td
                            className={` font-bold  text-black text-right pr-2 text-nowrap`}
                          >
                            {!el?.hasGodownOrBatch
                              ? el?.GodownList[0]?.taxableAmount?.toFixed(2) || 0
                              : el?.GodownList?.reduce((acc, curr) => {
                                  curr.taxableAmount =
                                    Number(curr?.taxableAmount) || 0;
                                  return acc + curr.taxableAmount;
                                }, 0)?.toFixed(2) || 0}
                          </td>

                          {configurations?.showStockWiseTaxAmount && (
                            <td className=" text-black text-right pr-2 font-bold">
                              {el?.totalIgstAmt.toFixed(2)}
                            </td>
                          )}
                          {configurations?.showStockWiseTaxAmount && (
                            <td className=" text-black text-right pr-2 font-bold">
                              {(el?.totalCessAmt || 0) +
                                (el?.totalAddlCessAmt || 0)}
                            </td>
                          )}

                          {configurations?.showStockWiseAmount && (
                            <td className=" pr-1 text-black text-right font-bold">
                              {el?.total}
                            </td>
                          )}
                        </tr>

                        {/* Product description row - show if description available and batch disabled */}
                        {el?.GodownList?.[0]?.description &&
                          !el?.batchEnabled && (
                            <tr className="bg-white text-[8px]">
                              <td></td>
                              <td className="pl-1 text-gray-600 max-w-4 ">
                                {el.GodownList[0].description}
                              </td>
                              {/* Empty cells for other columns */}
                              {configurations?.showHsn && <td></td>}
                              {configurations?.showTaxPercentage && <td></td>}
                              {configurations?.showTaxPercentage && <td></td>}
                              {configurations?.showQuantity && <td></td>}
                              {configurations?.showRate && <td></td>}
                              {configurations?.showDiscount && <td></td>}
                              <td></td>
                              {configurations?.showStockWiseTaxAmount && (
                                <td></td>
                              )}
                              {configurations?.showStockWiseTaxAmount && (
                                <td></td>
                              )}
                              {configurations?.showStockWiseAmount && <td></td>}
                            </tr>
                          )}

                        {/* godown or batch */}
                        {el.hasGodownOrBatch &&
                          el.GodownList.map((godownOrBatch, idx) => {
                            return godownOrBatch.added &&
                              godownOrBatch.batch &&
                              el?.batchEnabled ? (
                              <React.Fragment key={idx}>
                                <tr className={`bg-white text-[9px] `}>
                                  <td> </td>
                                  <td className="">
                                    {godownOrBatch.batch && (
                                      <p className="ml-1.5  ">
                                        Batch: {godownOrBatch?.batch}
                                      </p>
                                    )}
                                  </td>
                                  {configurations?.showHsn && (
                                    <td className=" text-black text-right pr-2  text-[8px]"></td>
                                  )}

                                  {configurations?.showTaxPercentage && (
                                    <td className=" text-black text-right pr-2  text-[8px]"></td>
                                  )}
                                  {configurations?.showTaxPercentage && (
                                    <td className=" text-black text-right pr-2  text-[8px]">
                                      {/* {el?.cess} & {el?.addl_cess}/{el.unit} */}
                                    </td>
                                  )}

                                  {configurations?.showQuantity && (
                                    <td className="  flex justify-end pr-2">
                                      {godownOrBatch?.count} {el?.unit}
                                    </td>
                                  )}
                                  {configurations?.showRate && (
                                    <td className="  text-end pr-2">
                                      {/* {findRate(
                                        godownOrBatch?.selectedPriceRate,
                                        el.isTaxInclusive,
                                        el.igst
                                      )} */}

                                      {godownOrBatch?.selectedPriceRate || 0}
                                    </td>
                                  )}

                                  {configurations?.showDiscount && (
                                    <td className=" text-black text-right pr-2">
                                      {getDiscountDisplay(
                                        el,
                                        configurations,
                                        "godownOrBatchWise",
                                        idx
                                      )}
                                    </td>
                                  )}

                                  <td className=" text-black text-right pr-2 text-nowrap">
                                    {el?.hasGodownOrBatch ? (
                                     ( godownOrBatch.taxableAmount)?.toFixed(2)
                                    ) : (
                                      <td></td>
                                    )}
                                  </td>

                                  {configurations?.showStockWiseTaxAmount && (
                                    <td className="  text-end pr-2">
                                      {godownOrBatch?.igstAmount || 0}
                                    </td>
                                  )}
                                  {configurations?.showStockWiseTaxAmount && (
                                    <td className="  text-end pr-2">
                                      {godownOrBatch?.totalCessAmount || 0}
                                      {}
                                    </td>
                                  )}

                                  {configurations?.showStockWiseAmount && (
                                    <td className=" text-end pr-1">
                                      <p>
                                        {godownOrBatch.individualTotal ?? 0}
                                      </p>
                                    </td>
                                  )}
                                </tr>

                                {/* Description row for batch - show under batch */}
                                {godownOrBatch?.description && (
                                  <tr className="bg-white text-[9px]">
                                    <td></td>
                                    <td className="pl-2 text-gray-600 text-[8px] max-w-4 ">
                                      {godownOrBatch.description}
                                    </td>
                                    {/* Empty cells for other columns */}
                                    {configurations?.showHsn && <td></td>}
                                    {configurations?.showTaxPercentage && (
                                      <td></td>
                                    )}
                                    {configurations?.showTaxPercentage && (
                                      <td></td>
                                    )}
                                    {configurations?.showQuantity && <td></td>}
                                    {configurations?.showRate && <td></td>}
                                    {configurations?.showDiscount && <td></td>}
                                    <td></td>
                                    {configurations?.showStockWiseTaxAmount && (
                                      <td></td>
                                    )}
                                    {configurations?.showStockWiseTaxAmount && (
                                      <td></td>
                                    )}
                                    {configurations?.showStockWiseAmount && (
                                      <td></td>
                                    )}
                                  </tr>
                                )}
                              </React.Fragment>
                            ) : null;
                          })}
                      </React.Fragment>
                    );
                  })}
              </tbody>

              <tfoot className="">
                <tr className="border-y  border-black bg-slate-200 py-6">
                  <td className="font-bold "></td>
                  {configurations?.showStockWiseAmount ? (
                    <td className="font-bold text-[9px] p-2">Subtotal</td>
                  ) : (
                    <td className="font-bold text-[9px] p-2"></td>
                  )}{" "}
                  {configurations?.showHsn && (
                    <td className="font-bold text-[9px] p-2"></td>
                  )}
                  {configurations?.showTaxPercentage && (
                    <td className="font-bold text-[9px] p-2"></td>
                  )}
                  {configurations?.showTaxPercentage && (
                    <td className="font-bold text-[9px] p-2"></td>
                  )}
                  {configurations?.showQuantity && (
                    <td className="text-black text-[9px] ">
                      <p className="text-right pr-1 font-bold">
                        {calculateTotalQunatity()}/unit
                      </p>{" "}
                    </td>
                  )}
                  {configurations?.showRate && (
                    <td className="font-bold text-[9px] p-2"></td>
                  )}
                  {configurations?.showDiscount && (
                    <td className="text-right pr-1 text-black font-bold text-[9px]"></td>
                  )}
                  <td className="text-right pr-1 text-black font-bold text-[9px]">
                    {calculateTotalTaxableQAmount()?.toFixed(2)}
                  </td>
                  {configurations?.showStockWiseTaxAmount && (
                    <td className="text-right pr-1 text-black font-bold text-[9px]">
                      {" "}
                      {calculateTotalTax()?.toFixed(2)}
                    </td>
                  )}
                  {configurations?.showStockWiseTaxAmount && (
                    <td className="text-right pr-1 text-black font-bold text-[9px]">
                      {calculateTotalCess()?.toFixed(2)}
                    </td>
                  )}
                  {}
                  {configurations?.showStockWiseAmount && (
                    <td className="text-right pr-1 text-black font-bold text-[9px]">
                      {subTotal}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
            <VoucherPdfFooter
              bank={bank}
              org={org}
              data={data}
              additinalCharge={additinalCharge}
              inWords={inWords}
              tab={"sales"}
              selectedOrganization={selectedOrganization}
              calculateTotalTax={calculateTotalTax}
              configurations={configurations}
              party={party}
              configVoucherType={voucherType}
            />
            {isPreview && (
              <div className="flex gap-3 justify-end p-2">
                <button className="px-3 py-1 rounded-lg bg-gray-500 text-black font-medium hover:bg-gray-600 active:scale-95 transition"
                  onClick={()=>handlePrint()}>
                  Print
                </button>
                <button className="px-3 py-1 rounded-lg bg-gray-500 text-black font-medium hover:bg-gray-600 active:scale-95 transition"
                  onClick={()=>sendToParent(true)}>
                  Confirm
                </button>
                <button className="px-3 py-1 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 active:scale-95 transition"
                  onClick={()=>sendToParent(false)}>
                  Cancel
                </button>
              </div>
            )}

            <div className="page-number"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoucherPdf;
