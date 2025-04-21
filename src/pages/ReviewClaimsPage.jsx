// src/pages/ReviewClaimsPage.jsx
import React, { useEffect } from 'react';
import { Container, Card, Spinner, Alert, Table, Button, Badge } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import {
    fetchReviewerClaims, // Use the specific fetch thunk
    selectAllClaims,
    selectListStatus, // Use list status/error selectors
    selectListError,
} from '../store/slices/claimsSlice';
import { selectUserRole } from '../store/slices/authSlice'; // Renamed selector if needed, or keep state.auth.user

const ReviewClaimsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate(); // Hook for navigation

    const assignedClaims = useSelector(selectAllClaims);
    const listStatus = useSelector(selectListStatus); // Use the dedicated list status
    const listError = useSelector(selectListError);   // Use the dedicated list error
    const currentUser = useSelector((state) => state.auth.user);


    useEffect(() => {
        // Fetch claims specifically for the reviewer on mount/status change
        if (listStatus === 'idle') {
            dispatch(fetchReviewerClaims());
        }
    }, [listStatus, dispatch]);

    const handleViewDetails = (claimId) => {
        // Navigate to the dedicated review page for this claim
        navigate(`/reviewer/claims/${claimId}/review`); // Use the new route
    };

    // --- Render Logic ---
    let content;
    if (listStatus === 'loading') {
        content = <div className="text-center p-3"><Spinner animation="border" /> Loading assigned claims...</div>;
    } else if (listStatus === 'failed') {
        content = <Alert variant="danger">Could not load claims: {listError}</Alert>;
    } else if (listStatus === 'succeeded') {
        // Optional: Frontend filter (Backend should ideally do this based on assigned_reviewer_id and status)
        // Adjust filter as needed, e.g., only show 'Under Review' or 'Pending' if assigned but not yet actioned
        const claimsToShow = assignedClaims;
        const pendingActionClaims = assignedClaims.filter(c => ['Under Review', 'Pending'].includes(c.status));


        content = (
            claimsToShow.length === 0 ? <Alert variant="warning">No claims assigned to you</Alert> : (
                <Table striped bordered hover responsive size="sm">
                    <thead><tr><th>ID</th><th>Type</th><th>Submitted</th><th>Status</th><th>Claimant</th><th>Actions</th></tr></thead>
                    <tbody>
                    {claimsToShow.map(claim => (
                        <tr key={claim.id}>
                            <td>{claim.id}</td>
                            <td>{claim.claim_type_name || 'N/A'}</td>
                            {/* Adjust date field based on your data: created_at or incident_date? */}
                            <td>{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <Badge bg={claim.status === 'Under Review' ? 'warning' : 'secondary'} text={claim.status === 'Under Review' ? 'dark' : null}>
                                    {claim.status}
                                </Badge>
                            </td>
                            <td>{claim.claimant_name || 'N/A'}</td>
                            <td>
                                {/* View Details Button navigates */}
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="mb-1" // Only one button now in the list view
                                    onClick={() => handleViewDetails(claim.id)}
                                >
                                    View Details & Review
                                </Button>
                                {/* Submit for Approval button MOVED to detail page */}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )
        );
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <Card className="mb-3 mb-lg-5 shadow-sm">
                <Card.Header><Card.Title as="h2">Claims Assigned for Your Review</Card.Title></Card.Header>
                <Card.Body>{content}</Card.Body>
            </Card>
            {/* Toasts are removed as the action happens on detail page */}
        </Container>
    );
};

export default ReviewClaimsPage;