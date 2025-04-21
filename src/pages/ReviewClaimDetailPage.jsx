// src/pages/ReviewClaimDetailPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup, Badge, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios'; // Ensure axios is imported for download
import {
    fetchClaimById,
    selectCurrentClaim,
    selectDetailStatus,
    selectDetailError,
    clearCurrentClaim,
    submitForApproval,
    selectSubmitApprovalStatus,
    selectSubmitApprovalError,
    resetSubmitApprovalStatus,
} from '../store/slices/claimsSlice';
import { selectUserRole } from '../store/slices/authSlice';

// --- Constants ---
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };
const STATUS_UNDER_REVIEW = 'Under Review'; // Status needed to allow submission
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_REVIEWER_FILES = 3;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// --- Helper Functions ---
const renderStatusBadge = (status) => {
    let bg = 'secondary', text = null;
    switch (status) {
        case 'Under Review': bg = 'warning'; text = 'dark'; break;
        case 'Pending Approval': bg = 'info'; text = 'dark'; break;
        case 'Approved': bg = 'success'; break;
        case 'Denied': bg = 'danger'; break;
    }
    return <Badge bg={bg} text={text ? text : undefined}>{status || 'Unknown'}</Badge>;
};
const formatDate = (d) => d ? new Date(d.replace(' ', 'T')).toLocaleString() : 'N/A';
const formatShortDate = (d) => d ? new Date(d.replace(' ', 'T')).toLocaleDateString() : 'N/A';
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
const ReviewClaimDetailPage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // --- Selectors ---
    const claim = useSelector(selectCurrentClaim);
    const detailStatus = useSelector(selectDetailStatus);
    const detailError = useSelector(selectDetailError);
    const submitApprovalStatus = useSelector(selectSubmitApprovalStatus);
    const submitApprovalError = useSelector(selectSubmitApprovalError);
    const userRole = useSelector(selectUserRole);
    const currentUser = useSelector((state) => state.auth.user);
    const authToken = useSelector((state) => state.auth.token); // Needed for manual download requests

    // --- Local State ---
    const [reviewerNotes, setReviewerNotes] = useState('');
    const [reviewerDocs, setReviewerDocs] = useState(null);
    const [settlementAmount, setSettlementAmount] = useState('');
    const [formError, setFormError] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showSubmitErrorAlert, setShowSubmitErrorAlert] = useState(false);
    const isActionLoading = submitApprovalStatus === 'loading';
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewDocUrl, setViewDocUrl] = useState('');
    const [viewDocType, setViewDocType] = useState('');
    const [viewDocName, setViewDocName] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');


    // --- Effects ---
    useEffect(() => {
        if (claimId) {
            dispatch(fetchClaimById({ claimId, role: ROLES.MAKER }));
        }
        return () => {
            dispatch(clearCurrentClaim());
            dispatch(resetSubmitApprovalStatus());
        };
    }, [claimId, dispatch]); // Only depends on claimId and dispatch

    useEffect(() => {
        if (submitApprovalStatus === 'succeeded') {
            setShowSuccessAlert(true); setShowSubmitErrorAlert(false);
            setReviewerNotes(''); setSettlementAmount(''); setReviewerDocs(null);
            const fileInput = document.getElementById('reviewerDocuments');
            if (fileInput) fileInput.value = null; // Reset file input
            const timer = setTimeout(() => navigate('/review-claims'), 3500);
            return () => clearTimeout(timer);
        }
        if (submitApprovalStatus === 'failed') {
            setShowSubmitErrorAlert(true); setShowSuccessAlert(false);
        }
    }, [submitApprovalStatus, navigate, dispatch]); // Added dispatch dependency

    const handleDismissError = () => { setShowSubmitErrorAlert(false); dispatch(resetSubmitApprovalStatus()); };
    const handleDismissSuccess = () => setShowSuccessAlert(false);

    // --- File Validation ---
    const validateReviewerFiles = (files) => {
        if (!files || files.length === 0) return true;
        if (files.length > MAX_REVIEWER_FILES) return `Max ${MAX_REVIEWER_FILES} files allowed.`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue;
            if (file.size > MAX_FILE_SIZE_BYTES) return `File "${file.name}" > ${MAX_FILE_SIZE_MB}MB limit.`;
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i;
            if (!allowedExtensions.exec(file.name)) return `Invalid type: ${file.name}. Allowed: Images, PDF, Word.`;
        }
        return true;
    };

    // --- Form Submission ---
    const handleSubmit = (event) => {
        event.preventDefault();
        setFormError(''); setShowSubmitErrorAlert(false); dispatch(resetSubmitApprovalStatus());

        if (!reviewerNotes.trim()) { setFormError('Reviewer comments are required.'); return; }

        if (settlementAmount !== '' && settlementAmount !== null) { // Check it's not just empty string
            const amountNum = Number(settlementAmount);
            if (isNaN(amountNum) || amountNum < 0) {
                setFormError('Proposed Settlement Amount must be a valid non-negative number.');
                return;
            }
        }

        const fileValidationResult = validateReviewerFiles(reviewerDocs);
        if (fileValidationResult !== true) { setFormError(fileValidationResult); return; }

        const formData = new FormData();
        formData.append('reviewer_notes', reviewerNotes);
        // Only append settlement if it has a meaningful value
        if (settlementAmount !== '' && settlementAmount !== null) {
            formData.append('settlement_amount', settlementAmount);
        }

        if (reviewerDocs?.length) {
            for (let i = 0; i < reviewerDocs.length; i++) { formData.append('reviewer_documents[]', reviewerDocs[i]); }
        }
        dispatch(submitForApproval({ claimId: claim.id, formData }));
    };

    // --- Document Action Handlers ---
    const handleViewDocument = (doc) => {
        if (!doc || !doc.stored_filename) return;
        const url = `${API_BASE_URL}/documents/download/${encodeURIComponent(doc.stored_filename)}`;
        setViewDocUrl(url); setViewDocType(doc.mime_type || ''); setViewDocName(doc.original_filename || 'Document');
        setShowViewModal(true);
    };
    const handleCloseViewModal = () => setShowViewModal(false);
    const handleDownloadDocument = async (doc) => {
        if (!doc || !doc.stored_filename || isDownloading) return;
        setIsDownloading(true); setDownloadError('');
        const downloadUrl = `${API_BASE_URL}/documents/download/${encodeURIComponent(doc.stored_filename)}`;
        const originalFilename = doc.original_filename || 'download';
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'blob', headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': '*/*' }
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
                if (error.response.status === 404) errMsg = 'File not found.';
                else if (error.response.status === 403) errMsg = 'Permission denied.';
                else errMsg = error.response.data?.message || errMsg;
            } else if (error.request) errMsg = 'No response from server.';
            else errMsg = error.message;
            setDownloadError(errMsg);
        } finally { setIsDownloading(false); }
    };

    // --- Memoized Document Lists ---
    const { claimantDocuments, reviewerDocuments } = useMemo(() => {
        const docs = claim?.documents || [];
        return {
            claimantDocuments: docs.filter(doc => !Number(doc.is_review_document)),
            reviewerDocuments: docs.filter(doc => Number(doc.is_review_document))
        };
    }, [claim]);


    // --- Render Logic ---
    let pageContent; // Use a different variable name to avoid conflict

    if (detailStatus === 'loading') {
        pageContent = <div className="text-center p-5"><Spinner animation="border" /> Loading claim details...</div>;
    } else if (detailStatus === 'failed') {
        pageContent = <Alert variant="danger">Error loading claim details: {detailError}</Alert>;
    } else if (detailStatus === 'succeeded' && claim) {
        // Authorization Check
        const canView = userRole === ROLES.MAKER && String(claim.assigned_reviewer_id) === String(currentUser?.id);

        if (!canView) {
            pageContent = <Alert variant="danger">Error: Claim {claimId} is not assigned to you for review or access denied.</Alert>;
        } else {
            // User Can View & Review
            const canSubmit = claim.status === STATUS_UNDER_REVIEW;

            pageContent = (
                <Form noValidate onSubmit={handleSubmit}>
                    <Row>
                        {/* Column 1: Display Claim Details & Documents */}
                        <Col md={7} lg={8} className="mb-3 mb-md-0">
                            {/* Card: Core Info */}
                            <Card className="shadow-sm mb-3">
                                <Card.Header className="d-flex justify-content-between align-items-center">
                                    <Card.Title as="h4" className="mb-0">Review Claim {claim.id}</Card.Title>
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
                                    </Row>
                                    <p className="mb-1 mt-2"><strong>Claimant Description:</strong></p>
                                    <Card body className="bg-light p-2 mb-0"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.description || '(No description)'}</small></Card>
                                    {/* Display previous notes if they exist */}
                                    {claim.reviewer_notes && (
                                        <> <hr /> <h5>Your Previous Notes:</h5>
                                            <Card body className="bg-light p-2"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.reviewer_notes}</small></Card>
                                        </>
                                    )}
                                    {/* Display previous settlement amount if exists */}
                                    {claim.settlement_amount != null && (
                                        <> <hr /> <h5>Your Previous Proposed Settlement:</h5>
                                            <Card body className="bg-light p-2"><small>ZMW {parseFloat(claim.settlement_amount).toFixed(2)}</small></Card>
                                        </>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Card: Documents */}
                            <Card className="shadow-sm">
                                <Card.Header><Card.Title as="h5">Associated Documents</Card.Title></Card.Header>
                                <Card.Body>
                                    {downloadError && <Alert variant="warning" size="sm" onClose={() => setDownloadError('')} dismissible>Download Failed: {downloadError}</Alert>}
                                    <h6 className="mb-2">Claimant Documents</h6>
                                    {claimantDocuments.length > 0 ? (
                                        <ListGroup variant="flush" className="mb-3 document-list">
                                            {claimantDocuments.map(doc => (
                                                <ListGroup.Item key={`claimant-doc-${doc.id}`} className="py-1 px-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                    <span title={doc.original_filename} className="text-truncate me-2 file-name"><i className="bi bi-file-earmark-text me-1"></i>{doc.original_filename}</span>
                                                    <div className="d-flex align-items-center flex-shrink-0">
                                                        <Badge bg="secondary" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                        <Button variant="outline-info" size="sm" className="me-1 p-1 btn-icon" onClick={() => handleViewDocument(doc)} title="View"><i className="bi bi-eye-fill"></i></Button>
                                                        <Button variant="outline-primary" size="sm" className="p-1 btn-icon" onClick={() => handleDownloadDocument(doc)} disabled={isDownloading} title="Download">{isDownloading ? <Spinner animation="border" size="sm"/> : <i className="bi bi-download"></i>}</Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : <p className="text-muted small mb-3">None submitted.</p>}
                                    <hr />
                                    <h6 className="mb-2">Your Previous Documents</h6>
                                    {reviewerDocuments.length > 0 ? (
                                        <ListGroup variant="flush" className="document-list">
                                            {reviewerDocuments.map(doc => (
                                                <ListGroup.Item key={`reviewer-doc-${doc.id}`} className="py-1 px-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                    <span title={doc.original_filename} className="text-truncate me-2 file-name"><i className="bi bi-file-earmark-check me-1"></i>{doc.original_filename}</span>
                                                    <div className="d-flex align-items-center flex-shrink-0">
                                                        <Badge bg="info" text="dark" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                        <Button variant="outline-info" size="sm" className="me-1 p-1 btn-icon" onClick={() => handleViewDocument(doc)} title="View"><i className="bi bi-eye-fill"></i></Button>
                                                        <Button variant="outline-primary" size="sm" className="p-1 btn-icon" onClick={() => handleDownloadDocument(doc)} disabled={isDownloading} title="Download">{isDownloading ? <Spinner animation="border" size="sm"/> : <i className="bi bi-download"></i>}</Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : <p className="text-muted small mb-0">None added during review.</p>}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Column 2: Reviewer Actions/Input */}
                        <Col md={5} lg={4}>
                            <Card className="shadow-sm">
                                <Card.Header><Card.Title as="h5">Review & Submit</Card.Title></Card.Header>
                                <Card.Body className="d-flex flex-column">
                                    {/* Action Alerts */}
                                    {showSuccessAlert && <Alert variant="success" onClose={handleDismissSuccess} dismissible>Submitted! Redirecting...</Alert>}
                                    {showSubmitErrorAlert && submitApprovalError && <Alert variant="danger" onClose={handleDismissError} dismissible>Submit Failed: {submitApprovalError}</Alert>}
                                    {/* Local Form Validation Alert */}
                                    {formError && <Alert variant="warning" onClose={() => setFormError('')} dismissible>{formError}</Alert>}

                                    {/* Form Inputs */}
                                    {canSubmit ? (
                                        <>
                                            <Form.Group className="mb-3" controlId="reviewerNotes">
                                                <Form.Label>Your Comments <span className="text-danger">*</span></Form.Label>
                                                <Form.Control as="textarea" rows={5} placeholder="Enter assessment notes..." value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} isInvalid={!!formError && !reviewerNotes.trim()} disabled={isActionLoading} required/>
                                            </Form.Group>
                                            <Form.Group className="mb-3" controlId="settlementAmount">
                                                <Form.Label>Proposed Settlement (ZMW)</Form.Label>
                                                <Form.Control type="number" step="0.01" min="0" placeholder="Optional" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} isInvalid={!!formError && formError.toLowerCase().includes('amount')} disabled={isActionLoading} />
                                            </Form.Group>
                                            <Form.Group controlId="reviewerDocuments" className="mb-3">
                                                <Form.Label>Upload Documents (Optional, Max {MAX_REVIEWER_FILES}, {MAX_FILE_SIZE_MB}MB each)</Form.Label>
                                                <Form.Control type="file" multiple onChange={(e) => setReviewerDocs(e.target.files)} isInvalid={!!formError && formError.toLowerCase().includes('file')} disabled={isActionLoading} />
                                            </Form.Group>
                                        </>
                                    ) : ( <Alert variant='secondary' className='text-center small'>This claim's status ("{claim.status}") does not allow submission for approval.</Alert> )}

                                    {/* Submit Button */}
                                    {canSubmit && (
                                        <div className="mt-auto d-grid">
                                            <Button variant="success" type="submit" disabled={isActionLoading}>
                                                {isActionLoading ? ( <><Spinner size="sm"/> Submitting...</> ) : ( 'Submit for Final Approval' )}
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            );
        } // end canView else
    } else { // Default/Fallback for Idle, initial Load etc.
        pageContent = (detailStatus !== 'loading' && detailStatus !== 'failed')
            ? <Alert variant="info">Please wait, loading claim data...</Alert>
            : null; // Avoid showing this if loading/failed message is already present
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3 d-flex justify-content-start">
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i> Back to Review List
                </Button>
            </div>
            {/* Display loading/error/success states */}
            {pageContent}

            {/* Modal for viewing documents */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} size="xl" centered dialogClassName="modal-fullscreen-lg-down">
                <Modal.Header closeButton> <Modal.Title className="text-truncate" style={{fontSize: '1rem'}} title={viewDocName}>{viewDocName}</Modal.Title> </Modal.Header>
                <Modal.Body style={{ height: '80vh', overflowY: 'auto', padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#eee' }}>
                    {viewDocType.startsWith('image/') ? (
                        <img src={viewDocUrl} alt={viewDocName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : viewDocType === 'application/pdf' ? (
                        <iframe src={`${viewDocUrl}#view=FitH`} style={{ width: '100%', height: '100%', border: 'none' }} title={viewDocName}></iframe>
                    ) : (
                        <div className="text-center p-4">
                            <Alert variant="light" className="mb-3 border"><i className="bi bi-exclamation-triangle text-warning me-2"></i>Inline preview not supported for <code className='small'>{viewDocType || 'this file type'}</code>.</Alert>
                            <Button variant="primary" size="sm" onClick={() => handleDownloadDocument({ stored_filename: viewDocUrl.split('/').pop(), original_filename: viewDocName })}> <i className="bi bi-download me-1"></i> Download File </Button>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ReviewClaimDetailPage;