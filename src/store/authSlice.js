
import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    status: "loading",
    user: null,
  },
  reducers: {
    setGuest(state) {
      state.status = "guest";
      state.user = null;
    },

    setAuthenticated(state, action) {
      state.status = "authenticated";
      state.user = action.payload;
    },

    setUnauthenticated(state) {
      state.status = "unauthenticated";
      state.user = null;
    },

    setAuthLoading(state) {
      state.status = "loading";
      state.user = null;
    },
  },
});

export const {
  setGuest,
  setAuthenticated,
  setUnauthenticated,
  setAuthLoading,
} = authSlice.actions;

export default authSlice.reducer;
