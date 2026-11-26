/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import numberToWords from "number-to-words";
import { defaultPrintSettings } from "../../../../../utils/defaultConfigurations";

function VoucherThreeInchPdf({
  contentToPrint,
  data,
  org,
  isPreview,
  sendToParent,
  handlePrintData,
}) {
  console.log(data);
  const [subTotal, setSubTotal] = useState("");
  const [additinalCharge, setAdditinalCharge] = useState("");
  const [inWords, setInWords] = useState("");

  console.log(isPreview);

  const IsIndian =
    useSelector(
      (state) => state?.secSelectedOrganization?.secSelectedOrg?.country,
    ) === "India";

  const party = data?.party;
  const isSameState =
    org?.state?.toLowerCase() === party?.state?.toLowerCase() || !party?.state;

  const voucherType = data?.voucherType;
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

  console.log();

  const getConfigurationVoucherType = () => {
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
        ?.printConfiguration,
  );

  const matchedConfiguration = allPrintConfigurations?.find(
    (item) => item.voucher === getConfigurationVoucherType(),
  );

  const configurations =
    voucherType && voucherType !== "default" && matchedConfiguration
      ? matchedConfiguration
      : defaultPrintSettings;

  const selectedOrganization = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  useEffect(() => {
    if (data && data.items) {
      ///please check it is temperary
      console.log(data);
      data.discount = data.additionalCharges[0]?.value;
      const calculatedSubTotal = data.items
        .reduce(
          (acc, curr) =>
            acc + (Number(curr?.total) - Number(curr?.totalIgstAmt)),
          0,
        )
        .toFixed(2);
      console.log(data.items[0].total);
      console.log(data.subtotal);
      setSubTotal(Number(calculatedSubTotal || data?.subTotal));

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

      const finalAmount = data.finalAmount;
      console.log(finalAmount);

      const [integerPart, decimalPart] = finalAmount.toString().split(".");
      const integerWords = numberToWords.toWords(parseInt(integerPart, 10));
      console.log(integerWords);
      const decimalWords = decimalPart
        ? ` and ${numberToWords.toWords(parseInt(decimalPart, 10))} `
        : " and Zero";
      console.log(decimalWords);

      const mergedWord = [
        ...(integerWords + " "),
        (selectedOrganization?.currencyName ?? "") + " ",
        ...decimalWords,
        (selectedOrganization?.subunit ?? "") + " ",
      ].join("");

      setInWords(mergedWord);
    }
  }, [data]);

  const calculateTotalTax = () => {
    const totalTax = data?.items?.reduce(
      (acc, curr) => (acc += curr?.totalIgstAmt || 0),
      0,
    );

    return totalTax;
  };

  console.log(data?.items);
  const calculateAddCess = () => {
    return data?.items?.reduce((acc, curr) => {
      return acc + curr?.totalAddlCessAmt;
    }, 0);
  };

  const calculateCess = () => {
    return data?.items?.reduce((acc, curr) => {
      return acc + curr?.totalCessAmt;
    }, 0);
  };

  let address;

  if (
    party?.newBillToShipTo &&
    Object.keys(party?.newBillToShipTo).length > 0
  ) {
    address = party?.newBillToShipTo;
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

  const handlePrint = () => {
    handlePrintData();
  };

  console.log(data);

  return (
    <div className="grid">
      <div
        ref={contentToPrint}
        className="receipt-container"
        style={{
          width: "100%",
          maxWidth: "62mm", // Slightly increased to accommodate larger fonts
          margin: "0 auto",
          fontFamily: "'Courier New', monospace",
          fontSize: "14px", // Increased base font
          fontWeight: "bold", // Made default text bold
          lineHeight: "1.4",
          padding: "3mm",
        }}
      >
        <div style={{ width: "100%" }}>
          {/* Header */}
          {org?.industry != 6 && org?.industry != 7 && org?.industry != 8 && (
            <div
              className="header"
              style={{ textAlign: "center", marginBottom: "10px" }}
            >
              <div
                className="restaurant-name"
                style={{
                  fontSize: "16px", // Large, readable header
                  fontWeight: "bold",
                  marginBottom: "6px",
                  letterSpacing: "1px",
                }}
              >
                {data?.voucherType === "performaInvoice" ? "PROFORMA INVOICE" : configurations?.printTitle || ""}
              </div>
            </div>
          )}

          {/* Document Info */}
          {/* Replace the commented order-info div with image */}
          <div
            className="image-container"
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "8px",
            }}
          >
            <img
              src={org?.logo} // Replace with your image path
              alt="Company Logo"
              style={{
                maxWidth: "50mm", // Adjust for thermal printer width
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Company Details */}
          {configurations?.showCompanyDetails && (
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <div
                style={{
                  fontSize: "20px", // Increased
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {org?.name}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "1.3",
                  fontWeight: "bold",
                }}
              >
                <div>
                  {[org?.flat, org?.landmark, org?.road, org?.place, org?.pin]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {org?.mobile && <div>Tel: {org?.mobile}</div>}
                {org?.email && <div>{org?.email}</div>}
                {org?.website && <div>Web: {org?.website}</div>}
                {org?.gstNum && (
                  <div>
                    {IsIndian ? "Tax No:" : "Vat No:"} {org?.gstNum}
                  </div>
                )}
                {org?.pan && <div>Pan: {org?.pan}</div>}
              </div>
            </div>
          )}
          <div
            className="divider"
            style={{
              borderBottom: "2px dashed #000", // Thicker divider
              margin: "8px 0",
            }}
          ></div>

          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            {(org?.industry == 6 || org?.industry == 7) && (
              <>
                <div
                  className="header"
                  style={{ textAlign: "center", marginBottom: "10px" }}
                >
                  <div
                    className="restaurant-name"
                    style={{
                      fontSize: "16px", // Large, readable header
                      fontWeight: "bold",
                      marginBottom: "6px",
                      letterSpacing: "1px",
                    }}
                  >
                    {data?.voucherType === "performaInvoice" ? "PROFORMA INVOICE" : configurations?.printTitle || ""}
                  </div>
                </div>
                <div
                  className="order-info"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "2px",
                    fontSize: "12px", // Increased
                    fontWeight: "bold",
                  }}
                >
                  <div>No: {data?.[getVoucherNumber()]}</div>
                  <div>
                    {new Date(data?.Date || data?.createdAt).toLocaleDateString(
                      "en-GB",
                    )}
                  </div>
                </div>
                <div
                  className="order-info"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                    fontSize: "12px", // Increased
                    fontWeight: "bold",
                  }}
                >
                  <div>
                    Table No:{" "}
                    {data?.voucherNumber
                      ?.map((item) => item?.tableNumber)
                      .join(", ") ||
                      data?.convertedFrom
                        ?.map((item) => item?.tableNumber)
                        .join(", ")}
                  </div>
                  <div>
                    Table No:{" "}
                    {data?.voucherNumber
                      ?.map((item) => item?.tableNumber)
                      .join(", ") ||
                      data?.convertedFrom
                        ?.map((item) => item?.tableNumber)
                        .join(", ")}
                  </div>
                  <div>
                    {new Date(data?.Date || data?.createdAt).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  </div>
                </div>
                <div
                  className="order-info"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                    fontSize: "12px", // Increased
                    fontWeight: "bold",
                  }}
                >
                  <div>
                    KOT NO :{" "}
                    {data?.voucherNumber
                      ?.map((item) => item?.voucherNumber)
                      .join(", ") ||
                      data?.convertedFrom
                        ?.map((item) => item?.voucherNumber)
                        .join(", ")}
                  </div>
                </div>
                {data?.isComplimentary && (
                  <div className="text-xm">Complementary</div>
                )}
              </>
            )}
          </div>

          <div
            className="divider"
            style={{
              borderBottom: "2px dashed #000", // Thicker divider
              margin: "8px 0",
            }}
          ></div>

          {/* Customer Details */}
          <div
            style={{
              marginBottom: "10px",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "2px" }}>
              Customer: {data?.party?.partyName}
            </div>
            {(address?.billToAddress || data?.party?.address) && (
              <div style={{ fontSize: "12px" }}>
                Address: {address.billToAddress || data?.party?.address}
              </div>
            )}
            {data?.party?.mobile && (
              <div style={{ fontSize: "12px" }}>
                {" "}
                Mob: {data?.party?.mobile}
              </div>
            )}
          </div>

          <div
            className="divider"
            style={{
              borderBottom: "1px dashed #000",
              margin: "8px 0",
            }}
          ></div>

          {/* Items Header - Single column layout for better readability */}
          {configurations?.showStockWiseAmount ? (
            // Full bill format
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  borderBottom: "1px solid #000",
                  paddingBottom: "2px",
                }}
              >
                <div style={{ width: "40%" }}>ITEMS</div>
                <div style={{ width: "15%", textAlign: "center" }}>QTY</div>
                <div style={{ width: "20%", textAlign: "right" }}>RATE</div>
                <div style={{ width: "25%", textAlign: "right" }}>AMOUNT</div>
              </div>

              {/* Items */}
              {data?.items?.length > 0 &&
                data?.items.map((el, index) => {
                  // console.log("welcome", el);
                  // console.log("welcome", data);
                  // console.log("welcome", el?.totalCount);
                  const total = el?.total || 0;
                  const count = el?.totalCount || 0;
                  const totalTax = Number(
                    el?.totalIgstAmt ||
                      (el?.totalCgstAmt || 0) + (el?.totalSgstAmt || 0) ||
                      0,
                  );
                  const addRateWithTax =
                    org?.configurations?.[0]?.addRateWithTax?.restaurantSale ??
                    org?.configurations?.[0]?.addRateWithTax?.sale ??
                    true;
                  const rate = addRateWithTax
                    ? count > 0
                      ? Math.round((total * 100) / (100 + el.igst)).toFixed(2)
                      : "0.00" // WITH tax (like format 1)
                    : count > 0
                      ? ((total - totalTax) / count).toFixed(2)
                      : "0.00"; // WITHOUT tax

                  console.log({ rate });

                  const amount = Math.round(Number(rate) * count).toFixed(2);

                  // const rate = count > 0 ? (total / count).toFixed(1) : "0";

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "14px",
                        fontWeight: "bold",
                        marginBottom: "3px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ width: "40%" }}>
                        <div style={{ fontSize: "12px", lineHeight: "1.2" }}>
                          {el.product_name?.length > 12
                            ? el.product_name
                            : el.product_name}
                        </div>
                        {configurations?.showTaxPercentage && (
                          <div style={{ fontSize: "12px" }}>({el.igst}%)</div>
                        )}
                      </div>

                      {configurations?.showQuantity && (
                        <div style={{ width: "15%", textAlign: "center" }}>
                          <div>{el?.totalCount}</div>
                          {configurations?.showUnit && (
                            <div style={{ fontSize: "12px" }}>{el?.unit}</div>
                          )}
                        </div>
                      )}

                      {configurations?.showRate && (
                        <div
                          style={{
                            width: "20%",
                            fontSize: "12px",
                            textAlign: "right",
                          }}
                        >
                          {rate}
                        </div>
                      )}

                      <div
                        style={{
                          width: "25%",
                          fontSize: "12px",
                          textAlign: "right",
                        }}
                      >
                        {amount}
                      </div>
                    </div>
                  );
                })}
            </>
          ) : (
            // Simple KOT format
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                  borderBottom: "1px solid #000",
                  paddingBottom: "2px",
                }}
              >
                <div>ITEMS</div>
                <div>QTY</div>
              </div>

              {/* Items */}
              {data?.items?.length > 0 &&
                data?.items.map((el, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "bold",
                      marginBottom: "3px",
                    }}
                  >
                    <div style={{ maxWidth: "75%" }}>
                      {index + 1}.{" "}
                      {el.product_name?.length > 15
                        ? el.product_name.substring(0, 15) + "..."
                        : el.product_name}
                    </div>
                    <div>{el?.totalCount || 1}</div>
                  </div>
                ))}
            </>
          )}

          <div
            className="divider"
            style={{
              borderBottom: "1px dashed #000",
              margin: "8px 0",
            }}
          ></div>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
              padding: "4px 0",
              backgroundColor: "#f0f0f0",
            }}
          >
            <div>TOTAL QTY:</div>
            <div>
              {data?.items?.reduce(
                (acc, curr) => acc + Number(curr?.totalCount),
                0,
              )}
            </div>
          </div>

          {configurations?.showStockWiseAmount && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                <div>SUBTOTAL:</div>
                <div>{subTotal}</div>
              </div>

              {data?.discount > 0 && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      color: "#d32f2f", // Red color for discount
                    }}
                  >
                    <div>DISCOUNT:</div>
                    <div>- {parseFloat(data.discount).toFixed(2)}</div>
                  </div>

                  {/* ✅ NOTE/REMARKS - Show if exists */}
                  {/* {data?.note && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontStyle: "italic",
                        marginBottom: "4px",
                        padding: "3px",
                        backgroundColor: "#fff3cd",
                        borderLeft: "2px solid #ffc107",
                      }}
                    >
                      Note: {data.note}
                    </div>
                  )} */}

                  {/* Divider after discount */}
                  <div
                    className="divider"
                    style={{
                      borderBottom: "1px dashed #000",
                      margin: "6px 0",
                    }}
                  ></div>
                </>
              )}
            </>
          )}

          {/* Tax Details */}
          {configurations?.showTaxAmount && (
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {IsIndian ? (
                isSameState ? (
                  <>
                    {calculateTotalTax() > 0 && (
                      <div
                        style={{
                          display: "flex",
                          fontSize: "12px",
                          justifyContent: "space-between",
                          marginBottom: "2px",
                        }}
                      >
                        <div>CGST:</div>
                        <div>{(calculateTotalTax() / 2).toFixed(1)}</div>
                      </div>
                    )}
                    {calculateTotalTax() > 0 && (
                      <div
                        style={{
                          display: "flex",
                          fontSize: "12px",
                          justifyContent: "space-between",
                          marginBottom: "2px",
                        }}
                      >
                        <div>SGST:</div>
                        <div>{(calculateTotalTax() / 2).toFixed(1)}</div>
                      </div>
                    )}
                  </>
                ) : (
                  calculateTotalTax() > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "2px",
                        fontSize: "12px",
                      }}
                    >
                      <div>IGST:</div>
                      <div>{Number(calculateTotalTax()).toFixed(1)}</div>
                    </div>
                  )
                )
              ) : (
                calculateTotalTax() > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "2px",
                    }}
                  >
                    <div>VAT:</div>
                    <div>{Number(calculateTotalTax()).toFixed(1)}</div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Additional Charges */}
          {additinalCharge > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              <div>Add Charges:</div>
              <div>{additinalCharge}</div>
            </div>
          )}

          {/* Net Amount */}
          {configurations?.showNetAmount && (
            <>
              <div
                className="divider"
                style={{
                  borderBottom: "3px solid #000", // Thicker divider for total
                  margin: "8px 0",
                }}
              ></div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px", // Larger for final total
                  fontWeight: "bold",
                  marginBottom: "10px",
                  padding: "4px",
                  backgroundColor: "#f0f0f0",
                }}
              >
                <div>GRAND TOTAL:</div>
                <div>
                  {selectedOrganization?.currency} {data?.finalAmount}
                </div>
              </div>

              <div
                style={{
                  fontSize: "14px",
                  textAlign: "center",
                  marginTop: "8px",
                  fontWeight: "bold",
                }}
              >
                <div style={{ marginBottom: "4px" }}>Amount in words:</div>
                <div
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    wordWrap: "break-word",
                    lineHeight: "1.3",
                    fontStyle: "italic",
                  }}
                >
                  {inWords}
                </div>
              </div>
            </>
          )}

          <div
            className="divider"
            style={{
              borderBottom: "2px dashed #000",
              margin: "10px 0",
            }}
          ></div>

          {/* Footer */}
          <div
            className="footer"
            style={{
              textAlign: "center",
              fontSize: "10px",
              fontWeight: "bold",
              letterSpacing: "0.5px",
            }}
          >
            *** THANK YOU ***
            <br />
            <div style={{ fontSize: "8px", marginTop: "4px" }}>
              Please visit again!
            </div>
          </div>
        </div>
      </div>

      {isPreview && (
        <div className="flex gap-3 justify-end p-2">
          <button
            className="px-3 py-1 rounded-lg bg-gray-500 text-black font-medium hover:bg-gray-600 active:scale-95 transition"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="px-3 py-1 rounded-lg bg-gray-500 text-black font-medium hover:bg-gray-600 active:scale-95 transition"
            onClick={() => sendToParent(true)}
          >
            Confirm
          </button>
          <button
            className="px-3 py-1 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 active:scale-95 transition"
            onClick={() => sendToParent(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default VoucherThreeInchPdf;
