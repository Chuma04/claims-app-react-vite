// src/pages/ClaimDetailPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup, Badge, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios'; // Import axios for the download request
import {
    fetchClaimById,
    approveClaimAction,
    denyClaimAction,
    selectCurrentClaim,
    selectDetailStatus,
    selectDetailError,
    selectFinalActionStatus,
    selectFinalActionError,
    clearCurrentClaim,
    resetFinalActionStatus,
} from '../store/slices/claimsSlice';
import { selectUserRole } from '../store/slices/authSlice';
// --- Import a CSS file for custom styles ---

// Define Roles constant
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };
const STATUS_PENDING_APPROVAL = 'Pending Approval';

// Define API base URL (Configure properly via .env)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// --- Helper Functions --- (Placed outside component for clarity)
const renderStatusBadge = (status) => {
    let bg = 'secondary'; let text = null;
    switch (status) {
        case 'Under Review': bg = 'warning'; text = 'dark'; break;
        case 'Pending Approval': bg = 'info'; text = 'dark'; break;
        case 'Approved': bg = 'success'; break;
        case 'Denied': bg = 'danger'; break;
        case 'Pending': // Keep secondary default
            break;
    }
    return <Badge bg={bg} text={text ? text : undefined}>{status || 'Unknown'}</Badge>;
};

const formatDate = (dateString) => dateString ? new Date(dateString.replace(' ', 'T')).toLocaleString() : 'N/A';
const formatShortDate = (dateString) => dateString ? new Date(dateString.replace(' ', 'T')).toLocaleDateString() : 'N/A';
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes < 1) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, index)).toFixed(1)) + ' ' + sizes[index];
};

