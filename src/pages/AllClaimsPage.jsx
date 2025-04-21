// src/pages/AllClaimsPage.jsx (Or CheckerDashboardPage.jsx)

import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Spinner, Alert, Table, Button, Badge, Row, Col, Modal, Form } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom'; // Added Link, useNavigate
import {
    // Import relevant thunks and selectors for Checker
    fetchCheckerClaims,
    fetchReviewers,
    assignClaim,
    approveClaimAction,
    denyClaimAction,
    selectAllClaims,
    selectListStatus,
    selectListError,
    selectReviewers,
    selectFetchReviewersStatus,
    selectFetchReviewersError,
    selectAssignStatus,
    selectAssignError,
    selectFinalActionStatus,
    selectFinalActionError,
    // Import reset actions
    resetAssignStatus,
    resetFinalActionStatus,
    clearListError
} from '../store/slices/claimsSlice';
import StatusPieChart from '../components/Charts/StatusPieChart';
import TypeBarChart from '../components/Charts/TypeBarChart';

// --- Helper Function: Process Claims Data for Charts ---
// Define OUTSIDE the component or ensure correct return if inside useMemo
const processClaimsData = (claims) => {
    if (!claims || claims.length === 0) {
        return { statusData: [], typeData: [] };
    }
    const statusCounts = claims.reduce((acc, claim) => {
        const status = claim.status || 'Unknown'; // Handle potential null status
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const typeCounts = claims.reduce((acc, claim) => {
        // Use joined type name if available, fallback to original type, then 'Unknown'
        const typeName = claim.claim_type_name || claim.type || 'Unknown Type';
        acc[typeName] = (acc[typeName] || 0) + 1;
        return acc;
    }, {});

    // Convert counts to array format required by Recharts
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

    return { statusData, typeData }; // Return the processed data
};

// --- Helper Function: Render Status Badge ---
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

// --- Main Component ---
const AllClaimsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate(); // For View Details navigation

    // Selectors
    const claims = useSelector(selectAllClaims);
    const listStatus = useSelector(selectListStatus);
    const listError = useSelector(selectListError);
    const reviewers = useSelector(selectReviewers);
    const reviewersStatus = useSelector(selectFetchReviewersStatus);
    const reviewersError = useSelector(selectFetchReviewersError);
    const assignStatus = useSelector(selectAssignStatus);
    const assignError = useSelector(selectAssignError);
    const finalActionStatus = useSelector(selectFinalActionStatus);
    const finalActionError = useSelector(selectFinalActionError); // Use this for approve/deny error display

    // Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [claimToAssign, setClaimToAssign] = useState(null);
    const [selectedReviewerId, setSelectedReviewerId] = useState('');
    // State to track individual row actions
    const [loadingActionId, setLoadingActionId] = useState(null); // For Assign, Approve, Deny

    // State for Denial Reason Modal/Input
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [claimToDeny, setClaimToDeny] = useState(null);
    const [denialReason, setDenialReason] = useState('');


    // Fetch Initial Data for Checker
    useEffect(() => {
        // Fetch checker-relevant claims if list is idle or failed
        if (listStatus === 'idle' || listStatus === 'failed') {
            dispatch(clearListError());
            console.log("AllClaimsPage: Fetching checker claims.");
            // Fetch claims relevant for checker (e.g., Pending, Pending Approval, or all)
            dispatch(fetchCheckerClaims(/* { status: ['Pending', 'Pending Approval'] } */));
        }
        // Fetch reviewers if needed for the assignment dropdown
        if (reviewersStatus === 'idle') {
            console.log("AllClaimsPage: Fetching reviewers.");
            dispatch(fetchReviewers());
        }
    }, [listStatus, reviewersStatus, dispatch]); // Run when these statuses change

    // Reset action statuses on unmount
    useEffect(() => {
        return () => {
            dispatch(resetAssignStatus());
            dispatch(resetFinalActionStatus());
        };
    }, [dispatch]);


    // --- Modal Handlers ---
    const handleOpenAssignModal = (claim) => {
        dispatch(resetAssignStatus());
        setClaimToAssign(claim);
        setSelectedReviewerId('');
        setShowAssignModal(true);
    };
    const handleCloseAssignModal = () => setShowAssignModal(false);

    const handleConfirmAssignment = () => {
        if (!claimToAssign || !selectedReviewerId) return;
        setLoadingActionId(claimToAssign.id);
        dispatch(assignClaim({ claimId: claimToAssign.id, reviewerId: selectedReviewerId }))
            .unwrap()
            .then(() => { handleCloseAssignModal(); }) // Close only on success
            .catch(() => { console.error("Assign failed, keeping modal open."); }) // Log error, keep modal
            .finally(() => setLoadingActionId(null));
    };

    const handleOpenDenyModal = (claim) => {
        dispatch(resetFinalActionStatus()); // Reset status for this action
        setClaimToDeny(claim);
        setDenialReason(''); // Clear previous reason
        setShowDenyModal(true);
    };
    const handleCloseDenyModal = () => setShowDenyModal(false);


    // --- Final Action Handlers ---
    const handleFinalApprove = (claimId) => {
        if (loadingActionId) return; // Prevent double-clicks
        setLoadingActionId(claimId);
        dispatch(resetFinalActionStatus()); // Reset before action
        dispatch(approveClaimAction(claimId))
            .unwrap()
            .then(() => console.log(`Claim ${claimId} approved successfully.`)) // TODO: Show Success Toast/Alert
            .catch((err) => console.error(`Approval failed for ${claimId}:`, err)) // Error shown via state potentially
            .finally(() => setLoadingActionId(null));
    };

    const handleConfirmDeny = () => {
        if (!claimToDeny) return;
        // Optional: Validate reason locally if required
        // if (!denialReason.trim()) { alert("Reason is required"); return; }
        setLoadingActionId(claimToDeny.id); // Set loading state
        dispatch(resetFinalActionStatus()); // Reset before action
        dispatch(denyClaimAction({ claimId: claimToDeny.id, reason: denialReason.trim() || null }))
            .unwrap()
            .then(() => {
                console.log(`Claim ${claimToDeny.id} denied successfully.`);
                handleCloseDenyModal(); // Close modal on success
            })
            .catch((err) => {
                console.error(`Denial failed for ${claimToDeny.id}:`, err);
                // Keep modal open, error is selected from state and shown in modal/alert
            })
            .finally(() => setLoadingActionId(null)); // Clear loading state
    };

    // --- Data for Charts (Memoized) ---
    const { statusData, typeData } = useMemo(() => {
        // Calls the helper function defined outside the component
        return processClaimsData(claims);
    }, [claims]); // Recalculate only when claims data changes


    // --- Render Logic ---
    let chartContent = null;
    let tableContent = null;

    // Display overall loading/error for the page content
    if (listStatus === 'loading') {
        tableContent = <div className="text-center p-5"><Spinner animation="border" /> Loading Claims Data...</div>;
    } else if (listStatus === 'failed') {
        tableContent = <Alert variant="danger" onClose={() => dispatch(clearListError())} dismissible>Could not load claims: {listError}</Alert>;
    } else if (listStatus === 'succeeded') {
        // Render Charts (only if data loaded successfully)
        chartContent = (
            <Row>
                <Col md={6} className="mb-3">
                    <Card className="h-100 shadow-sm">
                        <Card.Header>Claims by Status</Card.Header>
                        <Card.Body><StatusPieChart data={statusData} /></Card.Body>
                    </Card>
                </Col>
                <Col md={6} className="mb-3">
                    <Card className="h-100 shadow-sm">
                        <Card.Header>Claims by Type</Card.Header>
                        <Card.Body><TypeBarChart data={typeData} /></Card.Body>
                    </Card>
                </Col>
            </Row>
        );

        // Render Table
        tableContent = (
            claims.length === 0 ? <Alert variant="info">No claims matching current criteria.</Alert> : (
                <Card className="shadow-sm">
                    <Card.Header><Card.Title as="h4">Claims Management</Card.Title></Card.Header>
                    <Card.Body className="p-0">
                        <Table striped bordered hover responsive size="sm" className="mb-0">
                            <thead>
                            <tr>
                                <th>ID</th><th>Type</th><th>Claimant</th><th>Submitted</th><th>Status</th><th>Assigned To</th><th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {claims.map(claim => {
                                const isAssigning = loadingActionId === claim.id && assignStatus === 'loading';
                                const isFinalActioning = loadingActionId === claim.id && finalActionStatus === 'loading';
                                return (
                                    <tr key={claim.id}>
                                        <td>{claim.id}</td>
                                        <td>{claim.claim_type_name || 'N/A'}</td>
                                        <td>{claim.claimant_name || 'N/A'}</td>
                                        <td>{claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}</td>
                                        <td>{getStatusBadge(claim.status)}</td>
                                        <td>{claim.reviewer_name || claim.assigned_reviewer_id || '-'}</td>
                                        <td>
                                            {/* Assign Button */}
                                            {claim.status === 'Pending' && (
                                                <Button variant="outline-info" size="sm" className="me-1 mb-1" onClick={() => handleOpenAssignModal(claim)} disabled={isAssigning || reviewersStatus !== 'succeeded'}>
                                                    {isAssigning ? <Spinner size="sm" animation="border"/> : <><i className="bi bi-person-plus-fill me-1"></i>Assign</>}
                                                </Button>
                                            )}
                                            {/* Approve/Deny Buttons */}
                                            {(claim.status === 'Pending Approval') && (
                                                <>
                                                    <Button variant="outline-success" size="sm" className="me-1 mb-1" onClick={() => handleFinalApprove(claim.id)} disabled={isFinalActioning}>
                                                        {isFinalActioning ? <Spinner size="sm" /> : <><i className="bi bi-check-circle-fill me-1"></i>Approve</>}
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" className="mb-1" onClick={() => handleOpenDenyModal(claim)} disabled={isFinalActioning}>
                                                        {isFinalActioning ? <Spinner size="sm" /> : <><i className="bi bi-x-octagon-fill me-1"></i>Deny</>}
                                                    </Button>
                                                </>
                                            )}
                                            {/* View Details Button */}
                                            <Link to={`/claims/${claim.id}`} className="btn btn-sm btn-outline-secondary ms-1 mb-1" title="View Details">
                                                <i className="bi bi-eye-fill"></i>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )
        );
    } else { // Idle state
        tableContent = <div className="text-center p-4">Initializing...</div>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <h2 className="mb-4">Checker Dashboard & Claims Management</h2>
            {chartContent}
            <div className="mt-4">{tableContent}</div>

            {/* Assign Claim Modal */}
            <Modal show={showAssignModal} onHide={handleCloseAssignModal} centered>
                <Modal.Header closeButton><Modal.Title>Assign Claim {claimToAssign?.id}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {/* Show assign error within modal */}
                    {assignStatus === 'failed' && <Alert variant="danger" onClose={() => dispatch(resetAssignStatus())} dismissible>Failed to assign: {assignError}</Alert>}
                    <Form>
                        <Form.Group controlId="reviewerSelect">
                            <Form.Label>Select Reviewer</Form.Label>
                            {reviewersStatus === 'loading' && <Spinner size="sm"/>}
                            {reviewersStatus === 'failed' && <Alert variant="warning" size="sm">Error loading reviewers: {reviewersError}</Alert>}
                            {reviewersStatus === 'succeeded' && (
                                <Form.Select value={selectedReviewerId} onChange={(e) => setSelectedReviewerId(e.target.value)} disabled={assignStatus === 'loading'} required>
                                    <option value="">-- Select Reviewer --</option>
                                    {reviewers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email || r.id})</option>)} {/* Show email or ID */}
                                </Form.Select>
                            )}
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAssignModal} disabled={assignStatus === 'loading'}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirmAssignment} disabled={!selectedReviewerId || assignStatus === 'loading' || reviewersStatus !== 'succeeded'}>
                        {assignStatus === 'loading' ? <Spinner size="sm"/> : 'Confirm Assignment'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Deny Claim Modal */}
            <Modal show={showDenyModal} onHide={handleCloseDenyModal} centered>
                <Modal.Header closeButton><Modal.Title>Deny Claim {claimToDeny?.id}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {/* Show final action error within modal */}
                    {finalActionStatus === 'failed' && <Alert variant="danger" onClose={() => dispatch(resetFinalActionStatus())} dismissible>Failed to deny: {finalActionError}</Alert>}
                    <Form>
                        <Form.Group controlId="denialReasonInput">
                            <Form.Label>Reason for Denial (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={denialReason}
                                onChange={(e) => setDenialReason(e.target.value)}
                                disabled={finalActionStatus === 'loading'}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDenyModal} disabled={finalActionStatus === 'loading'}>Cancel</Button>
                    <Button variant="danger" onClick={handleConfirmDeny} disabled={finalActionStatus === 'loading'}>
                        {finalActionStatus === 'loading' ? <Spinner size="sm"/> : 'Confirm Denial'}
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    );
};

export default AllClaimsPage;