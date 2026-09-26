import React, { useEffect, useRef, useState } from "react";
import { BASE_URL as UPDATE_BASE_URL } from '../../utils/config';
import "./css/UpdateEmployeePopup.merged.css";

export default function UpdateEmployeePopup({ employee, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    id: employee?.Employee_Id || "",
    name: employee?.Employee_Name || "",
    email: employee?.Employee_Email || "",
    designation: employee?.Employee_Designation || "",
    department: employee?.Employee_Department || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!formData.name.trim()) return "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Valid email required";
    if (!formData.designation) return "Select designation";
    if (!formData.department) return "Select department";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const msg = validate();
    if (msg) { setError(msg); return; }

    try {
      setSaving(true);
      setError("");
      const res = await fetch(`${UPDATE_BASE_URL}/admin/updateEmployee/${encodeURIComponent(formData.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
      alert("Employee updated successfully!");
      onUpdate?.(data);
      onClose?.();
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Error updating employee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="upd-emp-title" onMouseDown={(e) => e.target.classList.contains('overlay') && onClose?.()}>
      <div className="popup" onMouseDown={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2 id="upd-emp-title">Update Employee</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          <div className="form-row">
            <label htmlFor="empid">Id :</label>
            <input id="empid" name="id" value={formData.id} readOnly />

            <label htmlFor="name">Name : <span className="red">*</span></label>
            <input id="name" ref={firstRef} name="name" value={formData.name} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label htmlFor="email">Email : <span className="red">*</span></label>
            <input id="email" name="email" value={formData.email} onChange={handleChange} />

            <label htmlFor="desig">Designation : <span className="red">*</span></label>
            <select id="desig" name="designation" value={formData.designation} onChange={handleChange}>
              <option value="">Select…</option>
              <option>Developer</option>
              <option>Manager</option>
              <option>Tester</option>
              <option>HR</option>
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="dept">Department : <span className="red">*</span></label>
            <select id="dept" name="department" value={formData.department} onChange={handleChange}>
              <option value="">Select…</option>
              <option>UI5</option>
              <option>Fiori</option>
              <option>ABAP</option>
              <option>Design</option>
              <option>HR</option>
            </select>
          </div>

          {error && <div className="field-error" role="alert">{error}</div>}

          <div className="button-row">
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="update-button" disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}