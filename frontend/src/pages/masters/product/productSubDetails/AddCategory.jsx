import ProductSubDetailsForm from "../../../../components/homePage/ProductSubDetailsForm";
import TitleDiv from "../../../../components/common/TitleDiv";
import { useState } from "react";
import { useSelector } from "react-redux";

function AddCategory() {
  const [loading, setLoading] = useState(false);
  let organization = useSelector(
    (state) => state?.secSelectedOrganization?.secSelectedOrg
  );
  console.log(organization?.industry);
  const handleLoader = (data) => {
    setLoading(data);
  };
  return (
    <div className="flex h-screen overflow-y-hidden ">
      <div className="flex-1  ">
        <TitleDiv
          title={ [6, 7, 9].includes(organization?.industry) ? "Bed Type" :"Add Category"}
          from="/sUsers/stockItemSettings"
          loading={loading}
        />

        <ProductSubDetailsForm
          tab={
            [6, 7, 9].includes(organization?.industry) ? "bedType" : "category"
          }
          handleLoader={handleLoader}
          isHotel={[6, 7, 9].includes(organization?.industry) ? true : false}
        />
      </div>
    </div>
  );
}

export default AddCategory;
