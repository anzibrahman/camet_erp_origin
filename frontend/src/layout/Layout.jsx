/* eslint-disable react/prop-types */
// src/components/Layout.js
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/homePage/Sidebar";
import SidebarSec from "../components/secUsers/SidebarSec";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import { createContext, useState, useContext } from "react";
import SubscriptionExpiryAlert from "@/components/common/SubscriptionExpiryAlert";

const SidebarContext = createContext();

export const useSidebar = () => {
  return useContext(SidebarContext);
};

const Layout = ({ children }) => {
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(false);
  const isRestaurantDashboard =
    location.pathname === "/sUsers/RestaurantDashboard";
  const handleToggleSidebar = () => {
    const isCompactPosScreen =
      isRestaurantDashboard && window.innerWidth < 1280;
    if (isCompactPosScreen || window.innerWidth < 768) {
      setShowSidebar((isVisible) => !isVisible);
    }
  };


  const isAdmin = location.pathname.includes("/admin/");
  const isDashboard = ["/pUsers/dashboard", "/sUsers/dashboard"].includes(
    location.pathname,
  );
  const storageKey = location.pathname.includes("/pUsers/")
    ? "pUserData"
    : "sUserData";
  const user = isDashboard
    ? JSON.parse(localStorage.getItem(storageKey) || "null")
    : null;

  

  const renderSidebar = () => {
    if (location.pathname.includes("/pUsers/")) {
      return (
        <Sidebar
          showBar={showSidebar}
          handleToggleSidebar={handleToggleSidebar}
        />
      );
    } else if (location.pathname.includes("/sUsers/")) {
      return (
        <SidebarSec
          showBar={showSidebar}
          handleToggleSidebar={handleToggleSidebar}
          hideOnDesktop={isRestaurantDashboard}
        />
      );
    } else if (isAdmin) {
      
      return (
        <AdminSidebar
          showBar={showSidebar}
          handleToggleSidebar={handleToggleSidebar}
        />
      );
    }
    return null;
  };

  const renderHeader = () => {
    if (isAdmin) {
      return <AdminHeader title="Admin Dashboard" />;
    }
    return null;
  };

  return (
    <SidebarContext.Provider value={{ showSidebar, handleToggleSidebar }}>
      <div className="app-layout flex h-screen w-screen overflow-hidden">
        <div className="app-sidebar contents">{renderSidebar()}</div>
        <div className="flex-1 flex flex-col min-w-0">
          {renderHeader()}
          <main className={`${isAdmin ? "bg-slate-100" : ""}  flex-1 overflow-y-auto overflow-x-auto`}>
            {isDashboard && <SubscriptionExpiryAlert user={user} />}
            {children}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default Layout;
