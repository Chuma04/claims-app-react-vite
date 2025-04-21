// src/store/slices/claimsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const handleApiError = (error, defaultMessage = 'An error occurred.') => {
    console.error("API Error:", error);
    let displayMessage = defaultMessage;
    if (error.response) {
        displayMessage = error.response.data?.message
            || (typeof error.response.data?.errors === 'object' ? Object.values(error.response.data.errors).join(' ') : null)
            || error.response.data?.error
            || `Server error: ${error.response.status}`;
        console.error("Response Data:", error.response.data);
        console.error("Response Status:", error.response.status);
    } else if (error.request) {
        displayMessage = 'No response from server. Check network or API CORS configuration.';
        console.error("Request Data:", error.request);
    } else {
        displayMessage = error.message;
    }
    return displayMessage;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const CLAIMANT_API = `${API_BASE_URL}/claimant`;
const REVIEWER_API = `${API_BASE_URL}/reviewer`;
const CHECKER_API = `${API_BASE_URL}/checker`;
const PUBLIC_API_RESOURCES = API_BASE_URL;

const GET_CLAIMANT_CLAIMS_URL = (userId) => `${CLAIMANT_API}/claims/${userId}`;
const CREATE_CLAIMANT_CLAIM_URL = () => `${CLAIMANT_API}/claims`;
const GET_CLAIMANT_CLAIM_BY_ID_URL = (claimId, userId) => `${CLAIMANT_API}/claims/${claimId}/${userId}`;
const GET_REVIEWER_CLAIMS_URL = (userId) => `${REVIEWER_API}/claims/${userId}`;
const GET_REVIEWER_CLAIM_BY_ID_URL = (claimId, userId) => `${REVIEWER_API}/claims/${claimId}/${userId}`;
const SUBMIT_FOR_APPROVAL_URL = (claimId, userId) => `${REVIEWER_API}/claims/${claimId}/submit-for-approval/${userId}`;
const GET_CHECKER_CLAIMS_URL = () => `${CHECKER_API}/claims`;
const GET_CHECKER_CLAIM_BY_ID_URL = (claimId) => `${CHECKER_API}/claims/${claimId}`;
const ASSIGN_CLAIM_URL = (claimId) => `${CHECKER_API}/claims/${claimId}/assign`;
const APPROVE_CLAIM_URL = (claimId, userId) => `${CHECKER_API}/claims/${claimId}/approve/${userId}`;
const DENY_CLAIM_URL = (claimId, userId) => `${CHECKER_API}/claims/${claimId}/deny/${userId}`;
const FETCH_REVIEWERS_URL = () => `${CHECKER_API}/users?role=reviewer`;
const GET_CLAIM_TYPES_URL = () => `${PUBLIC_API_RESOURCES}/claim-types`;
const GET_CLAIMANT_CLAIM_TYPES_URL = (userId) => `${PUBLIC_API_RESOURCES}/allowed-claim-types/${userId}`;

export const fetchClaimantClaims = createAsyncThunk(
    'claims/fetchClaimantClaims',
    async (_, { rejectWithValue }) => {
        try {
            let userId = localStorage.getItem('userId');
            const response = await axios.get(GET_CLAIMANT_CLAIMS_URL(userId));
            return response.data?.data ?? [];
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to fetch your claims.')); }
    }
);

export const fetchReviewerClaims = createAsyncThunk(
    'claims/fetchReviewerClaims',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_REVIEWER_CLAIMS_URL(localStorage.getItem('userId')));
            return response.data?.data ?? [];
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to fetch assigned claims.')); }
    }
);

export const fetchCheckerClaims = createAsyncThunk(
    'claims/fetchCheckerClaims',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_CHECKER_CLAIMS_URL(), { params: filters });
            return response.data?.data ?? [];
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to fetch claims for checker view.')); }
    }
);

export const fetchClaimById = createAsyncThunk(
    'claims/fetchClaimById',
    async ({ claimId, role }, { rejectWithValue }) => {
        let url;
        switch(role) {
            case 'reviewer': url = GET_REVIEWER_CLAIM_BY_ID_URL(claimId, localStorage.getItem('userId')); break;
            case 'checker': url = GET_CHECKER_CLAIM_BY_ID_URL(claimId); break;
            default: url = GET_CLAIMANT_CLAIM_BY_ID_URL(claimId, localStorage.getItem('userId')); break;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) { return rejectWithValue(handleApiError(error, `Failed to fetch details for claim ${claimId}.`)); }
    }
);

