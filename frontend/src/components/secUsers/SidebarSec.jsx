/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  setSecSelectedOrganization,
  removeSecSelectedOrg,
} from "../../../slices/secSelectedOrgSlice";
import { Link } from "react-router-dom";
import { RingLoader } from "react-spinners";
import { IoMdSettings } from "react-icons/io";

import { removeAll } from "../../../slices/invoiceSecondary";
import { removeAllSales } from "../../../slices/salesSecondary";
import { removeAll as removeAllStock } from "../../../slices/stockTransferSecondary";
import { removeAll as removeAllPurchase } from "../../../slices/purchase";
import { removeAll as removeAllCredit } from "../../../slices/creditNote";
import {
  storingPermissions,
  storingUserType,
} from "../../../slices/permissionSlice";
import CametHead from "../sidebar/CametHead";
import ProfileSection from "../sidebar/ProfileSection";
import { FaHome } from "react-icons/fa";
import { FaAngleRight } from "react-icons/fa";
import { MdOutlineSecurity } from "react-icons/md";
import { LuTimerReset } from "react-icons/lu";
import { SiHelpscout } from "react-icons/si";
import { GrInfo } from "react-icons/gr";
import { IoMdPower } from "react-icons/io";
import { BsFillBuildingsFill } from "react-icons/bs";
import { SlUserFollow } from "react-icons/sl";
import LogoutModal from "../common/modal/LogoutModal";
import { isAdminUser } from "@/utils/permissions";
import SubscriptionExpiryAlert from "@/components/common/SubscriptionExpiryAlert";

