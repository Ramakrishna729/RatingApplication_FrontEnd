import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BASE_URL } from "../../utils/config";
import "./css/AdminNotification.css";

const AdminNotificationPopup = ({ onClose, onclose, onDelete }) => {
  // Backward-compatible close handler (supports onclose or onClose)
  const handleClose = useCallback(() => {
    if (typeof onClose === "function") return onClose();
    if (typeof onclose === "function") return onclose();
  }, [onClose, onclose]);

  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const searchRef = useRef(null);

  // Focus search on open & support ESC to close
  useEffect(() => {
    searchRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await fetch(`${BASE_URL}/admin/notification`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const api = await res.json();
        const list = Array.isArray(api) ? api : [];

        // Normalize/map
        const mapped = list.map((item) => {
          const d = new Date(item.Requested_Date);
          const requestedDateStr = isNaN(d.getTime())
            ? String(item.Requested_Date ?? "")
            : d.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              });

          return {
            mockType: item.Mock_Type ?? "",
            requestedDate: d, // keep Date for sorting
            requestedDateStr,
            employeeId: String(item.User_Id ?? ""),
            reviewerId: String(item.SelectedId ?? ""),
            status: String(item.Status ?? ""),
            requestId: String(item.Request_Id ?? ""),
          };
        });

        // De-duplicate by requestId
        const seen = new Set();
        const unique = [];
        for (const row of mapped) {
          if (!row.requestId || seen.has(row.requestId)) continue;
          seen.add(row.requestId);
          unique.push(row);
        }

        // Sort by requestedDate desc (newest first)
        unique.sort((a, b) => {
          const ta = a.requestedDate?.getTime?.() ?? 0;
          const tb = b.requestedDate?.getTime?.() ?? 0;
          return tb - ta;
        });

        setData(unique);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching notifications:", err);
          setErrorMsg("Unable to load notifications. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  const handleSearch = (e) => setSearchTerm(e.target.value);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter((it) => {
      const haystack = [
        it.mockType,
        it.requestedDateStr,
        it.employeeId,
        it.reviewerId,
        it.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, searchTerm]);

  const handleDeleteClick = async (row) => {
    const isAccepted = String(row.status).toLowerCase() === "accepted";
    if (isAccepted) return;

    // If a parent handler is provided, use it; otherwise, remove locally.
    if (typeof onDelete === "function") {
      await onDelete(row.requestId);



    } else {
      // Local optimistic removal (no API call here since endpoint is unknown)
      setData((prev) => prev.filter((r) => r.requestId !== row.requestId));

      fetch(`http://localhost:3000/api/admin/deleteNotifications/${row.requestId}`, {
        method: "DELETE",
      });

    }
  };

  return (
    <div
      className="adminNotif-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminNotif-title"
    >
      <div className="adminNotif-popup">
        <div className="adminNotif-header">
          <h2 id="adminNotif-title" className="adminNotif-title">
            <b>
              <i>Admin Notification</i>
            </b>
          </h2>
          <button
            type="button"
            className="adminNotif-closeBtn"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            ✖
          </button>
        </div>

        <input
          ref={searchRef}
          type="text"
          className="adminNotif-search"
          placeholder="Search by date, employee, reviewer, or status…"
          value={searchTerm}
          onChange={handleSearch}
        />

        {loading ? (
          <div className="adminNotif-state">Loading notifications…</div>
        ) : errorMsg ? (
          <div className="adminNotif-state adminNotif-error">{errorMsg}</div>
        ) : (
          <div className="adminNotif-tableWrap">
            <table className="adminNotif-table">
              <thead>
                <tr>
                  <th>Mock Type</th>
                  <th>Requested Date</th>
                  <th>Employee Id</th>
                  <th>Reviewer Id</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((row) => {
                    const isAccepted =
                      String(row.status).toLowerCase() === "accepted";
                    const statusClass =
                      "adminNotif-status " +
                      ({
                        accepted: "is-accepted",
                        pending: "is-pending",
                        rejected: "is-rejected",
                        completed: "is-completed",
                      }[String(row.status).toLowerCase()] || "is-default");

                    return (
                      <tr key={row.requestId}>
                        <td>{row.mockType}</td>
                        <td>{row.requestedDateStr}</td>
                        <td>{row.employeeId}</td>
                        <td>{row.reviewerId}</td>
                        <td>
                          <span className={statusClass}>{row.status}</span>
                        </td>
                        <td className="adminNotif-actions">
                          <button
                            type="button"
                            className={"adminNotif-iconBtn" + (isAccepted ? " isDisabled" : "")}
                            disabled={isAccepted}
                            onClick={() => handleDeleteClick(row)}
                            title={
                              isAccepted
                                ? "Accepted notifications cannot be deleted"
                                : "Delete"
                            }
                            aria-label="Delete"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="adminNotif-empty">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationPopup;
