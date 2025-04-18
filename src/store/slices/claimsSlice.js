// src/store/slices/claimsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Ensure Axios is imported

// --- Configuration ---
// Use environment variable for API base URL, fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Define base URLs per role/area for clarity
const CLAIMANT_API = `${API_BASE_URL}/claimant`;
const REVIEWER_API = `${API_BASE_URL}/reviewer`;
const CHECKER_API = `${API_BASE_URL}/checker`;
// Auth lives at base API level
const AUTH_API = `${API_BASE_URL}/auth`;

// --- Define action URLs using template literals ---
// Claimant
const GET_CLAIMANT_CLAIMS_URL = (userId) => `${CLAIMANT_API}/claims/${userId}`;
const CREATE_CLAIMANT_CLAIM_URL = () => `${CLAIMANT_API}/claims`;
const GET_CLAIMANT_CLAIM_BY_ID_URL = (claimId, userId) => `${CLAIMANT_API}/claims/${claimId}/${userId}`;

// Reviewer
const GET_REVIEWER_CLAIMS_URL = () => `${REVIEWER_API}/claims`;
const GET_REVIEWER_CLAIM_BY_ID_URL = (claimId) => `${REVIEWER_API}/claims/${claimId}`;
const SUBMIT_FOR_APPROVAL_URL = (claimId) => `${REVIEWER_API}/claims/${claimId}/submit-for-approval`;

// Checker
const GET_CHECKER_CLAIMS_URL = () => `${CHECKER_API}/claims`;
const GET_CHECKER_CLAIM_BY_ID_URL = (claimId) => `${CHECKER_API}/claims/${claimId}`;
const ASSIGN_CLAIM_URL = (claimId) => `${CHECKER_API}/claims/${claimId}/assign`;
const APPROVE_CLAIM_URL = (claimId, approverId) => `${CHECKER_API}/claims/${claimId}/approve/${approverId}`;
const DENY_CLAIM_URL = (claimId) => `${CHECKER_API}/claims/${claimId}/deny`;
const FETCH_REVIEWERS_URL = () => `${CHECKER_API}/users?role=reviewer`; // Assuming Checker fetches reviewers

// --- Helper Function for API Error Handling ---
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

// --- Async Thunks ---

// Fetch claims for Claimant
export const fetchClaimantClaims = createAsyncThunk(
    'claims/fetchClaimantClaims',
    async (_, { rejectWithValue }) => {
        try {
            const userId = localStorage.getItem('userId');
            console.log('Fetching claimant claims for userId:', userId);
            const response = await axios.get(GET_CLAIMANT_CLAIMS_URL(userId));
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch your claims.'));
        }
    }
);

// Fetch claims for Reviewer (assigned claims)
export const fetchReviewerClaims = createAsyncThunk(
    'claims/fetchReviewerClaims',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_REVIEWER_CLAIMS_URL());
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch assigned claims.'));
        }
    }
);

// Fetch claims for Checker (all or filtered)
export const fetchCheckerClaims = createAsyncThunk(
    'claims/fetchCheckerClaims',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_CHECKER_CLAIMS_URL(), { params: filters });
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch claims for checker view.'));
        }
    }
);

// Fetch single claim details - role determines endpoint, backend authorizes access
export const fetchClaimById = createAsyncThunk(
    'claims/fetchClaimById',
    async ({ claimId, role }, { rejectWithValue }) => {
        let url;
        let userId = localStorage.getItem('userId');
        switch(role) {
            case 'reviewer': url = GET_REVIEWER_CLAIM_BY_ID_URL(claimId); break;
            case 'checker': url = GET_CHECKER_CLAIM_BY_ID_URL(claimId); break;
            default: url = GET_CLAIMANT_CLAIM_BY_ID_URL(claimId, userId); break; // Default to claimant
        }
        try {
            const response = await axios.get(url);
            // ResourceController usually returns single item directly, not nested in 'data'
            return response.data;
        } catch (error) {
            return rejectWithValue(handleApiError(error, `Failed to fetch details for claim ${claimId}.`));
        }
    }
);

// Submit a new claim (Claimant action) - Expects FormData
export const submitClaim = createAsyncThunk(
    'claims/submitClaim',
    async (formData, { rejectWithValue }) => {
        try {
            // add the user id to the form data
            const userId = localStorage.getItem('userId');
            formData.append('user_id', userId);
            const response = await axios.post(CREATE_CLAIMANT_CLAIM_URL(), formData);
            if (response.status === 201 || response.status === 200) { // 201 Created is standard
                return response.data?.data ?? response.data; // Check if ResourceController nests created resource
            } else {
                return rejectWithValue(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Claim submission failed.'));
        }
    }
);

// Fetch reviewers list (Checker action)
export const fetchReviewers = createAsyncThunk(
    'claims/fetchReviewers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(FETCH_REVIEWERS_URL());
            return response.data?.data ?? []; // Assuming data is in 'data' key
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch reviewers.'));
        }
    }
);

