import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  role:           null,
  token:          null,
  employeeId:     sessionStorage.getItem('employeeId') || null,
  initialized:    false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    initializeAuth(state) {
      const token      = sessionStorage.getItem('token');
      const role       = sessionStorage.getItem('role');
      const employeeId = sessionStorage.getItem('employeeId');

      if (token && role) {
        state.isAuthenticated = true;
        state.token           = token;
        state.role            = role;
        state.employeeId      = employeeId;
      }
      state.initialized = true;
    },
    setAuth(state, action) {
      const { token, role, employeeId } = action.payload;
      state.isAuthenticated = true;
      state.token           = token;
      state.role            = role;
      state.employeeId      = employeeId;
      state.initialized     = true;

      sessionStorage.setItem('token',      token);
      sessionStorage.setItem('role',       role);
      sessionStorage.setItem('employeeId', employeeId);
    },
    clearAuth(state) {
      state.isAuthenticated = false;
      state.role            = null;
      state.token           = null;
      state.employeeId      = null;
      state.initialized     = true;

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('employeeId');
    },
  },
});

export const { initializeAuth, setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