export const submitClaim = createAsyncThunk(
    'claims/submitClaim',
    async (formData, { rejectWithValue }) => {
        try {
            formData.append('user_id', localStorage.getItem('userId'));
            const response = await axios.post(CREATE_CLAIMANT_CLAIM_URL(), formData);
            if (response.status === 201 || response.status === 200) { return response.data?.data ?? response.data; }
            else { return rejectWithValue(`Unexpected status: ${response.status}`); }
        } catch (error) { return rejectWithValue(handleApiError(error, 'Claim submission failed.')); }
    }
);

export const fetchReviewers = createAsyncThunk(
    'claims/fetchReviewers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(FETCH_REVIEWERS_URL());
            return response.data?.data ?? [];
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to fetch reviewers.')); }
    }
);

export const assignClaim = createAsyncThunk(
    'claims/assignClaim',
    async ({ claimId, reviewerId }, { rejectWithValue }) => {
        try {
            const payload = { reviewer_id: reviewerId };
            const response = await axios.patch(ASSIGN_CLAIM_URL(claimId), payload);
            return response.data?.data ?? response.data;
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to assign claim.')); }
    }
);

export const submitForApproval = createAsyncThunk(
    'claims/submitForApproval',
    async ({ claimId, formData }, { rejectWithValue }) => {
        try {
            const response = await axios.post(SUBMIT_FOR_APPROVAL_URL(claimId, localStorage.getItem('userId')), formData);
            return response.data?.data ?? response.data;
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to submit claim for approval.')); }
    }
);

export const approveClaimAction = createAsyncThunk(
    'claims/approveClaim',
    async (claimId, { rejectWithValue }) => {
        try {
            const response = await axios.patch(APPROVE_CLAIM_URL(claimId, localStorage.getItem('userId')), {});
            return response.data?.data ?? response.data;
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to approve claim.')); }
    }
);

export const denyClaimAction = createAsyncThunk(
    'claims/denyClaim',
    async ({ claimId, reason = null }, { rejectWithValue }) => {
        try {
            const payload = reason ? { denial_reason: reason } : {};
            const response = await axios.patch(DENY_CLAIM_URL(claimId, localStorage.getItem('userId')), payload);
            return response.data?.data ?? response.data;
        } catch (error) { return rejectWithValue(handleApiError(error, 'Failed to deny claim.')); }
    }
);

export const fetchClaimTypes = createAsyncThunk(
    'claims/fetchClaimTypes',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_CLAIM_TYPES_URL());
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch claim types.'));
        }
    }
);


export const fetchClaimTypesForClaimant = createAsyncThunk(
    'claims/fetchClaimTypesForClaimant',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(GET_CLAIMANT_CLAIM_TYPES_URL(localStorage.getItem('userId')));
            return response.data?.data ?? [];
        } catch (error) {
            return rejectWithValue(handleApiError(error, 'Failed to fetch claim types.'));
        }
    }
);

const initialState = {
    claims: [], currentClaim: null, reviewers: [],
    claimTypes: [],
    claimTypesStatus: 'idle', claimTypesError: null,
    listStatus: 'idle', listError: null,
    detailStatus: 'idle', detailError: null,
    submitStatus: 'idle', submitError: null,
    assignStatus: 'idle', assignError: null,
    submitApprovalStatus: 'idle', submitApprovalError: null,
    finalActionStatus: 'idle', finalActionError: null,
    fetchReviewersStatus: 'idle', fetchReviewersError: null,
};

const updateOrAddClaimInList = (claimsList, updatedClaim) => {
    if (!updatedClaim || !updatedClaim.id) return claimsList;
    const index = claimsList.findIndex(claim => String(claim.id) === String(updatedClaim.id));
    if (index !== -1) { const newList = [...claimsList]; newList[index] = { ...claimsList[index], ...updatedClaim }; return newList; }
    return claimsList;
};

