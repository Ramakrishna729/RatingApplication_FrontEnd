import React, { useEffect, useMemo, useRef, useState } from "react";
import "./css/RequestAccept.merged.css";

export default function RequestAccept({ onClose, onSubmit }) {
  const [mode, setMode] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const minLocal = useMemo(() => {
    const d = new Date(Date.now() + 60_000); // +1 min buffer
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const isFormValid = mode !== "" && dateTime !== "";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    const selected = new Date(dateTime);
    const now = new Date();

    if (Number.isNaN(selected.getTime()) || selected <= now) {
      setError("Please select a future date and time.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      onSubmit?.(mode, selected.toISOString());
      alert(`Mode: ${mode}\nDateTime: ${selected.toString()}`);
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="req-accept-title" onMouseDown={(e) => e.target.classList.contains('popup-overlay') && onClose?.()}>
      <div className="popup-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="popup-close">
          <button onClick={onClose} className="close-button" aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="mode">Select Mode :</label>
            <select id="mode" ref={firstRef} value={mode} onChange={(e) => setMode(e.target.value)} required>
              <option value="">Select mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="dt">Select Date :</label>
            <input id="dt" type="datetime-local" value={dateTime} min={minLocal} onChange={(e) => setDateTime(e.target.value)} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-button" disabled={!isFormValid || submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}