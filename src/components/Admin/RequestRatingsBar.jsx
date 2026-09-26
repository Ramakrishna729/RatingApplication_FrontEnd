import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../../utils/config';
import KpiRatingPopup from '../popups/KpiRatingPopup';
import './css/RequestRatingsBar.css';

const RequestRatingsBar = ({ department, employeeId }) => {
  const [emplist, setEmplist] = useState([]);
  const [mockType, setMockType] = useState('');
  const [showKpiPopup, setShowKpiPopup] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!department || !employeeId) return;
    fetch(`${BASE_URL}/admin/department/employees/${department}`)
      .then(res => res.json())
      .then(data => setEmplist(data.filter(emp => emp.Employee_Id !== employeeId)))
      .catch(err => {
        console.error('Error fetching employees:', err);
        setStatusMessage('Unable to load employees');
      });
  }, [department, employeeId]);

  const handleRequestClick = async () => {
    if (!mockType || !selectedEmployee) {
      setStatusMessage('Please select both Mock Type and Employee');
      return;
    }

    if (mockType === 'KPI') {
      setShowKpiPopup(true);
      return;
    }

    const dateObj = new Date();
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(
      dateObj.getMonth() + 1
    ).padStart(2, '0')}/${dateObj.getFullYear()}`;
    debugger;

    try {
      const res = await fetch(`${BASE_URL}/admin/requestMock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          User_Id: employeeId,
          Requested_Date: formattedDate,
          Status: 'pending',
          Mock_Type: mockType,
          SelectedId: selectedEmployee,
          Reviewer_name: selectedEmployeeName
        }),
      });

      if (!res.ok) {
        if (res.status === 409) throw new Error('Request already exists');
        throw new Error(`Server Error: ${res.status}`);
      }

      setStatusMessage('Request submitted successfully ✅');
    } catch (err) {
      console.error('Error sending request:', err);
      setStatusMessage(err.message || 'An error occurred while sending the request');
    }
  };

  return (
    <div className="latest-ratings-bar">
      <div className="right-side">
        <div className="dropdowns">
          <select
            className="dropdown"
            aria-label="Select Mock Type"
            onChange={(e) => setMockType(e.target.value)}
            value={mockType}
          >
            <option value="">Select Mock Type</option>
            <option value="Monthly Mock">Monthly Mock</option>
            <option value="Hierachy Mock">Hierarchy Mock</option>
            <option value="Technology completion mock">Technology completion mock</option>
            <option value="KPI">KPI</option>
          </select>

          <select
            className="dropdown"
            aria-label="Select Employee"
            onChange={(e) => {
              debugger
              setSelectedEmployee(e.target.value);
              setSelectedEmployeeName(e.target.options[e.target.selectedIndex].text);
            }}
            value={selectedEmployee}
          >
            <option value="">Select Employee</option>
            {emplist.map((obj) => (
              <option key={obj.Employee_Id} value={obj.Employee_Id}>
                {obj.Employee_Name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="request-button"
          onClick={handleRequestClick}
          disabled={!mockType || !selectedEmployee}
        >
          Request
        </button>
      </div>

      {statusMessage && <div className="status-msg">{statusMessage}</div>}

      {showKpiPopup && (
        <KpiRatingPopup
          mockDetails={{
            User_Id: employeeId,
            Requested_Date: new Date().toISOString().split('T')[0],
            Reviewer_name: selectedEmployeeName,
            SelectedId: selectedEmployee,
          }}
          onClose={() => setShowKpiPopup(false)}
          employeeId={employeeId}
          selectedEmployee={selectedEmployee}
        />
      )}
    </div>
  );
};

export default RequestRatingsBar;
