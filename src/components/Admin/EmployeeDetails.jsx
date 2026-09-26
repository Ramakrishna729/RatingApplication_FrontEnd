// src/components/admin/EmployeeDetails.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BASE_URL } from "../../utils/config";
import HeaderBar from "../reusable/HeaderBar";
import ReviewTable from "../mocks and KPI/ReviewTable";
import RequestRatingsBar from "./RequestRatingsBar";
import UpdateEmployeePopup from "../popups/UpdateEmployeePopup";
import "./css/EmployeeDetails.css";

function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employee, setEmployee] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const fileInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);


  // Reusable fetch (used on mount and after any update)
  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${BASE_URL}/admin/employees/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load employee. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // Close menu on outside click
  useEffect(() => {
  if (!menuOpen) return;
  const onClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
  };
  const onKey = (e) => {
    if (e.key === "Escape") setMenuOpen(false);
  };
  document.addEventListener("mousedown", onClickOutside);
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("mousedown", onClickOutside);
    document.removeEventListener("keydown", onKey);
  };
}, [menuOpen]);

  // Preview src (assumes base64 bytes stored in IMG_file)
  const imageSrc = useMemo(() => {
    if (!employee?.IMG_file) {
      return "https://via.placeholder.com/200x200.png?text=No+Image";
    }
    return `data:image/jpeg;base64,${employee.IMG_file}`;
  }, [employee]);

  const formatDate = (isoOrDateStr) => {
    if (!isoOrDateStr) return "—";
    const d = new Date(isoOrDateStr);
    if (Number.isNaN(d.getTime())) return isoOrDateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const onOpenFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  // Convert selected file to base64 and POST JSON
  const handleImageChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // validations
      const typePart = (file.type || "").split("/")[1] || "";
      if (!/(png|jpe?g)$/i.test(typePart)) {
        alert("Please choose a PNG or JPG image.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Max 2 MB.");
        return;
      }

      try {
        // file -> base64 (strip data URL prefix)
        const toBase64 = (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const result = String(reader.result || "");
              const idx = result.indexOf(",");
              resolve(idx >= 0 ? result.slice(idx + 1) : result);
            };
            reader.onerror = (err) => reject(err);
          });

        const base64String = await toBase64(file);

        const res = await fetch(`${BASE_URL}/admin/updateProfileImage/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          // Include mimeType if your API needs it:
          // body: JSON.stringify({ IMG_file: base64String, mimeType: file.type }),
          body: JSON.stringify({ IMG_file: base64String }),
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        await res.json();

        alert("Image updated successfully!");
        await fetchEmployee(); // refresh component with latest data
      } catch (err) {
        console.error("Upload error:", err);
        alert("Error uploading image. Please try again.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [id, fetchEmployee]
  );

  const handleUpdateProfile = useCallback(() => {
    setShowUpdateModal(true);
  }, []);

  const handleDeleteProfile = useCallback(async () => {
    const yes = window.confirm("Delete this profile? This action cannot be undone.");
    if (!yes) return;
    try {
      const res = await fetch(`${BASE_URL}/admin/deleteEmployee/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Employee deleted.");
      navigate("/admin");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete employee.");
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="employee-container" aria-busy="true" aria-live="polite">
        <HeaderBar />
        <div className="employee-card skeleton">
          <div className="employee-left">
            <div className="employee-image skeleton-block" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
          <div className="employee-info">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-container">
        <HeaderBar />
        <div className="employee-card" role="alert">
          <p>{error || "Employee not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-container">
      <HeaderBar />

      <div className="employee-card">
        {/* Column 1: Image + actions */}
        <div className="employee-left">
          {/* <img
            src={imageSrc}
            alt={`Profile of ${employee.Employee_Name || "employee"}`}
            className="employee-image"
          /> */}
           <iframe src={employee?.IMG_file}  
            className="employee-image" 
             title="shared image (5)"></iframe>

          <input
            ref={fileInputRef}
            id="imageUpload"
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />

          {/* Dropdown Actions */}
          <div ref={menuRef} className={`dropdown-menu ${menuOpen ? "open" : ""}`}>
  <button
    type="button"
    className="menu-trigger"
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    onClick={() => setMenuOpen((v) => !v)}
  >
    Actions ▾
  </button>

  <div
    className="menu-content"
    role="menu"
    aria-hidden={!menuOpen}
    onClick={() => setMenuOpen(false)} // close after any click inside
  >
    <button type="button" role="menuitem" onClick={onOpenFilePicker}>Update Image</button>
    <button type="button" role="menuitem" onClick={handleUpdateProfile}>Update Profile</button>
    <button type="button" role="menuitem" className="danger" onClick={handleDeleteProfile}>
      Delete Profile
    </button>
  </div>
</div>
        </div>

        {/* Column 2: Core info */}
        <div className="employee-info">
          <h1 className="title">{employee.Employee_Name}</h1>
          <div className="info-columns">
            <div>
              <h3>Employment</h3>
              <p><strong>ID:</strong> {employee.Employee_Id}</p>
              <p><strong>Designation:</strong> {employee.Employee_Designation || "—"}</p>
              <p><strong>Department:</strong> {employee.Employee_Department || "—"}</p>
              <p><strong>Status:</strong> {employee.Employee_Status || "—"}</p>
            </div>
            <div>
              <h3>Personal Info</h3>
              <p><strong>Email:</strong> {employee.Employee_Email || "—"}</p>
              <p><strong>Mobile:</strong> {employee.mobil || employee.mobile || "—"}</p>
              <p><strong>DOB:</strong> {formatDate(employee.dateOfBirth)}</p>
            </div>
            <div>
              <h3>Mentoring</h3>
              <p><strong>Mentor:</strong> {employee.mentor || "—"}</p>
              <p><strong>Position:</strong>{employee.position || "—"}</p>
            </div>
            <div>
              <h3>Request Mock</h3>
              <RequestRatingsBar
                department={employee.Employee_Department}
                employeeId={employee.Employee_Id}
              />
            </div>
          </div>
        </div>
      </div>

      <ReviewTable employeeId={employee.Employee_Id ?? id} />

      {showUpdateModal && (
        <UpdateEmployeePopup
          employee={employee}
          onClose={() => {
            setShowUpdateModal(false);
            fetchEmployee(); // refresh after modal-driven updates
          }}
        />
      )}
    </div>
  );
}

export default EmployeeDetails;
