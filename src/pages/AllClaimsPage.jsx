// src/pages/AllClaimsPage.jsx (Or maybe rename to CheckerDashboardPage.jsx for clarity)

import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Spinner, Alert, Table, Button, Badge, Row, Col, Modal, Form } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // Import Link for details navigation
import {
    // --- CORRECTED: Import specific checker actions ---
    fetchCheckerClaims, // Action to get claims for checker view
    fetchReviewers,     // Action to get reviewers for assignment
    assignClaim,        // Action to assign a claim
    approveClaimAction, // Action to approve
    denyClaimAction,    // Action to deny
    // --- Keep Selectors ---
    selectAllClaims,
    selectListStatus,
    selectListError,
    selectReviewers,
    selectFetchReviewersStatus,
    selectFetchReviewersError, // Added for modal error handling
    selectAssignStatus,
    selectAssignError,
    selectFinalActionStatus, // Status for Approve/Deny
    selectFinalActionError,  // Error for Approve/Deny
    // --- Keep Reset Actions ---
    resetAssignStatus,
    resetFinalActionStatus, // Added reset for approve/deny
    clearListError
} from '../store/slices/claimsSlice'; // <-- 'fetchClaims' is NOT imported
import StatusPieChart from '../components/Charts/StatusPieChart';
import TypeBarChart from '../components/Charts/TypeBarChart';

// processClaimsData function remains the same

// Helper for consistent badge rendering
const getStatusBadge = (claimStatus) => {
    let bg = 'secondary'; let text = null;
    switch (claimStatus) {
        case 'Under Review': bg = 'warning'; text = 'dark'; break;
        case 'Pending Approval': bg = 'info'; text = 'dark'; break;
        case 'Approved': bg = 'success'; break;
        case 'Denied': bg = 'danger'; break;
        // case 'Pending': // default secondary
    }
    return <Badge bg={bg} text={text}>{claimStatus || 'Unknown'}</Badge>;
};


