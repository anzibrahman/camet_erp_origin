/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import TitleDiv from "@/components/common/TitleDiv";
import Swal from "sweetalert2";
import api from "@/api/api";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PRINT_MODES = {
  THERMAL: "thermal",
  A5: "a5",
};

const PRINT_MODE_LABELS = {
  [PRINT_MODES.THERMAL]: "3 Inch (80mm) Thermal",
  [PRINT_MODES.A5]: "A5",
};

function VoucherThreeInchPdfFormat2({
  data,
  org: orgProp,
  isPreview,
  sendToParent,
  selectedSaleDate,
  setSelectedSaleDate,
}) {
  const [subTotal, setSubTotal] = useState(0);
  const isConfirmingRef = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [printMode, setPrintMode] = useState(PRINT_MODES.THERMAL);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const contentToPrint = useRef(null);

  const orgFromStore = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg,
  );

  if (!data) data = location?.state;
  const org = orgProp ?? orgFromStore;

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  let showPrintButton =
    org?.configurations?.[0]?.defaultPrint?.showBeforeSaleInRestaurant;
  const { isFinalized } = useParams();
  const isIndian = true;
  const party = data?.party;
  const isSameState =
    org?.state?.toLowerCase() === party?.state?.toLowerCase() || !party?.state;
  const voucherType = data?.voucherType;
  const discountBasedOnGrossAmount =
    org?.configurations?.[0]?.discountBasedOnGrossAmount ?? false;
  const includeTaxWithPrint =
    org?.configurations?.[0]?.defaultPrint?.showPrintWithTaxInRestaurant;

  const isA5Mode = printMode === PRINT_MODES.A5;
  const emailPaperFormat = isA5Mode ? "a5" : "a4";
  const emailPageWidth = isA5Mode ? 148 : 210;
  const emailPageHeight = isA5Mode ? 210 : 297;
  const emailWindowWidth = isA5Mode ? 560 : 794;
  const emailMargin = isA5Mode ? 6 : 10;

  const isCancelled =
    data?.isCancelled === true ||
    data?.cancelled === true ||
    data?.status === "cancelled" ||
    data?.dayBookStatus === "cancelled" ||
    data?.saleStatus === "cancelled";

  const getVoucherNumber = () => {
    if (!voucherType) return "";
    if (voucherType === "sales" || voucherType === "vanSale")
      return "salesNumber";
    if (voucherType === "saleOrder") return "orderNumber";
    return voucherType + "Number";
  };

  useEffect(() => {
    if (!data?.items?.length) return;
    const discountValue = Number(data?.additionalCharges?.[0]?.finalValue || 0);
    const taxableSubTotal = data.items.reduce(
      (acc, curr) =>
        acc +
        Number(
          curr?.GodownList?.[0]?.taxableAmount ?? curr?.taxableAmount ?? 0,
        ),
      0,
    );
    setSubTotal(Number((taxableSubTotal - discountValue).toFixed(2)));
  }, [data, discountBasedOnGrossAmount]);

  const getItemTaxableAfterDiscount = (item, totalDiscount, grossAmount) => {
    const lineGross = Number(item.total || 0);
    const totalTax = Number(item.totalIgstAmt || 0);
    const lineBeforeTax = lineGross - totalTax;
    const lineDiscount =
      grossAmount > 0 ? (lineBeforeTax / grossAmount) * totalDiscount : 0;
    return lineBeforeTax - lineDiscount;
  };

  const calculateTotalTaxWithDiscountLogic = () => {
    if (!data?.items?.length) return 0;
    const totalDiscount =
      Number(
        data?.totalAdditionalCharges ||
          data?.additionalCharges?.[0]?.finalValue,
      ) || 0;

    const grossTaxable = data.items.reduce((acc, item) => {
      const lineTax = Number(item.totalIgstAmt || 0);
      return acc + (Number(item.total || 0) - lineTax);
    }, 0);

    const isInterState = !isSameState;

    const totalTax = data.items.reduce((acc, item) => {
      const taxableAfterDiscount = getItemTaxableAfterDiscount(
        item,
        totalDiscount,
        grossTaxable,
      );

      if (isInterState) {
        return acc + (taxableAfterDiscount * Number(item.igst || 0)) / 100;
      }

      return (
        acc +
        (taxableAfterDiscount * Number(item.cgst || 0)) / 100 +
        (taxableAfterDiscount * Number(item.sgst || 0)) / 100
      );
    }, 0);

    return Number(totalTax.toFixed(2));
  };

  const calculateTotalTax = () =>
    discountBasedOnGrossAmount
      ? Number(
          data?.items?.reduce(
            (acc, curr) =>
              acc +
              Number(
                curr?.totalIgstAmt ||
                  curr?.totalCgstAmt + curr?.totalSgstAmt ||
                  0,
              ),
            0,
          ) || 0,
        )
      : calculateTotalTaxWithDiscountLogic();

  const getBillNumber = () =>
    data?.[getVoucherNumber()] ||
    data?.voucherNumber?.[0]?.voucherNumber ||
    "11007";

  const getTableNumber = () =>
    data?.voucherNumber
      ?.map((item) => item?.tableNumber)
      .filter(Boolean)
      .join(", ") ||
    data?.convertedFrom
      ?.map((item) => item?.tableNumber)
      .filter(Boolean)
      .join(", ") ||
    null;

  const getRoomNumber = () => {
    const hasCheckIn = data?.voucherNumber?.[0]?.checkInNumber;
    const roomNo =
      data?.roomDetails?.roomno ||
      data?.voucherNumber?.[0]?.roomNumber ||
      data?.roomId?.roomno ||
      data?.roomId?.roomName;

    if (!hasCheckIn && !roomNo) return null;
    return `Room: ${roomNo}`;
  };

  const getFoodPlan = () => {
    const hasCheckIn = data?.voucherNumber?.[0]?.checkInNumber;
    const foodPlanArray = data?.roomDetails?.foodPlanDetails;
    if (!hasCheckIn && !Array.isArray(foodPlanArray)) return null;
    const names = foodPlanArray?.map((item) => item.planType).join(", ");
    return names?.length > 0 ? `Food Plan: ${names}` : null;
  };

  const netAmount = Math.round(Number(data?.finalAmount || 0)).toFixed(2);
  const discount = Math.abs(
    Number(
      data?.totalAdditionalCharges ??
        data?.additionalCharges?.[0]?.finalValue ??
        0,
    ),
  ).toFixed(2);
  let amountWithDiscount = Math.round(
    Number(data?.finalAmount || 0) + Number(discount || 0),
  ).toFixed(2);
  const tax = Math.round(calculateTotalTax()).toFixed(2);
  const cgst = (calculateTotalTax() / 2).toFixed(2);
  const sgst = (calculateTotalTax() / 2).toFixed(2);
  const cgstPercentage = data?.items?.find((el) => el.cgst > 0)?.cgst || 0;
  const sgstPercentage = data?.items?.find((el) => el.sgst > 0)?.sgst || 0;
  const igstPercentage = data?.items?.find((el) => el.igst > 0)?.igst || 0;

  const handleThermalPrint = useReactToPrint({
    content: () => contentToPrint.current,
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; }
      .receipt-container { width: 72mm !important; margin: 0 auto !important; padding: 2mm 3mm !important; box-sizing: border-box; }
    `,
  });

  const handleA5Print = useReactToPrint({
    content: () => contentToPrint.current,
    pageStyle: `
      @page { size: A5 portrait; margin: 6mm; }
      html, body { margin: 0 !important; padding: 0 !important; }
      .receipt-container { width: 136mm !important; margin: 0 auto !important; padding: 6mm 8mm !important; box-sizing: border-box; border: none !important; }
    `,
  });

  const handlePrint = () => (isA5Mode ? handleA5Print() : handleThermalPrint());

  const generateReceiptPDFAsBase64 = async () => {
    const element = contentToPrint.current;
    if (!element) throw new Error("Receipt element not found");

    const orig = {
      width: element.style.width,
      margin: element.style.margin,
      border: element.style.border,
      padding: element.style.padding,
    };

    element.style.width = `${emailPageWidth}mm`;
    element.style.margin = "0";
    if (isA5Mode) {
      element.style.border = "none";
      element.style.padding = "8mm";
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: emailWindowWidth,
    });

    Object.assign(element.style, orig);

    const imgData = canvas.toDataURL("image/png");
    const availableWidth = emailPageWidth - emailMargin * 2;
    const availableHeight = emailPageHeight - emailMargin * 2;
    const imgRenderedHeight = availableWidth * (canvas.height / canvas.width);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: emailPaperFormat,
    });

    if (imgRenderedHeight <= availableHeight) {
      doc.addImage(
        imgData,
        "PNG",
        emailMargin,
        emailMargin + (availableHeight - imgRenderedHeight) / 2,
        availableWidth,
        imgRenderedHeight,
      );
    } else {
      const scaledWidth =
        availableWidth * (availableHeight / imgRenderedHeight);
      doc.addImage(
        imgData,
        "PNG",
        emailMargin + (availableWidth - scaledWidth) / 2,
        emailMargin,
        scaledWidth,
        availableHeight,
      );
    }

    return new Promise((resolve) => {
      const blob = doc.output("blob");
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(blob);
    });
  };

  const handleShareBill = async (option, message, ccEmails, toEmail) => {
    if (option === "WhatsApp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
      );
      return true;
    }
    if (option === "Mail") {
      const pdfBase64 = await generateReceiptPDFAsBase64();
      if (!pdfBase64) throw new Error("Failed to generate receipt PDF");
      const billNo = getBillNumber();
      const res = await api.post(
        "/api/sUsers/send-bill-email",
        {
          toEmail,
          ccEmails,
          message,
          billNo,
          guestName: data?.party?.partyName || data?.customerName || "Customer",
          organizationName: org?.name,
          pdfBase64,
          pdfFileName: `Receipt-${billNo}.pdf`,
        },
        { withCredentials: true },
      );
      if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to send email");
      return true;
    }
  };

  const handleShareClick = async () => {
    const billNo = getBillNumber();
    const tableNo = getTableNumber();
    const roomNo = getRoomNumber();
    const orgName = org?.name || "";
    const orgPhone = org?.mobile || "";
    const itemsList =
      data?.items
        ?.map(
          (el, i) =>
            `  ${i + 1}. ${el.product_name} x${el.totalCount || 1} = ₹${Number(el.total || 0).toFixed(2)}`,
        )
        .join("\n") || "";

    const defaultMessage = `Dear Customer,\n\nThank you for dining at ${orgName}!\n\nYour Bill Summary:\n  Bill No    : ${billNo}\n  ${tableNo ? `Table      : ${tableNo}` : ""}\n  ${roomNo || ""}\n  Date       : ${new Date(data?.Date || data?.createdAt).toLocaleDateString("en-GB")}\n\nItems:\n${itemsList}\n\n  Gross      : ₹${subTotal?.toFixed(2)}\n  Tax        : ₹${tax}\n  Net Amount : ₹${netAmount}\n\nWe look forward to serving you again!\n\n${orgPhone ? `Contact: ${orgPhone}` : ""}\n\nWarm Regards,\n${orgName}`;

    const { value: option } = await Swal.fire({
      title: "Share through",
      input: "radio",
      inputOptions: { WhatsApp: "WhatsApp", Mail: "Mail" },
      confirmButtonText: "Next",
      confirmButtonColor: "#000000",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      cancelButtonColor: "#dd3333",
      inputValidator: (v) => !v && "Please select an option!",
    });
    if (!option) return;

    let toEmail = "",
      ccEmails = [];

    if (option === "Mail") {
      const { value: emailData, isDismissed } = await Swal.fire({
        title: "Email Details",
        html: `<div style="text-align:left;padding:10px;">
          <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:14px;">To Email <span style="color:red;">*</span></label>
          <input id="swal-to" type="email" class="swal2-input" placeholder="customer@example.com" style="width:95%;margin:0 0 14px 0;"/>
          <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:14px;">CC Emails <span style="color:gray;font-weight:normal;">(Optional)</span></label>
          <input id="swal-cc" type="text" class="swal2-input" placeholder="cc1@example.com, cc2@example.com" style="width:95%;margin:0;"/>
          <small style="color:gray;display:block;margin-top:6px;">Separate multiple CC emails with commas</small>
        </div>`,
        showCancelButton: true,
        cancelButtonColor: "#dd3333",
        confirmButtonText: "Next",
        confirmButtonColor: "#000000",
        width: "540px",
        focusConfirm: false,
        preConfirm: () => {
          const to = document.getElementById("swal-to").value.trim();
          const cc = document.getElementById("swal-cc").value.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!to) {
            Swal.showValidationMessage("Please enter recipient email");
            return false;
          }
          if (!emailRegex.test(to)) {
            Swal.showValidationMessage("Please enter a valid email address");
            return false;
          }
          if (cc) {
            const invalid = cc
              .split(",")
              .map((e) => e.trim())
              .filter((e) => e && !emailRegex.test(e));
            if (invalid.length) {
              Swal.showValidationMessage(
                `Invalid CC email(s): ${invalid.join(", ")}`,
              );
              return false;
            }
          }
          return { to, cc };
        },
      });
      if (isDismissed || !emailData) return;
      toEmail = emailData.to;
      ccEmails = emailData.cc
        ? emailData.cc
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];
    }

    const { value: finalMessage, isDismissed: msgDismissed } = await Swal.fire({
      title: "Compose Message",
      html: `<div style="text-align:left;padding:10px;">
        <label style="display:block;margin-bottom:6px;font-weight:bold;font-size:14px;">Message <span style="color:red;">*</span></label>
        <textarea id="swal-message" class="swal2-textarea" style="width:95%;height:280px;padding:10px;font-size:13px;resize:vertical;">${defaultMessage}</textarea>
      </div>`,
      showCancelButton: true,
      cancelButtonColor: "#dd3333",
      confirmButtonText: "Send",
      confirmButtonColor: "#000000",
      width: "660px",
      focusConfirm: false,
      preConfirm: () => {
        const msg = document.getElementById("swal-message").value;
        if (!msg?.trim()) {
          Swal.showValidationMessage("Please enter a message");
          return false;
        }
        return msg;
      },
    });
    if (msgDismissed || !finalMessage) return;

    Swal.fire({
      title: option === "Mail" ? "Sending Email..." : "Opening WhatsApp...",
      html: `<div style="text-align:center;padding:16px;"><p>Please wait...</p>
        ${option === "Mail" && toEmail ? `<p style="color:gray;font-size:13px;margin-top:8px;">To: ${toEmail}</p>` : ""}
        ${ccEmails.length ? `<p style="color:gray;font-size:13px;">CC: ${ccEmails.join(", ")}</p>` : ""}
      </div>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await handleShareBill(option, finalMessage, ccEmails, toEmail);
      Swal.fire({
        icon: "success",
        title: "Success!",
        text:
          option === "Mail" ? "Email sent successfully!" : "WhatsApp opened!",
        confirmButtonColor: "#000000",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to share.",
        confirmButtonColor: "#000000",
      });
    }
  };

  const thermalContainerStyle = {
    width: "72mm",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
    fontSize: "11px",
    lineHeight: 1.2,
    padding: "2mm 3mm",
    border: "1px dotted #000",
    textAlign: "left",
    boxSizing: "border-box",
  };

  const a5ContainerStyle = {
    width: "148mm",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
    fontSize: "12px",
    lineHeight: 1.4,
    padding: "8mm 10mm",
    textAlign: "left",
    boxSizing: "border-box",
    background: "#fff",
  };

  const containerStyle = isA5Mode ? a5ContainerStyle : thermalContainerStyle;

  const flexRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2px",
  };

  const textRight = { textAlign: "right", paddingRight: "3px" };
  const textLeft = { textAlign: "left", paddingLeft: "3px" };
  const centerText = { textAlign: "center" };
  const bold = { fontWeight: "bold" };

  const headerGrid = {
    display: "grid",
    gridTemplateColumns: "0.6fr 2.2fr 0.7fr 1fr 1.1fr",
    fontSize: isA5Mode ? "12px" : "11px",
    fontWeight: "bold",
    paddingBottom: "3px",
    borderBottom: "1px dotted #000",
    marginBottom: "4px",
  };

  const itemGrid = {
    display: "grid",
    gridTemplateColumns: "0.6fr 2.2fr 0.7fr 1fr 1.1fr",
    fontSize: isA5Mode ? "11px" : "10px",
    marginBottom: "2px",
    padding: "1px 0",
  };

  const paymentSplits = data?.paymentSplittingData || [];

  const getPaymentSummary = () => {
    if (!paymentSplits.length) return null;
    return paymentSplits
      .filter((p) => p.amount > 0)
      .map((p) => (
        <div key={`${p.type}_${p.subsource}`}>
          <div style={{ fontSize: "10px", fontWeight: "bold" }}>
            {p.subsource} : ₹ {Math.round(p.amount).toFixed(2)}
          </div>
          {p?.credit_reference_type && (
            <div style={{ fontSize: "10px", fontWeight: "bold" }}>
              Party : {p?.credit_reference_type}{" "}
              {p?.creditor_gst && `(${p.creditor_gst})`}
            </div>
          )}
        </div>
      ));
  };

  const PrintModeDropdown = () => (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          border: "1.5px solid #3b82f6",
          borderRadius: "8px",
          background: "#fff",
          fontSize: "13px",
          fontWeight: "500",
          color: "#1e3a5f",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
        {PRINT_MODE_LABELS[printMode]}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "#1f2937",
            borderRadius: "8px",
            minWidth: "200px",
            zIndex: 999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          {Object.entries(PRINT_MODE_LABELS).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => {
                setPrintMode(mode);
                setDropdownOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 16px",
                background: printMode === mode ? "#3b82f6" : "transparent",
                border: "none",
                color: "#fff",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {printMode === mode ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span style={{ width: 13 }} />
              )}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const ReceiptHeader = () => {
    const hasLogo = !!org?.logo;

    if (isA5Mode && hasLogo) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "8px",
            paddingBottom: "6px",
            borderBottom: "1px dotted #000",
            gap: "12px",
          }}
        >
          <img
            src={org.logo}
            alt="Logo"
            style={{
              width: "35mm",
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div style={{ textAlign: "right" }}>
            <div style={{ ...bold, fontSize: "20px", marginBottom: "3px" }}>
              {org?.name}
            </div>
            {(org?.road || org?.place) && (
              <div style={{ fontSize: "11px" }}>
                {`${org?.road || ""}${org?.road && org?.place ? ", " : ""}${org?.place || ""}`}
              </div>
            )}
            {org?.mobile && (
              <div style={{ fontSize: "11px" }}>PH: {org.mobile}</div>
            )}
            {org?.gstNum && (
              <div style={{ fontSize: "11px" }}>GSTIN: {org.gstNum}</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          ...flexRow,
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px dotted #000",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        {hasLogo && (
          <img
            src={org.logo}
            alt="Logo"
            style={{ width: "25mm", height: "auto", objectFit: "contain" }}
          />
        )}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ ...bold, fontSize: "16px", marginBottom: "2px" }}>
            {org?.name}
          </div>
          {(org?.road || org?.place) && (
            <div>{`${org?.road || ""}${org?.road && org?.place ? ", " : ""}${org?.place || ""}`}</div>
          )}
          {org?.mobile && <div>PH: {org.mobile}</div>}
          {org?.gstNum && <div>GSTNO: {org.gstNum}</div>}
        </div>
      </div>
    );
  };

  const receiptJSX = (
    <div
      ref={contentToPrint}
      className="receipt-container"
      style={{
        ...containerStyle,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isCancelled && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-25deg)",
            fontSize: isA5Mode ? "58px" : "34px",
            fontWeight: "bold",
            color: "rgba(220, 38, 38, 0.18)",
            letterSpacing: "4px",
            whiteSpace: "nowrap",
            zIndex: 0,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          CANCELLED
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <ReceiptHeader />

        <div
          style={{
            ...centerText,
            marginBottom: "6px",
            paddingBottom: "6px",
            borderBottom: "1px dotted #000",
          }}
        >
          {!isCancelled ? (
            <div
              style={{
                fontSize: isA5Mode ? "16px" : "14px",
                fontWeight: "bold",
                fontStyle: "italic",
              }}
            >
              {data?.isComplimentary ? "COMPLEMENTARY" : "INVOICE"}
            </div>
          ) : (
            <div
              style={{
                fontSize: isA5Mode ? "16px" : "14px",
                fontWeight: "bold",
                color: "#dc2626",
                letterSpacing: "2px",
              }}
            >
              CANCELLED BILL
            </div>
          )}
        </div>

        <div
          style={{
            marginBottom: "6px",
            fontSize: isA5Mode ? "12px" : "11px",
            fontWeight: "bold",
            paddingBottom: "6px",
            borderBottom: "1px dotted #000",
          }}
        >
          <div style={{ display: "flex" }}>
            <span style={{ minWidth: "160px" }}>Bill {getBillNumber()}</span>
            <span>
              Date: {""}
              {new Date(data?.date || data?.createdAt).toLocaleDateString(
                "en-GB",
              )}
            </span>
          </div>
          <div style={{ display: "flex" }}>
            <span
              style={{
                minWidth: "160px",
                visibility:
                  getTableNumber() && getTableNumber() !== "10"
                    ? "visible"
                    : "hidden",
              }}
            >
              Table: {getTableNumber()}
            </span>
            <span>
              Time: {""}
              {new Date(data?.Date || data?.createdAt).toLocaleTimeString(
                "en-GB",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                },
              )}
            </span>
          </div>
          {data?.orderType && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ textTransform: "capitalize" }}>
                {data.orderType.replace(/-/g, " ")}
              </span>
            </div>
          )}
          {data?.party?.partyName && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ textTransform: "capitalize" }}>Guest : </span>
              <span style={{ textTransform: "capitalize" }}>
                {data?.party?.partyName}
              </span>
            </div>
          )}
        </div>

        <div style={headerGrid}>
          <div style={textLeft}>No</div>
          <div style={textLeft}>Item</div>
          <div style={centerText}>Qty</div>
          <div style={textRight}>Rate</div>
          <div style={textRight}>Amount</div>
        </div>

        {data?.items?.map((el, index) => {
          const IsComplimentary = data?.isComplimentary;
          const total = Number(el?.total || 0);
          const count = Number(el?.totalCount || 1);
          const totalTax = IsComplimentary
            ? 0
            : el?.totalIgstAmt != null
              ? Number(el.totalIgstAmt)
              : Number(el?.totalCgstAmt || 0) + Number(el?.totalSgstAmt || 0);
          const igst = IsComplimentary ? 0 : Number(el?.igst || 0);
          const addRateWithTax =
            org?.configurations?.[0]?.addRateWithTax?.restaurantSale;

          const addRate = addRateWithTax
            ? count > 0
              ? ((total * 100) / (100 + igst) / count).toFixed(2)
              : "0.00"
            : count > 0
              ? ((total - totalTax) / count).toFixed(2)
              : "0.00";

          const rate = includeTaxWithPrint
            ? count > 0
              ? (
                  Number(addRate) + Number((totalTax / count).toFixed(2))
                ).toFixed(2)
              : "0.00"
            : addRate;

          const amount = (Number(rate) * count).toFixed(2);

          return (
            <div key={index} style={itemGrid}>
              <div style={textLeft}>{index + 1}</div>
              <div style={{ ...textLeft, wordBreak: "break-word" }}>
                {el.product_name}
              </div>
              <div style={centerText}>{count}</div>
              <div style={textRight}>{rate}</div>
              <div style={textRight}>{amount}</div>
            </div>
          );
        })}

        <div style={{ borderBottom: "1px dotted #000", margin: "6px 0" }} />

        <div
          style={{
            fontSize: "10px",
            marginBottom: "4px",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div style={{ flex: 1 }}>{getPaymentSummary()}</div>
          <div style={{ flex: 1 }}>
            {!discountBasedOnGrossAmount && Number(discount) > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    marginBottom: "2px",
                    fontWeight: "bold",
                  }}
                >
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 60,
                      textAlign: "right",
                    }}
                  >
                    SubTotal
                  </div>
                  <div style={{ width: 60, textAlign: "right" }}>
                    {(Number(subTotal || 0) + Number(discount || 0)).toFixed(2)}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    marginBottom: "2px",
                    fontWeight: "bold",
                  }}
                >
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 60,
                      textAlign: "right",
                    }}
                  >
                    Discount
                  </div>
                  <div style={{ width: 60, textAlign: "right" }}>
                    {discount}
                  </div>
                </div>
              </>
            )}

            {!data?.isComplimentary && (
              <>
                {discountBasedOnGrossAmount && Number(discount) > 0 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        marginBottom: "2px",
                        fontWeight: "bold",
                      }}
                    >
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 80,
                          textAlign: "right",
                        }}
                      >
                        Total Amount
                      </div>
                      <div style={{ width: 60, textAlign: "right" }}>
                        {amountWithDiscount}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        marginBottom: "2px",
                        fontWeight: "bold",
                      }}
                    >
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 80,
                          textAlign: "right",
                        }}
                      >
                        Discount
                      </div>
                      <div style={{ width: 60, textAlign: "right" }}>
                        {discount}
                      </div>
                    </div>
                  </>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    marginBottom: "2px",
                    fontWeight: "bold",
                  }}
                >
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 80,
                      textAlign: "right",
                    }}
                  >
                    Gross Amount
                  </div>
                  <div style={{ width: 60, textAlign: "right" }}>
                    {subTotal?.toFixed(2)}
                  </div>
                </div>

                {(org?.industry == 7 || org?.industry == 9
                  ? calculateTotalTax() > 0
                  : isIndian && isSameState && calculateTotalTax() > 0) && (
                  <>
                    <div style={flexRow}>
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 70,
                          fontWeight: "bold",
                        }}
                      >
                        CGST {cgstPercentage}%
                      </div>
                      <div style={textRight}>{cgst}</div>
                    </div>
                    <div style={flexRow}>
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 70,
                          fontWeight: "bold",
                        }}
                      >
                        SGST {sgstPercentage}%
                      </div>
                      <div style={textRight}>{sgst}</div>
                    </div>
                  </>
                )}
              </>
            )}

            {org?.industry != 7 && org?.industry != 9 &&
              isIndian &&
              !isSameState &&
              calculateTotalTax() > 0 && (
                <div style={flexRow}>
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 70,
                      fontWeight: "bold",
                    }}
                  >
                    IGST {igstPercentage}%
                  </div>
                  <div style={textRight}>{tax}</div>
                </div>
              )}

            {!isIndian && calculateTotalTax() > 0 && (
              <div style={flexRow}>
                <div
                  style={{ marginLeft: "auto", width: 70, fontWeight: "bold" }}
                >
                  Tax {igstPercentage}%
                </div>
                <div style={textRight}>{tax}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ borderBottom: "1px dotted #000", margin: "6px 0" }} />

        <div style={{ fontSize: "10px", marginBottom: "6px" }}>
          <div
            style={{ display: "flex", fontWeight: "bold", marginBottom: "2px" }}
          >
            {getRoomNumber() && <div style={bold}>{getRoomNumber()}</div>}
            <div
              style={{
                marginLeft: "auto",
                paddingRight: "3px",
                fontWeight: "bold",
                color: isCancelled ? "#dc2626" : "inherit",
              }}
            >
              {isCancelled
                ? `Cancelled Amount: ${netAmount}`
                : `Total: ${netAmount}`}
            </div>
          </div>
          {getFoodPlan() && <div style={bold}>{getFoodPlan()}</div>}
          <div
            style={{
              ...flexRow,
              justifyContent: "flex-end",
              paddingRight: "3px",
              fontWeight: "bold",
            }}
          >
            {discountBasedOnGrossAmount &&
              data?.isComplimentary &&
              Number(discount) > 0 && (
                <>
                  Discount: <span style={bold}>{discount || "0.00"}</span>
                </>
              )}
          </div>
        </div>

        <div style={{ borderBottom: "1px dotted #000", margin: "6px 0" }} />

        <div
          style={{
            ...centerText,
            fontSize: isA5Mode ? "16px" : "14px",
            fontWeight: "bold",
            marginBottom: "8px",
            paddingBottom: "6px",
            borderBottom: "1px dotted #000",
            color: isCancelled ? "#dc2626" : "inherit",
          }}
        >
          {isCancelled
            ? `CANCELLED AMOUNT: ${netAmount}`
            : `Net Amount: ${netAmount}`}
        </div>

        <div
          style={{
            ...centerText,
            fontSize: "11px",
            fontWeight: "bold",
            marginTop: "8px",
            color: isCancelled ? "#dc2626" : "inherit",
          }}
        >
          {isCancelled ? "THIS BILL IS CANCELLED" : "Thank You Visit Again"}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style type="text/css" media="print">
        {isA5Mode
          ? `
          @page { size: A5 portrait; margin: 6mm; }
          html, body { margin: 0 !important; padding: 0 !important; text-align: left !important; }
          .receipt-container { width: 136mm !important; margin: 0 auto !important; padding: 6mm 8mm !important; text-align: left !important; box-sizing: border-box; border: none !important; }
        `
          : `
          @page { size: 80mm auto; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; text-align: left !important; }
          .receipt-container { width: 72mm !important; margin: 0 auto !important; padding: 2mm 3mm !important; text-align: left !important; box-sizing: border-box; }
        `}
      </style>

      <TitleDiv title="Restaurant sale print" />

      <div className="flex justify-between items-center">
        {isPreview && (
          <div className="my-2 mx-2">
            <input
             className="border rounded-md px-3 py-2 hover:cursor-pointer"
              type="date"
              value={selectedSaleDate}
              onChange={(e) => {
                setSelectedSaleDate(e.target.value);
              }}
            />
          </div>
        )}

        <div className="my-2 mx-2 ml-auto hover:cursor-pointer">
          <PrintModeDropdown />
        </div>
      </div>

      <div className="grid mt-2">
        {isA5Mode ? (
          <div
            style={{
              background: "#fff",
              padding: "32px 16px",
              minHeight: "400px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                borderRadius: "2px",
                width: "148mm",
                maxWidth: "100%",
              }}
            >
              {receiptJSX}
            </div>
            <div
              style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280" }}
            >
              Previewing A5 layout
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {receiptJSX}
            <div
              style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}
            >
              Previewing 80mm thermal layout
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center p-2">
          {(showPrintButton || isFinalized) && (
            <button
              className="px-3 py-1 rounded-lg bg-gray-500 text-white font-medium hover:bg-gray-600 active:scale-95 transition"
              onClick={handlePrint}
            >
              Print
            </button>
          )}

          {isFinalized && (
            <button
              className="px-3 py-1 rounded-lg bg-black text-white font-medium hover:bg-green-600 active:scale-95 transition"
              onClick={handleShareClick}
            >
              Share
            </button>
          )}

          {isPreview && (
            <>
              <button
                className="px-3 py-1 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                disabled={isConfirming}
                onClick={() => {
                  if (isConfirmingRef.current) return;
                  isConfirmingRef.current = true;
                  setIsConfirming(true);
                  sendToParent(true);
                }}
              >
                {isConfirming ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Confirming...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>

              <button
                className="px-3 py-1 rounded-lg bg-red-400 text-gray-800 font-medium hover:bg-red-500 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isConfirming}
                onClick={() => sendToParent(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default VoucherThreeInchPdfFormat2;
