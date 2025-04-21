import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import claimsReducer from './slices/claimsSlice';
import userManagementReducer from './slices/userManagementSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        claims: claimsReducer,
        users: userManagementReducer,
    },
});