// Assign claim to reviewer (Checker action)
export const assignClaim = createAsyncThunk(
    'claims/assignClaim',
    async ({ claimId, reviewerId }, { rejectWithValue }) => {
        try {
            const payload = { reviewer_id: reviewerId }; // Backend expected payload
            const response = await axios.patch(ASSIGN_CLAIM_URL(claimId), payload);
            return response.data?.data ?? response.data; // Return updated claim
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to assign claim.'));
        }
    }
);

// Submit claim for approval (Reviewer action) - Expects FormData
export const submitForApproval = createAsyncThunk(
    'claims/submitForApproval',
    async ({ claimId, formData }, { rejectWithValue }) => {
        try {
            const userId = localStorage.getItem('userId');
            formData.append('user_id', userId);
            const response = await axios.patch(SUBMIT_FOR_APPROVAL_URL(claimId), formData);
            return response.data?.data ?? response.data; // Return updated claim
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to submit claim for approval.'));
        }
    }
);

// Approve claim (Checker action)
export const approveClaimAction = createAsyncThunk(
    'claims/approveClaim',
    async (claimId, { rejectWithValue }) => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.patch(APPROVE_CLAIM_URL(claimId, userId), {});
            return response.data?.data ?? response.data; // Return updated claim
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to approve claim.'));
        }
    }
);

// Deny claim (Checker action)
export const denyClaimAction = createAsyncThunk(
    'claims/denyClaim',
    async ({ claimId, reason = null }, { rejectWithValue }) => {
        try {
            const payload = reason ? { denial_reason: reason } : {};
            const response = await axios.patch(DENY_CLAIM_URL(claimId), payload);
            return response.data?.data ?? response.data; // Return updated claim
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to deny claim.'));
        }
    }
);

// --- Initial State ---
const initialState = {
    claims: [],                    // Holds the list of claims fetched based on context (claimant's, reviewer's assigned, checker's all/filtered)
    currentClaim: null,            // Holds single claim details when viewing
    reviewers: [],                 // List of available reviewers (fetched by checker)
    // Status/Error pairs for distinct asynchronous operations
    listStatus: 'idle',            // Fetching lists (any role)
    listError: null,
    detailStatus: 'idle',          // Fetching single claim detail
    detailError: null,
    submitStatus: 'idle',          // Claimant submitting a new claim
    submitError: null,
    assignStatus: 'idle',          // Checker assigning a claim
    assignError: null,
    submitApprovalStatus: 'idle',  // Reviewer submitting for approval
    submitApprovalError: null,
    finalActionStatus: 'idle',     // Checker approving/denying
    finalActionError: null,
    fetchReviewersStatus: 'idle',  // Checker fetching reviewers list
    fetchReviewersError: null,
};

// --- Helper: Update/Replace item in state array immutably ---
const updateOrAddClaimInList = (claimsList, updatedClaim) => {
    if (!updatedClaim || !updatedClaim.id) return claimsList; // Must have an ID
    const index = claimsList.findIndex(claim => String(claim.id) === String(updatedClaim.id)); // String compare IDs
    if (index !== -1) { // Found existing claim -> Update it
        const newList = [...claimsList];
        newList[index] = { ...claimsList[index], ...updatedClaim }; // Merge new data into existing
        return newList;
    }
    // If it's an update action (like assign, approve), don't add if not found
    // Only `submitClaim.fulfilled` should definitively add.
    return claimsList;
};


