/* eslint-disable react/prop-types */

import { useSelector } from "react-redux";

function VoucherPdfHeaderNonIndian({
  data,
  org,
  address,
  despatchDetails,
  configurations,
  voucherType,
  configVoucherType,
}) {
  /// to get voucher number name
  const getVoucherNumber = () => {
    if (!voucherType) return "";
    if (voucherType === "sales" || voucherType === "vanSale" || voucherType === "performaInvoice") {
      return "salesNumber";
    } else if (voucherType === "saleOrder") {
      return "orderNumber";
    } else {
      return voucherType + "Number";
    }
  };


  /// to get voucher number title name
  const getTitleNumber = () => {
    if (!voucherType) return "";
    if (voucherType === "sales" || voucherType === "vanSale") {
      return "Invoice No";
    } else {
      return "No";
    }
  };
  // console.log(tab);

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  let displayTitles = {};
  if (org?.configurations) {
    const despatchDetailsConfig =
      org?.configurations[0]?.despatchTitles?.find(
        (config) => config.voucher === configVoucherType
      ) ?? {};
    for (const key in despatchDetailsConfig) {
      displayTitles[key] =
        despatchDetailsConfig[key] ||
        capitalizeFirstLetter(key.split(/(?=[A-Z])/).join(" "));
    }
  }

  const showShipTo =
    useSelector(
      (state) =>
        state?.secSelectedOrganization?.secSelectedOrg?.configurations[0]
          ?.enableShipTo[configVoucherType]
    ) || true;

  return (
    <div>
      <div>
        <div className="bg-gray-500 h-2 w-full mt-1"></div>
        <div className="flex items-center justify-between bg-gray-300 px-3 py-1">
          <div className="text-xs md:text-sm">
            {getTitleNumber()} : {data?.[getVoucherNumber()]}
          </div>
          <div className="text-xs md:text-sm">
            Date: {new Date(data?.date).toDateString()}
          </div>
        </div>
      </div>
      {configurations?.showCompanyDetails && (
        <>
          <div className="flex items-center border-t-2 py-2">
            <div className="w-0.5/5">
              {org.logo && (
                <img
                  className="h-16 w-16 mr-2 mt-1"
                  src={org.logo}
                  alt="Logo"
                />
              )}
            </div>
            <div className="w-4/5 flex flex-col mt-1 ml-2">
              <div className="">
                <p className="text-gray-700 font-semibold text-base pb-1">
                  {org?.name}
                </p>
              </div>
              <div className="">
                <div className="text-gray-500 md:text-xs text-[10px] mt-1">
                  {[
                    org?.flat,
                    org?.landmark,
                    org?.road,
                    org?.place,
                    org?.pin,
                    org?.mobile,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          </div>
          <div className="  flex  justify-between px-5 gap-6  bg-slate-100 py-2">
            <div className="">
              {org?.pan && (
                <div className="text-gray-500 mb-0.5 md:text-xs text-[9px]">
                  Pan: {org?.pan && org?.pan}
                </div>
              )}
              <div className="text-gray-500 mb-0.5 md:text-xs text-[9px]">
                {org?.country === "India" ? "Gst No" : "Vat"}:{" "}
                {org?.gstNum && org?.gstNum !== null ? org.gstNum : ""}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-gray-500 mb-0.5 md:text-xs text-[9px] text-right">
                {org?.email && org?.email !== null ? org.email : ""}
              </div>
              <div className="text-gray-500 mb-0.5 md:text-xs text-[9px] text-right">
                {org?.website && org?.website !== null ? org.website : ""}
              </div>
            </div>
          </div>
        </>
      )}

      <hr className="border-2" />

      <div className="   print-md-layout flex flex-col md:flex-row  py-3 px-2 gap-3     ">
        {/* bill to  */}
        <div className=" bill-to  w-[70%]   mt-1  flex justify-between  gap-3 tracking-wider text-[11px]  md:border-r md:pr-4 ">
          <div className="border-gray-300 mb-2 ">
            <h2 className="text-xs font-bold mb-1">
              {voucherType === "purchase"
                ? "Supplier (Bill From):"
                : "Bill To:"}
            </h2>
            <div className="text-gray-700 ">{address?.billToName}</div>
            {address?.billToAddress?.split(/[\n,]+/).map((line, index) => (
              <div key={index} className="text-gray-700">
                {line.trim()}
              </div>
            ))}
            <div className="text-gray-700">
              {address?.billToEmail && address?.billToEmail !== "null"
                ? address?.billToEmail
                : ""}
            </div>
            <div className="text-gray-700">
              {address?.billToMobile && address?.billToMobile !== "null"
                ? address?.billToMobile
                : ""}
            </div>
            <div className="text-gray-700">
              {address?.billToGst && address?.billToGst !== "null"
                ? address?.billToGst
                : ""}
            </div>
          </div>
          {showShipTo && (
            <div className="border-gray-300 ">
              <h2 className="text-xs font-bold mb-1">
                {voucherType === "purchase"
                  ? "Consignee (Ship to):"
                  : "Ship To:"}
              </h2>
              <div className="text-gray-700">{address?.shipToName}</div>
              {address?.shipToAddress?.split(/[\n,]+/).map((line, index) => (
                <div key={index} className="text-gray-700">
                  {line.trim()}
                </div>
              ))}

              <div className="text-gray-700">
                {address?.shipToEmail !== "null" ? address?.shipToEmail : ""}
              </div>
              <div className="text-gray-700">
                {address?.shipToMobile && address?.shipToMobile !== "null"
                  ? address?.shipToMobile
                  : ""}
              </div>
              <div className="text-gray-700">
                {address?.shipToGst && address?.shipToGst !== "null"
                  ? address?.shipToGst
                  : ""}
              </div>
            </div>
          )}
        </div>

        {/* table */}
        <hr className="mb-1" />

        <table className=" details-table w-[30%]  divide-y divide-gray-200">
          <tbody>
            {despatchDetails &&
              Object?.entries(despatchDetails)
                ?.filter(([key]) => key !== "title")
                .map(([key, value]) => {
                  if (value) {
                    return (
                      <tr key={key} className="flex justify-between">
                        <td className="text-gray-500 mb-0.5 text-[9px]">
                          {displayTitles[key] ||
                            capitalizeFirstLetter(
                              key?.split(/(?=[A-Z])/).join(" ")
                            )}
                          :
                        </td>
                        <td className="text-gray-500 mb-0.5 text-[9px]">
                          {value}
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VoucherPdfHeaderNonIndian;
