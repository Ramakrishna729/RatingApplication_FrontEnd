
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./css/KPIContainer.css";

const API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_EMP_KPI_DETAILS) ||
  process.env.REACT_APP_API_EMP_KPI_DETAILS ||
  "http://localhost:3000/api/employee/KPI-Details";


/** Optional: add auth headers if your API needs them */
const buildHeaders = () => ({
  "Content-Type": "application/json",
  // Authorization: `Bearer ${yourToken}`, // uncomment if needed
});

/** Map tabs -> API kpi_type text (exact strings your backend expects) */
const TAB_TO_KPI_TYPE = {
  monthly: "monthly KPI",
  quarterly: "quarterly KPI",
  yearly: "yearly KPI",
};

/** ------------ Helpers ------------ */
const tabTitle = (tab) =>
  tab === "monthly" ? "Monthly" : tab === "quarterly" ? "Quarterly" : "Yearly";

const parseISO = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const monthLabel = (iso) => {
  const d = parseISO(iso);
  return d
    ? d.toLocaleString(undefined, { month: "long", year: "numeric" })
    : iso || "";
};

const quarterOf = (d) => Math.floor(d.getMonth() / 3) + 1;

const quarterLabel = (from_iso, to_iso) => {
  const base = parseISO(from_iso) || parseISO(to_iso);
  return base ? `Q${quarterOf(base)}-${base.getFullYear()}` : "Q?-????";
};

const yearLabel = (from_iso, to_iso) => {
  const base = parseISO(from_iso) || parseISO(to_iso);
  return base ? String(base.getFullYear()) : "????";
};

const buildPeriodLabel = (tab, masterDetails) => {
  const { from_date, to_date } = masterDetails || {};
  if (tab === "monthly") return monthLabel(to_date || from_date);
  if (tab === "quarterly") return quarterLabel(from_date, to_date);
  return yearLabel(from_date, to_date);
};

const safeNumber = (n, fallback = "—") => {
  if (n === null || n === undefined || n === "") return fallback;
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
};

