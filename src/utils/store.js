// src/store.js
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice'; // Your existing userSlice
import authReducer from './authSlice'; // Add the new authSlice

export default configureStore({
  reducer: {
    user: userReducer,      // Your existing user slice
    auth: authReducer,      // Add the auth slice
  },
});
 