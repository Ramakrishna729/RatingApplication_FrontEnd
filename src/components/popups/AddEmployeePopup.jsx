import React, { useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "../../utils/config";
import "./css/AddEmployeePopup.merged.css";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AddEmployeePopup({ onClose, onCreated }) {
  const [form, setForm] = useState({
    employeeId: "",
    designation: "",
    department: "",
    imageFile: null,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadCSV, setUploadCSV] = useState(false);
  const [uploadSingleEmployee, setUploadSingleEmployee] = useState(true);
  const [uploadUsingGreytHR, setUploadUsingGreytHR] = useState(false);
  const firstFieldRef = useRef(null);
  const [uploadCSVFile, setUploadCSVFile] = useState(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const imagePreview = useMemo(
    () => (form.imageFile ? URL.createObjectURL(form.imageFile) : ""),
    [form.imageFile]
  );

  useEffect(
    () => () => imagePreview && URL.revokeObjectURL(imagePreview),
    [imagePreview]
  );

  function validate() {
    const next = {};
    if (!/^S\d{5,}$/i.test(form.employeeId.trim()))
      next.employeeId = "Use an ID like S00XXXX";
    if (!form.designation) next.designation = "Select a designation";
    if (!form.department) next.department = "Select a department";
    if (!form.imageFile) next.imageFile = "Employee image is required";
    else if (!/^(image\/(png|jpe?g|webp))$/i.test(form.imageFile.type))
      next.imageFile = "Only PNG/JPG/WEBP";
    else if (form.imageFile.size > 2 * 1024 * 1024) next.imageFile = "Max 2 MB";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const handleSelectChange = (e) => {
    const value = e.target.value;

    // Reset all first
    setUploadCSV(false);
    setUploadSingleEmployee(false);
    setUploadUsingGreytHR(false);

    // Enable based on selected value
    if (value === "single") setUploadSingleEmployee(true);
    else if (value === "greytHR") setUploadUsingGreytHR(true);
    else if (value === "excel") setUploadCSV(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    try {
      setSubmitting(true);
      const base64Image = await fileToBase64(form.imageFile);
      const payload = {
        employeeId: form.employeeId.trim(),
        designation: form.designation,
        department: form.department,
        image: base64Image,
      };

      const res = await fetch(`${BASE_URL}/admin/addnewEmployee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);

      onCreated?.(data);
      alert("Employee added successfully");
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const handleFileUpload = (e) => {
    setUploadCSVFile(e.target.files[0]);
    alert("File uploaded: " + e.target.files[0].name || "No file selected");

  };

  const handleCsvSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("csvFile", uploadCSVFile);

    debugger;
    fetch("http://localhost:3000/api/admin/csv-upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        alert("uploaded Successfully");
      })
      .catch((e) => {
        // alert("Working properly with encounter erroir")
      });
  };
  return (
    <div
      className="popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-emp-title"
      onMouseDown={(e) =>
        e.target.classList.contains("popup-overlay") && onClose?.()
      }
    >
      <div className="popup-content" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="add-emp-title">Add New Employee</h2>
        <select onChange={handleSelectChange} defaultValue="single">
          <option value="single">Add Single Employee</option>
          <option value="greytHR">Add Employee By Using GreytHR</option>
          <option value="excel"> Add Multiple Employees By Using CSV 
          </option>
        </select>
        <div>
          {uploadUsingGreytHR && (
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="emp-id">Employee Id</label>
              <input
                id="emp-id"
                ref={firstFieldRef}
                type="text"
                placeholder="Employee_Id like 'S00XXXX'"
                value={form.employeeId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, employeeId: e.target.value }))
                }
                aria-invalid={!!errors.employeeId}
              />
              {errors.employeeId && (
                <div className="field-error">{errors.employeeId}</div>
              )}

              <label htmlFor="emp-img">
                Employee Image <span className="required">*</span>
              </label>
              <input
                id="emp-img"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    imageFile: e.target.files?.[0] || null,
                  }))
                }
                aria-invalid={!!errors.imageFile}
              />
              {errors.imageFile && (
                <div className="field-error">{errors.imageFile}</div>
              )}
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Employee preview" />
                </div>
              )}

              <label htmlFor="emp-desig">
                Designation <span className="required">*</span>
              </label>
              <select
                id="emp-desig"
                value={form.designation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, designation: e.target.value }))
                }
                aria-invalid={!!errors.designation}
              >
                <option value="">---Select---</option>
                <option value="Developer">Developer</option>
                <option value="Manager">Manager</option>
                <option value="HR">HR</option>
                <option value="Tester">Tester</option>
              </select>
              {errors.designation && (
                <div className="field-error">{errors.designation}</div>
              )}

              <label htmlFor="emp-dept">
                Department <span className="required">*</span>
              </label>
              <select
                id="emp-dept"
                value={form.department}
                onChange={(e) =>
                  setForm((p) => ({ ...p, department: e.target.value }))
                }
                aria-invalid={!!errors.department}
              >
                <option value="">---Select---</option>
                <option value="UI5">UI5</option>
                <option value="Fiori">Fiori</option>
                <option value="ABAP">ABAP</option>
                <option value="Design">Design</option>
                <option value="HR">HR</option>
              </select>
              {errors.department && (
                <div className="field-error">{errors.department}</div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          )}

          {uploadSingleEmployee && (
            <form>
              <div className="employee-form">
                <label>
                  Employee Name
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter employee name"
                  />
                </label>

                <label>
                  Employee ID
                  <input
                    type="text"
                    name="employeeId"
                    placeholder="Enter employee ID"
                  />
                </label>

                <label>
                  Designation
                  <input
                    type="text"
                    name="designation"
                    placeholder="Enter designation"
                  />
                </label>

                <label>
                  Email
                  <input type="email" name="email" placeholder="Enter email" />
                </label>

                <label>
                  Department
                  <input
                    type="text"
                    name="department"
                    placeholder="Enter department"
                  />
                </label>

                <label>
                  Gender
                  <select name="gender">
                    <option value="">--Select Gender--</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Image
                  <input type="file" name="image" accept="image/*" />
                </label>

                <label>
                  Date of Birth
                  <input type="date" name="dob" />
                </label>

                <label>
                  Mobile
                  <input
                    type="text"
                    name="mobile"
                    placeholder="Enter mobile number"
                  />
                </label>

                <label>
                  Employee Number
                  <input
                    type="text"
                    name="empNo"
                    placeholder="Enter employee number"
                  />
                </label>
              </div>
            </form>
          )}

          {uploadCSV && (
            <form onSubmit={handleCsvSubmit}>
              <input type="file" onChange={handleFileUpload} />
              <div className="form-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close"
          disabled={submitting}
        >
          ×
        </button>
      </div>
    </div>
  );
}
