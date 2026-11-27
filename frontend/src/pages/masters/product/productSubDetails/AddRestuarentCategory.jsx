import ProductSubDetailsForm from "../../../../components/homePage/ProductSubDetailsForm";
import TitleDiv from "../../../../components/common/TitleDiv";
import { useState } from "react";
import { useSelector } from "react-redux";

function AddRestuarentCategory() {
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
          title={ [6, 7, 9].includes(organization?.industry) ? " Regional Food Category" :"Add Category"}
          from="/sUsers/restuarentSettings"
          loading={loading}
        />

        <ProductSubDetailsForm
          tab="Regional Food Category"
          handleLoader={handleLoader}
          isRestaurants={true}
        />
      </div>
    </div>
  );
}

export default AddRestuarentCategory;
