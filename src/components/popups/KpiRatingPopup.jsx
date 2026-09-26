import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { BASE_URL as KPI_BASE_URL } from '../../utils/config';
import './css/KpiRatingPopup.merged.css';

function normalizePoint(s) {
  if (!s) return '';
  const t = s.trim().replace(/\s+/g, ' ');
  return t.replace(/\.?\s*$/, '');
}

export default function KpiRatingPopup({ mockDetails, onClose, kpiPointsUrl }) {
  const [kpiType, setKpiType] = useState('');
  const [selectedKpis, setSelectedKpis] = useState([]);
  const [showDocInput, setShowDocInput] = useState(false);
  const [docLink, setDocLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState('');
  const [rawOptions, setRawOptions] = useState([]);
  const modalRef = useRef(null);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError('');
      try {
        const res = await fetch(kpiPointsUrl || `${KPI_BASE_URL}/verify/KPIPoints`, {
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch KPI points (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid KPI points payload');
        if (!aborted) setRawOptions(data);
      } catch (e) {
        if (!aborted) setOptionsError(e.message || 'Unable to load KPI points');
      } finally {
        if (!aborted) setOptionsLoading(false);
      }
    }

    loadOptions();
    return () => { aborted = true; ctrl.abort(); };
  }, [kpiPointsUrl]);

  const kpiOptions = useMemo(() => {
    const set = new Set();
    for (const row of rawOptions) {
      const val = normalizePoint(row?.KPINewPoint);
      if (val) set.add(val);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawOptions]);

  const isValidUrl = (value) => {
    try { const u = new URL(value); return !!u.protocol && !!u.host; } catch { return false; }
  };

  const resetForm = useCallback(() => {
    setKpiType('');
    setSelectedKpis([]);
    setShowDocInput(false);
    setDocLink('');
    setErrors({});
  }, []);

  const toggleKpi = useCallback((option) => {
    setSelectedKpis((prev) => prev.includes(option)
      ? prev.filter((o) => o !== option)
      : [...prev, option]
    );
  }, []);

  const toggleDocLink = useCallback(() => {
    setShowDocInput((prev) => !prev);
    setDocLink('');
    setErrors((e) => ({ ...e, docLink: undefined }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!kpiType) newErrors.kpiType = 'Please select KPI type.';
    if (selectedKpis.length === 0) newErrors.selectedKpis = 'Please choose at least one KPI point.';
    if (showDocInput) {
      if (!docLink.trim()) newErrors.docLink = 'Please enter a document link.';
      else if (!isValidUrl(docLink.trim())) newErrors.docLink = 'Please enter a valid URL.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [kpiType, selectedKpis.length, showDocInput, docLink]);

  const handleSubmit = useCallback(async () => {
    if (loading) return;
    if (!validate()) return;

    const payload = {
      User_Id: mockDetails?.User_Id ?? null,
      Requested_Date: mockDetails?.Requested_Date ?? null,
      Reviewer_name: mockDetails?.Reviewer_name ?? null,
      SelectedId: mockDetails?.SelectedId ?? null,
      Mock_Type: kpiType,
      document_link: showDocInput ? docLink.trim() : null,
      from_date: null,
      to_date: null,
      kpi_points: selectedKpis.map((kpi) => ({ kpi_points: kpi })),
    };

    try {
      setLoading(true);
      const res = await fetch(`${KPI_BASE_URL}/admin/KPIrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const serverMsg = data?.error || data?.message || `Server error (${res.status})`;
        alert(serverMsg);
        return;
      }

      if (data?.error) alert(data.error || 'Request already sent.');
      else alert('KPI Submitted!');

      resetForm();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mockDetails, kpiType, showDocInput, docLink, selectedKpis, loading, onClose, resetForm, validate]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = modalRef.current?.querySelector('select, input, button');
    el?.focus();
  }, []);

  return (
    <div className="kpi-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kpi-popup-title" onMouseDown={(e) => e.target.classList.contains('kpi-modal-overlay') && onClose?.()}>
      <div className="kpi-popup-container" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="kpi-popup-header">
          <h2 id="kpi-popup-title">Select KPI Points</h2>
          <button type="button" className="kpi-close-button" onClick={onClose} aria-label="Close" disabled={loading}>×</button>
        </div>

        <div className="kpi-form-section">
          <label className="kpi-label">
            KPI Type
            <select
              value={kpiType}
              onChange={(e) => { setKpiType(e.target.value); setErrors((prev) => ({ ...prev, kpiType: undefined })); }}
              disabled={loading}
            >
              <option value="">Select KPI Type</option>
              <option value="Monthly KPI">Monthly KPI</option>
              <option value="Quarterly KPI">Quarterly KPI</option>
            </select>
          </label>
          {errors.kpiType && <div className="kpi-error">{errors.kpiType}</div>}
        </div>

        <div className="kpi-checkbox-group">
          <label className="kpi-document-link-label">
            <input type="checkbox" checked={showDocInput} onChange={toggleDocLink} disabled={loading} />
            <strong>Document Link :</strong>
            {showDocInput && (
              <input
                type="text"
                placeholder="https://…"
                value={docLink}
                onChange={(e) => { setDocLink(e.target.value); setErrors((prev) => ({ ...prev, docLink: undefined })); }}
                disabled={loading}
              />
            )}
          </label>
          {errors.docLink && <div className="kpi-error">{errors.docLink}</div>}

          {optionsLoading && <div className="kpi-hint">Loading KPI points…</div>}
          {optionsError && <div className="kpi-error">Failed to load KPI points: {optionsError}</div>}

          {!optionsLoading && !optionsError && (
            kpiOptions.length === 0 ? (
              <div className="kpi-hint">No KPI points available.</div>
            ) : (
              <div className="kpi-points-list">
                {kpiOptions.map((option) => (
                  <label key={option} className="kpi-point-item">
                    <input type="checkbox" checked={selectedKpis.includes(option)} onChange={() => toggleKpi(option)} disabled={loading} />
                    {option}
                  </label>
                ))}
              </div>
            )
          )}
          {errors.selectedKpis && <div className="kpi-error">{errors.selectedKpis}</div>}
        </div>

        <div className="kpi-submit-section">
          <button type="button" onClick={handleSubmit} disabled={loading || !kpiType || optionsLoading || !!optionsError || kpiOptions.length === 0}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

KpiRatingPopup.propTypes = {
  mockDetails: PropTypes.shape({
    User_Id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    Requested_Date: PropTypes.string,
    Reviewer_name: PropTypes.string,
    SelectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onClose: PropTypes.func,
  kpiPointsUrl: PropTypes.string,
};

KpiRatingPopup.defaultProps = {
  mockDetails: { User_Id: null, Requested_Date: null, Reviewer_name: null, SelectedId: null },
  onClose: () => {},
  kpiPointsUrl: '',
};
