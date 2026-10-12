import { useState, useRef, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import { useSelector } from "react-redux";
import { BASE_URL } from "../../utils/config";
import "./css/ProfileMenu.css";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const auth = useSelector((state) => state.auth) || {};
  // Saved by EmployeeHome after it loads the employee
  const savedInfo = useSelector((state) => state.user?.Login_User_Info);
  const empId = auth.employeeId;

  // Use saved data only if it belongs to the logged-in user
  const saved = savedInfo?.Employee_Id === empId ? savedInfo : null;
  const info = saved || fetched;

  // Close on outside click or Esc
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // If nothing saved (e.g. admin page), fetch when popup first opens
  useEffect(() => {
    if (!open || info || !empId) return;
    const ac = new AbortController();
    setLoading(true);

    fetch(`${BASE_URL}/admin/employees/${encodeURIComponent(empId)}`, {
      signal: ac.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setFetched(data))
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Profile fetch failed:", err);
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [open, info, empId]);

  const name = info?.Employee_Name || "User";
  const email = info?.Employee_Email || "-";
  const department = info?.Employee_Department || "-";
  const designation = info?.Employee_Designation;

  return (
    <div className="profile-wrapper" ref={ref}>
      <button
        type="button"
        className="user-avatar profile-btn"
        title="Profile"
        aria-label="Profile"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FaUser />
      </button>

      {open && (
        <div className="profile-popup">
          <div className="profile-avatar">{name.charAt(0).toUpperCase()}</div>
          <h4>{name}</h4>
          <p className="role">{designation || auth.role || "-"}</p>
          <hr />
          {loading ? (
            <p className="role">Loading...</p>
          ) : (
            <>
              <div className="row">
                <span>Employee ID</span>
                <b>{empId || "-"}</b>
              </div>
              <div className="row">
                <span>Email</span>
                <b>{email}</b>
              </div>
              <div className="row">
                <span>Department</span>
                <b>{department}</b>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}