/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */

import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import transactionImg from "../../assets/images/transactions.png";
import customers from "../../assets/images/customers.png";
import vouchers from "../../assets/images/application.png";
import product from "../../assets/images/product.png";
import reportImg from "../../assets/images/reports.png";
import hotelImg from "../../assets/images/hotel.png";
import restaurantImg from "../../assets/images/restaurant.png";
import Mixologist from "../../assets/images/Mixologist.jpg"
import api from "@/api/api";
import { BEVERAGE_INDUSTRY_CODE } from "../../../constants/industries.js";

// API function to fetch dashboard counts
const fetchDashboardCounts = async (cmp_id) => {
  const response = await api.get(`/api/sUsers/fetchDashboardCounts/${cmp_id}`, {
    withCredentials: true,
  });

  return response.data.data;
};



const DashboardCards = ({
  userType,
  receiptTotal,
  handleLinkClick,
  organization,
}) => {
  const cmp_id = useSelector(
    (state) => state?.secSelectedOrganization.secSelectedOrg?._id
  );

  // React Query to fetch dashboard counts
  const { data: dashboardCounts, isLoading } = useQuery({
    queryKey: ['dashboardCounts', cmp_id],
    queryFn: () => fetchDashboardCounts(cmp_id),
    enabled: !!cmp_id, // Only run query if cmp_id exists
    staleTime:  15*60*1000, // 15 minutes
    refetchInterval:15*60*1000, // Refetch every 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    // cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Use fetched data or fallback to 0
  const notificationCounts = {
    products: dashboardCounts?.productCount || 0,
    customers: dashboardCounts?.customerCount || 0,
  };

  

  const primary = [
    {
      icon: transactionImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Transactions",
      link: "/pUsers/transaction",
    },
    {
      icon: customers,
      subtitle: "Stock Register",
      link: "/pUsers/Inventory",
    },
  ];

 let secondary = [];

if (organization?.industry === 6) {
  secondary = [
    {
      icon: hotelImg,
      subtitle: "Hotel Management",
      link: "/sUsers/hotelDashBoard",
    }, {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
} else if (organization?.industry === 3 ) {
  secondary = [
    {
      icon: restaurantImg,
      subtitle: "Restaurant Management",
      link: "/sUsers/RestaurantDashboard",
    },
    {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
} else if (organization?.industry === 7) {
  secondary = [
    {
      icon: hotelImg,
      subtitle: "Hotel Management",
      link: "/sUsers/hotelDashBoard",
    },
    {
      icon: restaurantImg,
      subtitle: "Restaurant Management",
      link: "/sUsers/RestaurantDashboard",
    },
    {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
}
 else if (organization?.industry === 8) {
  secondary = [
    
    {
      icon: restaurantImg,
      subtitle: "Bakery & Cafe",
      link: "/sUsers/RestaurantDashboard",
    },
    {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
}else if (organization?.industry === 9) {
  secondary = [
   
    {
      icon: Mixologist,
      subtitle: "Bar Management",
      link: "/sUsers/BarDashboard",
    },
    {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
}

else {
  secondary = [
    {
      icon: product,
      subtitle: "Products",
      link: "/sUsers/productList",
      notificationCount: notificationCounts.products,
      notificationColor: "bg-blue-500",
    },
    {
      icon: customers,
      subtitle: "Customers",
      link: "/sUsers/partyList",
      notificationCount: notificationCounts.customers,
      notificationColor: "bg-green-500",
    },
    {
      icon: vouchers,
      subtitle: "Vouchers",
      link: "/sUsers/selectVouchers",
    },
    {
      icon: reportImg,
      title: `₹${receiptTotal.toFixed(2)}`,
      subtitle: "Reports",
      link: "/sUsers/reports",
    },
  ];
}

  // if (organization?.industry === BEVERAGE_INDUSTRY_CODE) {
  //   secondary.push({
  //     icon: product,
  //     subtitle: "Beverage",
  //     link: "/sUsers/productList",
  //   });
  // }

  const cardData = {
    primary,
    secondary,
  };

  const cards = cardData[userType];

  return (
    <div
      className={`grid grid-cols-2 ${ cards.length >= 5 ? "md:grid-cols-5" : "md:grid-cols-4" } p-6 lg:px-6 gap-4 md:gap-6  w-full md:w-6.5/12  `}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          onClick={() => handleLinkClick(card.link)}
          className="flex flex-wrap"
        >
          <div className="w-full cursor-pointer relative">
            <div className="flex items-center px-2 py-4 shadow-md rounded-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5">
              <div className="bg-white p-1.5 rounded-lg flex justify-center items-center w-12 h-12 md:w-14 md:h-14 shadow-lg relative">
                <img src={card.icon} alt={card.title} className="" />
                
                {/* Notification Badge */}
                {card.notificationCount > 0 && !isLoading && (
                  <div
                    className={`absolute -top-2 -right-2 ${card.notificationColor} text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md border-2 border-white`}
                  >
                    {card.notificationCount}
                  </div>
                )}
                
                {/* Loading indicator for badge */}
                {isLoading && card.notificationCount !== undefined && (
                  <div className="absolute -top-2 -right-2 bg-gray-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className="mx-2 md:mx-5">
                {/* {card.title && (
                  <h4 className="sm:text-md md:text-lg font-semibold text-gray-700">
                    {card.title}
                  </h4>
                )} */}
                <div className="text-gray-500 text-[15px]">
                  {card?.subtitle}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
