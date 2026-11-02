import { useRef, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
// import { FaFilePdf } from "react-icons/fa";
// import { BeatLoader } from "react-spinners"; // You can use any loader from react-spinners
import useFetch from "@/customHook/useFetch";
import { IoIosArrowRoundBack } from "react-icons/io";
import { MdPrint } from "react-icons/md";
import CustomBarLoader from "@/components/common/CustomBarLoader";
import VoucherThreeInchPdf from "./threeInchPdf/VoucherThreeInchPdf";

function VoucherPdfInitiatorThreeInch() {
  const [data, setData] = useState([]);
  const { id } = useParams();

  const org = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg
  );

  const bank = org?.configurations[0]?.bank;

  const contentToPrint = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  let voucherType = null;
  const params = {};

  if (pathname.toLowerCase().includes("/susers/shareperformainvoicethreeinch/")) {
    voucherType = "performaInvoice";
  } else if (pathname.toLowerCase().includes("/susers/sharesalesthreeinch/")) {
    voucherType = "sales";
  } else if (pathname.toLowerCase().includes("/susers/sharepurchasethreeinch/")) {
    voucherType = "purchase";
  } else if (pathname.toLowerCase().includes("/susers/sharesaleorderthreeinch/")) {
    voucherType = "saleOrder";
  } else if (pathname.toLowerCase().includes("/susers/sharecreditnotethreeinch/")) {
    voucherType = "creditNote";
  } else if (pathname.toLowerCase().includes("/susers/sharedebitnotethreeinch/")) {
    voucherType = "debitNote";
  } else if (pathname.toLowerCase().includes("/susers/sharevansalethreeinch/")) {
    voucherType = "sales";
    params.vanSale = true;
  }

  // useEffect(() => {
  //   const getTransactionDetails = async () => {
  //     try {
  //       // Fetch invoice details
  //       const res = await api.get(
  //         `/api/sUsers/get${voucherType}Details/${id}`,

  //         {
  //           params,
  //           withCredentials: true,
  //         }
  //       );
  //       setData(res.data.data);

  //       // Set loading to false after data is fetched
  //       // setLoading(false);
  //     } catch (error) {
  //       console.log(error);
  //       toast.error(error.response.data.message);
  //       // setLoading(false);

  //       // Navigate back if there's an error
  //       setTimeout(() => {
  //         navigate(-1, { replace: true });
  //       }, 2000);
  //     }
  //   };

  //   getTransactionDetails();
  // }, [id, voucherType]);

  const { data: voucherData, loading } = useFetch(
    `/api/sUsers/get${voucherType}Details/${id}`,
    params,
    true
  );

  useEffect(() => {
    if (voucherData) {
      setData(voucherData.data);
    }
  }, [voucherData]);
const handlePrint = useReactToPrint({
  documentTitle: `Sale Order ${data?.salesNumber}`,
  pageStyle: `
    @page { 
      size: 65mm auto; 
      margin: 0; 
    }
    @media print {
      * {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      body { 
        font-family: 'Courier New', monospace !important;
        font-size: 14px !important;
        font-weight: bold !important;
        line-height: 1.4 !important;
        margin: 0 !important;
        padding: 3mm !important;
        width: 67mm !important;
      }
      .receipt-container {
        width: 100% !important;
        max-width: 67mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
      .header {
        text-align: center !important;
        margin-bottom: 10px !important;
      }
      .restaurant-name {
        font-size: 16px !important;
        font-weight: bold !important;
        margin-bottom: 6px !important;
        letter-spacing: 1px !important;
      }
      .divider {
        margin: 8px 0 !important;
        width: 100% !important;
      }
      .order-info {
        display: flex !important;
        justify-content: space-between !important;
        margin-bottom: 8px !important;
        font-size: 14px !important;
        font-weight: bold !important;
      }
      .footer {
        text-align: center !important;
        margin-top: 10px !important;
        font-weight: bold !important;
        font-size: 14px !important;
        letter-spacing: 0.5px !important;
      }
    }
  `,
  onBeforePrint: () => console.log("before printing..."),
  onAfterPrint: () => console.log("after printing..."),
  removeAfterPrint: true,
});



  return (
    <div>
      {/* <TitleDiv title="Voucher" loading={loading} /> */}

      <div className=" nonPrintable-content bg-[#012a4a]   sticky top-0 p-3 px-5 text-white text-lg font-bold flex items-center gap-3  shadow-lg justify-between">
        <div className="flex gap-2 ">
          <button
            onClick={() => navigate(-1, { replace: true })}
            className="cursor-pointer"
          >
            <IoIosArrowRoundBack className="text-3xl" />
          </button>
          <p>Share Your Order</p>
        </div>
        <div>
          <MdPrint
            onClick={() => {
              handlePrint(null, () => contentToPrint.current);
            }}
            className="text-xl cursor-pointer "
          />
        </div>
      </div>
      {loading && <CustomBarLoader />}

      <div className="  ">
        <VoucherThreeInchPdf
          contentToPrint={contentToPrint}
          data={data}
          org={org}
          bank={bank}
          tab="sale"
          // isPreview={true}
          // handlePrintData={handlePrint}
          
        />
      </div>
    </div>
  );
}

export default VoucherPdfInitiatorThreeInch;
