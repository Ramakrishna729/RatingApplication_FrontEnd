import React, { useState } from 'react';
import { BASE_URL } from '../../utils/config';
import axios from 'axios';
import './css/ForgotPasswordPopup.css';

const ForgotPasswordPopup = ({ onClose }) => {
  const [stage, setStage] = useState('enterEmployee'); 
  // stages: enterEmployee, enterOtp, resetPassword
  const [employeeId, setEmployeeId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const sendOtp = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/verify/send-otp`, { employeeId });
      if(res.status=== 404) {
        throw new Error("Employee ID not found.");
      }
      if(res.status === 500) {
        throw new Error("Internal server error.");
      }
      if (res.status !== 200) {
        throw new Error(res.data.message || "Failed to send OTP.");
      }
      setMessage(res.data.message);
      setStage('enterOtp');
    } catch (err) {
      alert(err.response?.data?.message || "Error sending OTP.");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/verify/verify-otp`, { employeeId, otp });
      if(res.status === 404) {
        throw new Error("Invalid OTP or Employee ID.");
      }
      if(res.status === 500) {
        throw new Error("Internal server error.");  
      }
      setMessage(res.data.message);
      setStage('resetPassword');
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP.");
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/verify/reset-password`, { employeeId, newPassword });
      alert("Password reset successful.");
      onClose();
    } catch (err) { 
      alert("Error resetting password.");
    }
  };
  
  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <button className="close-icon" onClick={onClose}>×</button>

        <h2>Forgot Password?</h2>

        {stage === 'enterEmployee' && (
          <>
            <input
              type="text"
              placeholder="Employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <button className="send-btn" onClick={sendOtp}>
              Send OTP
            </button>
          </>
        )}

        {stage === 'enterOtp' && (
          <>
            <p className="otp-text">{message}</p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button className="verify-btn" onClick={verifyOtp}>
              Verify OTP
            </button>
          </>
        )}

        {stage === 'resetPassword' && (
          <>
            <p>{message}</p>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button className="verify-btn" onClick={resetPassword}>
              Reset Password
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPopup;
