import ProductSubDetailsForm from "../../../../components/homePage/ProductSubDetailsForm";
import TitleDiv from "../../../../components/common/TitleDiv";
import { useState } from "react";
import { useSelector } from "react-redux";
function AddBrand({ isRestaurantBrand = false }) {
  let organization = useSelector((state) => state?.secSelectedOrganization?.secSelectedOrg);
  console.log(organization?.industry)
  const [loading, setLoading] = useState(false);

  const handleLoader = (data) => {
    setLoading(data)
  }

return (
  <div className="flex-1 h-screen overflow-y-hidden">
    <TitleDiv
      title={isRestaurantBrand ? "Brand Management" : [6, 7, 9].includes(organization?.industry) ? "Room Type" : "Add Brand"}
      from={isRestaurantBrand ? "/sUsers/restuarentSettings" : "/sUsers/stockItemSettings"}
      loading={loading}
    />
    <ProductSubDetailsForm
      tab={isRestaurantBrand ? "brand" : [6, 7, 9].includes(organization?.industry) ? "roomType" : "brand"}
      handleLoader={handleLoader}
      isHotel={!isRestaurantBrand && [6, 7, 9].includes(organization?.industry)}
      isRestaurants={isRestaurantBrand}
      
    />
  </div>
);

}

export default AddBrand;
