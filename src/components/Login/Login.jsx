import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setAuth, clearAuth } from '../../utils/authSlice';
import { BASE_URL } from '../../utils/config';
import ImageSlider from "./ImageSlider";
import ForgotPasswordPopup from "./ForgotPasswordPopup";
import "./css/Login.css";

const Login = () => {
  const [credentials, setCredentials] = useState({ employeeId: '', password: '' });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(clearAuth());
  }, [dispatch]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // clear old errors
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        dispatch(setAuth({
          token: data.token,
          role: data.user.role,
          employeeId: data.user.id || null,
        }));

        if (data.user.role === 'Admin') {
          navigate('/admin', { replace: true });
        } else if (data.user.role === 'user') {
          navigate('/employee-home', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Server error, please try again later.');
    }
  };

  return (    
    <div>
      <div className="login-container">
        <div className="login-left">
          <ImageSlider className="logo"/>
        </div>
        <div className="login-right">
          <h2 className="login-heading">Login</h2>
          <input
            name="employeeId"
            type="text"
            placeholder="S00XXXX"
            className="login-input-box"
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="PASSWORD"
            className="login-input-box"
            onChange={handleChange}
            required
          />

          {/* Error message display */}
          {error && <p className="error-message">{error}</p>}

          {/* <a href="#" className="forgot-password">
            Forgot password?
          </a> */}
           <button className="forgot-password" onClick={() => setShowForgotPassword(true)}>
            Forgot Password?
          </button>
          <button className="login-button" onClick={handleSubmit}>Login</button>
         
        </div>
      </div>
      <footer className="footer">Copyright © 2025. All rights reserved.</footer>
      {showForgotPassword && (
        <ForgotPasswordPopup
          onClose={() => setShowForgotPassword(false)}
          isOpen={showForgotPassword}
        />
      )}
     
      
    </div>
  );
};

export default Login;