// --- Main Component ---
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
    const currentUser = useSelector((state) => state.auth.user);
    const authToken = useSelector((state) => state.auth.token);

    // --- Local State ---
    const [denialReason, setDenialReason] = useState('');
    const [showActionError, setShowActionError] = useState(false);
    const [showActionSuccess, setShowActionSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const isActionLoading = finalActionStatus === 'loading';
    const [showViewModal, setShowViewModal] = useState(false); // <-- State controlling modal visibility
    const [viewDocUrl, setViewDocUrl] = useState('');
    const [viewDocType, setViewDocType] = useState('');
    const [viewDocName, setViewDocName] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');

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
            setShowActionSuccess(true); setShowActionError(false);
            setSuccessMessage(`Action completed successfully for claim ${claimId}. Status updated.`);
            const timer = setTimeout(() => setShowActionSuccess(false), 6000);
            return () => clearTimeout(timer);
        }
        if (finalActionStatus === 'failed') {
            setShowActionError(true); setShowActionSuccess(false);
        }
    }, [finalActionStatus, claimId]);

    const handleDismissError = () => { setShowActionError(false); dispatch(resetFinalActionStatus()); };
    const handleDismissSuccess = () => setShowActionSuccess(false);

    // --- Action Handlers (Checker) ---
    const handleApprove = () => {
        if (!claim || isActionLoading) return;
        dispatch(resetFinalActionStatus()); setShowActionError(false);
        dispatch(approveClaimAction(claimId));
    };
    const handleDeny = () => {
        if (!claim || isActionLoading) return;
        if (userRole === ROLES.CHECKER && !denialReason.trim()) {
            alert("Denial reason is required."); return;
        }
        dispatch(resetFinalActionStatus()); setShowActionError(false);
        dispatch(denyClaimAction({ claimId, reason: denialReason.trim() }));
    };

    // --- Document Action Handlers ---
    const handleViewDocument = (doc) => {
        if (!doc || !doc.stored_filename) return;
        const url = `${API_BASE_URL}/documents/download/${encodeURIComponent(doc.stored_filename)}`;
        setViewDocUrl(url);
        setViewDocType(doc.mime_type || '');
        setViewDocName(doc.original_filename || 'Document');
        setShowViewModal(true); // <-- Set modal state to true
    };
    const handleCloseViewModal = () => setShowViewModal(false); // <-- Set modal state to false
    const handleDownloadDocument = async (doc) => {
        if (!doc || !doc.stored_filename || isDownloading) return;
        setIsDownloading(true); setDownloadError('');
        const downloadUrl = `${API_BASE_URL}/documents/download/${encodeURIComponent(doc.stored_filename)}`;
        const originalFilename = doc.original_filename || 'download';
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'blob',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': '*/*' }
            });
            if (!(response.data instanceof Blob)) { throw new Error('Invalid file data received.'); }
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl; link.setAttribute('download', originalFilename);
            document.body.appendChild(link); link.click();
            link.parentNode.removeChild(link); window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download Error:', error);
            let errMsg = 'Could not download the file.';
            if (error.response) {
                if (error.response.status === 404) errMsg = 'File not found on server.';
                else if (error.response.status === 403) errMsg = 'Permission denied to download file.';
                else errMsg = error.response.data?.message || errMsg;
            } else if (error.request) errMsg = 'No response from server for download.';
            else errMsg = error.message;
            setDownloadError(errMsg);
        } finally {
            setIsDownloading(false);
        }
    };

    // --- Memoized Document Lists ---
    const { claimantDocuments, reviewerDocuments } = useMemo(() => {
        const docs = claim?.documents || [];
        return {
            claimantDocuments: docs.filter(doc => !Number(doc.is_review_document)),
            reviewerDocuments: docs.filter(doc => Number(doc.is_review_document))
        };
    }, [claim]);

    // --- Main Render Logic ---
    let content;

    if (detailStatus === 'loading') {
        content = <div className="text-center p-5"><Spinner animation="border" /> Loading claim details...</div>;
    } else if (detailStatus === 'failed') {
        content = <Alert variant="danger">Error loading claim details: {detailError}</Alert>;
    } else if (detailStatus === 'succeeded' && claim) {
        // --- Frontend Authorization Check ---
        let canView = false;
        if (userRole === ROLES.CHECKER) canView = true;
        else if (userRole === ROLES.MAKER && String(claim.assigned_reviewer_id) === String(currentUser?.id)) canView = true;
        else if (userRole === ROLES.CLAIMANT && String(claim.claimant_user_id) === String(currentUser?.id)) canView = true;

        if (!canView) {
            content = <Alert variant="danger">You do not have permission to view this claim's details.</Alert>;
        } else {
            // --- User Can View, Proceed with Rendering ---
            const canCheckerAct = userRole === ROLES.CHECKER && claim.status === STATUS_PENDING_APPROVAL;

            content = (
                <Row>
                    {/* Column 1: Claim Info + Documents */}
                    <Col lg={userRole === ROLES.CHECKER ? 8 : 12} className="mb-3 mb-lg-0">
                        {/* Card: Core Info */}
                        <Card className="shadow-sm mb-3">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <Card.Title as="h4" className="mb-0">Claim {claim.id} Details</Card.Title>
                                {renderStatusBadge(claim.status)}
                            </Card.Header>
                            <Card.Body>
                                <h5>Core Information</h5>
                                <Row className="mb-2 fs-sm">
                                    <Col md={6}><p className="mb-1"><strong>Claim Type:</strong> {claim.claim_type_name || 'N/A'}</p></Col>
                                    <Col md={6}><p className="mb-1"><strong>Incident Date:</strong> {formatShortDate(claim.incident_date)}</p></Col>
                                    <Col md={6}><p className="mb-1"><strong>Submitted:</strong> {formatDate(claim.created_at)}</p></Col>
                                    <Col md={6}><p className="mb-1"><strong>Last Updated:</strong> {formatDate(claim.updated_at)}</p></Col>
                                    <Col md={6}><p className="mb-1"><strong>Claimant:</strong> {claim.claimant_name || `User ID: ${claim.claimant_user_id}`}</p></Col>
                                    {claim.settlement_amount != null && <Col md={6}><p className="mb-1"><strong>Settlement Amount:</strong> {`$${parseFloat(claim.settlement_amount).toFixed(2)}`}</p></Col>}
                                </Row>
                                <p className="mb-1 mt-2"><strong>Claimant Description:</strong></p>
                                <Card body className="bg-light p-2 mb-0"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.description || '(No description)'}</small></Card>

                                {/* Reviewer Info Section */}
                                {(claim.assigned_reviewer_id || claim.reviewer_notes || claim.submitted_for_approval_at) && (
                                    <> <hr /> <h5>Reviewer Information</h5>
                                        <Row className="mb-2 fs-sm">
                                            <Col md={6}><p className="mb-1"><strong>Assigned Reviewer:</strong> {claim.reviewer_name || (claim.assigned_reviewer_id ? `User ID: ${claim.assigned_reviewer_id}` : 'N/A')}</p></Col>
                                            <Col md={6}><p className="mb-1"><strong>Submitted for Approval:</strong> {formatDate(claim.submitted_for_approval_at)}</p></Col>
                                        </Row>
                                        <p className="mb-1"><strong>Reviewer Notes:</strong></p>
                                        <Card body className="bg-light p-2"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.reviewer_notes || '(No notes provided)'}</small></Card>
                                    </>
                                )}

                                {/* Final Action Info Section */}
                                {(claim.final_action_user_id || claim.final_action_at) && (
                                    <> <hr /> <h5>Final Action</h5>
                                        <Row className="mb-2 fs-sm">
                                            <Col md={6}><p className="mb-1"><strong>Action By:</strong> {claim.checker_name || (claim.final_action_user_id ? `User ID: ${claim.final_action_user_id}` : 'N/A')}</p></Col>
                                            <Col md={6}><p className="mb-1"><strong>Action Date:</strong> {formatDate(claim.final_action_at)}</p></Col>
                                        </Row>
                                        {claim.status === 'Denied' && (<p className="mb-1"><strong>Denial Reason:</strong> {claim.denial_reason || '(No reason provided)'}</p>)}
                                        {claim.status === 'Approved' && claim.settlement_date && (<p className="mb-1"><strong>Settlement Date:</strong> {formatShortDate(claim.settlement_date)}</p>)}
                                    </>
                                )}
                            </Card.Body>
                        </Card>

                        {/* --- Card with Documents --- */}
                        <Card className="shadow-sm">
                            <Card.Header><Card.Title as="h5">Associated Documents</Card.Title></Card.Header>
                            <Card.Body>
                                {downloadError && <Alert variant="warning" size="sm" onClose={() => setDownloadError('')} dismissible>Download Failed: {downloadError}</Alert>}
                                <h6 className="mb-2">Claimant Documents</h6>
                                {claimantDocuments.length > 0 ? (
                                    <ListGroup variant="flush" className="mb-3 document-list">
                                        {claimantDocuments.map(doc => (
                                            <ListGroup.Item key={`claimant-${doc.id}`} className="py-1 px-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <span title={doc.original_filename} className="text-truncate me-2 file-name"> <i className="bi bi-file-earmark-text me-1"></i>{doc.original_filename} </span>
                                                <div className="d-flex align-items-center flex-shrink-0">
                                                    <Badge bg="secondary" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                    <Button variant="outline-info" size="sm" className="me-1 p-1 btn-icon" onClick={() => handleViewDocument(doc)} title="View Document"><i className="bi bi-eye-fill"></i></Button>
                                                    <Button variant="outline-primary" size="sm" className="p-1 btn-icon" onClick={() => handleDownloadDocument(doc)} disabled={isDownloading} title="Download Document">{isDownloading ? <Spinner animation="border" size="sm"/> : <i className="bi bi-download"></i>}</Button>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                ) : <p className="text-muted small mb-3">None submitted.</p>}

                                <hr />
                                <h6 className="mb-2">Reviewer Documents</h6>
                                {reviewerDocuments.length > 0 ? (
                                    <ListGroup variant="flush" className="document-list">
                                        {reviewerDocuments.map(doc => (
                                            <ListGroup.Item key={`reviewer-${doc.id}`} className="py-1 px-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <span title={doc.original_filename} className="text-truncate me-2 file-name"> <i className="bi bi-file-earmark-check me-1"></i>{doc.original_filename} </span>
                                                <div className="d-flex align-items-center flex-shrink-0">
                                                    <Badge bg="info" text="dark" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                    <Button variant="outline-info" size="sm" className="me-1 p-1 btn-icon" onClick={() => handleViewDocument(doc)} title="View Document"><i className="bi bi-eye-fill"></i></Button>
                                                    <Button variant="outline-primary" size="sm" className="p-1 btn-icon" onClick={() => handleDownloadDocument(doc)} disabled={isDownloading} title="Download Document">{isDownloading ? <Spinner animation="border" size="sm"/> : <i className="bi bi-download"></i>}</Button>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                ) : <p className="text-muted small mb-0">None submitted.</p>}
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* --- Column 2: Actions (Only IF Checker and action possible) --- */}
                    {userRole === ROLES.CHECKER && (
                        // *** Apply conditional class based on modal visibility ***
                        <Col lg={4} className={showViewModal ? 'checker-actions-behind-modal' : ''}>
                            <Card className="shadow-sm">
                                <Card.Header><Card.Title as="h5">Checker Actions</Card.Title></Card.Header>
                                <Card.Body>
                                    {/* Action Alerts */}
                                    {showActionSuccess && <Alert variant="success" onClose={handleDismissSuccess} dismissible>{successMessage}</Alert>}
                                    {showActionError && finalActionError && <Alert variant="danger" onClose={handleDismissError} dismissible>Action Failed: {finalActionError}</Alert>}

                                    {/* Action Buttons/Form - Render based on status */}
                                    {canCheckerAct ? (
                                        <Form>
                                            <Form.Group className="mb-3" controlId="denialReason">
                                                <Form.Label>Denial Reason <span className="text-danger">*</span></Form.Label>
                                                <Form.Control as="textarea" rows={3} placeholder="Enter reason..." value={denialReason} onChange={(e) => setDenialReason(e.target.value)} disabled={isActionLoading}/>
                                                <Form.Text className="text-muted small">Required only if denying the claim.</Form.Text>
                                            </Form.Group>
                                            <div className="d-grid gap-2">
                                                <Button variant="success" onClick={handleApprove} disabled={isActionLoading}>
                                                    {isActionLoading ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-check-lg me-1"></i>Approve Claim</>}
                                                </Button>
                                                <Button variant="danger" onClick={handleDeny} disabled={isActionLoading || !denialReason.trim()}>
                                                    {isActionLoading ? <Spinner size="sm" animation="border" /> : <><i className="bi bi-x-lg me-1"></i>Deny Claim</>}
                                                </Button>
                                            </div>
                                        </Form>
                                    ) : (
                                        <Alert variant={claim.status === 'Approved' || claim.status === 'Denied' ? 'secondary' : 'info'} className="text-center small">
                                            {claim.status === 'Approved' || claim.status === 'Denied' ? `Claim already ${claim.status.toLowerCase()}.` : `No actions available. Status is ${claim.status}.`}
                                        </Alert>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row> // End Main Content Row
            );
        } // End canView Check
    } else { // Fallback if not loading, succeeded, or no claim object
        content = <Alert variant="info">Loading claim data or claim could not be found.</Alert>;
    }

    // --- Final Page Render ---
    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3 d-flex justify-content-start">
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
            </div>
            {content}

            {/* --- Document View Modal --- */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} size="xl" centered dialogClassName="modal-fullscreen-lg-down">
                <Modal.Header closeButton>
                    <Modal.Title className="text-truncate" style={{fontSize: '1rem'}} title={viewDocName}> {viewDocName || 'View Document'} </Modal.Title>
                </Modal.Header>
                {/* Modal body optimized for different types */}
                <Modal.Body style={{ height: '90vh', overflowY: 'auto', padding: viewDocType.startsWith('image/') ? '0.5rem' : '0', display: 'flex', justifyContent: 'center', alignItems: viewDocType.startsWith('image/') ? 'center' : 'stretch', background: '#eee' }}>
                    {viewDocType.startsWith('image/') ? (
                        <img src={viewDocUrl} alt={viewDocName || 'Preview'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: 'auto' }} />
                    ) : viewDocType === 'application/pdf' ? (
                        <iframe src={`${viewDocUrl}#view=FitH`} style={{ width: '100%', height: '100%', border: 'none' }} title={viewDocName || 'PDF Preview'}> Browser unable to display PDF directly.</iframe>
                    ) : ( // Fallback for unsupported types
                        <div className="text-center p-4 d-flex flex-column justify-content-center align-items-center h-100">
                            <Alert variant="light" className="mb-3 border"> <i className="bi bi-exclamation-triangle text-warning me-2"></i>Inline preview not supported for this file type (<code className='small'>{viewDocType || 'unknown'}</code>).</Alert>
                            <Button variant="primary" size="sm" onClick={() => handleDownloadDocument({ stored_filename: viewDocUrl.split('/').pop(), original_filename: viewDocName })}>
                                <i className="bi bi-download me-1"></i> Download File
                            </Button>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ClaimDetailPage;