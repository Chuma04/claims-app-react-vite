// src/store/slices/userManagementSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// --- Helper Function for API Error Handling ---
// It's good practice to potentially move this to a shared utils file
const handleApiError = (error, defaultMessage = 'An error occurred.') => {
    console.error("API Error:", error);
    let displayMessage = defaultMessage;
    if (error.response) {
        // Try to get specific messages from backend response
        displayMessage = error.response.data?.message // Standard message field
            || (typeof error.response.data?.errors === 'object' ? Object.values(error.response.data.errors).join(' ') : null) // Combine CodeIgniter validation errors
            || error.response.data?.error // Alternative error field
            || `Server error: ${error.response.status}`; // Fallback
        console.error("Response Data:", error.response.data);
        console.error("Response Status:", error.response.status);
    } else if (error.request) {
        displayMessage = 'No response from server. Check network or API CORS configuration.';
        console.error("Request Data:", error.request);
    } else {
        // Error setting up the request
        displayMessage = error.message;
    }
    return displayMessage;
};

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
// Endpoint assumes Checker permission is needed
const USER_MANAGEMENT_URL = `${API_BASE_URL}/checker/users`;

// --- Async Thunks ---

/**
 * Fetches users, optionally filtering by role.
 * Expects filter object, e.g., { role: 'claimant' } or {} for all manageable users.
 */
export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    async (filter = {}, { rejectWithValue }) => {
        try {
            console.log('Fetching users with filter:', filter);
            // Auth should be handled by default Axios header
            const response = await axios.get(USER_MANAGEMENT_URL, { params: filter });
            // Assuming backend responds with { data: [...] } or just [...]
            return response.data?.data ?? response.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch users.'));
        }
    }
);

/**
 * Creates a new user.
 * Expects userData: { username, email, password, role, claimTypeIds?: number[] }
 */
export const createUser = createAsyncThunk(
    'users/createUser',
    async (userData, { rejectWithValue }) => {
        try {
            console.log("Creating user with data:", userData);
            // Backend endpoint for Checker to create users
            const response = await axios.post(USER_MANAGEMENT_URL, userData);
            // Assuming backend returns the newly created user object in 'data' or directly
            return response.data?.data ?? response.data;
        } catch (error) {
            // Specific handling for potential validation errors (e.g., email exists)
            return rejectWithValue(handleApiError(error, 'Failed to create user. Check input fields.'));
        }
    }
);

// --- Placeholder Thunks for Future ---
/*
export const updateUser = createAsyncThunk(
    'users/updateUser',
    async ({ userId, updateData }, { rejectWithValue }) => {
        try {
            const response = await axios.patch(`${USER_MANAGEMENT_URL}/${userId}`, updateData);
            return response.data?.data ?? response.data;
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to update user.'));
        }
    }
);

export const deleteUser = createAsyncThunk(
    'users/deleteUser',
    async (userId, { rejectWithValue }) => {
        try {
            await axios.delete(`${USER_MANAGEMENT_URL}/${userId}`);
            return userId; // Return the ID of the deleted user for filtering state
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to delete user.'));
        }
    }
);
*/

// --- Initial State ---
const initialState = {
    list: [],              // Array to hold the fetched list of users
    listStatus: 'idle',    // Status for fetching list ('idle' | 'loading' | 'succeeded' | 'failed')
    listError: null,       // Error message if fetching list fails

    createStatus: 'idle',  // Status for creating a user
    createError: null,     // Error message if creating user fails

    // Future state for update/delete actions
    // updateStatus: 'idle', updateError: null,
    // deleteStatus: 'idle', deleteError: null,
};

// --- Slice Definition ---
const userManagementSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        // Reset actions allow components to clear status/error easily
        resetCreateStatus: (state) => {
            state.createStatus = 'idle';
            state.createError = null;
        },
        resetListStatus: (state) => {
            state.listStatus = 'idle';
            state.listError = null;
            state.list = []; // Optionally clear list when resetting status
        },
        // Add resets for update/delete later
        // resetUpdateStatus: (state) => { state.updateStatus = 'idle'; state.updateError = null; },
        // resetDeleteStatus: (state) => { state.deleteStatus = 'idle'; state.deleteError = null; },
    },
    extraReducers: (builder) => {
        builder
            // Cases for Fetching Users
            .addCase(fetchUsers.pending, (state) => {
                state.listStatus = 'loading';
                state.listError = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.listStatus = 'succeeded';
                state.list = action.payload; // Replace list with fetched data
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.listStatus = 'failed';
                state.listError = action.payload;
            })

            // Cases for Creating User
            .addCase(createUser.pending, (state) => {
                state.createStatus = 'loading';
                state.createError = null;
            })
            .addCase(createUser.fulfilled, (state, action) => {
                state.createStatus = 'succeeded';
                // Add the new user to the beginning of the list for immediate feedback
                state.list.unshift(action.payload);
            })
            .addCase(createUser.rejected, (state, action) => {
                state.createStatus = 'failed';
                state.createError = action.payload;
            })

        // Placeholder cases for future actions
        /*
        .addCase(updateUser.pending, (state) => { state.updateStatus = 'loading'; state.updateError = null; })
        .addCase(updateUser.fulfilled, (state, action) => {
            state.updateStatus = 'succeeded';
            // Find and update user in the list
            const index = state.list.findIndex(user => user.id === action.payload.id);
            if (index !== -1) {
                state.list[index] = { ...state.list[index], ...action.payload };
            }
        })
        .addCase(updateUser.rejected, (state, action) => { state.updateStatus = 'failed'; state.updateError = action.payload; })

        .addCase(deleteUser.pending, (state) => { state.deleteStatus = 'loading'; state.deleteError = null; })
        .addCase(deleteUser.fulfilled, (state, action) => { // action.payload is userId
            state.deleteStatus = 'succeeded';
            state.list = state.list.filter(user => user.id !== action.payload);
        })
        .addCase(deleteUser.rejected, (state, action) => { state.deleteStatus = 'failed'; state.deleteError = action.payload; })
        */
        ;
    },
});

// Export Actions from reducers
export const {
    resetCreateStatus,
    resetListStatus,
    // export other reset actions later
} = userManagementSlice.actions;

// Export Reducer
export default userManagementSlice.reducer;

// Export Selectors
export const selectUserList = (state) => state.users.list;
export const selectUserListStatus = (state) => state.users.listStatus;
export const selectUserListError = (state) => state.users.listError;
export const selectUserCreateStatus = (state) => state.users.createStatus;
export const selectUserCreateError = (state) => state.users.createError;
// export const selectUserUpdateStatus = (state) => state.users.updateStatus;
// export const selectUserUpdateError = (state) => state.users.updateError;
// export const selectUserDeleteStatus = (state) => state.users.deleteStatus;
// export const selectUserDeleteError = (state) => state.users.deleteError;