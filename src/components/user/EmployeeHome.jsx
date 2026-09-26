import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../../utils/config';
import HeaderBar from '../reusable/HeaderBar';
import ReviewTable from "../mocks and KPI/ReviewTable"; // keep path as-is to match your current structure
import './css/EmployeeHome.css';

const PLACEHOLDER_IMG = 'https://via.placeholder.com/200x200.png?text=No+Image';

export default function EmployeeHome() {
  const userId = useSelector((state) => state.auth.employeeId);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: null });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // If not logged in, route to login and stop
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setStatus({ loading: true, error: null });
        const res = await fetch(
          `${BASE_URL}/admin/employees/${encodeURIComponent(userId)}`,
          { signal: ac.signal }
        );

        if (!res.ok) {
          throw new Error(`Failed to load employee (HTTP ${res.status})`);
        }

        const data = await res.json();
        setUser(data);

        // Keep your existing action contract
        dispatch({
          type: 'user/setLoginUserInfo',
          payload: { Login_User_Info: data },
        });

        setStatus({ loading: false, error: null });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setStatus({ loading: false, error: err.message || 'Failed to load employee' });
        }
      }
    })();

    return () => ac.abort();
  }, [userId, dispatch, navigate]);

  const imageSrc = useMemo(() => {
    const img = user?.IMG_file;
    if (!img) return PLACEHOLDER_IMG;
    if (typeof img === 'string' && img.startsWith('data:image')) return img; // already a data URI
    return `data:image/jpeg;base64,${img}`; // raw base64 -> data URI
  }, [user]);

  if (status.loading) {
    return (
      <div className="eh-root">
        <HeaderBar />
        <div className="eh-wrapper">
          <div className="eh-skeleton">
            <div className="eh-skel-line" />
            <div className="eh-skel-line short" />
            <div className="eh-skel-box" />
          </div>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (   
      <div className="eh-root">
        <HeaderBar />
        <div className="eh-wrapper">
          <div className="eh-card eh-error-card">
            <p className="eh-error-title"><strong>Couldn’t load employee.</strong></p>
            <p className="eh-error-msg">{status.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="eh-btn"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null; // defensive

  return (
    <div className="eh-root">
      <HeaderBar />
      <div className="eh-wrapper">
        <div className="eh-profile">
          {/* <img
            src={imageSrc}
            alt={`${user.Employee_Name || 'Employee'} photo`}
            className="eh-avatar"
          /> */}
          <iframe src={user?.IMG_file}  
            className="eh-avatar" 
             title={user.Employee_Name}></iframe>

          <div className="eh-section">
            <h1 className="eh-title">{user.Employee_Name || '—'}</h1>
            <p className="eh-row"><strong>ID:</strong> {user.Employee_Id || '—'}</p>
            <p className="eh-row"><strong>Designation:</strong> {user.Employee_Designation || '—'}</p>
            <p className="eh-row"><strong>Department:</strong> {user.Employee_Department || '—'}</p>
          </div>

          <div className="eh-section">
            <h3 className="eh-subtitle">Personal Info</h3>
            <p className="eh-row"><strong>Email:</strong> {user.Employee_Email || '—'}</p>
            <p className="eh-row"><strong>Mobile:</strong> {user.mobil || user.mobile || '—'}</p>
            <p className="eh-row"><strong>DOB:</strong> {user.dateOfBirth || '—'}</p>
          </div>
        </div>

        <ReviewTable employeeId={user.Employee_Id} />
      </div>
    </div>
  );
}
