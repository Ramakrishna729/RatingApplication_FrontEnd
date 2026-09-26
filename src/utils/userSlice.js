import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  ReviewToId:null,
  RequestId:null,
  nodtification_id:null,
  Login_User_Info:{}
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoginUserInfo:(state,action)=>{
      state.Login_User_Info=action.payload;
    },
    setReviewToId(state, action) {
      debugger;
      state.ReviewToId = action.payload.ReviewToId;
      state.RequestId = action.payload.RequestId;
    },
    resetReviewToId(state) {
      state.ReviewToId = null;
      state.RequestId = null;
      state.nodtification_id = null;  
    },
    resetLoginUserInfo(state) {
      state.Login_User_Info = {};
    }
  }
});

export const { setReviewToId, resetReviewToId } = userSlice.actions;
export default userSlice.reducer;
 