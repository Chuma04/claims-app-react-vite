// src/store/slices/claimsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Ensure Axios is imported

// --- Configuration ---
// Use environment variable for API base URL, fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'; // Adjust port/URL as needed

// Define base URLs per role/area for clarity
const CLAIMANT_API = `${API_BASE_URL}/claimant`;
const REVIEWER_API = `${API_BASE_URL}/reviewer`;
const CHECKER_API = `${API_BASE_URL}/checker`;

// --- Define action URLs using template literals ---
// Claimant
const GET_CLAIMANT_CLAIMS_URL = () => `${CLAIMANT_API}/claims`;
const CREATE_CLAIMANT_CLAIM_URL = () => `${CLAIMANT_API}/claims`;
const GET_CLAIMANT_CLAIM_BY_ID_URL = (claimId) => `${CLAIMANT_API}/claims/${claimId}`;

// Reviewer
const GET_REVIEWER_CLAIMS_URL = () => `${REVIEWER_API}/claims`;
const GET_REVIEWER_CLAIM_BY_ID_URL = (claimId, userId) => `${REVIEWER_API}/claims/${claimId}/${userId}`;
const SUBMIT_FOR_APPROVAL_URL = (claimId) => `${REVIEWER_API}/claims/${claimId}/submit-for-approval`;

// Checker
const GET_CHECKER_CLAIMS_URL = () => `${CHECKER_API}/claims`;
const GET_CHECKER_CLAIM_BY_ID_URL = (claimId) => `${CHECKER_API}/claims/${claimId}`;
const ASSIGN_CLAIM_URL = (claimId) => `${CHECKER_API}/claims/${claimId}/assign`;
const APPROVE_CLAIM_URL = (claimId) => `${CHECKER_API}/claims/${claimId}/approve`;
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

// Fetch claims specifically for the claimant view
export const fetchClaimantClaims = createAsyncThunk(
    'claims/fetchClaimantClaims',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_CLAIMANT_CLAIMS_URL());
            // Adjust based on expected response structure (e.g., response.data.data)
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch your claims.'));
        }
    }
);

// Fetch claims specifically for the reviewer view (assigned claims)
export const fetchReviewerClaims = createAsyncThunk(
    'claims/fetchReviewerClaims',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_REVIEWER_CLAIMS_URL());
            // Adjust based on expected response structure
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch assigned claims.'));
        }
    }
);

// Fetch claims specifically for the checker view (all or filtered)
export const fetchCheckerClaims = createAsyncThunk(
    'claims/fetchCheckerClaims',
    async (filters = {}, { rejectWithValue }) => { // Optional filters (e.g., { status: 'Pending Approval' })
        try {
            const response = await axios.get(GET_CHECKER_CLAIMS_URL(), { params: filters });
            // Adjust based on expected response structure
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch claims for checker view.'));
        }
    }
);

// Generic/shared function to fetch details, relies on backend authorization per endpoint
export const fetchClaimById = createAsyncThunk(
    'claims/fetchClaimById',
    async ({ claimId, role }, { rejectWithValue }) => {
        let url;
        let userId = localStorage.getItem('userId'); // Get user ID from local storage
        switch(role) {
            case 'reviewer': url = GET_REVIEWER_CLAIM_BY_ID_URL(claimId, userId); break;
            case 'checker': url = GET_CHECKER_CLAIM_BY_ID_URL(claimId); break;
            // case 'claimant': // Explicitly handle claimant if needed
            default: url = GET_CLAIMANT_CLAIM_BY_ID_URL(claimId); break;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            // If error is 404, it could be not found OR not authorized for that role's endpoint
            return rejectWithValue(handleApiError(error, `Failed to fetch details for claim ${claimId}. Check permissions or ID.`));
        }
    }
);