const claimsSlice = createSlice({
    name: 'claims',
    initialState,
    reducers: {
        clearCurrentClaim: (state) => { state.currentClaim = null; state.detailStatus = 'idle'; state.detailError = null; },
        resetSubmitStatus: (state) => { state.submitStatus = 'idle'; state.submitError = null; },
        resetAssignStatus: (state) => { state.assignStatus = 'idle'; state.assignError = null; },
        resetSubmitApprovalStatus: (state) => { state.submitApprovalStatus = 'idle'; state.submitApprovalError = null; },
        resetFinalActionStatus: (state) => { state.finalActionStatus = 'idle'; state.finalActionError = null; },
        clearListError: (state) => { state.listError = null; state.listStatus = 'idle'; },
        resetClaimTypesStatus: (state) => { state.claimTypesStatus = 'idle'; state.claimTypesError = null; }
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
            .addCase(fetchClaimById.fulfilled, (state, action) => { state.detailStatus = 'succeeded'; state.currentClaim = action.payload.data; })
            .addCase(fetchClaimById.rejected, (state, action) => { state.detailStatus = 'failed'; state.detailError = action.payload; })
            .addCase(submitClaim.pending, (state) => { state.submitStatus = 'loading'; state.submitError = null; })
            .addCase(submitClaim.fulfilled, (state, action) => { state.submitStatus = 'succeeded'; state.claims.push(action.payload); })
            .addCase(submitClaim.rejected, (state, action) => { state.submitStatus = 'failed'; state.submitError = action.payload; })
            .addCase(fetchReviewers.pending, (state) => { state.fetchReviewersStatus = 'loading'; state.fetchReviewersError = null; })
            .addCase(fetchReviewers.fulfilled, (state, action) => { state.fetchReviewersStatus = 'succeeded'; state.reviewers = action.payload; })
            .addCase(fetchReviewers.rejected, (state, action) => { state.fetchReviewersStatus = 'failed'; state.fetchReviewersError = action.payload; })
            .addCase(assignClaim.pending, (state) => { state.assignStatus = 'loading'; state.assignError = null; })
            .addCase(assignClaim.fulfilled, (state, action) => { state.assignStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(assignClaim.rejected, (state, action) => { state.assignStatus = 'failed'; state.assignError = action.payload; })
            .addCase(submitForApproval.pending, (state) => { state.submitApprovalStatus = 'loading'; state.submitApprovalError = null; })
            .addCase(submitForApproval.fulfilled, (state, action) => { state.submitApprovalStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(submitForApproval.rejected, (state, action) => { state.submitApprovalStatus = 'failed'; state.submitApprovalError = action.payload; })
            .addCase(approveClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(approveClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(approveClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; })
            .addCase(denyClaimAction.pending, (state) => { state.finalActionStatus = 'loading'; state.finalActionError = null; })
            .addCase(denyClaimAction.fulfilled, (state, action) => { state.finalActionStatus = 'succeeded'; handleUpdateFulfilled(state, action); })
            .addCase(denyClaimAction.rejected, (state, action) => { state.finalActionStatus = 'failed'; state.finalActionError = action.payload; })
            // Fetch Claim Types
            .addCase(fetchClaimTypes.pending, (state) => { state.claimTypesStatus = 'loading'; state.claimTypesError = null; })
            .addCase(fetchClaimTypes.fulfilled, (state, action) => { state.claimTypesStatus = 'succeeded'; state.claimTypesList = action.payload; })
            .addCase(fetchClaimTypes.rejected, (state, action) => { state.claimTypesStatus = 'failed'; state.claimTypesError = action.payload; })
            .addCase(fetchClaimTypesForClaimant.pending, (state) => {
                state.claimTypesStatus = 'loading';
                state.claimTypesError = null;
                state.claimTypes = [];
            })
            .addCase(fetchClaimTypesForClaimant.fulfilled, (state, action) => {
                state.claimTypesStatus = 'succeeded';
                state.claimTypes = action.payload;
            })
            .addCase(fetchClaimTypesForClaimant.rejected, (state, action) => {
                state.claimTypesStatus = 'failed';
                state.claimTypesError = action.payload;
            });
    },
});

export const {
    clearCurrentClaim, resetSubmitStatus, resetAssignStatus,
    resetSubmitApprovalStatus, resetFinalActionStatus, clearListError,
    resetClaimTypesStatus
} = claimsSlice.actions;
export default claimsSlice.reducer;

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
export const selectFinalActionError = state => state.claims
export const selectClaimTypes = state => state.claims.claimTypes;
export const selectClaimTypesStatus = state => state.claims.claimTypesStatus;
export const selectClaimTypesError = state => state.claims.claimTypesError;
export const selectClaimTypesList = state => state.claims.claimTypesList;