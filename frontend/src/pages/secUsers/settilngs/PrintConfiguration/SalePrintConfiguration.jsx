import TitleDiv from "../../../../components/common/TitleDiv";
import SettingsCard from "../../../../components/common/SettingsCard";
import { 
  Percent, 
  FileText,
  Image,
  Hash,
  TrendingUp,
  DollarSign,
  Layers,
  Calculator,
  Building2,
  Landmark,
  BarChart3,
  Tag,
  Package,
  Type,
  Coins,
  ImagePlus,
   Scale
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../../../../api/api";
import { toast } from "sonner";
import { updateConfiguration } from "../../../../../slices/secSelectedOrgSlice";
import { useDispatch } from "react-redux";
import PrintTitleModal from "./PrintTitleModal";
import LogoUploadModal from "./LogoUploadModal";

const SalePrintConfiguration = () => {
  const [settings, setSettings] = useState([]);
  const [printTitleModal, setPrintTitleModal] = useState(false);
  const [logoUploadModal, setLogoUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  ///// redux and api call
  const { _id: cmp_id, configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );

  const saleConfigurations = configurations[0]?.printConfiguration?.filter(
    (item) => item?.voucher === "sale"
  )[0];

  console.log(saleConfigurations?.showUnit);

  useEffect(() => {
    if (saleConfigurations) {
      setSettings([
        {
          title: "Print Title",
          description: "Update print title for invoices",
          icon: <Type />,
          to: "/sUsers/EnableCompanyDetails",
          active: true,
          toggle: false,
          modal: true,
          dbField: "showCompanyDetails",
        },
        {
          title: "Show Letterhead",
          description: "Show company letterhead on invoices",
          icon: <Image />,
          to: "/sUsers/EnableCompanyDetails",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showLetterHead || false,
          dbField: "showLetterHead",
        },
        {
          title: "Company Logo & Letterhead",
          description: "Upload company logo and letterhead image",
          icon: <ImagePlus />,
          to: "/sUsers/sale/upLoadLetterHead",
          active: saleConfigurations.showLetterHead || false,
          toggle: false,
          modal: false,
          dbField: "companyLogo",
          modalType: "logo"
        },
        {
          title: "Enable Company Details",
          description: "Show company information on invoices",
          icon: <Building2 />,
          to: "/sUsers/EnableCompanyDetails",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showCompanyDetails,
          dbField: "showCompanyDetails",
        },
        {
          title: "Enable Discount Column",
          description: "Show discount column for line items",
          icon: <Percent />,
          to: "/sUsers/enableDiscount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showDiscount,
          dbField: "showDiscount",
        },
        {
          title: "Enable Discount Amount",
          description: "Show discount amount instead of percentage",
          icon: <DollarSign />,
          to: "/sUsers/enableDiscount",
          active: saleConfigurations?.showDiscount,
          toggle: true,
          toggleValue: saleConfigurations.showDiscountAmount,
          dbField: "showDiscountAmount",
        },
        {
          title: "Enable HSN",
          description: "Show HSN codes for products",
          icon: <Hash />,
          to: "/sUsers/enableHSN",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showHsn,
          dbField: "showHsn",
        },
        {
          title: "Enable Tax Percentage",
          description: "Display tax percentage on invoices",
          icon: <Percent />,
          to: "/sUsers/enableTaxPercentage",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showTaxPercentage,
          dbField: "showTaxPercentage",
        },
        {
          title: "Enable Incl. Tax Rate",
          description: "Show inclusive tax rate (hides tax amount column)",
          icon: <Calculator />,
          to: "/sUsers/EnableStockWiseTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showInclTaxRate,
          dbField: "showInclTaxRate",
        },
        {
          title: "Enable Tax Analysis",
          description: "Show detailed tax breakdown",
          icon: <BarChart3 />,
          to: "/sUsers/enableTaxAnalysis",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showTaxAnalysis,
          dbField: "showTaxAnalysis",
        },
        {
          title: "Enable Stock wise Tax Amount",
          description: "Show tax amount for each stock item",
          icon: <Layers />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showStockWiseTaxAmount,
          dbField: "showStockWiseTaxAmount",
        },
        {
          title: "Enable Terms & Conditions",
          description: "Show terms and conditions on invoices",
          icon: <FileText />,
          to: "/sUsers/enableTeamsConditions",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showTeamsAndConditions,
          dbField: "showTeamsAndConditions",
        },
        {
          title: "Enable Bank Details",
          description: "Show bank account information",
          icon: <Landmark />,
          to: "/sUsers/enableBankDetails",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showBankDetails,
          dbField: "showBankDetails",
        },
        {
          title: "Enable Tax Amount",
          description: "Display total tax amount",
          icon: <Calculator />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showTaxAmount,
          dbField: "showTaxAmount",
        },
        {
          title: "Enable Rate",
          description: "Show unit rate for products",
          icon: <Tag />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showRate,
          dbField: "showRate",
        },
        {
          title: "Enable Quantity",
          description: "Display product quantities",
          icon: <Package />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showQuantity,
          dbField: "showQuantity",
        },
        {
          title: "Enable Stock Wise Amount",
          description: "Show amount for each stock item",
          icon: <TrendingUp />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showStockWiseAmount,
          dbField: "showStockWiseAmount",
        },
        {
          title: "Enable NET Amount",
          description: "Display net total amount",
          icon: <Coins />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showNetAmount,
          dbField: "showNetAmount",
        },
         {
          title: "Enable Unit",
          description: "Display unit for quantity",
          icon: < Scale />,
          to: "/sUsers/EnableTaxAmount",
          active: true,
          toggle: true,
          toggleValue: saleConfigurations.showUnit,
          dbField: "showUnit",
        },
      ]);
    }
  }, [saleConfigurations]);

  const handleToggleChange = async (newState) => {
    const apiData = {
      ...newState,
      type: "printConfiguration",
      voucher: "sale",
    };

    try {
      setLoading(true);
      const res = await api.put(
        `/api/sUsers/updateConfiguration/${cmp_id}`,
        apiData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      dispatch(updateConfiguration(res?.data?.data));
      localStorage.setItem("secOrg", JSON.stringify(res.data.data));
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const savePrintTitle = async (value) => {
    const apiData = {
      input: "printTitle",
      value,
      type: "printConfiguration",
      voucher: "sale",
    };

    try {
      const res = await api.put(
        `/api/sUsers/updateConfiguration/${cmp_id}`,
        apiData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      dispatch(updateConfiguration(res?.data?.data));
      localStorage.setItem("secOrg", JSON.stringify(res.data.data));
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    }
  };

  const saveCompanyLogo = async (imageFile) => {
    const formData = new FormData();
    formData.append('logo', imageFile);
    formData.append('type', 'printConfiguration');
    formData.append('voucher', 'sale');

    try {
      setLoading(true);
      const res = await api.put(
        `/api/sUsers/updateConfiguration/${cmp_id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      dispatch(updateConfiguration(res?.data?.data));
      localStorage.setItem("secOrg", JSON.stringify(res.data.data));
      toast.success("Company logo updated successfully");
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalOpen = (modalType) => {
    if (modalType === "logo") {
      setLogoUploadModal(true);
    } else {
      setPrintTitleModal(true);
    }
  };

  const savePrintFormat = async (printFormat) => {
    try {
      setLoading(true);
      const res = await api.put(`/api/sUsers/updateConfiguration/${cmp_id}`, {
        input: "printFormat",
        value: printFormat,
        type: "printConfiguration",
        voucher: "sale",
      }, { headers: { "Content-Type": "application/json" }, withCredentials: true });
      dispatch(updateConfiguration(res.data.data));
      localStorage.setItem("secOrg", JSON.stringify(res.data.data));
      toast.success(`Default sales print set to ${printFormat === "thermal" ? "Thermal" : "A4"}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update print format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <TitleDiv
        title="Print Configuration (Sale)"
        from="/sUsers/printConfiguration"
        loading={loading}
      />

      <PrintTitleModal
        isOpen={printTitleModal}
        onClose={() => setPrintTitleModal(false)}
        onSubmit={savePrintTitle}
        data={saleConfigurations}
        loading={loading}
      />

      <LogoUploadModal
        isOpen={logoUploadModal}
        onClose={() => setLogoUploadModal(false)}
        onSubmit={saveCompanyLogo}
        loading={loading}
        currentLogo={saleConfigurations?.companyLogo}
      />

      <div className="space-y-4 b-white p-4 mx-1">
        <div className="flex items-center justify-between gap-4 rounded-sm p-4 shadow-md">
          <div>
            <h3 className="text-xs font-bold">Default Sales Print Format</h3>
            <p className="mt-0.5 text-xs text-gray-500">Every sales transaction uses this format when you press Print.</p>
          </div>
          <select
            aria-label="Default sales print format"
            value={saleConfigurations?.printFormat || "a4"}
            disabled={loading}
            onChange={event => savePrintFormat(event.target.value)}
            className="h-9 min-w-28 rounded border border-slate-300 bg-white px-2 text-xs font-semibold"
          >
            <option value="a4">A4 Print</option>
            <option value="thermal">Thermal Print</option>
          </select>
        </div>
        {settings.map((option, index) => (
          <SettingsCard
            option={option}
            index={index}
            key={index}
            modalHandler={() => handleModalOpen(option.modalType)}
            handleToggleChangeFromParent={handleToggleChange}
          />
        ))}
      </div>
    </div>
  );
};

export default SalePrintConfiguration;