// Submit a new claim (Claimant action) - Expects FormData
export const submitClaim = createAsyncThunk(
    'claims/submitClaim',
    async (formData, { rejectWithValue }) => {
        try {
            // Axios automatically sets multipart/form-data header for FormData
            const response = await axios.post(CREATE_CLAIMANT_CLAIM_URL(), formData);
            if (response.status === 201 || response.status === 200) { // 201 Created is standard
                // ResourceController create often returns the created object directly
                return response.data;
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
            // Adjust based on API structure (e.g., response.data.data)
            return response.data?.data ?? [];
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
            // Assume PATCH update returns the updated resource directly
            return response.data;
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to assign claim.'));
        }
    }
);

// Submit claim for approval (Reviewer action) - Expects FormData
export const submitForApproval = createAsyncThunk(
    'claims/submitForApproval',
    // Payload: { claimId: string|number, formData: FormData }
    async ({ claimId, formData }, { rejectWithValue }) => {
        try {
            console.log(`Submitting claim ${claimId} for approval via FormData.`);
            // Use PATCH (adjust if backend uses POST/PUT)
            const response = await axios.patch(SUBMIT_FOR_APPROVAL_URL(claimId), formData);
            console.log(`Submit For Approval ${claimId} Response:`, response.data);
            // Assume PATCH returns updated resource directly
            return response.data;
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
            const response = await axios.patch(APPROVE_CLAIM_URL(claimId), {});
            // Assume PATCH returns updated resource directly
            return response.data;
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
            // Assume PATCH returns updated resource directly
            return response.data;
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to deny claim.'));
        }
    }
);

// --- Initial State ---
const initialState = {
    claims: [],                    // Holds the list of claims fetched based on context
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
        // --- Synchronous Actions ---
        clearCurrentClaim: (state) => {
            state.currentClaim = null;
            state.detailStatus = 'idle';
            state.detailError = null;
        },
        resetSubmitStatus: (state) => { state.submitStatus = 'idle'; state.submitError = null; },
        resetAssignStatus: (state) => { state.assignStatus = 'idle'; state.assignError = null; },
        resetSubmitApprovalStatus: (state) => { state.submitApprovalStatus = 'idle'; state.submitApprovalError = null; },
        resetFinalActionStatus: (state) => { state.finalActionStatus = 'idle'; state.finalActionError = null; },
        clearListError: (state) => { state.listError = null; state.listStatus = 'idle'; }
    },
    extraReducers: (builder) => {
        const handleListPending = (state) => { state.listStatus = 'loading'; state.listError = null; };
        const handleListFulfilled = (state, action) => { state.listStatus = 'succeeded'; state.claims = action.payload; };
        const handleListRejected = (state, action) => { state.listStatus = 'failed'; state.listError = action.payload; };

        const handleUpdateFulfilled = (state, action) => {
            if (!action.payload) return;
            state.claims = updateOrAddClaimInList(state.claims, action.payload);
            if (state.currentClaim?.id === action.payload?.id) {
                state.currentClaim = { ...state.currentClaim, ...action.payload };
            }
        };

        builder
            .addCase(fetchClaimantClaims.pending, handleListPending).addCase(fetchClaimantClaims.fulfilled, handleListFulfilled).addCase(fetchClaimantClaims.rejected, handleListRejected)
            .addCase(fetchReviewerClaims.pending, handleListPending).addCase(fetchReviewerClaims.fulfilled, handleListFulfilled).addCase(fetchReviewerClaims.rejected, handleListRejected)
            .addCase(fetchCheckerClaims.pending, handleListPending).addCase(fetchCheckerClaims.fulfilled, handleListFulfilled).addCase(fetchCheckerClaims.rejected, handleListRejected)

            .addCase(fetchClaimById.pending, (state) => { state.detailStatus = 'loading'; state.currentClaim = null; state.detailError = null; })
            .addCase(fetchClaimById.fulfilled, (state, action) => {
                state.detailStatus = 'succeeded';
                state.currentClaim = action.payload.data ?? null;
                state.detailError = null;
            })
            .addCase(fetchClaimById.rejected, (state, action) => { state.detailStatus = 'failed'; state.detailError = action.payload; state.currentClaim = null; })

            .addCase(submitClaim.pending, (state) => { state.submitStatus = 'loading'; state.submitError = null; })
            .addCase(submitClaim.fulfilled, (state, action) => {
                state.submitStatus = 'succeeded';
                if (action.payload) { state.claims.push(action.payload); }
            })
            .addCase(submitClaim.rejected, (state, action) => { state.submitStatus = 'failed'; state.submitError = action.payload; })

            .addCase(fetchReviewers.pending, (state) => { state.fetchReviewersStatus = 'loading'; state.fetchReviewersError = null; })
            .addCase(fetchReviewers.fulfilled, (state, action) => { state.fetchReviewersStatus = 'succeeded'; state.reviewers = action.payload; })
            .addCase(fetchReviewers.rejected, (state, action) => { state.fetchReviewersStatus = 'failed'; state.fetchReviewersError = action.payload; })

            .addCase(assignClaim.pending, (state) => { state.assignStatus = 'loading'; state.assignError = null; })
            .addCase(assignClaim.fulfilled, (state, action) => { state.assignStatus = 'succeeded'; handleUpdateFulfilled(state, action); }) // Update state with returned claim
            .addCase(assignClaim.rejected, (state, action) => { state.assignStatus = 'failed'; state.assignError = action.payload; })

            .addCase(submitForApproval.pending, (state) => { state.submitApprovalStatus = 'loading'; state.submitApprovalError = null; })
            .addCase(submitForApproval.fulfilled, (state, action) => { state.submitApprovalStatus = 'succeeded'; handleUpdateFulfilled(state, action); }) // Update state with returned claim
            .addCase(submitForApproval.rejected, (state, action) => { state.submitApprovalStatus = 'failed'; state.submitApprovalError = action.payload; })

            .addCase(approveClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(approveClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); }) // Update state with returned claim
            .addCase(approveClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; })

            .addCase(denyClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(denyClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); }) // Update state with returned claim
            .addCase(denyClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; });
    },
});

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