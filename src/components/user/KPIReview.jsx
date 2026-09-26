import React, { useEffect, useMemo, useCallback, useState, memo } from "react";
import "./css/KPIReview.css";
import HeaderBar from "../reusable/HeaderBar";
import EmployeeHeaderCard from "../reusable/EmployeeHeaderCard";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // 👈 ADD

// ---------- Config ----------
const API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_EMP_KPI_REVIEW) ||
  process.env.REACT_APP_API_EMP_KPI_REVIEW ||
  "http://localhost:3000/api/employee/kpi/full/by-notification";

const SUBMIT_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_EMP_KPI_SUBMIT) ||
  process.env.REACT_APP_API_EMP_KPI_SUBMIT ||
  "http://localhost:3000/api/employee/review/submit";

// ---------- Pure helpers (kept outside to avoid re-creation) ----------
const clamp0to10 = (val) => {
  if (val === "" || val === null || Number.isNaN(Number(val))) return "";
  const n = Math.round(Number(val));
  return Math.min(10, Math.max(0, n));
};

const isBlank = (v) => !v || !String(v).trim();

const normalizeDateForInput = (v) => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const compareDate = (a, b) => {
  // returns -1, 0, 1 like localeCompare but for yyyy-mm-dd strings
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
};

// ---------- Row (memoized) ----------
const KpiRow = memo(function KpiRow({
  d,
  index,
  disabled,
  fieldErrors,
  onChange,
  onBlur,
}) {
  const ratingErr = fieldErrors?.rating;
  const commentErr = fieldErrors?.comment;

  return (
    <div className="monthlyMock-form-row">
      <label className="monthlyMock-form-label" htmlFor={`rating_${d.Uid}`}>
        {index + 1}. {d.kpi_points} <b className="monthlyMock-mandatory">*</b>
      </label>

      <input
        id={`rating_${d.Uid}`}
        data-uid={d.Uid}
        name="rating"
        type="number"
        inputMode="numeric"
        min={0}
        max={10}
        step={1}
        className={`monthlyMock-number-field ${ratingErr ? "error-border" : ""}`}
        value={d.rating ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="0–10"
        disabled={disabled}
        aria-invalid={!!ratingErr}
        aria-describedby={ratingErr ? `err_rating_${d.Uid}` : undefined}
      />

      <input
        type="text"
        data-uid={d.Uid}
        name="comment"
        className={`monthlyMock-comment-input ${commentErr ? "error-border" : ""}`}
        placeholder="Comment *"
        value={d.comment ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!commentErr}
        aria-describedby={commentErr ? `err_comment_${d.Uid}` : undefined}
      />
    </div>
  );
});

// ---------- Component ----------
export default function KPIReview() {
  const user = useSelector((s) => s.user);
  const navigate = useNavigate(); // 👈 ADD

  let notification_id = user?.RequestId;
  // API/data state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null); // { type: 'success'|'error', text }

  // Form data (master + details)
  const [data, setData] = useState({
    master: null,
    details: [],
    totals: null,
  });

  // Validation state
  const [errors, setErrors] = useState({
    from_date: "",
    to_date: "",
    overallFeedback: "",
    details: {}, // { [uid]: { rating?: string, comment?: string } }
  });
  const [touched, setTouched] = useState({
    from_date: false,
    to_date: false,
    overallFeedback: false,
    details: {}, // { [uid]: { rating?: boolean, comment?: boolean } }
  });

  // Local overall feedback
  const [overallFeedback, setOverallFeedback] = useState("");

  // ----- Load from API -----
  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const headers = { "Content-Type": "application/json" };
        const token = user?.token || user?.jwt || user?.accessToken;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/${notification_id}`, {
          headers,
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`Failed to load KPI review (${res.status})`);

        const json = await res.json();
        const master = json?.master || null;
        const details = Array.isArray(json?.details)
          ? json.details.map((d) => ({
              Uid: d.Uid,
              kpi_points: d.kpi_points ?? "",
              rating: d.rating ?? "",
              comment: d.comment ?? "",
            }))
          : [];

        setData({ master, details, totals: json?.totals ?? null });
        setOverallFeedback("");
        setErrors({
          from_date: "",
          to_date: "",
          overallFeedback: "",
          details: {},
        });
        setTouched({
          from_date: false,
          to_date: false,
          overallFeedback: false,
          details: {},
        });
      } catch (e) {
        if (e.name !== "AbortError") setLoadError(e.message || "Failed to load review");
      } finally {
        setLoading(false);
      }
    })();
    return () => abort.abort();
  }, [user?.token, user?.jwt, user?.accessToken]);

  // ----- Derived values -----
  const uidIndex = useMemo(() => {
    const map = new Map();
    data.details.forEach((d, i) => map.set(d.Uid, i));
    return map;
  }, [data.details]);

  const overallRating = useMemo(() => {
    if (!data.details.length) return "";
    const nums = data.details
      .map((d) => parseFloat(d.rating))
      .filter((n) => !Number.isNaN(n));
    if (!nums.length) return "";
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return avg.toFixed(1);
  }, [data.details]);

  const ratedPoints = useMemo(
    () =>
      data.details.filter(
        (d) => d?.rating !== "" && d?.rating !== null && !Number.isNaN(parseFloat(d.rating))
      ).length,
    [data.details]
  );
  const unratedPoints = data.details.length - ratedPoints;
  const fullyRated = data.details.length > 0 && unratedPoints === 0;

  // ----- Validation helpers -----
  const setFieldTouched = useCallback((uid, field) => {
    setTouched((prev) => {
      const next = { ...prev };
      if (uid) {
        next.details = {
          ...next.details,
          [uid]: { ...(next.details?.[uid] || {}), [field]: true },
        };
      } else {
        next[field] = true;
      }
      return next;
    });
  }, []);

  const setFieldError = useCallback((uid, field, message) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (uid) {
        const d = { ...(next.details?.[uid] || {}) };
        if (message) d[field] = message;
        else delete d[field];
        next.details = { ...next.details, [uid]: d };
      } else {
        next[field] = message || "";
      }
      return next;
    });
  }, []);

  const validateDetailField = useCallback((val, field) => {
    if (field === "rating") {
      if (val === "" || val === null || Number.isNaN(Number(val))) return "Rating 0-10 required";
      const n = Number(val);
      if (n < 0 || n > 10) return "Rating must be between 0 and 10";
      if (!Number.isInteger(n)) return "Whole number only";
      return "";
    }
    if (field === "comment") {
      if (isBlank(val)) return "Comment required";
      if (String(val).trim().length < 2) return "Comment is too short";
      return "";
    }
    return "";
  }, []);

  // ✅ Dates are now REQUIRED and checked (From required, To required, To ≥ From)
  const validateMasterDates = useCallback((from_date, to_date) => {
    const res = { from_date: "", to_date: "" };
    if (!from_date) res.from_date = "From date is required";
    if (!to_date) res.to_date = "To date is required";
    if (from_date && to_date && compareDate(to_date, from_date) < 0) {
      res.to_date = "To date must be on/after From date";
    }
    return res;
  }, []);

  const validateAll = useCallback(() => {
    const nextErrors = {
      from_date: "",
      to_date: "",
      overallFeedback: "",
      details: {},
    };

    // details
    for (const d of data.details) {
      const re = validateDetailField(d.rating, "rating");
      const ce = validateDetailField(d.comment, "comment");
      if (re || ce)
        nextErrors.details[d.Uid] = {
          ...(re ? { rating: re } : {}),
          ...(ce ? { comment: ce } : {}),
        };
    }

    // overall feedback
    if (isBlank(overallFeedback)) nextErrors.overallFeedback = "Overall feedback required";

    // dates (required + order)
    const md = validateMasterDates(
      normalizeDateForInput(data.master?.from_date),
      normalizeDateForInput(data.master?.to_date)
    );
    nextErrors.from_date = md.from_date;
    nextErrors.to_date = md.to_date;

    setErrors(nextErrors);
    const hasDetailErrors = Object.values(nextErrors.details).some((e) => e.rating || e.comment);
    const hasTopErrors = !!(
      nextErrors.from_date || nextErrors.to_date || nextErrors.overallFeedback
    );
    return !hasDetailErrors && !hasTopErrors;
  }, [
    data.details,
    data.master?.from_date,
    data.master?.to_date,
    overallFeedback,
    validateDetailField,
    validateMasterDates,
  ]);

  // ----- Change/Blur handlers -----
  const onChangeDetail = useCallback(
    (e) => {
      const uid = e.currentTarget.dataset.uid;
      const field = e.currentTarget.name; // 'rating' | 'comment'
      let value = e.target.value;

      if (field === "rating") value = value === "" ? "" : clamp0to10(value);

      setData((prev) => {
        const idx = uidIndex.get(uid);
        if (idx == null) return prev;
        const details = prev.details.slice();
        details[idx] = { ...details[idx], [field]: value };
        return { ...prev, details };
      });

      // live-validate
      const alreadyTouched = !!touched.details?.[uid]?.[field];
      if (alreadyTouched) {
        const msg = validateDetailField(value, field);
        setFieldError(uid, field, msg);
      }
    },
    [uidIndex, touched.details, validateDetailField, setFieldError]
  );

  const onBlurDetail = useCallback(
    (e) => {
      const uid = e.currentTarget.dataset.uid;
      const field = e.currentTarget.name;
      setFieldTouched(uid, field);
      const value = e.currentTarget.value;
      const msg = validateDetailField(value, field);
      setFieldError(uid, field, msg);
    },
    [setFieldTouched, validateDetailField, setFieldError]
  );

  const onChangeFeedback = useCallback(
    (e) => {
      const val = e.target.value;
      setOverallFeedback(val);
      if (touched.overallFeedback) {
        setFieldError(null, "overallFeedback", isBlank(val) ? "Overall feedback required" : "");
      }
    },
    [touched.overallFeedback, setFieldError]
  );

  const onBlurFeedback = useCallback(() => {
    setFieldTouched(null, "overallFeedback");
    setFieldError(
      null,
      "overallFeedback",
      isBlank(overallFeedback) ? "Overall feedback required" : ""
    );
  }, [overallFeedback, setFieldTouched, setFieldError]);

  const onChangeFromDate = useCallback(
    (e) => {
      const v = e.target.value || null; // yyyy-mm-dd or null
      setData((prev) => ({
        ...prev,
        master: { ...(prev.master || {}), from_date: v },
      }));
      if (touched.from_date || touched.to_date) {
        const md = validateMasterDates(v, normalizeDateForInput(data.master?.to_date || ""));
        setErrors((prev) => ({ ...prev, ...md }));
      }
    },
    [touched.from_date, touched.to_date, data.master?.to_date, validateMasterDates]
  );

  const onChangeToDate = useCallback(
    (e) => {
      const v = e.target.value || null;
      setData((prev) => ({
        ...prev,
        master: { ...(prev.master || {}), to_date: v },
      }));
      if (touched.from_date || touched.to_date) {
        const md = validateMasterDates(normalizeDateForInput(data.master?.from_date || ""), v);
        setErrors((prev) => ({ ...prev, ...md }));
      }
    },
    [touched.from_date, touched.to_date, data.master?.from_date, validateMasterDates]
  );

  const onBlurFromDate = useCallback(() => {
    setTouched((p) => ({ ...p, from_date: true }));
    const md = validateMasterDates(
      normalizeDateForInput(data.master?.from_date || ""),
      normalizeDateForInput(data.master?.to_date || "")
    );
    setErrors((prev) => ({ ...prev, ...md }));
  }, [data.master?.from_date, data.master?.to_date, validateMasterDates]);

  const onBlurToDate = useCallback(() => {
    setTouched((p) => ({ ...p, to_date: true }));
    const md = validateMasterDates(
      normalizeDateForInput(data.master?.from_date || ""),
      normalizeDateForInput(data.master?.to_date || "")
    );
    setErrors((prev) => ({ ...prev, ...md }));
  }, [data.master?.from_date, data.master?.to_date, validateMasterDates]);

  // ----- Submit -----
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitMsg(null);

      // mark everything touched once, then validate
      setTouched((prev) => {
        const detailsTouched = {};
        for (const d of data.details) detailsTouched[d.Uid] = { rating: true, comment: true };
        return {
          ...prev,
          from_date: true,
          to_date: true,
          overallFeedback: true,
          details: detailsTouched,
        };
      });

      if (!validateAll()) {
        setSubmitMsg({
          type: "error",
          text: "Please fix errors before submitting.",
        });
        return;
      }

      const payload = {
        notification_id,
        kpi_master_uid: data.master?.kpi_master_uid,
        request_id: data.master?.Request_Id,
        reviewee_id: data.master?.User_Id,
        reviewer_id: data.master?.SelectedId,
        reviewer_name: data.master?.reviewer_name,
        kpi_type: data.master?.kpi_type,
        from_date: normalizeDateForInput(data.master?.from_date),
        to_date: normalizeDateForInput(data.master?.to_date),
        overall_feedback: overallFeedback.trim(),
        overall_rating: overallRating ? Number(overallRating) : null,
        details: data.details.map((d) => ({
          uid: d.Uid,
          rating: d.rating === "" ? null : Number(d.rating),
          comment: (d.comment || "").trim(),
        })),
      };
      console.log(payload);

      try {
        setIsSubmitting(true);
        const headers = { "Content-Type": "application/json" };
        const token = user?.token || user?.jwt || user?.accessToken;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(SUBMIT_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `Submit failed (${res.status})`);
        }

        // Success: optionally keep a flash message for the next page
        // You can read it in /employee-home via useLocation().state?.flash
        navigate("/employee-home", {
          replace: true,
          state: { flash: "Review submitted successfully." },
        }); // 👈 REDIRECT ON SUCCESS
      } catch (err) {
        setSubmitMsg({
          type: "error",
          text: err.message || "Submission failed.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      data.master,
      data.details,
      overallFeedback,
      overallRating,
      user,
      validateAll,
      notification_id,
      navigate, // 👈 ensure stable dependency
    ]
  );

  // ----- Render -----
  if (loading) {
    return (
      <>
        <HeaderBar />
        <div className="monthlyMock-form-container">
          <p>Loading KPI review…</p>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <HeaderBar />
        <div className="monthlyMock-form-container">
          <div className="monthlyMock-msg monthlyMock-msg--error" role="alert">
            {loadError}
          </div>
        </div>
      </>
    );
  }

  if (!data.master) {
    return (
      <>
        <HeaderBar />
        <div className="monthlyMock-form-container">
          <p>No KPI review found.</p>
        </div>
      </>
    );
  }

  const headerEmpId = user?.ReviewToId || data.master?.User_Id;

  return (
    <>
      <HeaderBar />
      {headerEmpId ? <EmployeeHeaderCard empId={headerEmpId} /> : null}

      <div className="monthlyMock-form-container">
        <h2 className="monthlyMock-title">KPI Review</h2>

        {/* Master meta */}
        <div className="monthlyMock-meta" role="group" aria-label="KPI metadata">
          <div className="monthlyMock-meta-item">
            <b>Type:</b> <span>{data.master?.kpi_type || "-"}</span>
          </div>

          {data.master?.document_link ? (
            <div className="monthlyMock-meta-item">
              <b>Document:</b>{" "}
              <a href={data.master.document_link} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          ) : null}

          <div className="monthlyMock-meta-item">
            <b>Status:</b> <span>{data.master?.status || "-"}</span>
          </div>

          {/* From / To date inputs */}
          <div className="monthlyMock-meta-item monthlyMock-meta-date">
            <label htmlFor="from_date">
              <b>From:</b>
            </label>
            <input
              id="from_date"
              type="date"
              name="from_date"
              className={`monthlyMock-date-input ${errors.from_date ? "error-border" : ""}`}
              value={normalizeDateForInput(data.master?.from_date)}
              onChange={onChangeFromDate}
              onBlur={onBlurFromDate}
              disabled={isSubmitting}
              aria-invalid={!!errors.from_date}
              aria-describedby={errors.from_date ? "err_from" : undefined}
            />
            {errors.from_date ? (
              <div id="err_from" className="monthlyMock-error">
                {errors.from_date}
              </div>
            ) : null}
          </div>

          <div className="monthlyMock-meta-item monthlyMock-meta-date">
            <label htmlFor="to_date">
              <b>To:</b>
            </label>
            <input
              id="to_date"
              type="date"
              name="to_date"
              className={`monthlyMock-date-input ${errors.to_date ? "error-border" : ""}`}
              value={normalizeDateForInput(data.master?.to_date)}
              onChange={onChangeToDate}
              onBlur={onBlurToDate}
              disabled={isSubmitting}
              aria-invalid={!!errors.to_date}
              aria-describedby={errors.to_date ? "err_to" : undefined}
            />
            {errors.to_date ? (
              <div id="err_to" className="monthlyMock-error">
                {errors.to_date}
              </div>
            ) : null}
          </div>
        </div>

        {/* Status banner */}
        {submitMsg && (
          <div
            className={`monthlyMock-msg monthlyMock-msg--${submitMsg.type}`}
            role="status"
            aria-live="polite"
          >
            {submitMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="monthlyMock-form-body" noValidate>
          {/* Dynamic rating rows */}
          {data.details.map((d, idx) => (
            <KpiRow
              key={d.Uid}
              d={d}
              index={idx}
              disabled={isSubmitting}
              fieldErrors={errors.details?.[d.Uid]}
              onChange={onChangeDetail}
              onBlur={onBlurDetail}
            />
          ))}

          {/* Feedback + Rating + Submit */}
          <div className="monthlyMock-feedback-row">
            <div className="monthlyMock-feedback-col">
              <textarea
                name="overallFeedback"
                value={overallFeedback}
                onChange={onChangeFeedback}
                onBlur={onBlurFeedback}
                placeholder="Overall Feedback *"
                className={`monthlyMock-feedback-textarea ${
                  errors.overallFeedback ? "error-border" : ""
                }`}
                maxLength={500}
                disabled={isSubmitting}
                aria-invalid={!!errors.overallFeedback}
                aria-describedby={errors.overallFeedback ? "err_overall" : undefined}
              />
              {errors.overallFeedback ? (
                <div id="err_overall" className="monthlyMock-error">
                  {errors.overallFeedback}
                </div>
              ) : null}
            </div>

            <div className="monthlyMock-rating-col">
              <label className="monthlyMock-rating-label">Overall Rating *</label>
              <input
                type="text"
                name="overallRating"
                value={overallRating}
                className="monthlyMock-rating-input"
                readOnly
                placeholder="Auto-calculated"
              />
              {!fullyRated && (
                <small className="monthlyMock-hint">All points must be rated to finalize.</small>
              )}
            </div>

            <button
              type="submit"
              className="monthlyMock-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
