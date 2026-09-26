import React, { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../../utils/config";
// If your CSS lives alongside this file, use './ReviewTable.css'
// If you keep a 'css' subfolder, switch to './css/ReviewTable.css'
import "./css/ReviewTable.css";
import KPIContainer from "./KPIContainer";

const ReviewTable = ({ employeeId = "all" }) => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: null });
  const [showKPI, setShowKPI] = useState(false);

  const endpoint = useMemo(
    () => `${BASE_URL}/verify/rating/${encodeURIComponent(employeeId)}`,
    [employeeId]
  );

  const load = () => {
    const ac = new AbortController();
    setStatus({ loading: true, error: null });

    fetch(endpoint, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!json || json.message) {
          setRows([]);
        } else if (Array.isArray(json)) {
          debugger;
          setRows(json);
        } else {
          setRows([]);
        }

        setStatus({ loading: false, error: null });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
           setRows([]);
          setStatus({ loading: false, error: err.message || "Failed to fetch" });
        }
      });

    return () => ac.abort();
  };

  useEffect(() => {
    const abort = load();
    return abort;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const ratingClass = (val) => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return "";
    if (n <= 1) return "rating-low";
    if (n < 3) return "rating-medium";
    return "rating-high";
  };

  return (
    <div className="rt-container">
      <div className="rt-toolbar" role="group" aria-label="View switch">
        <span className="rt-toolbar-label">Ratings</span>
        <label className="switch" aria-label="Toggle KPI view">
          <input
            type="checkbox"
            checked={showKPI}
            onChange={(e) => setShowKPI(e.target.checked)}
          />
          <span className="slider" />
        </label>
        <span className="rt-toolbar-label">KPI</span>

        <div className="rt-spacer" />
        <button
          className="rt-btn"
          type="button"
          onClick={load}
          disabled={status.loading}
          aria-busy={status.loading ? "true" : "false"}
        >
          {status.loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {status.error && (
        <div className="rt-alert" role="alert">
          <div className="rt-alert-title">Couldn’t load reviews</div>
          <div className="rt-alert-body">{status.error}</div>
        </div>  
      )}

      {showKPI ? (
        <div className="rt-kpi-box">
          <KPIContainer  employeeId={employeeId} />
        </div>
      ) : (
        <div className="rt-table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>Reviewer&nbsp;ID</th>
                <th>Reviewer&nbsp;Name</th>
                <th>Review&nbsp;Date</th>
                <th>Feedback</th>
                <th>Attendance</th>
                <th>Productivity</th>
                <th>Communication</th>
                <th>Behaviour</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, idx) => (
                  <tr key={row.UniqueId || `${row.Reviewer_Id}-${idx}`}>
                    <td>{row.Reviewer_Id ?? "—"}</td>
                    <td>{row.Rew_Name ?? "—"}</td>
                    <td>{formatDate(row.Review_Date)}</td>
                    <td className="rt-td-text">{row.Employee_Overall_Feedback ?? "—"}</td>
                    <td>{row.Employee_Attendence_punctuality ?? "—"}</td>
                    <td>{row.Employee_Productivity ?? "—"}</td>
                    <td>{row.Employee_Communication ?? "—"}</td>
                    <td>{row.Employee_Behaviour ?? "—"}</td>
                    <td className={ratingClass(row.Employee_Total_Rating)}>
                      {row.Employee_Total_Rating ?? "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">
                    {status.loading ? "Loading…" : "No records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReviewTable;