function SidebarSec({ showBar, hideOnDesktop = false }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [userData, setUserData] = useState({});
  const [dropdown, setDropdown] = useState(false);
  const [org, setOrg] = useState("");
  const [loader, setLoader] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [role, setRole] = useState("user");
  const [open, setOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const selectedTab = localStorage.getItem("selectedSecondatSidebarTab");
  const storedUserData = JSON.parse(localStorage.getItem("sUserData"));
  const permission = useSelector((state) => state?.permissionData?.permissions);

  console.log(storedUserData);

  const [tab, setTab] = useState(selectedTab);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { secSelectedOrg: prevOrg, refreshOrganizations } = useSelector(
    (state) => state.secSelectedOrganization
  );

  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setShowSidebar(false);
      }
    };

    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [sidebarRef, setShowSidebar]);

  // const canAccess = useCallback(
  //   (path) =>
  //     canAccessPath({
  //       pathname: path,
  //       user: userData?._id ? userData : storedUserData,
  //       permissions:
  //         userData?.permissions || storedUserData?.permissions || storedPermissions || {},
  //     }),
  //   [storedPermissions, storedUserData, userData]
  // );

  const navItems = [
    {
      to: "/sUsers/dashboard",
      tab: "dash",
      icon: <FaHome />,
      label: "Home",
    },
  ];

  if (isAdminUser({ role })) {
    navItems.push(
      {
        to: "/sUsers/company/list",
        tab: "company",
        icon: <BsFillBuildingsFill />,
        label: "Company",
      },
      {
        to: "/sUsers/retailers",
        tab: "addSec",
        icon: <SlUserFollow />,
        label: "Users",
      }
    );
  }

  const securityItems = [
    {
      to: "/sUsers/dashboard",
      tab: "passcode",
      icon: <MdOutlineSecurity />,
      label: "Passcode",
    },
    {
      to: "/sUsers/dashboard",
      tab: "resetPassword",
      icon: <LuTimerReset />,
      label: "Reset Password",
    },
  ];

  const supportItems = [
    {
      to: "/sUsers/dashboard",
      tab: "help",
      icon: <SiHelpscout />,
      label: "Help",
    },
    {
      to: "/sUsers/dashboard",
      tab: "About",
      icon: <GrInfo />,
      label: "About",
    },
  ];

  if (
    companies &&
    companies.length > 0 &&
    org.isApproved === true 
    // canAccess("/sUsers/settings")
  ) {
    const additionalTabs = [];
    {(permission?.settings || storedUserData?.role === "admin") && 
  
    additionalTabs.push({
      to: "/sUsers/settings",
      tab: "terms",
      icon: <IoMdSettings />,
      label: "Settings",
    })
    }

    additionalTabs.forEach((item) => {
      navItems.push(item);
    });
  }

  const getUserData = useCallback(async () => {
    try {
      const res = await api.get("/api/sUsers/getSecUserData", {
        withCredentials: true,
      });

      const { userData } = res.data.data;

      // This endpoint does not include subscription status. Preserve the
      // status received at login so the dashboard popup/sidebar reminder is
      // not lost when the sidebar refreshes the user profile.
      const loggedInUser = JSON.parse(localStorage.getItem("sUserData") || "null");
      const userDataWithSubscription = {
        ...userData,
        subscription: userData?.subscription || loggedInUser?.subscription,
      };

      setUserData(userDataWithSubscription);
      setCompanies(userDataWithSubscription?.organization);
      setRole(userDataWithSubscription?.role || "user");
      localStorage.setItem("sUserData", JSON.stringify(userDataWithSubscription));
      localStorage.setItem(
        "permissions",
        JSON.stringify(userDataWithSubscription?.permissions || {})
      );
      localStorage.setItem("userType", userDataWithSubscription?.userType || "");
      dispatch(storingPermissions(userDataWithSubscription?.permissions || {}));
      dispatch(storingUserType(userDataWithSubscription?.userType || null));

      if (!prevOrg) {
        setOrg(userDataWithSubscription?.organization[0]);
        dispatch(setSecSelectedOrganization(userDataWithSubscription?.organization[0]));
      } else {
        setOrg(prevOrg);
      }
    } catch (error) {
      console.log(error);
    }
  }, [prevOrg, dispatch]);

  useEffect(() => {
    getUserData();
  }, [refreshOrganizations]);

  useEffect(() => {
    const isCompactPosScreen = hideOnDesktop && window.innerWidth < 1280;
    if (isCompactPosScreen || window.innerWidth < 768) {
      setShowSidebar(showBar);
    }
  }, [showBar, hideOnDesktop]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []);

  const handleSidebarItemClick = (newTab) => {
    if (hideOnDesktop || window.innerWidth < 768) {
      setShowSidebar(false);
    }

    setTab(newTab);
    localStorage.setItem("selectedSecondatSidebarTab", newTab);
    dispatch(removeAll());
    dispatch(removeAllSales());
    dispatch(removeAllStock());
    dispatch(removeAllPurchase());
    dispatch(removeAllCredit());

    localStorage.removeItem("SecondaryTransactionEndDate");
    localStorage.removeItem("SecondaryTransactionStartDate");
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      const res = await api.post(
        "/api/sUsers/logout",
        {},
        {
          withCredentials: true,
        }
      );
      toast.success(res.data.message);
      localStorage.removeItem("sUserData");
      dispatch(removeSecSelectedOrg());
      navigate("/sUsers/login");
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "An error occurred during logout"
      );
    } finally {
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleDropDownchange = async (el) => {
    if (!el?._id) return;

    try {
      setLoader(true);
      const res = await api.get(`/api/sUsers/getSingleOrganization/${el._id}`, {
        withCredentials: true,
      });

      const org = res.data.organizationData;
      setDropdown(!dropdown);
      if (window.innerWidth <= 640) {
        setShowSidebar(!showSidebar);
      }
      setOrg(org);
      dispatch(setSecSelectedOrganization(org));
      navigate("/sUsers/dashboard");
      setLoader(false);
    } catch (error) {
      console.log(error);
      toast.error("An error occurred");
      setLoader(false);
    } finally {
      setLoader(false);
    }
  };

  const SidebarCard = ({
    item,
    tab,
    expandedSections,
    handleSidebarItemClick,
  }) => {
    return (
      <>
        <Link to={item.to}>
          <span
            onClick={() => {
              if (item.tab === "logout") {
                handleLogoutClick();
              } else {
                handleSidebarItemClick(item.tab);
              }
            }}
            className={`${
              tab === item.tab
                ? `text-blue-500 ${
                    open ? "border-r-2 border-blue-500 bg-gray-800" : ""
                  }`
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            } flex items-center w-full py-2 mt-3 transition-all duration-300 transform text-[13.5px] h-10 ${
              open && "pl-5"
            }`}
          >
            {open ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center ">
                  <span className="text-lg">{item.icon}</span>
                  <span className=" transition-all mx-4 font-medium origin-left duration-500 ease-in-out">
                    {item.label}
                  </span>
                </div>
                <span className="mx-4 font-medium ">
                  <FaAngleRight />
                </span>
              </div>
            ) : (
              <div className="flex justify-center text-lg">{item.icon}</div>
            )}

            {item.subItems && (
              <div
                className={`flex flex-col ml-6 overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                  expandedSections.inventory ? "max-h-[500px]" : "max-h-0"
                }`}
              >
                {item.subItems.map((subItem, index) => (
                  <div key={index} className="py-1">
                    {subItem.label}
                  </div>
                ))}
              </div>
            )}
          </span>
        </Link>
      </>
    );
  };

  return (
    <div ref={sidebarRef} className="nonPrintable-content">
      {loader && (
        <div className="absolute top-0 w-screen h-screen z-50 flex justify-center items-center bg-black/[0.5] ">
          <RingLoader color="#1c14a0" />
        </div>
      )}

      <div
        className={`${
          showSidebar
            ? "z-50 absolute h-[125vh] transform translate-x-0"
            : hideOnDesktop
              ? "-translate-x-full xl:translate-x-0 z-50 absolute xl:relative"
              : "-translate-x-full md:translate-x-0 z-50 absolute md:relative"
        } ${
          open ? "w-64" : "w-28"
        } transition-all duration-700 ease-in-out flex flex-col h-screen p-1 bg-[#0b1d34] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-[#0B1D34] scrollbar-thumb-[#30435e]`}
        style={{
          transitionProperty: "width, transform",
        }}
      >
        {/* company head */}
        <CametHead
          handleSidebarItemClick={handleSidebarItemClick}
          open={open}
          setOpen={setOpen}
        />

        {/* user profile section */}
        <ProfileSection
          org={org}
          userData={userData}
          handleDropDownchange={handleDropDownchange}
          handleLogout={handleLogoutClick}
          open={open}
        />

        {open && <SubscriptionExpiryAlert user={storedUserData} variant="sidebar" />}

        {/* Main content area - this will take up remaining space */}
        <div className="flex flex-col flex-1 my-3">
          <div
            className={`flex flex-col ${!open ? "items-center mt-1" : "mt-9"}`}
          >
            <p
              className={`text-sm text-gray-400 ${
                open ? "px-4" : "text-center"
              }`}
            >
              Menu
            </p>

            {/* my accounts */}
            <nav>
              {navItems.map((item, index) => (
                <div key={index}>
                  <SidebarCard
                    item={item}
                    tab={tab}
                    handleSidebarItemClick={handleSidebarItemClick}
                  />
                </div>
              ))}
            </nav>

            {/* security items */}
            <p
              className={`text-sm text-gray-400 mt-7 ${
                open ? "px-4" : "text-center"
              }`}
            >
              Security
            </p>

            <nav>
              {securityItems.map((item, index) => (
                <div key={index}>
                  <SidebarCard
                    item={item}
                    tab={tab}
                    handleSidebarItemClick={handleSidebarItemClick}
                  />
                </div>
              ))}
            </nav>

            {/* support items - removed logout from here */}
            <p
              className={`text-sm text-gray-400 mt-7 ${
                open ? "px-4" : "text-center"
              }`}
            >
              Support
            </p>

            <nav>
              {supportItems.map((item, index) => (
                <div key={index}>
                  <SidebarCard
                    item={item}
                    tab={tab}
                    handleSidebarItemClick={handleSidebarItemClick}
                  />
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom section - Logout and Version - Always at bottom */}
        <div className={`mt-auto flex flex-col ${!open ? "items-center" : ""}`}>
          {/* Logout button */}
          <div className="mb-2 w-full">
            <span
              onClick={handleLogoutClick}
              className={`${
                tab === "logout"
                  ? `text-blue-500 ${
                      open ? "border-r-2 border-blue-500 bg-gray-800" : ""
                    }`
                  : "text-gray-400 bg-slate-800 hover:text-white"
              } flex items-center w-full py-2 transition-all duration-300 transform text-[13.5px] h-10 cursor-pointer ${
                open && "pl-5"
              }`}
            >
              {open ? (
                <div className="flex items-center justify-between w-full ">
                  <div className="flex items-center ">
                    <span className="text-lg text-red-500">
                      <IoMdPower />
                    </span>
                    <span className=" transition-all mx-4 font-medium origin-left duration-500 ease-in-out">
                      Log Out
                    </span>
                  </div>
                  {/* <span className="mx-4 font-medium ">
                    <FaAngleRight />
                  </span> */}
                </div>
              ) : (
                <div className="flex justify-center text-lg w-full text-red-500">
                  <IoMdPower />
                </div>
              )}
            </span>
          </div>

          {/* version */}
          <hr className="mb-2 border mx-2 border-gray-700" />

          <div className="flex flex-col items-center px-4 bg-gray-700 py-1">
            <h3 className="text-[10px] text-gray-400 tracking-widest text-center">
              Version 0.0.11
            </h3>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
  
    </div>
  );
}

export default SidebarSec;
