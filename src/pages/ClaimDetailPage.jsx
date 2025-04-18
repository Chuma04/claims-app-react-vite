// src/pages/ClaimDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Added Link
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchClaimById,           // Fetch action
    approveClaimAction,       // Approve action
    denyClaimAction,          // Deny action
    selectCurrentClaim,       // Selectors for claim data and action status
    selectDetailStatus,
    selectDetailError,
    selectFinalActionStatus,
    selectFinalActionError,
    clearCurrentClaim,        // Reset actions
    resetFinalActionStatus,
} from '../store/slices/claimsSlice';
import { selectUserRole } from '../store/slices/authSlice'; // Using named selector assuming it's exported

// Define Roles constant
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };
const STATUS_PENDING_APPROVAL = 'Pending Approval';

// Define File size limit (if displaying, maybe not validation needed here)
const MAX_FILE_SIZE_MB = 5;

const ClaimDetailPage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // --- Selectors ---
    const claim = useSelector(selectCurrentClaim);
    const detailStatus = useSelector(selectDetailStatus);
    const detailError = useSelector(selectDetailError);
    const finalActionStatus = useSelector(selectFinalActionStatus);
    const finalActionError = useSelector(selectFinalActionError);
    const userRole = useSelector(selectUserRole);
    // Use direct access if named selector 'selectUser' not available:
    const currentUser = useSelector((state) => state.auth.user);

    // --- Local State ---
    const [denialReason, setDenialReason] = useState('');
    const [showActionError, setShowActionError] = useState(false);
    const [showActionSuccess, setShowActionSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const isActionLoading = finalActionStatus === 'loading'; // Loading state for Approve/Deny

    // --- Fetch claim details ---
    useEffect(() => {
        if (claimId) {
            dispatch(fetchClaimById({ claimId, role: userRole }));
        }
        return () => {
            dispatch(clearCurrentClaim());
            dispatch(resetFinalActionStatus());
        };
    }, [claimId, userRole, dispatch]);

    // --- Handle Action Status Alerts ---
    useEffect(() => {
        if (finalActionStatus === 'succeeded') {
            setShowActionSuccess(true);
            setShowActionError(false);
            setSuccessMessage(`Action completed successfully for claim ${claimId}.`);
            const timer = setTimeout(() => setShowActionSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
        if (finalActionStatus === 'failed') {
            setShowActionError(true);
            setShowActionSuccess(false);
        }
    }, [finalActionStatus, claimId]); // Added claimId

    const handleDismissError = () => { setShowActionError(false); dispatch(resetFinalActionStatus()); };
    const handleDismissSuccess = () => { setShowActionSuccess(false); /* Status is already 'succeeded' */};

    // --- Action Handlers (Checker) ---
    const handleApprove = () => {
        if (!claim) return;
        dispatch(resetFinalActionStatus());
        setShowActionError(false);
        dispatch(approveClaimAction(claimId));
    };

    const handleDeny = () => {
        if (!claim) return;
        // Optional: Add client-side validation for reason if mandatory
        dispatch(resetFinalActionStatus());
        setShowActionError(false);
        dispatch(denyClaimAction({ claimId, reason: denialReason.trim() || null }));
    };

    // --- Helper Functions ---
    const renderStatusBadge = (status) => {
        let bg = 'secondary'; let text = null;
        switch (status) {
            case 'Under Review': bg = 'warning'; text='dark'; break;
            case 'Pending Approval': bg = 'info'; text='dark'; break;
            case 'Approved': bg = 'success'; break;
            case 'Denied': bg = 'danger'; break;
        }
        return <Badge bg={bg} text={text ? text : undefined}>{status || 'Unknown'}</Badge>;
    };

    const formatDate = (dateString) => dateString ? new Date(dateString.replace(' ', 'T')).toLocaleString() : 'N/A';
    const formatShortDate = (dateString) => dateString ? new Date(dateString.replace(' ', 'T')).toLocaleDateString() : 'N/A';


    // --- Main Render Logic ---
    let content;

    if (detailStatus === 'loading') {
        content = <div className="text-center p-5"><Spinner animation="border" /> Loading claim details...</div>;
    } else if (detailStatus === 'failed') {
        content = <Alert variant="danger">Error loading claim details: {detailError}</Alert>;
    } else if (detailStatus === 'succeeded' && claim) {
        // Frontend Authorization Check (essential)
        let canView = false;
        if (userRole === ROLES.CHECKER) {
            canView = true; // Checkers can view all details fetched
        } else if (userRole === ROLES.MAKER && String(claim.assigned_reviewer_id) === String(currentUser?.id)) {
            canView = true; // Reviewer can view if assigned
        } else if (userRole === ROLES.CLAIMANT && String(claim.claimant_user_id) === String(currentUser?.id)) {
            canView = true; // Claimant can view their own
        }

        // if (!canView) {
        //     content = <Alert variant="danger">You do not have permission to view this claim's details.</Alert>;
        // } else {
            // User is authorized to view, proceed with rendering
            const claimantDocuments = claim.documents?.filter(doc => !doc.is_review_document) || [];
            const reviewerDocuments = claim.documents?.filter(doc => doc.is_review_document) || [];
            const canCheckerAct = userRole === ROLES.CHECKER && claim.status === STATUS_PENDING_APPROVAL;

            content = (
                <Row>
                    {/* Column 1: Claim Info + Documents */}
                    <Col lg={userRole === ROLES.CHECKER ? 8 : 12} className="mb-3 mb-lg-0"> {/* Take full width if not Checker */}
                        {/* Card with Core Info */}
                        <Card className="shadow-sm mb-3">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <Card.Title as="h4" className="mb-0">Claim {claim.id} Details</Card.Title>
                                {renderStatusBadge(claim.status)}
                            </Card.Header>
                            <Card.Body>
                                <h5>Core Information</h5>
                                <Row>
                                    <Col sm={6}><p><strong>Claim Type:</strong> {claim.claim_type_name || 'N/A'}</p></Col>
                                    <Col sm={6}><p><strong>Incident Date:</strong> {formatShortDate(claim.incident_date)}</p></Col>
                                    <Col sm={6}><p><strong>Submitted:</strong> {formatDate(claim.created_at)}</p></Col>
                                    <Col sm={6}><p><strong>Last Updated:</strong> {formatDate(claim.updated_at)}</p></Col>
                                    <Col sm={6}><p><strong>Claimant:</strong> {claim.claimant_name || `User ID: ${claim.claimant_user_id}`}</p></Col>
                                    <Col sm={6}><p><strong>Claim Amount:</strong> {claim.settlement_amount ? `$${parseFloat(claim.settlement_amount).toFixed(2)}` : 'N/A'}</p></Col> {/* Added Amount */}
                                </Row>
                                <p className="mb-1"><strong>Claimant Description:</strong></p>
                                <Card body className="bg-light p-2 mb-3"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.description || 'N/A'}</small></Card>


                                {(claim.assigned_reviewer_id || claim.reviewer_notes || claim.submitted_for_approval_at) && (
                                    <> <hr /> <h5>Reviewer Information</h5>
                                        <Row>
                                            <Col sm={6}><p><strong>Assigned Reviewer:</strong> {claim.reviewer_name || (claim.assigned_reviewer_id ? `User ID: ${claim.assigned_reviewer_id}` : 'N/A')}</p></Col>
                                            <Col sm={6}><p><strong>Submitted for Approval:</strong> {formatDate(claim.submitted_for_approval_at)}</p></Col>
                                        </Row>
                                        <p className="mb-1"><strong>Reviewer Notes:</strong></p>
                                        <Card body className="bg-light p-2"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.reviewer_notes || 'N/A'}</small></Card>
                                    </>
                                )}

                                {(claim.final_action_user_id || claim.final_action_at) && (
                                    <> <hr /> <h5>Final Action</h5>
                                        <Row>
                                            <Col sm={6}><p><strong>Action By:</strong> {claim.checker_name || (claim.final_action_user_id ? `User ID: ${claim.final_action_user_id}` : 'N/A')}</p></Col>
                                            <Col sm={6}><p><strong>Action Date:</strong> {formatDate(claim.final_action_at)}</p></Col>
                                        </Row>
                                        {claim.status === 'Denied' && ( <p><strong>Denial Reason:</strong> {claim.denial_reason || 'No reason provided.'}</p> )}
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                        {/* Card with Documents */}
                        <Card className="shadow-sm">
                            <Card.Header><Card.Title as="h5">Associated Documents</Card.Title></Card.Header>
                            <Card.Body>
                                <h6>Claimant Documents</h6>
                                {claimantDocuments.length > 0 ? (
                                    <ListGroup variant="flush">
                                        {claimantDocuments.map(doc => (
                                            <ListGroup.Item key={doc.id} className="d-flex justify-content-between align-items-center">
                                                {/* TODO: Make this a real download link */}
                                                <span title={doc.original_filename}><i className="bi bi-file-earmark-text me-2"></i>{doc.original_filename}</span>
                                                <Badge bg="secondary" pill>{(doc.file_size / 1024).toFixed(1)} KB</Badge>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                ) : <p className="text-muted small">None.</p>}
                                <hr />
                                <h6>Reviewer Documents</h6>
                                {reviewerDocuments.length > 0 ? (
                                    <ListGroup variant="flush">
                                        {reviewerDocuments.map(doc => (
                                            <ListGroup.Item key={doc.id} className="d-flex justify-content-between align-items-center">
                                                {/* TODO: Make this a real download link */}
                                                <span title={doc.original_filename}><i className="bi bi-file-earmark-check me-2"></i>{doc.original_filename}</span>
                                                <Badge bg="info" text="dark" pill>{(doc.file_size / 1024).toFixed(1)} KB</Badge>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                ) : <p className="text-muted small">None.</p>}
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Column 2: Actions (Only for Checker in correct status) */}
                    {userRole === ROLES.CHECKER && (
                        <Col lg={4}>
                            <Card className="shadow-sm">
                                <Card.Header><Card.Title as="h5">Checker Actions</Card.Title></Card.Header>
                                <Card.Body>
                                    {/* Action Alerts */}
                                    {showActionSuccess && <Alert variant="success" onClose={handleDismissSuccess} dismissible>{successMessage}</Alert>}
                                    {showActionError && finalActionError && <Alert variant="danger" onClose={handleDismissError} dismissible>Action Failed: {finalActionError}</Alert>}

                                    {/* Action Buttons/Form */}
                                    {canCheckerAct ? (
                                        <>
                                            <Form.Group className="mb-3" controlId="denialReason">
                                                <Form.Label>Denial Reason (Required if denying)</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    placeholder="Enter reason if denying..."
                                                    value={denialReason}
                                                    onChange={(e) => setDenialReason(e.target.value)}
                                                    disabled={isActionLoading}
                                                />
                                            </Form.Group>

                                            <div className="d-grid gap-2">
                                                <Button variant="success" onClick={handleApprove} disabled={isActionLoading}>
                                                    {isActionLoading ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check-lg me-1"></i>Approve Claim</>}
                                                </Button>
                                                <Button variant="danger" onClick={handleDeny} disabled={isActionLoading}>
                                                    {isActionLoading ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-x-lg me-1"></i>Deny Claim</>}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <Alert variant={claim.status === 'Approved' || claim.status === 'Denied' ? 'secondary' : 'info'} className="text-center">
                                            {claim.status === 'Approved' || claim.status === 'Denied'
                                                ? `Claim already ${claim.status.toLowerCase()}.`
                                                : `No actions available. Claim status: ${claim.status}.`
                                            }
                                        </Alert>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row>
            );
        // } // End if (canView)
    } else { // Fallback if not loading, not success, or no claim object
        content = <Alert variant="warning">Claim details could not be loaded or the claim was not found.</Alert>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3 d-flex justify-content-start">
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
            </div>
            {content}
        </Container>
    );
};

export default ClaimDetailPage;