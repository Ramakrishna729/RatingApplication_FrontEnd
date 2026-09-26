import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./css/EmployeeHeaderCard.css";

// Optional: configure API base via env (works in CRA/Vite)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:3000";

function makeInitialsSvgDataUrl(name = "") {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => (n?.[0] || "").toUpperCase())
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='140'>
    <rect width='100%' height='100%' fill='#f0f2f5'/>
    <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-family='Inter,system-ui,Segoe UI,Roboto,Arial' font-size='48' fill='#555'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function parseImage(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:")) return url; // already a data URL
  const commaIdx = url.indexOf(",");
  if (commaIdx !== -1) return `data:image/*;base64,${url.slice(commaIdx + 1)}`;
  if (/^https?:\/\//i.test(url)) return url; // absolute URL
  return null;
}

export default function EmployeeHeaderCard({ empId, className = "", showEmail = true, onError }) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  useEffect(() => {
    if (!empId) return;
    const ctrl = new AbortController();
    setState({ status: "loading", data: null, error: null });

    fetch(`${API_BASE}/api/employee/${encodeURIComponent(empId)}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${msg}`.trim());
        }
        return res.json();
      })
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Error fetching employee data:", err);
        setState({ status: "error", data: null, error: err });
        onError?.(err);
      });

    return () => ctrl.abort();
  }, [empId, onError]);

  const emp = state.data ?? {};
  const imageSrc = useMemo(
    () => parseImage(emp?.IMG_file) ?? makeInitialsSvgDataUrl(emp?.Employee_Name),
    [emp]
  );
  const mailHref = emp?.Employee_Email ? `mailto:${emp.Employee_Email}` : undefined;

  return (
    <section className={`empHeader ${className} ${state.status === "loading" ? "is-loading" : ""}`}>
      <div className="empHeader__left">
        {/* <img
          className="empHeader__avatar"
          src={imageSrc}
          alt={`${emp?.Employee_Name || "Employee"} profile`}
          loading="lazy"
        /> */}
        <iframe src={emp?.IMG_file}  
            className="empHeader__avatar" 
             title={emp?.Employee_Name}></iframe>
      </div>

      <div className="empHeader__right">
        <div className="empHeader__grid" aria-live="polite">
          <div className="empHeader__row">
            <span className="empHeader__label">Emp&nbsp;ID</span>
            <span className="empHeader__sep">:</span>
            <span className="empHeader__value">{emp?.Employee_Id || (state.status === "loading" ? "—" : "NA")}</span>
          </div>

          <div className="empHeader__row">
            <span className="empHeader__label">Name</span>
            <span className="empHeader__sep">:</span>
            <span className="empHeader__value">{emp?.Employee_Name || (state.status === "loading" ? "—" : "NA")}</span>
          </div>

          <div className="empHeader__row">
            <span className="empHeader__label">Department</span>
            <span className="empHeader__sep">:</span>
            <span className="empHeader__value">{emp?.Employee_Department || (state.status === "loading" ? "—" : "NA")}</span>
          </div>
        </div>

        {showEmail && (
          <div className="empHeader__grid empHeader__grid--right">
            <div className="empHeader__row">
              <span className="empHeader__label">Email</span>
              <span className="empHeader__sep">:</span>
              {mailHref ? (
                <a className="empHeader__value empHeader__link" href={mailHref}>
                  {emp.Employee_Email}
                </a>
              ) : (
                <span className="empHeader__value">{state.status === "loading" ? "—" : "NA"}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {state.status === "error" && (
        <div className="empHeader__error" role="alert">
          Unable to load employee details.
          <button
            type="button"
            className="empHeader__retry"
            onClick={() => setState((s) => ({ ...s, status: "idle" }))}
            aria-label="Retry loading employee details"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

EmployeeHeaderCard.propTypes = {
  empId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  className: PropTypes.string,
  showEmail: PropTypes.bool,
  onError: PropTypes.func,
};
