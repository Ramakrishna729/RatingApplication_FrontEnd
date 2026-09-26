import React, { useMemo, useCallback, useState } from 'react';
import './css/MonthlyMockForm.css';
import HeaderBar from '../reusable/HeaderBar';
import EmployeeHeaderCard from '../reusable/EmployeeHeaderCard';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Prefer env override but keep sensible fallback for local dev
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_EMP_MONTHLY_REVIEW) ||
  process.env.REACT_APP_API_EMP_MONTHLY_REVIEW ||
  'http://localhost:3000/api/employee/monthly-review';

const RATING_FIELDS = [
  { label: 'Job Knowledge', name: 'jobKnowledge' },
  { label: 'Work Quality', name: 'workQuality' },
  { label: 'Attendance/Punctuality', name: 'attendance' },
  { label: 'Productivity', name: 'productivity' },
  { label: 'Communication / Listening Skill', name: 'communication' },
  { label: 'Behaviour', name: 'behaviour' }
];

export default function MonthlyMockForm() {
  const state = useSelector((s) => s.user);

  const [formData, setFormData] = useState({
    jobKnowledge: '',
    workQuality: '',
    attendance: '',
    productivity: '',
    communication: '',
    behaviour: '',
    overallFeedback: '',
    mockType: '',
    link: '',
    comments: {
      jobKnowledge: '',
      workQuality: '',
      attendance: '',
      productivity: '',
      communication: '',
      behaviour: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null); // { type: 'success'|'error', text }
  const navigate = useNavigate();

  // Derive overall rating instead of storing it (avoids extra renders)
  const overallRating = useMemo(() => {
    const values = RATING_FIELDS
      .map((f) => parseInt(formData[f.name], 10))
      .filter((v) => !Number.isNaN(v));
    if (!values.length) return '';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(1);
  }, [formData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    // clear error for this field on edit
    if (errors[name]) {
      setErrors((prev) => {
        const { [name]: _omit, ...rest } = prev;
        return rest;
      });
    }

    if (name.startsWith('comment_')) {
      const fieldName = name.replace('comment_', '');
      setFormData((prev) => ({
        ...prev,
        comments: {
          ...prev.comments,
          [fieldName]: value
        }
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }, [errors]);

  const validateForm = useCallback(() => {
    const nextErrors = {};

    // required selects
    RATING_FIELDS.forEach(({ name }) => {
      if (formData[name] === '') nextErrors[name] = true;
    });

    // required comments for each rating
    Object.entries(formData.comments).forEach(([key, val]) => {
      if (!val.trim()) nextErrors[`comment_${key}`] = true;
    });

    if (!formData.overallFeedback.trim()) nextErrors.overallFeedback = true;
    if (!formData.mockType) nextErrors.mockType = true;
    if (formData.mockType === 'Online') {
      const link = formData.link.trim();
      if (!link) nextErrors.link = true;
      // basic URL pattern check
      const urlOk = /^(https?:\/\/).+/.test(link);
      if (link && !urlOk) nextErrors.link = true;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      jobKnowledge: '',
      workQuality: '',
      attendance: '',
      productivity: '',
      communication: '',
      behaviour: '',
      overallFeedback: '',
      mockType: '',
      link: '',
      comments: {
        jobKnowledge: '',
        workQuality: '',
        attendance: '',
        productivity: '',
        communication: '',
        behaviour: ''
      }
    });
    setErrors({});
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitMsg(null);

    if (!validateForm()) {
      setSubmitMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const reviewer = state?.Login_User_Info?.Login_User_Info || {};
    const payload = {
      Request_Id: state?.RequestId,
      Employee_Id: state?.ReviewToId,
      Rew_Name: reviewer.Employee_Name || 'Unknown',
      Employee_Job_knowledge: `${formData.jobKnowledge} - ${formData.comments.jobKnowledge || ''}`,
      Employee_Work_Quality: `${formData.workQuality} - ${formData.comments.workQuality || ''}`,
      Employee_Attendence_punctuality: `${formData.attendance} - ${formData.comments.attendance || ''}`,
      Employee_Productivity: `${formData.productivity} - ${formData.comments.productivity || ''}`,
      Employee_Communication: `${formData.communication} - ${formData.comments.communication || ''}`,
      Employee_Behaviour: `${formData.behaviour} - ${formData.comments.behaviour || ''}`,
      Employee_Total_Rating: `${overallRating}`,
      Employee_Overall_Feedback: `${formData.overallFeedback.trim()}`,
      Reviewer_Id: reviewer.Employee_Id || 'Unknown',
      Recording_Link: formData.mockType === 'Online' ? formData.link.trim() : 'N/A'
    };

    try {
      setIsSubmitting(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let msg = `Submission failed (${res.status})`;
        try {
          const data = await res.json();
          msg = data?.message || data?.error || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      setSubmitMsg({ type: 'success', text: 'Ratings submitted successfully.' });
      resetForm();
      alert("submitted successfully.")
      // Optionally navigate away or reset state
      navigate('/employee-home');
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message || 'Something went wrong while submitting.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, overallRating, resetForm, state, validateForm]);

  const SelectField = ({ name }) => (
    <select
      name={name}
      value={formData[name]}
      onChange={handleChange}
      className={`monthlyMock-select-field ${errors[name] ? 'error-border' : ''}`}
      disabled={isSubmitting}
      aria-invalid={!!errors[name]}
    >
      <option value="">--Select--</option>
      <option value="0">Very Poor</option>
      <option value="2">Poor</option>
      <option value="4">Fair</option>
      <option value="6">Satisfactory</option>
      <option value="8">Good</option>
      <option value="10">Excellent</option>
    </select>
  );

  if (!state?.ReviewToId) {
    return (
      <div className="monthlyMock-empty-state">
        <p>No employee selected for review.</p>
      </div>
    );
  }

  return (
    <>
      <HeaderBar />
      <EmployeeHeaderCard empId={state.ReviewToId} />

      <div className="monthlyMock-form-container">
        <h2 className="monthlyMock-title">MOCK RATING</h2>

        {/* Status banner */}
        {submitMsg && (
          <div className={`monthlyMock-msg monthlyMock-msg--${submitMsg.type}`} role="status">
            {submitMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="monthlyMock-form-body" noValidate>
          {/* Mock type + optional link */}
          <div className="monthlyMock-form-row">
            <label className="monthlyMock-form-label" htmlFor="mockType">
              Mock mode <b className="monthlyMock-mandatory">*</b>
            </label>
            <select
              id="mockType"
              name="mockType"
              value={formData.mockType}
              onChange={handleChange}
              className={`monthlyMock-select-field ${errors.mockType ? 'error-border' : ''}`}
              disabled={isSubmitting}
              aria-invalid={!!errors.mockType}
            >
              <option value="">Select</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>

            {formData.mockType === 'Online' && (
              <input
                type="text"
                name="link"
                value={formData.link}
                onChange={handleChange}
                className={`monthlyMock-comment-input ${errors.link ? 'error-border' : ''}`}
                placeholder="Enter meeting/recording link"
                disabled={isSubmitting}
                aria-invalid={!!errors.link}
              />
            )}
          </div>

          {/* Rating rows */}
          {RATING_FIELDS.map((item) => (
            <div key={item.name} className="monthlyMock-form-row">
              <label className="monthlyMock-form-label" htmlFor={item.name}>
                {item.label} <b className="monthlyMock-mandatory">*</b>
              </label>
              <SelectField name={item.name} />
              <input
                type="text"
                className={`monthlyMock-comment-input ${errors[`comment_${item.name}`] ? 'error-border' : ''}`}
                placeholder={`Comments on ${item.label}`}
                name={`comment_${item.name}`}
                value={formData.comments[item.name]}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!errors[`comment_${item.name}`]}
              />
            </div>
          ))}

          {/* Feedback + Rating + Submit */}
          <div className="monthlyMock-feedback-row">
            <div className="monthlyMock-feedback-col">
              <textarea
                name="overallFeedback"
                value={formData.overallFeedback}
                onChange={handleChange}
                placeholder="Overall Feedback"
                className={`monthlyMock-feedback-textarea ${errors.overallFeedback ? 'error-border' : ''}`}
                maxLength={500}
                disabled={isSubmitting}
                aria-invalid={!!errors.overallFeedback}
              />
            </div>
            <div className="monthlyMock-rating-col">
              <label className="monthlyMock-rating-label">Overall Rating *</label>
              <input
                type="text"
                name="overallRating"
                value={overallRating}
                className="monthlyMock-rating-input"
                readOnly
                placeholder="Auto-calculated"
              />
            </div>
            <button type="submit" className="monthlyMock-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
