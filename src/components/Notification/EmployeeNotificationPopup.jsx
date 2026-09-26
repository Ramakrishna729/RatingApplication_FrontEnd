import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/config";
import { setReviewToId } from "../../utils/userSlice";
import RequestAccept from "../popups/RequestAccept";
import "./css/EmployeeNotificationPopup.css";

/**
 * EmployeeNotificationPopup
 * - Fetches notifications for the logged-in employee
 * - Search + client-side filter
 * - Accept / Reject (with optional RequestAccept modal)
 * - Navigate to appropriate review form on Accepted → Review
 */
export default function EmployeeNotificationPopup({ onClose, onclose }) {
  const employeeId = useSelector((state) => state.auth.employeeId);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Support both `onClose` and legacy `onclose` prop names
  const handleClose = useCallback(() => {
    if (typeof onClose === "function") return onClose();
    if (typeof onclose === "function") return onclose();
  }, [onClose, onclose]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // bump to refetch after updates

  // Accept modal state
  const [acceptModal, setAcceptModal] = useState({ open: false, rowIndex: null });

  const formatDate = (val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return String(val);
      return d.toLocaleString();
    } catch (e) {
      return String(val);
    }
  };

  const fetchNotifications = useCallback(() => {
    if (!employeeId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`${BASE_URL}/employee/notification/${employeeId}` , { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Server returned an unexpected payload (expected an array)");
        }
        setNotifications(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setError("Failed to load notifications. Please try again.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    const abort = fetchNotifications();
    return abort; // cleanup aborts on unmount or deps change
  }, [fetchNotifications, refreshKey]);

  // Debounced search input
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    const q = debouncedSearch;
    return notifications
      .filter((n) => {
        const status = (n?.Status || "").toLowerCase();
        return status !== "rejected" && status !== "completed";
      })
      .filter((n) => {
        if (!q) return true;
        const haystack = [
          n?.Mock_Type,
          n?.Requested_Date,
          n?.User_Id,
          n?.SelectedId,
          n?.Status,
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return haystack.some((s) => s.includes(q));
      });
  }, [notifications, debouncedSearch]);

  const updateStatus = async ({ indexInFiltered, newStatus, mode = null, dateTime = null }) => {
    const row = filteredData[indexInFiltered];
    if (!row) return;

    // Optimistic update: reflect status locally first
    setNotifications((prev) =>
      prev.map((n) => (n.Request_Id === row.Request_Id ? { ...n, Status: newStatus } : n))
    );

    try {
      const res = await fetch(`${BASE_URL}/employee/update-notification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          requestId: row.Request_Id,
          mode,
          dateTime,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // refresh from server to keep in sync
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to update status. Please try again.");
      // rollback on failure
      setRefreshKey((k) => k + 1);
    }
  };

  const onAcceptClick = (indexInFiltered) => {
    setAcceptModal({ open: true, rowIndex: indexInFiltered });
  };

  const onAcceptSubmit = (mode, dateTime) => {
    // Assuming the RequestAccept component will call onSubmit(mode, dateTime)
    updateStatus({ indexInFiltered: acceptModal.rowIndex, newStatus: "Accepted", mode, dateTime });
    setAcceptModal({ open: false, rowIndex: null });
  };

  const onRejectClick = (indexInFiltered) => {
    updateStatus({ indexInFiltered, newStatus: "Rejected" });
  };

  const onReviewClick = (indexInFiltered) => {
    debugger;
    const row = filteredData[indexInFiltered];
    if (!row) return;

    // Save the person being reviewed into the store
    dispatch(setReviewToId({ ReviewToId: row.User_Id, RequestId: row.Request_Id }));

    // Route based on Mock_Type
    const type = String(row.Mock_Type || "");
    if (["Monthly Mock", "Weekly Mock", "Hierachy Mock"].includes(type)) {
      navigate("/monthly-mock-form");
    } else if (["Quarterly KPI","Monthly KPI","Yearly KPI"].includes(type)) {
      navigate("/KPI-review");
    } else {
      alert(`Unknown mock type: ${type}`);
    }
  };

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-labelledby="empNotifTitle" onMouseDown={handleClose}>
      <div className="admin-popup" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-popup-header">
          <h2 id="empNotifTitle">Employee Notification</h2>
          <button type="button" onClick={handleClose} className="admin-close-button" aria-label="Close">
            ✖
          </button>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search-input"
          aria-label="Search notifications"
        />

        {loading && <div className="admin-no-data">Loading...</div>}
        {error && !loading && <div className="admin-no-data">{error}</div>}

        {!loading && !error && (
          <table className="admin-notification-table">
            <thead>
              <tr>
                <th>Mock Type</th>
                <th>Requested Date</th>
                <th>Employee Id</th>
                <th>Reviewer Id</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={row?.Request_Id || `${row?.User_Id}-${idx}`}>
                    <td>{row?.Mock_Type || "-"}</td>
                    <td>{formatDate(row?.Requested_Date)}</td>
                    <td>{row?.User_Id || "-"}</td>
                    <td>{row?.SelectedId || "-"}</td>
                    <td>

                      <span className={"adminNotif-status " +
                      ({
                        accepted: "is-accepted",
                        pending: "is-pending",
                        rejected: "is-rejected",
                        completed: "is-completed",
                      }[String(row?.Status).toLowerCase()] || "is-default")}>{row?.Status}</span>

                    </td>
                    <td>
                      <div className="admin-action-buttons">
                        {String(row?.Status || "").toLowerCase() === "pending" && (
                          <>
                            <button className="admin-action-button admin-accept-btn" onClick={() => onAcceptClick(idx)}>
                              Accept
                            </button>
                            <button className="admin-action-button admin-reject-btn" onClick={() => onRejectClick(idx)}>
                              Reject
                            </button>
                          </>
                        )}
                        {String(row?.Status || "").toLowerCase() === "accepted" && (
                          <button className="admin-action-button admin-admin-review-btn" onClick={() => onReviewClick(idx)}>
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="admin-no-data">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {acceptModal.open && (
        <RequestAccept onClose={() => setAcceptModal({ open: false, rowIndex: null })} onSubmit={onAcceptSubmit} />
      )}
    </div>
  );
}
