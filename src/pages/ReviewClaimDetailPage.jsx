// src/pages/ReviewClaimDetailPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup, Badge, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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

// Define Roles constant
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };
const STATUS_UNDER_REVIEW = 'Under Review'; // Status needed to allow submission

// Define File size limit in MB and bytes, and max file count
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_REVIEWER_FILES = 3; // Example limit for reviewer files

// API Base URL for constructing download links
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// --- Helper Functions --- (Outside component)
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
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

    // --- Local State ---
    const [reviewerNotes, setReviewerNotes] = useState('');
    const [reviewerDocs, setReviewerDocs] = useState(null); // FileList
    // NEW: State for settlement amount
    const [settlementAmount, setSettlementAmount] = useState('');
    const [formError, setFormError] = useState(''); // Local validation errors
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showSubmitErrorAlert, setShowSubmitErrorAlert] = useState(false);
    const isActionLoading = submitApprovalStatus === 'loading';
    // Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewDocUrl, setViewDocUrl] = useState('');
    const [viewDocType, setViewDocType] = useState('');
    const [viewDocName, setViewDocName] = useState('');

    // --- Effects ---
    useEffect(() => {
        if (claimId) {
            dispatch(fetchClaimById({ claimId, role: ROLES.MAKER })); // Fetch as reviewer
        }
        return () => {
            dispatch(clearCurrentClaim());
            dispatch(resetSubmitApprovalStatus());
        };
    }, [claimId, dispatch]);

    // Show alerts/redirect on submission status change
    useEffect(() => {
        if (submitApprovalStatus === 'succeeded') {
            setShowSuccessAlert(true);
            setShowSubmitErrorAlert(false);
            // Clear form fields after successful submission
            setReviewerNotes('');
            setSettlementAmount('');
            setReviewerDocs(null);
            // Reset file input visually (find input by ID and reset value)
            const fileInput = document.getElementById('reviewerDocuments');
            if (fileInput) fileInput.value = null;
            const timer = setTimeout(() => navigate('/review-claims'), 3500);
            return () => clearTimeout(timer);
        }
        if (submitApprovalStatus === 'failed') {
            setShowSubmitErrorAlert(true);
            setShowSuccessAlert(false);
        }
    }, [submitApprovalStatus, navigate]);

    const handleDismissError = () => { setShowSubmitErrorAlert(false); dispatch(resetSubmitApprovalStatus()); };
    const handleDismissSuccess = () => setShowSuccessAlert(false);

    // --- File Validation ---
    const validateReviewerFiles = (files) => {
        if (!files || files.length === 0) return true; // Optional
        if (files.length > MAX_REVIEWER_FILES) return `Max ${MAX_REVIEWER_FILES} reviewer files allowed.`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue;
            if (file.size > MAX_FILE_SIZE_BYTES) return `File "${file.name}" > ${MAX_FILE_SIZE_MB}MB limit.`;
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i; // Add more as needed
            if (!allowedExtensions.exec(file.name)) return `Invalid type: ${file.name}. Allowed: Images, PDF, Word.`;
        }
        return true;
    };

    // --- Form Submission ---
    const handleSubmit = (event) => {
        event.preventDefault();
        setFormError(''); setShowSubmitErrorAlert(false); dispatch(resetSubmitApprovalStatus());

        // Validation Checks
        if (!reviewerNotes.trim()) {
            setFormError('Reviewer comments are required.');
            return;
        }

        // NEW: Validate settlement amount if entered
        if (settlementAmount !== '') {
            const amountNum = Number(settlementAmount);
            if (isNaN(amountNum) || amountNum < 0) {
                setFormError('Proposed Settlement Amount must be a valid non-negative number.');
                return;
            }
            // Optional: Check for excessive decimal places if needed
            // if (amountNum !== parseFloat(amountNum.toFixed(2))) {
            //     setFormError('Proposed Settlement Amount can have at most two decimal places.');
            //     return;
            // }
        }


        const fileValidationResult = validateReviewerFiles(reviewerDocs);
        if (fileValidationResult !== true) {
            setFormError(fileValidationResult);
            return;
        }

        const formData = new FormData();
        formData.append('reviewer_notes', reviewerNotes);

        if (settlementAmount !== '') {
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
        setViewDocUrl(url);
        setViewDocType(doc.mime_type || '');
        setViewDocName(doc.original_filename || 'Document');
        setShowViewModal(true);
    };
    const handleCloseViewModal = () => setShowViewModal(false);
    const handleDownloadDocument = (doc) => {
        if (!doc || !doc.stored_filename) return;
        const url = `${API_BASE_URL}/documents/download/${encodeURIComponent(doc.stored_filename)}`;
        // Trigger download - Simulate link click
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.original_filename || 'download'); // Suggest original filename
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
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
    let content;

    if (detailStatus === 'loading') {
        content = <div className="text-center p-5"><Spinner animation="border" /> Loading claim details...</div>;
    } else if (detailStatus === 'failed') {
        content = <Alert variant="danger">Error loading claim details: {detailError}</Alert>;
    } else if (detailStatus === 'succeeded' && claim) {
        // Authorization Check
        if (userRole !== ROLES.MAKER || String(claim.assigned_reviewer_id) !== String(currentUser?.id)) {
            content = <Alert variant="danger">Error: Claim {claimId} is not assigned to you for review or access denied.</Alert>;
        } else {
            const canSubmit = claim.status === STATUS_UNDER_REVIEW; // Only allow submission if status is correct

            content = (
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
                                    <Row className="mb-2">
                                        <Col sm={6}><p className="mb-1"><strong>Claim Type:</strong> {claim.claim_type_name || 'N/A'}</p></Col>
                                        <Col sm={6}><p className="mb-1"><strong>Incident Date:</strong> {formatShortDate(claim.incident_date)}</p></Col>
                                        <Col sm={6}><p className="mb-1"><strong>Submitted:</strong> {formatDate(claim.created_at)}</p></Col>
                                        <Col sm={6}><p className="mb-1"><strong>Last Updated:</strong> {formatDate(claim.updated_at)}</p></Col>
                                        <Col sm={6}><p className="mb-1"><strong>Claimant:</strong> {claim.claimant_name || `User ID: ${claim.claimant_user_id}`}</p></Col>
                                    </Row>
                                    <p className="mb-1"><strong>Claimant Description:</strong></p>
                                    <Card body className="bg-light p-2 mb-0"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.description || '(No description)'}</small></Card>
                                    {/* Reviewer notes added by THIS reviewer */}
                                    {claim.reviewer_notes && (
                                        <> <hr /> <h5>Your Previous Notes:</h5>
                                            <Card body className="bg-light p-2"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.reviewer_notes}</small></Card>
                                        </>
                                    )}
                                    {/* NEW: Display previously saved settlement amount if available */}
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
                                    <h6 className="mb-2">Claimant Documents</h6>
                                    {claimantDocuments.length > 0 ? (
                                        <ListGroup variant="flush" className="mb-3">
                                            {claimantDocuments.map(doc => (
                                                <ListGroup.Item key={`claimant-doc-${doc.id}`} className="py-1 d-flex justify-content-between align-items-center flex-wrap">
                                                      <span title={doc.original_filename} className="text-truncate me-2 mb-1 mb-sm-0">
                                                         <i className="bi bi-file-earmark-text me-1"></i>{doc.original_filename}
                                                      </span>
                                                    <div className="d-flex align-items-center">
                                                        <Badge bg="secondary" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                        <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleViewDocument(doc)} title="View Document"> <i className="bi bi-eye-fill"></i> </Button>
                                                        <Button variant="outline-primary" size="sm" onClick={() => handleDownloadDocument(doc)} title="Download Document"> <i className="bi bi-download"></i> </Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : <p className="text-muted small mb-3">None submitted.</p>}

                                    <h6 className="mb-2">Your Previous Documents</h6>
                                    {reviewerDocuments.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {reviewerDocuments.map(doc => (
                                                <ListGroup.Item key={`reviewer-doc-${doc.id}`} className="py-1 d-flex justify-content-between align-items-center flex-wrap">
                                                      <span title={doc.original_filename} className="text-truncate me-2 mb-1 mb-sm-0">
                                                          <i className="bi bi-file-earmark-check me-1"></i>{doc.original_filename}
                                                      </span>
                                                    <div className="d-flex align-items-center">
                                                        <Badge bg="info" text="dark" pill className="me-2">{formatFileSize(doc.file_size)}</Badge>
                                                        <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleViewDocument(doc)} title="View Document"> <i className="bi bi-eye-fill"></i> </Button>
                                                        <Button variant="outline-primary" size="sm" onClick={() => handleDownloadDocument(doc)} title="Download Document"> <i className="bi bi-download"></i> </Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : <p className="text-muted small mb-0">None added yet.</p>}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Column 2: Reviewer Actions/Input */}
                        <Col md={5} lg={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header><Card.Title as="h5">Review & Submit</Card.Title></Card.Header>
                                <Card.Body className="d-flex flex-column">
                                    {/* Action Alerts */}
                                    {showSuccessAlert && <Alert variant="success" onClose={handleDismissSuccess} dismissible>Submitted! Redirecting...</Alert>}
                                    {showSubmitErrorAlert && submitApprovalError && <Alert variant="danger" onClose={handleDismissError} dismissible>Submit Failed: {submitApprovalError}</Alert>}
                                    {/* Local Validation Alert */}
                                    {formError && <Alert variant="warning" onClose={() => setFormError('')} dismissible>{formError}</Alert>}

                                    {/* Only show input fields if review is possible */}
                                    {canSubmit ? (
                                        <>
                                            <Form.Group className="mb-3" controlId="reviewerNotes">
                                                <Form.Label>Your Comments <span className="text-danger">*</span></Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={5}
                                                    placeholder="Enter assessment notes..."
                                                    value={reviewerNotes}
                                                    onChange={(e) => setReviewerNotes(e.target.value)}
                                                    isInvalid={!!formError && !reviewerNotes.trim()} // Simple check if notes are empty when required
                                                    disabled={isActionLoading}
                                                    required
                                                />
                                                {/* Add invalid feedback if needed */}
                                            </Form.Group>

                                            {/* NEW: Proposed Settlement Amount field */}
                                            <Form.Group className="mb-3" controlId="settlementAmount">
                                                <Form.Label>Proposed Settlement Amount (ZMW)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.01" // Allow two decimal places
                                                    min="0"      // Don't allow negative amounts
                                                    placeholder="e.g., 123.45"
                                                    value={settlementAmount}
                                                    onChange={(e) => setSettlementAmount(e.target.value)}
                                                    // Check if formError exists AND the error message relates to the amount
                                                    isInvalid={!!formError && formError.toLowerCase().includes('amount')}
                                                    disabled={isActionLoading}
                                                />
                                                {/* Add invalid feedback if needed */}
                                            </Form.Group>


                                            <Form.Group controlId="reviewerDocuments" className="mb-3">
                                                <Form.Label>Upload Documents (Optional, Max {MAX_REVIEWER_FILES}, {MAX_FILE_SIZE_MB}MB each)</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    multiple
                                                    onChange={(e) => setReviewerDocs(e.target.files)}
                                                    // Check if formError exists AND the error message relates to files
                                                    isInvalid={!!formError && formError.toLowerCase().includes('file')}
                                                    disabled={isActionLoading}
                                                />
                                                {/* Add invalid feedback if needed */}
                                            </Form.Group>
                                        </>
                                    ) : (
                                        <Alert variant='secondary' className='text-center'> This claim's status is "{claim.status}" and cannot be submitted for approval. </Alert>
                                    )}

                                    {/* Submit Button - Render only if submission is possible */}
                                    {canSubmit && (
                                        <div className="mt-auto d-grid"> {/* Pushes button to bottom */}
                                            <Button variant="success" type="submit" disabled={!canSubmit || isActionLoading}>
                                                {isActionLoading ? ( <><Spinner size="sm" animation="border"/> Submitting...</> ) : ( 'Submit for Final Approval' )}
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            );
        } // end canView check
    } else {
        // Handles initial loading state where claim might be null before fetch or if not found/error
        content = detailStatus === 'loading' ? null : (
            <Alert variant="info">
                {detailStatus === 'failed' ? `Error: ${detailError}` : 'Loading claim data or claim could not be found.'}
            </Alert>
        );
    }

    // Handle the case where the user is not authorized immediately after detailStatus succeeds
    const unauthorized = detailStatus === 'succeeded' && claim && (userRole !== ROLES.MAKER || String(claim.assigned_reviewer_id) !== String(currentUser?.id));


    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3 d-flex justify-content-start">
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
            </div>
            {unauthorized ? <Alert variant="danger">Error: Claim {claimId} is not assigned to you for review or access denied.</Alert> : content}

            {/* Modal for viewing documents */}
            <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg" centered dialogClassName="modal-90w">
                <Modal.Header closeButton>
                    <Modal.Title><small>{viewDocName || 'View Document'}</small></Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ height: '75vh', overflow: 'hidden', padding: '0' }}>
                    {viewDocType.startsWith('image/') ? (
                        <img src={viewDocUrl} alt={viewDocName || 'Preview'} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', margin: 'auto' }} />
                    ) : viewDocType === 'application/pdf' ? (
                        <iframe src={viewDocUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={viewDocName || 'PDF Preview'}></iframe>
                    ) : (
                        <div className="text-center p-5">
                            <Alert variant="info">
                                Preview not available for this file type ({viewDocType || 'unknown'}).
                            </Alert>
                            <Button variant="primary" size="sm" href={viewDocUrl} download={viewDocName}>
                                <i className="bi bi-download me-1"></i> Download File
                            </Button>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ReviewClaimDetailPage;