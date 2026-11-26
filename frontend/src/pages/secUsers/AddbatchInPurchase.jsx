import BathAddingForm from "../../components/secUsers/main/Forms/BathAddingForm";
import TitleDiv from "@/components/common/TitleDiv";
import "./addBatchDesktop.css";

const AddbatchInPurchase = () => {
  return (
    <div className="batch-add-page relative">
      <TitleDiv title={"Add Batch"} />
      <BathAddingForm taxInclusive={false} />
    </div>
  );
};

export default AddbatchInPurchase;
