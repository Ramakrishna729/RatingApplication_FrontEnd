import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/PreviousEmployeeTable.css';
import HeaderBar from '../reusable/HeaderBar';

// Utils
const SAFE = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const toLower = (v) => SAFE(v).trim().toLowerCase();

// Debounce hook for search input
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Column model
const COLUMNS = [
  { key: 'Employee_Id', label: 'Employee ID', get: (e) => SAFE(e.Employee_Id) },
  { key: 'Employee_Name', label: 'Name', get: (e) => SAFE(e.Employee_Name) },
  { key: 'Employee_Department', label: 'Department', get: (e) => SAFE(e.Employee_Department) },
  { key: 'Employee_Designation', label: 'Designation', get: (e) => SAFE(e.Employee_Designation) },
  {
    key: 'Employee_Email',
    label: 'Email',
    get: (e) => {
      const email = SAFE(e.Employee_Email);
      return email ? (
        <a href={`mailto:${email}`} className="linklike" aria-label={`Email ${SAFE(e.Employee_Name)}`}>{email}</a>
      ) : (
        ''
      );
    },
  },
  { key: 'Employee_Icon', label: 'Gender', get: (e) => SAFE(e.Employee_Icon) },
];

export default function PreviousEmployeeTable({
  // Optional API base override (defaults to localhost)
  apiBase = import.meta?.env?.VITE_API_BASE || 'http://localhost:3000',
}) {
  const API_URL = `${apiBase.replace(/\/$/, '')}/api/admin/PreviousEmployees`;

  const [employees, setEmployees] = useState([]);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch, 250);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'Employee_Id', dir: 'asc' });

  const abortRef = useRef(null);
  const navigate = useNavigate();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      let payload;
      try {
        payload = await res.json();
      } catch {
        throw new Error('Invalid JSON from server');
      }

      if (!res.ok) {
        const serverMsg = payload?.message || payload?.error || `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      const data = Array.isArray(payload) ? payload : payload?.data || payload?.employees || [];
      if (!Array.isArray(data)) throw new Error('Unexpected API response format');

      setEmployees(data);
    } catch (e) {
      if (e?.name === 'AbortError') return; // ignored
      console.error('[PreviousEmployeeTable] Fetch error:', e);
      setEmployees([]);
      setError('Unable to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchEmployees();
    return () => abortRef.current?.abort();
  }, [fetchEmployees]);

  const handleSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedEmployees = useMemo(() => {
    const arr = [...employees];
    const { key, dir } = sort;
    arr.sort((a, b) => SAFE(a?.[key]).localeCompare(SAFE(b?.[key]), undefined, { numeric: true, sensitivity: 'base' }));
    if (dir === 'desc') arr.reverse();
    return arr;
  }, [employees, sort]);

  const filtered = useMemo(() => {
    const q = toLower(search);
    if (!q) return sortedEmployees;
    return sortedEmployees.filter((emp) => (
      toLower(emp.Employee_Id).includes(q) ||
      toLower(emp.Employee_Name).includes(q) ||
      toLower(emp.Employee_Department).includes(q) ||
      toLower(emp.Employee_Designation).includes(q) ||
      toLower(emp.Employee_Email).includes(q)
    ));
  }, [sortedEmployees, search]);

  const handleOpen = useCallback(
    (id) => navigate(`/employee/${encodeURIComponent(id)}`),
    [navigate]
  );

  // optimistic helpers
  const optimisticUpdate = (id, action) => {
    setEmployees((prev) => prev.filter((e) => SAFE(e.Employee_Id) !== SAFE(id)));
    action().catch(() => fetchEmployees()); // rollback by refetch on failure
  };

  const restoreEmployee = async (id) => {
    await fetch(`${API_URL}/${encodeURIComponent(id)}/restore`, { method: 'POST' });
  };

  const removeEmployee = async (id) => {
    await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  };

  const onRestore = (id) => optimisticUpdate(id, () => restoreEmployee(id));
  const onRemove = (id) => optimisticUpdate(id, () => removeEmployee(id));

  return (
    <>
      <HeaderBar />
      <div className="prvEmp-employee-container">
        <div className="prvEmp-header-row">
          <h4>Previous Employees</h4>
          <input
            type="text"
            placeholder="Search by ID, Name, Department, Designation, or Email"
            className="prvEmp-search-input"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            aria-label="Search employees"
          />
        </div>

        <div role="status" aria-live="polite" className="prvEmp-visually-hidden">
          {loading ? 'Loading employees…' : `${filtered.length} employees loaded`}
        </div>

        {error && (
          <div className="prvEmp-alert error" role="alert">
            {error}{' '}
            <button type="button" className="prvEmp-linklike" onClick={fetchEmployees}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className="empty-state">No employees found.</div>
        )}

        <div className="prvEmp-table-wrapper" aria-busy={loading}>
          <table className="prvEmp-employee-table">
            <caption className="prvEmp-visually-hidden">Employee directory</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} onClick={() => handleSort(c.key)} style={{ cursor: 'pointer' }}>
                    <span className="th-inner">
                      {c.label}
                      {sort.key === c.key && (
                        <span aria-label={sort.dir === 'asc' ? 'ascending' : 'descending'}>
                          {sort.dir === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {COLUMNS.map((c) => (
                      <td key={`${c.key}-${i}`}>
                        <span className="skeleton" />
                      </td>
                    ))}
                    <td className="prvEmp-col-action">
                      <div className="prvEmp-button-group">
                        <span className="prvEmp-btn" aria-hidden>Restore</span>
                        <span className="prvEmp-btn secondary" aria-hidden>Remove</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((emp, idx) => {
                  const id = SAFE(emp.Employee_Id);
                  return (
                    <tr key={id || `row-${idx}`}>
                      {COLUMNS.map((c) => (
                        <td key={c.key}>{c.get(emp)}</td>
                      ))}
                      <td className="col-action">
                        <div className="button-group">
                          <button
                            type="button"
                            className="prvEmp-btn"
                            onClick={() => onRestore(id)}
                            title="Move this employee back to active list"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="prvEmp-btn secondary"
                            onClick={() => onRemove(id)}
                            title="Permanently remove this employee"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="prvEmp-no-results">
                    No matching records. Try clearing the search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}