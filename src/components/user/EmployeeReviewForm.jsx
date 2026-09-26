import React, { useState } from 'react';
import './css/EmployeeReviewForm.css';

const criteriaList = [
  "Job Knowledge",
  "Work Quality",
  "Attendance/Punctuality",
  "Productivity",
  "Communication/listening skill",
  "Behaviour",
];

const options = [
  "--Select--",
  "Very Poor",
  "Poor",
  "Fair",
  "Satisfactory",
  "Good",
  "Excellent",
];

const EmployeeReviewForm = ({ employeeId }) => {
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [overallRating, setOverallRating] = useState('');

  const handleRatingChange = (field, value) => {
    setRatings(prev => ({ ...prev, [field]: value }));
  };

  const handleCommentChange = (field, value) => {
    setComments(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = {
      ratings,
      comments,
      overallFeedback,
      overallRating
    };

    console.log('Submitted Data:', formData);
    alert('Form submitted successfully!');
    // Submit formData to your backend here
  };

  return (
    <form onSubmit={handleSubmit}>
      {criteriaList.map((label, index) => (
        <div className="field-row" key={index}>
          <div className="field-label">
            <label>{label}<span className="required">*</span></label>
          </div>
          <div className="field-input-group">
            <select
              value={ratings[label] || "--Select--"}
              onChange={(e) => handleRatingChange(label, e.target.value)}
              required
            >
              {options.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder={`Comments on ${label}`}
              value={comments[label] || ''}
              onChange={(e) => handleCommentChange(label, e.target.value)}
              className="comment-input"
              required
            />
          </div>
        </div>
      ))}

      <div className="field-row">
        <div className="field-label">
          <label>Overall Feedback<span className="required">*</span></label>
        </div>
        <div className="field-input">
          <textarea
            required
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            rows="4"
            placeholder="Enter overall feedback here"
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field-label">
          <label>Overall Ratings<span className="required">*</span></label>
        </div>
        <div className="field-input">
          <input
            type="text"
            value={overallRating}
            onChange={(e) => setOverallRating(e.target.value)}
            required
            placeholder="Enter overall rating"
          />
        </div>
      </div>

      <div className="submit-row">
        <button type="submit">Submit</button>
      </div>
    </form>
  );
};

export default EmployeeReviewForm;