const AllClaimsPage = () => {
    const dispatch = useDispatch();
    const claims = useSelector(selectAllClaims); // List potentially filtered by fetchCheckerClaims
    const listStatus = useSelector(selectListStatus);
    const listError = useSelector(selectListError);
    const reviewers = useSelector(selectReviewers);
    const reviewersStatus = useSelector(selectFetchReviewersStatus);
    const reviewersError = useSelector(selectFetchReviewersError); // Get reviewer fetch error
    const assignStatus = useSelector(selectAssignStatus);
    const assignError = useSelector(selectAssignError);
    const finalActionStatus = useSelector(selectFinalActionStatus);
    // const finalActionError = useSelector(selectFinalActionError); // Use this for approve/deny errors if needed

    // Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [claimToAssign, setClaimToAssign] = useState(null);
    const [selectedReviewerId, setSelectedReviewerId] = useState('');
    // State to track which row's action is loading
    const [loadingActionId, setLoadingActionId] = useState(null);


    // Fetch Initial Data
    useEffect(() => {
        if (listStatus === 'idle') {
            dispatch(clearListError());
            // Fetch data relevant for checker (e.g., all pending assignment/approval)
            dispatch(fetchCheckerClaims(/* { status: ['Pending', 'Pending Approval']} */)); // Example filter
        }
        if (reviewersStatus === 'idle') {
            dispatch(fetchReviewers());
        }
    }, [listStatus, reviewersStatus, dispatch]);

    // Reset action statuses on unmount
    useEffect(() => {
        return () => {
            dispatch(resetAssignStatus());
            dispatch(resetFinalActionStatus());
        };
    }, [dispatch]);

    // Modal Handlers
    const handleOpenAssignModal = (claim) => {
        dispatch(resetAssignStatus()); // Clear previous errors
        setClaimToAssign(claim);
        setSelectedReviewerId('');
        setShowAssignModal(true);
    };
    const handleCloseAssignModal = () => {
        setShowAssignModal(false);
        setClaimToAssign(null);
    };
    const handleConfirmAssignment = () => {
        if (!claimToAssign || !selectedReviewerId) return;
        setLoadingActionId(claimToAssign.id); // Set loading for this specific action
        dispatch(assignClaim({ claimId: claimToAssign.id, reviewerId: selectedReviewerId }))
            .unwrap()
            .then(() => { handleCloseAssignModal(); }) // Close modal on success
            .catch(() => { /* Keep modal open on error, error shown via state */ })
            .finally(() => setLoadingActionId(null)); // Clear loading state regardless of outcome
    };

    // Final Action Handlers
    const handleFinalApprove = (claimId) => {
        setLoadingActionId(claimId); // Track loading state
        dispatch(approveClaimAction(claimId))
            .unwrap()
            .then(() => console.log(`Claim ${claimId} approved successfully.`)) // Maybe show toast later
            .catch((err) => console.error(`Approval failed for ${claimId}:`, err)) // Error handled via slice state mostly
            .finally(() => setLoadingActionId(null));
    };

    const handleFinalDeny = (claimId) => {
        // TODO: Implement a modal/prompt to capture denial reason if required
        const reason = prompt("Enter reason for denial (optional):"); // Simple prompt for now
        setLoadingActionId(claimId);
        dispatch(denyClaimAction({ claimId, reason: reason || null }))
            .unwrap()
            .then(() => console.log(`Claim ${claimId} denied successfully.`))
            .catch((err) => console.error(`Denial failed for ${claimId}:`, err))
            .finally(() => setLoadingActionId(null));
    };

    // Data for Charts
    const { statusData, typeData } = useMemo(() => {
        if (listStatus !== 'succeeded') return { statusData: [], typeData: [] };
        // Calculate based on the 'claims' currently loaded (might be filtered list)
        const processClaimsData = (claims) => { /* ... as before ... */ return { statusData, typeData }; };
        return processClaimsData(claims);
    }, [claims, listStatus]);

    // --- Render Logic ---
    let chartContent, tableContent;

    if (listStatus === 'loading') {
        chartContent = <div className="text-center p-3"><Spinner animation="border" /> Loading Charts...</div>;
        tableContent = <div className="text-center p-3"><Spinner animation="border" /> Loading Claims...</div>;
    } else if (listStatus === 'failed') {
        chartContent = <Alert variant="warning" onClose={() => dispatch(clearListError())} dismissible>Chart data unavailable: {listError}</Alert>;
        tableContent = <Alert variant="danger" onClose={() => dispatch(clearListError())} dismissible>Could not load claims: {listError}</Alert>;
    } else if (listStatus === 'succeeded') {
        // Charts (assuming StatusPieChart and TypeBarChart exist)
        chartContent = (
            <Row>
                <Col md={6} className="mb-3"><Card className="h-100 shadow-sm"><Card.Header>Claims by Status</Card.Header><Card.Body><StatusPieChart data={statusData} /></Card.Body></Card></Col>
                <Col md={6} className="mb-3"><Card className="h-100 shadow-sm"><Card.Header>Claims by Type</Card.Header><Card.Body><TypeBarChart data={typeData} /></Card.Body></Card></Col>
            </Row>
        );

        // Table
        tableContent = (
            claims.length === 0 ? <Alert variant="info">No claims matching current filter.</Alert> : (
                <Card className="shadow-sm">
                    <Card.Header><Card.Title as="h4">Claims Management</Card.Title></Card.Header>
                    <Card.Body className="p-0">
                        <Table striped bordered hover responsive size="sm" className="mb-0">
                            <thead><tr><th>ID</th><th>Type</th><th>Claimant</th><th>Submitted</th><th>Status</th><th>Assigned To</th><th>Actions</th></tr></thead>
                            <tbody>
                            {claims.map(claim => (
                                <tr key={claim.id}>
                                    <td>{claim.id}</td>
                                    <td>{claim.claim_type_name || 'N/A'}</td>
                                    <td>{claim.claimant_name || 'N/A'}</td>
                                    <td>{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>{getStatusBadge(claim.status)}</td>
                                    <td>{claim.assigned_reviewer?.name || claim.assigned_reviewer_id || '-'}</td>
                                    <td>
                                        {/* Assign Button */}
                                        {claim.status === 'Pending' && (
                                            <Button variant="outline-info" size="sm" className="me-1 mb-1" onClick={() => handleOpenAssignModal(claim)} disabled={loadingActionId === claim.id || assignStatus === 'loading' || reviewersStatus !== 'succeeded'}>
                                                {(loadingActionId === claim.id && assignStatus === 'loading') ? <Spinner size="sm" animation="border"/> : <><i className="bi bi-person-plus-fill me-1"></i>Assign</>}
                                            </Button>
                                        )}
                                        {/* Approve/Deny Buttons */}
                                        {(claim.status === 'Pending Approval') && ( // Only show for Pending Approval status
                                            <>
                                                <Button variant="outline-success" size="sm" className="me-1 mb-1" onClick={() => handleFinalApprove(claim.id)} disabled={loadingActionId === claim.id || finalActionStatus === 'loading'}>
                                                    {(loadingActionId === claim.id && finalActionStatus === 'loading') ? <Spinner size="sm" /> : <><i className="bi bi-check-circle-fill me-1"></i>Approve</>}
                                                </Button>
                                                <Button variant="outline-danger" size="sm" className="mb-1" onClick={() => handleFinalDeny(claim.id)} disabled={loadingActionId === claim.id || finalActionStatus === 'loading'}>
                                                    {(loadingActionId === claim.id && finalActionStatus === 'loading') ? <Spinner size="sm" /> : <><i className="bi bi-x-octagon-fill me-1"></i>Deny</>}
                                                </Button>
                                            </>
                                        )}
                                        {/* View Details Button */}
                                        <Link to={`/claims/${claim.id}`} className="btn btn-sm btn-outline-secondary ms-1 mb-1" title="View Details">
                                            <i className="bi bi-eye-fill"></i>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )
        );
    } else {
        chartContent = null; // Idle state
        tableContent = <p>Initializing...</p>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <h2 className="mb-4">Checker Dashboard & Claims Management</h2>
            {chartContent}
            <div className="mt-4">{tableContent}</div>

            {/* Assign Claim Modal (Unchanged from previous version) */}
            <Modal show={showAssignModal} onHide={handleCloseAssignModal} centered>
                {/* ... Modal content with Form.Select for reviewers ... */}
                <Modal.Header closeButton><Modal.Title>Assign Claim {claimToAssign?.id}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {assignStatus === 'failed' && <Alert variant="danger" onClose={() => dispatch(resetAssignStatus())} dismissible>Failed to assign: {assignError}</Alert>}
                    {/* Reviewer Fetch Error */}
                    {reviewersStatus === 'failed' && !showAssignModal && <Alert variant="warning">Could not load reviewers list: {reviewersError}</Alert>}
                    <Form>
                        <Form.Group controlId="reviewerSelect">
                            <Form.Label>Select Reviewer</Form.Label>
                            {reviewersStatus === 'loading' && <Spinner size="sm"/>}
                            {reviewersStatus === 'succeeded' && (
                                <Form.Select value={selectedReviewerId} onChange={(e) => setSelectedReviewerId(e.target.value)} disabled={assignStatus === 'loading'} required>
                                    <option value="">-- Select Reviewer --</option>
                                    {reviewers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
                                </Form.Select>
                            )}
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAssignModal} disabled={assignStatus === 'loading'}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirmAssignment} disabled={!selectedReviewerId || assignStatus === 'loading' || reviewersStatus !== 'succeeded'}>
                        {assignStatus === 'loading' ? <Spinner size="sm"/> : 'Confirm'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AllClaimsPage;