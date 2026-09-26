import React, { useState, lazy, Suspense, useCallback } from "react";
import { FaBell, FaUser, FaPowerOff } from "react-icons/fa";
import { VscTypeHierarchySub } from "react-icons/vsc";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { clearAuth } from "../../utils/authSlice";
import "./css/HeaderBar.css";

// Lazy-load popups
const AdminNotification = lazy(() =>
  import("../Notification/AdminNotification")
);
const EmployeeNotificationPopup = lazy(() =>
  import("../Notification/EmployeeNotificationPopup")
);

const HeaderBar = () => {
  const [showAdminNotification, setShowAdminNotification] = useState(false);
  const { role } = useSelector((state) => state.auth || { role: null }) || {};
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const closeNotification = useCallback(
    () => setShowAdminNotification(false),
    []
  );
  const openNotification = useCallback(
    () => setShowAdminNotification(true),
    []
  );

  const handleLogoClick = useCallback(() => {
    if (role === "Admin") navigate("/admin");
    else navigate("/employee-home");
  }, [navigate, role]);

  const logout = useCallback(
    (e) => {
      e.preventDefault();
      dispatch(clearAuth());
      navigate("/", { replace: true });
    },
    [dispatch, navigate]
  );

  return (
    <header className="header-container">
      {/* Left: Logo */}
      <div className="header-left" title="Home">
        <img
          src="/images/slides/logo2.jpg"
          alt="SIGNIWIS Logo"
          className="header-logo"
          width={200}
          height={50}
          onClick={handleLogoClick}
        />
      </div>

      {/* Center: Title */}
      <div className="header-center">
        <h1 className="header-title">— Rating Application —</h1>
      </div>

      {/* Right: Actions */}
      <div className="header-right">
        {
          role === "user" ? (
            <button
              type="button"
              aria-label="Open notifications"
              title="My Hierarchy"
              onClick={() => navigate("/Myhierarchy")}
              className="icon-button"
            >
              <VscTypeHierarchySub  size={20}  />
            </button>
          ) : (
            ""
          )}
        <button
          type="button"
          aria-label="Open notifications"
          title="Notifications"
          onClick={openNotification}
          className="icon-button"
        >
          <FaBell size={20} />
        </button>

        <div className="user-avatar" aria-hidden="true">
          <FaUser />
        </div>

        <button
          type="button"
          aria-label="Log out"
          title="Log out"
          onClick={logout}
          className="icon-button"
        >
          <FaPowerOff size={20} />
        </button>
      </div>

      {/* Notification popup */}
      <Suspense fallback={null}>
        {showAdminNotification &&
          (role === "Admin" ? (
            <AdminNotification onclose={closeNotification} />
          ) : (
            <EmployeeNotificationPopup onclose={closeNotification} />
          ))}
      </Suspense>
    </header>
  );
};

export default HeaderBar;
