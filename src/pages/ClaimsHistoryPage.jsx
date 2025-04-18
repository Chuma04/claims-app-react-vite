// src/pages/ClaimsHistoryPage.jsx
import React, { useEffect } from 'react';
import { Container, Card, Spinner, Alert, Table, Badge } from 'react-bootstrap'; // Added Badge
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    // CORRECTED: Import role-specific thunks
    fetchClaimantClaims,
    fetchCheckerClaims,
    // Keep other needed selectors/actions
    selectAllClaims,
    selectListStatus, // Use list status/error
    selectListError,
    clearListError
} from '../store/slices/claimsSlice'; // <-- 'fetchClaims' is NOT imported
import { selectUserRole } from '../store/slices/authSlice'; // Get user role

// Define Roles constant (can be imported from a shared file)
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };

const ClaimsHistoryPage = () => {
    const dispatch = useDispatch();
    const userRole = useSelector(selectUserRole); // Get the role
    const claims = useSelector(selectAllClaims); // Get the list (will be populated by the correct fetch)
    const listStatus = useSelector(selectListStatus); // Use list status
    const listError = useSelector(selectListError);   // Use list error

    // Fetch claims based on role when component mounts or status changes
    useEffect(() => {
        if (userRole && (listStatus === 'idle')) {
            dispatch(clearListError()); // Clear previous errors
            if (userRole === ROLES.CLAIMANT) {
                console.log("ClaimsHistoryPage: Fetching claims for Claimant");
                dispatch(fetchClaimantClaims());
            } else if (userRole === ROLES.CHECKER) {
                console.log("ClaimsHistoryPage: Fetching claims for Checker");
                dispatch(fetchCheckerClaims(/* Add filters if needed, e.g. fetch only specific statuses */));
            } else {
                // Decide behavior for other roles (e.g., Reviewer shouldn't see this page directly?)
                console.warn("ClaimsHistoryPage: Accessed by unexpected role:", userRole);
                // Could redirect or show an unauthorized message
            }
        }
    }, [userRole, listStatus, dispatch]);

    // --- Helper to Render Status Badge ---
    const renderStatusBadge = (status) => {
        let bg = 'secondary'; let text = null;
        switch (status) {
            case 'Under Review': bg = 'warning'; text='dark'; break;
            case 'Pending Approval': bg = 'info'; text='dark'; break;
            case 'Approved': bg = 'success'; break;
            case 'Denied': bg = 'danger'; break;
            // case 'Pending': // Keep default secondary
        }
        return <Badge bg={bg} text={text}>{status || 'Unknown'}</Badge>;
    };

    // --- Render Logic ---
    let content;
    let pageTitle = "Claims History"; // Default title
    let introText = "Below is a list of claims.";

    if (userRole === ROLES.CLAIMANT) {
        pageTitle = "My Claims History";
        introText = "Below is a list of your submitted claims.";
    } else if (userRole === ROLES.CHECKER) {
        pageTitle = "All Claims History (Checker View)";
        introText = "Below is a list of all claims in the system.";
    }
    // Handle loading state
    if (listStatus === 'loading') {
        content = <div className="text-center p-4"><Spinner animation="border" /><p className="mt-2">Loading claims...</p></div>;
    }
    // Handle error state
    else if (listStatus === 'failed') {
        content = <Alert variant="danger" onClose={() => dispatch(clearListError())} dismissible>Error loading claims: {listError}</Alert>;
    }
    // Handle success state
    else if (listStatus === 'succeeded') {
        content = (
            <>
                <p>{introText}</p>
                {claims.length === 0 ? (
                    <Alert variant="info">No claims found matching the criteria.</Alert>
                ) : (
                    <Table striped bordered hover responsive size="sm">
                        <thead>
                        <tr>
                            <th>Claim ID</th>
                            {userRole === ROLES.CHECKER && <th>Claimant</th>} {/* Show Claimant for Checker */}
                            <th>Type</th>
                            <th>Submitted</th> {/* Assuming created_at */}
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {claims.map(claim => (
                            <tr key={claim.id}>
                                <td>{claim.id}</td>
                                {/* Conditionally render claimant name for Checker */}
                                {userRole === ROLES.CHECKER && <td>{claim.claimant_name || 'N/A'}</td>}
                                <td>{claim.claim_type_name || claim.type || 'N/A'}</td>
                                <td>{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</td>
                                <td>{renderStatusBadge(claim.status)}</td>
                                <td>
                                    {/* Checkers and Claimants both likely view details via a generic route */}
                                    {/* The backend will authorize access */}
                                    <Link to={`/claims/${claim.id}`} className="btn btn-sm btn-outline-primary">
                                        View Details
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                )}
            </>
        );
    }
    // Handle initial idle state
    else {
        content = <p>Initializing...</p>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            {/* Only render card if user role is appropriate */}
            {(userRole === ROLES.CLAIMANT || userRole === ROLES.CHECKER) ? (
                <Card className="mb-3 mb-lg-5 shadow-sm">
                    <Card.Header>
                        <Card.Title as="h2">{pageTitle}</Card.Title>
                    </Card.Header>
                    <Card.Body>
                        {content}
                    </Card.Body>
                </Card>
            ) : (
                // Show message for unauthorized roles accessing this page component
                <Alert variant="warning">You do not have permission to view this page.</Alert>
            )}
        </Container>
    );
};
export default ClaimsHistoryPage;