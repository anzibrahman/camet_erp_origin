import { useRef, useEffect, useState } from "react";
import api from "../../../api/api";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import VoucherPdf from "./indian/VoucherPdf";
import VoucherPdfNonIndian from "./nonIndian/VoucherPdfNonIndian";
import TitleDiv from "@/components/common/TitleDiv";
import { formatVoucherType } from "../../../../utils/formatVoucherType";
import { SharingMethodSelector } from "../voucherDetails/actionButtons/SharingMethodSelector";
import { FaShareAlt } from "react-icons/fa";
import html2pdf from "html2pdf.js";
import MobilePdfViewer from "./MobilePdfViewer"; // Import the new wrapper


function VoucherPdfInitiator() {
  const [data, setData] = useState([]);
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  
  const contentToPrint = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const IsIndian =
    useSelector(
      (state) => state?.secSelectedOrganization?.secSelectedOrg?.country
    ) === "India";

  const org = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg
  );

  const bank = org?.configurations[0]?.bank;

  let voucherType = null;
  const params = {};

  if (pathname.toLowerCase().includes("/susers/shareperformainvoice/")) {
    voucherType = "performaInvoice";
  } else if (pathname.toLowerCase().includes("/susers/sharesales/")) {
    voucherType = "sales";
  } else if (pathname.toLowerCase().includes("/susers/sharepurchase/")) {
    voucherType = "purchase";
  } else if (pathname.toLowerCase().includes("/susers/sharesaleorder/")) {
    voucherType = "saleOrder";
  } else if (pathname.toLowerCase().includes("/susers/sharecreditnote/")) {
    voucherType = "creditNote";
  } else if (pathname.toLowerCase().includes("/susers/sharedebitnote/")) {
    voucherType = "debitNote";
  } else if (pathname.toLowerCase().includes("/susers/sharevansale/")) {
    voucherType = "sales";
    params.vanSale = true;
  }

  console.log(voucherType)

  useEffect(() => {
    const getTransactionDetails = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/api/sUsers/get${voucherType}Details/${id}`,
          { params, withCredentials: true }
        );
        setData(res.data.data);
      } catch (error) {
        console.log(error);
        toast.error(error.response?.data?.message || "An error occurred");
        setTimeout(() => navigate(-1, { replace: true }), 2000);
      } finally {
        setLoading(false);
      }
    };

    getTransactionDetails();
  }, [id, voucherType]);

  const handleDownload = () => {
    const element = contentToPrint.current;
    if (!element) return;

    // Detect mobile devices
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Store original styles
    const originalTransform = element.style.transform;
    const originalTransition = element.style.transition;

    if (isMobile) {
      element.style.transform = "none";
      element.style.transition = "none";
    }

    const options = {
      margin: [1, 1, 10, 1],
      filename: `${formatVoucherType(voucherType)}_${id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 5,
        useCORS: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight + 50,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    html2pdf()
      .from(element)
      .set(options)
      .outputPdf("blob")
      .then((pdfBlob) => {
        const blobUrl = URL.createObjectURL(pdfBlob);

        // Restore styles
        if (isMobile) {
          element.style.transform = originalTransform;
          element.style.transition = originalTransition;
        }

        if (isMobile) {
          // ✅ Mobile: trigger direct download
          const downloadLink = document.createElement("a");
          downloadLink.href = blobUrl;
          downloadLink.download = `${formatVoucherType(voucherType)}_${id}.pdf`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } else {
          // ✅ Desktop: trigger print
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = blobUrl;
          document.body.appendChild(iframe);

          iframe.onload = () => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          };
        }
      })
      .catch((error) => {
        console.error("PDF generation failed:", error);

        if (isMobile) {
          element.style.transform = originalTransform;
          element.style.transition = originalTransition;
        }
      });
  };

  return (
    <div>
      <TitleDiv
        loading={loading}
        title={`${formatVoucherType(voucherType)} Preview`}
        rightSideContent={<FaShareAlt size={15} />}
        rightSideModalComponent={({ setShowModal }) => (
          <SharingMethodSelector
            open={true}
            setOpen={setShowModal}
            handleDownload={handleDownload}
          />
        )}
      />

      <MobilePdfViewer
        loading={loading}
        showControls={true}
        containerHeight="75vh"
        initialScale={0.476}
      >
        <div ref={contentToPrint}>
          {IsIndian ? (
            <VoucherPdf
              data={data}
              org={org}
              bank={bank}
              userType="secondaryUser"
              tab="sales"
            />
          ) : (
            <VoucherPdfNonIndian
              data={data}
              org={org}
              bank={bank}
              userType="secondaryUser"
              tab="sales"
            />
          )}
        </div>
      </MobilePdfViewer>
    </div>
  );
}

export default VoucherPdfInitiator;
