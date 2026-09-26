// src/components/tables/EmployeeTable.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import AddEmployeePopup from '../popups/AddEmployeePopup';
import './css/EmployeeTable.css';

const SAFE = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Debounce hook for search input */
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const EmployeeTable = () => {
  const [employeesData, setEmployeesData] = useState([]);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebouncedValue(rawSearch, 250);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const navigate = useNavigate();

  // 🔹 DIRECT API endpoint
  const API_URL = 'http://localhost:3000/api/admin/employees';

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setErr('');

    try {
      const res = await fetch(API_URL, {
        method: 'GET',
        
        headers: { Accept: 'application/json' },
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

      // Normalize response shape
      const data = Array.isArray(payload)
        ? payload
        : payload?.data || payload?.employees || [];

      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response format');
      }

      setEmployeesData(data);
    } catch (e) {
      console.error('[EmployeeTable] Fetch error:', e);
      setEmployeesData([]);
      setErr('Unable to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleView = useCallback(
    (id) => navigate(`/employee/${encodeURIComponent(id)}`),
    [navigate]
  );

  const handleHierarchy = useCallback(() => navigate('/admin/hierarchy'), [navigate]);

  const openAddEmployee = useCallback(() => setShowAddEmployee(true), []);
  const closeAddEmployee = useCallback(() => {
    setShowAddEmployee(false);
    fetchEmployees(); // refresh list
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = SAFE(search).trim().toLowerCase();
    if (!q) return employeesData;

    return employeesData.filter((emp) => {
      const id = SAFE(emp.Employee_Id).toLowerCase();
      const name = SAFE(emp.Employee_Name).toLowerCase();
      const dept = SAFE(emp.Employee_Department).toLowerCase();
      const desig = SAFE(emp.Employee_Designation).toLowerCase();
      const email = SAFE(emp.Employee_Email).toLowerCase();
      return (
        id.includes(q) ||
        name.includes(q) ||
        dept.includes(q) ||
        desig.includes(q) ||
        email.includes(q)
      );
    });
  }, [employeesData, search]);

  return (
    <div className="employee-container">
      <div className="header-row">
        <input
          type="text"
          placeholder="Search by ID, Name, Department, Designation, or Email"
          className="search-input"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          aria-label="Search employees"
        />

        <div className="button-group">
          <button
            type="button"
            className="icon-btn"
            onClick={openAddEmployee}
            aria-label="Add employee"
            title="Add employee"
          >
            <FaPlus aria-hidden="true" />
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate('/admin/employees/previous')}
          >
            Prev Employees
          </button>

          <button type="button" className="icon-btn" onClick={handleHierarchy}>
            Hierarchy
          </button>
        </div>
      </div>

      {/* Accessibility live region */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {loading ? 'Loading employees…' : `${filteredEmployees.length} employees loaded`}
      </div>

      {err && (
        <div className="alert error" role="alert">
          {err}{' '}
          <button type="button" className="linklike" onClick={fetchEmployees}>
            Retry
          </button>
        </div>
      )}

      {!loading && !err && employeesData.length === 0 && (    
        <div className="empty-state">No employees found.</div>
      )}

      {!loading && !err && employeesData.length > 0 && (
        <div className="table-wrapper">
          <table className="employee-table">
            <caption className="visually-hidden">Employee directory</caption>
            <thead>
              <tr>
                <th>Employee&nbsp;ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Email</th>
                <th>Gender</th>
                {/* <th>Ratings</th> */}
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, idx) => {
                  const id = SAFE(emp.Employee_Id);
                  return (
                    <tr key={id || `row-${idx}`}>
                      <td>{id}</td>
                      <td>{SAFE(emp.Employee_Name)}</td>
                      <td>{SAFE(emp.Employee_Department)}</td>
                      <td>{SAFE(emp.Employee_Designation)}</td>
                      <td>{SAFE(emp.Employee_Email)}</td>
                      <td>{SAFE(emp.Employee_Icon)}</td>
                      {/* <td>{SAFE(emp.Employee_Total_Rating) || '--NA--'}</td> */}
                      <td className="col-action">
                        <button
                          type="button"
                          className="view-btn"
                          onClick={() => handleView(id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="no-results">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddEmployee && <AddEmployeePopup onClose={closeAddEmployee} />}
    </div>
  );
};
export default EmployeeTable;