/** ------------ Component ------------ */
export default function KPIContainer({
  employeeId,
  initialTab = "monthly",
  refetchOnTabAgain = false, // set true if you want to refetch even when cached
}) {
  const [activeTab, setActiveTab] = useState(
    ["monthly", "quarterly", "yearly"].includes(initialTab) ? initialTab : "monthly"
  );

  // cache per tab: { monthly: [...], quarterly: [...], yearly: [...] }
  const [dataCache, setDataCache] = useState({
    monthly: null,
    quarterly: null,
    yearly: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // currently selected period id per tab (so each tab remembers its selection)
  const [selectedByTab, setSelectedByTab] = useState({
    monthly: null,
    quarterly: null,
    yearly: null,
  });

  const setSelectedForActiveTab = (id) =>
    setSelectedByTab((s) => ({ ...s, [activeTab]: id }));

  // ------- Fetch function (per tab) -------
  const fetchTab = useCallback(
    async (tab) => {
      try {
        setLoading(true);
        setError("");

        // Request body payload
        const body = JSON.stringify({
          employeeId,               // or "Employee_Id" if your backend expects that key
          kpi_type: TAB_TO_KPI_TYPE[tab], // or "KPI_Type"
        });

        const res = await fetch(API_URL, {
          method: "POST",
          headers: buildHeaders(),
          body,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.json();

        if (!Array.isArray(arr)) throw new Error("API did not return an array.");

        // normalize for this tab
        const normalized = arr.map((rec) => {
          const md = rec?.masterDetails || {};
          return {
            ...rec,
            __tab: tab,
            __periodId: `${rec?.kpiMasterId || ""}__${md.from_date || ""}__${md.to_date || ""}`,
            __label: buildPeriodLabel(tab, md),
            __to: parseISO(md?.to_date),
          };
        });

        // newest first
        normalized.sort((a, b) => {
          const at = a.__to?.getTime?.() ?? 0;
          const bt = b.__to?.getTime?.() ?? 0;
          return bt - at || String(b.__periodId).localeCompare(String(a.__periodId));
        });

        setDataCache((prev) => ({ ...prev, [tab]: normalized }));

        // pick first as default if none selected for this tab
        setSelectedByTab((prev) => ({
          ...prev,
          [tab]: prev[tab] ?? (normalized[0]?.__periodId ?? null),
        }));
      } catch (e) {
        setError("Failed to load KPI periods. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );

  // initial load for initialTab
  useEffect(() => {
    if (!dataCache[activeTab]) fetchTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when tab changes, fetch if needed (or if forcing refetch)
  const onChangeTab = (tab) => {
    setActiveTab(tab);
   // if (!dataCache[tab] || refetchOnTabAgain) 
      fetchTab(tab);
  };

  // period list for active tab
  const periodsForActiveTab = useMemo(() => {
    const arr = dataCache[activeTab] || [];
    return arr.map((r) => ({ id: r.__periodId, label: r.__label }));
  }, [dataCache, activeTab]);

  const selectedPeriodId = selectedByTab[activeTab];

  const currentRecord = useMemo(() => {
    const arr = dataCache[activeTab] || [];
    return arr.find((r) => r.__periodId === selectedPeriodId) || null;
  }, [dataCache, activeTab, selectedPeriodId]);

  const handleKeyDownTab = useCallback(
    (e) => {
      const order = ["monthly", "quarterly", "yearly"];
      const idx = order.indexOf(activeTab);
      if (e.key === "ArrowRight") {
        const next = order[(idx + 1) % order.length];
        onChangeTab(next);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        const prev = order[(idx - 1 + order.length) % order.length];
        onChangeTab(prev);
        e.preventDefault();
      }
    },
    [activeTab]
  );

  return (
    <div className="kpi-container">
      <h2 className="kpi-title">KPI Periods</h2>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="KPI Period Tabs"
        className="tablist"
        onKeyDown={handleKeyDownTab}
      >
        {["monthly", "quarterly", "yearly"].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => onChangeTab(tab)}
            className={`tab ${activeTab === tab ? "tab--active" : "tab--inactive"}`}
          >
            {tabTitle(tab)} KPI
          </button>
        ))}
      </div>

      {/* Periods + Details */}
      <div className="content">
        <div className="sidebar">
          <h3 className="sidebar__title">{tabTitle(activeTab)} Periods</h3>

          {loading ? (
            <div className="state">Loading…</div>
          ) : error ? (
            <div role="alert" className="state state--error">
              {error}
            </div>
          ) : periodsForActiveTab.length ? (
            <ul className="period-list" role="listbox" aria-label="KPI period list">
              {periodsForActiveTab.map(({ id, label }) => (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={id === selectedPeriodId}
                    onClick={() => setSelectedForActiveTab(id)}
                    className={`period-list__btn ${
                      id === selectedPeriodId ? "period-list__btn--active" : ""
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="state">No periods found.</div>
          )}
        </div>

        <div className="main">
          <h3 className="main__title">KPI Details</h3>

          {!loading && !error && !currentRecord && (
            <div className="state">No KPI data found for this tab.</div>
          )}

          {currentRecord && <MasterSummary rec={currentRecord} />}

          {currentRecord && (
            <ul className="tree" role="tree" aria-label="KPI items">
              {currentRecord.kpiDetails?.length ? (
                currentRecord.kpiDetails.map((item) => (
                  <li key={item.kpi_detail_uid} role="treeitem" className="leaf">
                    <div className="leaf__row">
                      <div className="point">{item.kpi_points}</div>
                      <div className="meta-row">
                        <Meta label="Rating" value={safeNumber(item.rating)} />
                        {item.comment && <Meta label="Comment" value={item.comment} />}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="leaf">
                  <div className="state">No KPI points found for this period.</div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** ------------ Subcomponents ------------ */
function Meta({ label, value }) {
  return (
    <div className="meta">
      <span className="meta__label">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

function MasterSummary({ rec }) {
  const m = rec?.masterDetails || {};
  const fmt = (d) => {
    const dt = parseISO(d);
    return dt ? dt.toLocaleDateString() : d || "—";
  };
  return (
    <div className="master">
      <div className="master__row">
        <span className={`badge badge--${(m.status || "").toLowerCase()}`}>
          {m.status || "—"}
        </span>
        <KV label="Type" value={m.kpi_type} />
        <KV label="From" value={fmt(m.from_date)} />
        <KV label="To" value={fmt(m.to_date)} />
      </div>
      <div className="master__row">
        <KV label="Employee" value={m.employee_id} />
        <KV
          label="Reviewer"
          value={`${m.reviewer_name || "—"} ${
            m.reviewer_id ? `(${m.reviewer_id})` : ""
          }`}
        />
        <KV
          label="Document"
          value={
            m.document_link ? (
              <a href={m.document_link} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : (
              "—"
            )
          }
        />
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="master__kv">
      <span className="master__label">{label}:</span>
      <span>{value || "—"}</span>
    </div>
  );
}
