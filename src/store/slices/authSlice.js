import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Import Axios

const API_BASE_URL = 'http://localhost:8080/api';

const LOGIN_URL = `${API_BASE_URL}/auth/login`;

// --- Helper Function to get data from localStorage ---
const getUserDataFromStorage = () => {
    try {
        const token = localStorage.getItem('authToken');
        const userJson = localStorage.getItem('authUser');
        if (token && userJson) {
            const user = JSON.parse(userJson);
            // Basic validation - more checks (like token expiry) can be added
            if (user && user.role) {
                return { user, token, isAuthenticated: true };
            }
        }
    } catch (error) {
        console.error("Failed to parse auth data from storage:", error);
    }
    return { user: null, token: null, isAuthenticated: false };
};


// Async Thunk for Login using Axios
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials, { rejectWithValue }) => {
        try {
            console.log(`Attempting login for: ${credentials.email}`);
            const response = await axios.post(LOGIN_URL, {
                email: credentials.email,
                password: credentials.password
            });

            console.log('Login API Response:', response.data);

            if (response.data && response.data.token && response.data.user && response.data.user.role) {
                const { token, user } = response.data;
                console.log('User token is: ' + token);
                console.log('User id  is: ' + user.id);
                localStorage.setItem('authToken', token);
                localStorage.setItem('userId', user.id);
                localStorage.setItem('authUser', JSON.stringify(user));
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                return { token, user };
            } else {
                console.error("Invalid login response structure:", response.data);
                return rejectWithValue('Invalid login response from server.');
            }
        } catch (error) {
            console.error("Login API Error:", error);
            let displayMessage = 'An unexpected error occurred during login.'; // Default message

            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const status = error.response.status;
                const serverMessage = error.response.data?.message || error.response.data?.error; // Message from backend

                if (status === 401 || status === 400) { // Unauthorized or Bad Request (often used for invalid credentials)
                    displayMessage = serverMessage || 'Invalid email or password.';
                } else if (status === 404) { // Might occur if API route is wrong
                    displayMessage = 'Login endpoint not found (Error 404).';
                } else if (status >= 500) { // Server error
                    displayMessage = serverMessage || 'Server error during login. Please try again later.';
                } else { // Other client errors (4xx)
                    displayMessage = serverMessage || `Login failed with status: ${status}.`;
                }
                console.error("Login API Error Data:", error.response.data);

            } else if (error.request) {
                // The request was made but no response was received
                // This can happen with network errors or CORS issues (like failed OPTIONS preflight)
                console.error("Login API No Response (potentially CORS or Network):", error.request);
                // Check if it looks like a network error specifically
                if (error.code === 'ERR_NETWORK') {
                    displayMessage = 'Network Error: Could not connect to the server. Please check your connection.';
                } else {
                    // This branch often catches failed CORS preflights if the server doesn't respond correctly to OPTIONS
                    displayMessage = 'Could not communicate with the server. This might be a network issue or a CORS configuration problem on the server.';
                }
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Login Error:', error.message);
                displayMessage = `Error setting up login request: ${error.message}`;
            }

            // Clear any potential remnants from storage on any login error
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            delete axios.defaults.headers.common['Authorization'];

            // Return the user-friendly message for the Redux state
            return rejectWithValue(displayMessage);
        }
    }
);

// --- Initial State ---
// Initialize state from localStorage or default
const initialAuthState = getUserDataFromStorage();
const initialState = {
    user: initialAuthState.user,
    token: initialAuthState.token,
    isAuthenticated: initialAuthState.isAuthenticated,
    loading: false,
    error: null,
};

// Set Axios default header if token exists on initial load
if (initialState.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialState.token}`;
}

// --- Slice Definition ---
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Standard reducer for logout
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.error = null;
            // Clear from localStorage and Axios headers
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            delete axios.defaults.headers.common['Authorization'];
            console.log('User logged out, storage cleared.');
        },
        // Reducer to manually clear errors (e.g., when user dismisses alert)
        clearAuthError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user; // user object including role
                state.token = action.payload.token;
                state.error = null;
                console.log('Login successful, state updated:', state.user);
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = action.payload || 'Login Failed'; // Use error message from rejectWithValue
                console.error('Login failed, state updated with error:', state.error);
            });
    },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

// Selector for user role
export const selectUserRole = (state) => state.auth.user?.role;