// --- Slice Definition ---
const claimsSlice = createSlice({
    name: 'claims',
    initialState,
    reducers: {
        clearCurrentClaim: (state) => { state.currentClaim = null; state.detailStatus = 'idle'; state.detailError = null; },
        resetSubmitStatus: (state) => { state.submitStatus = 'idle'; state.submitError = null; },
        resetAssignStatus: (state) => { state.assignStatus = 'idle'; state.assignError = null; },
        resetSubmitApprovalStatus: (state) => { state.submitApprovalStatus = 'idle'; state.submitApprovalError = null; },
        resetFinalActionStatus: (state) => { state.finalActionStatus = 'idle'; state.finalActionError = null; },
        clearListError: (state) => { state.listError = null; state.listStatus = 'idle'; } // Allow refetching list
    },
    extraReducers: (builder) => {
        // Generic handlers for list fetching thunks
        const handleListPending = (state) => { state.listStatus = 'loading'; state.listError = null; };
        const handleListFulfilled = (state, action) => { state.listStatus = 'succeeded'; state.claims = action.payload; }; // Overwrites list with fetched data
        const handleListRejected = (state, action) => { state.listStatus = 'failed'; state.listError = action.payload; };

        // Generic handler for actions that return an updated claim object
        const handleUpdateFulfilled = (state, action) => {
            state.claims = updateOrAddClaimInList(state.claims, action.payload); // Update item in the list
            if (state.currentClaim?.id === action.payload?.id) { // Update details view if open
                state.currentClaim = { ...state.currentClaim, ...action.payload };
            }
        };

        builder
            // List Fetching
            .addCase(fetchClaimantClaims.pending, handleListPending).addCase(fetchClaimantClaims.fulfilled, handleListFulfilled).addCase(fetchClaimantClaims.rejected, handleListRejected)
            .addCase(fetchReviewerClaims.pending, handleListPending).addCase(fetchReviewerClaims.fulfilled, handleListFulfilled).addCase(fetchReviewerClaims.rejected, handleListRejected)
            .addCase(fetchCheckerClaims.pending, handleListPending).addCase(fetchCheckerClaims.fulfilled, handleListFulfilled).addCase(fetchCheckerClaims.rejected, handleListRejected)

            // Detail Fetching
            .addCase(fetchClaimById.pending, (state) => { state.detailStatus = 'loading'; state.currentClaim = null; state.detailError = null; })
            .addCase(fetchClaimById.fulfilled, (state, action) => { state.detailStatus = 'succeeded'; state.currentClaim = action.payload; })
            .addCase(fetchClaimById.rejected, (state, action) => { state.detailStatus = 'failed'; state.detailError = action.payload; })

            // Submit New Claim
            .addCase(submitClaim.pending, (state) => { state.submitStatus = 'loading'; state.submitError = null; })
            .addCase(submitClaim.fulfilled, (state, action) => {
                state.submitStatus = 'succeeded';
                state.claims.push(action.payload); // Add the NEW claim to the current list view
            })
            .addCase(submitClaim.rejected, (state, action) => { state.submitStatus = 'failed'; state.submitError = action.payload; })

            // Fetch Reviewers
            .addCase(fetchReviewers.pending, (state) => { state.fetchReviewersStatus = 'loading'; state.fetchReviewersError = null; })
            .addCase(fetchReviewers.fulfilled, (state, action) => { state.fetchReviewersStatus = 'succeeded'; state.reviewers = action.payload; })
            .addCase(fetchReviewers.rejected, (state, action) => { state.fetchReviewersStatus = 'failed'; state.fetchReviewersError = action.payload; })

            // Assign Claim
            .addCase(assignClaim.pending, (state) => { state.assignStatus = 'loading'; state.assignError = null; })
            .addCase(assignClaim.fulfilled, (state, action) => { state.assignStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(assignClaim.rejected, (state, action) => { state.assignStatus = 'failed'; state.assignError = action.payload; })

            // Submit For Approval
            .addCase(submitForApproval.pending, (state) => { state.submitApprovalStatus = 'loading'; state.submitApprovalError = null; })
            .addCase(submitForApproval.fulfilled, (state, action) => { state.submitApprovalStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(submitForApproval.rejected, (state, action) => { state.submitApprovalStatus = 'failed'; state.submitApprovalError = action.payload; })

            // Approve Claim
            .addCase(approveClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(approveClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(approveClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; })

            // Deny Claim
            .addCase(denyClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(denyClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(denyClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; });
    },
});

// --- Exports ---
// // Export Thunks
// export {
//     fetchClaimantClaims,
//     fetchReviewerClaims,
//     fetchCheckerClaims,
//     fetchClaimById,
//     submitClaim,
//     fetchReviewers,
//     assignClaim,
//     submitForApproval,
//     approveClaimAction,
//     denyClaimAction
// };
// Export Actions (Reducers)
export const {
    clearCurrentClaim,
    resetSubmitStatus,
    resetAssignStatus,
    resetSubmitApprovalStatus,
    resetFinalActionStatus,
    clearListError,
} = claimsSlice.actions;
// Export Reducer
export default claimsSlice.reducer;
// Export Selectors
export const selectAllClaims = state => state.claims.claims;
export const selectCurrentClaim = state => state.claims.currentClaim;
export const selectListStatus = state => state.claims.listStatus;
export const selectListError = state => state.claims.listError;
export const selectDetailStatus = state => state.claims.detailStatus;
export const selectDetailError = state => state.claims.detailError;
export const selectSubmitStatus = state => state.claims.submitStatus;
export const selectSubmitError = state => state.claims.submitError;
export const selectReviewers = state => state.claims.reviewers;
export const selectFetchReviewersStatus = state => state.claims.fetchReviewersStatus;
export const selectFetchReviewersError = state => state.claims.fetchReviewersError;
export const selectAssignStatus = state => state.claims.assignStatus;
export const selectAssignError = state => state.claims.assignError;
export const selectSubmitApprovalStatus = state => state.claims.submitApprovalStatus;
export const selectSubmitApprovalError = state => state.claims.submitApprovalError;
export const selectFinalActionStatus = state => state.claims.finalActionStatus;
export const selectFinalActionError = state => state.claims.finalActionError;