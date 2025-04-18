import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import claimsReducer from './slices/claimsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        claims: claimsReducer,
        // Add other reducers here as needed
    },
    // Middleware is automatically configured by RTK (includes thunk)
    // DevTools are enabled by default in development
});