// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { initializeAuth } from './utils/authSlice';
import store from './utils/store';
import EmployeeHome from './components/user/EmployeeHome';
import Login from './components/Login/Login';
import AdminHome from './components/Admin/AdminHome';
import EmployeeDetails from './components/Admin/EmployeeDetails'
import Hirarchy from './components/Admin/Hirarchy'
import MonthlyMockForm from './components/user/MonthlyMockForm';
import KPIForm from './components/user/KPIFrom';
import PreviousEmployeeTable from './components/Admin/PreviousEmployeeTable';
import ReviewTable from './components/mocks and KPI/ReviewTable';
import KPIReview from './components/user/KPIReview'
import Myhierarchy from './components/user/Myhierarchy';
import Test from './components/user/Test'; // Import the Test component


function AppRoutes() {
  const dispatch = useDispatch();
  
  // Add error handling for undefined state
  const authState = useSelector(state => state.auth);
  const { isAuthenticated, role } = authState || { isAuthenticated: false, role: null };

  useEffect(() => {
    // Initialize auth state from session storage on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  // Add loading state check
  if (!authState) {
    return <div>Loading...</div>;
  }
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/admin" element={isAuthenticated && role === 'Admin' ? <AdminHome /> : <Navigate to="/" replace />} />
        <Route path="/employee/:id" element= {isAuthenticated && role === 'Admin' ? <EmployeeDetails /> : <Navigate to="/" replace />} />
        <Route path='/admin/hierarchy' element={isAuthenticated && role === 'Admin'? <Hirarchy /> : <Navigate to="/" replace />} />
        <Route path="/admin/employees/previous" element={isAuthenticated && role === 'Admin' ? <PreviousEmployeeTable /> : <Navigate to="/" replace />} />
        <Route path='/:id/Employee-hierarchy' element={isAuthenticated && role=== 'Admin' ? <Myhierarchy /> : <Navigate to="/" replace />} />
        <Route path="/employee-home" element={isAuthenticated && role === 'user' ? <EmployeeHome /> : <Navigate to="/" replace />} />
        <Route path="/KPI-review" element={ isAuthenticated && role === 'user' ? <KPIReview /> : <Navigate to="/" replace />} />
        <Route path="/monthly-mock-form" element={ isAuthenticated && role=== 'user' ? <MonthlyMockForm /> : <Navigate to="/" replace />} />
        <Route path='/Myhierarchy' element={isAuthenticated && role=== 'user' ? <Myhierarchy /> : <Navigate to="/" replace />} />
        <Route  path='/Test' element={<Test />} />
      
      </Routes>
    </Router>  
  );  
}
function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  ); 
}
export default App;
