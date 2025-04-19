// src/pages/ReviewClaimDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';
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
import { selectUserRole } from '../store/slices/authSlice'; // Assuming exported correctly

// Define Roles constant
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };
const STATUS_UNDER_REVIEW = 'Under Review';

// Define File size limit in MB and bytes, and max file count
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_REVIEWER_FILES = 3; // Example limit

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
    const [formError, setFormError] = useState(''); // Local validation errors
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showSubmitErrorAlert, setShowSubmitErrorAlert] = useState(false);
    const isActionLoading = submitApprovalStatus === 'loading';

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

    // Handle Submit for Approval Status Changes (show/hide alerts)
    useEffect(() => {
        if (submitApprovalStatus === 'succeeded') {
            setShowSuccessAlert(true);
            setShowSubmitErrorAlert(false);
            setReviewerNotes(''); // Clear form on success
            setReviewerDocs(null); // Clear files (might need input reset too)
            const timer = setTimeout(() => navigate('/review-claims'), 3500); // Redirect after success
            return () => clearTimeout(timer);
        }
        if (submitApprovalStatus === 'failed') {
            setShowSubmitErrorAlert(true);
            setShowSuccessAlert(false);
        }
    }, [submitApprovalStatus, navigate, dispatch]); // dispatch dependency if resetSubmit is called inside

    // --- ADDED: Dismiss Handlers for Alerts ---
    const handleDismissError = () => {
        setShowSubmitErrorAlert(false);
        dispatch(resetSubmitApprovalStatus()); // Reset status when error dismissed
    };
    const handleDismissSuccess = () => {
        setShowSuccessAlert(false);
        // Optional: You could dispatch reset here too, but maybe not needed if redirecting
    };
    // --- END ADDED ---

    // --- File Validation ---
    const validateReviewerFiles = (files) => {
        if (!files || files.length === 0) return true; // Optional
        if (files.length > MAX_REVIEWER_FILES) return `Max ${MAX_REVIEWER_FILES} files allowed.`;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue;
            if (file.size > MAX_FILE_SIZE_BYTES) return `File "${file.name}" > ${MAX_FILE_SIZE_MB}MB.`;
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i;
            if (!allowedExtensions.exec(file.name)) return `Invalid type: ${file.name}.`;
        }
        return true;
    };

    // --- Form Submission ---
    const handleSubmit = (event) => {
        event.preventDefault();
        setFormError('');
        setShowSubmitErrorAlert(false);
        dispatch(resetSubmitApprovalStatus());

        if (!reviewerNotes.trim()) { setFormError('Reviewer comments required.'); return; }
        const fileValidationResult = validateReviewerFiles(reviewerDocs);
        if (fileValidationResult !== true) { setFormError(fileValidationResult); return; }

        const formData = new FormData();
        formData.append('reviewer_notes', reviewerNotes);
        if (reviewerDocs?.length) {
            for (let i = 0; i < reviewerDocs.length; i++) {
                formData.append('reviewer_documents[]', reviewerDocs[i]);
            }
        }
        dispatch(submitForApproval({ claimId: claim.id, formData }));
    };

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


    // --- Main Render Logic ---
    let content;

    if (detailStatus === 'loading') {
        content = <div className="text-center p-5"><Spinner animation="border" /> Loading claim details...</div>;
    } else if (detailStatus === 'failed') {
        content = <Alert variant="danger">Error loading claim details: {detailError}</Alert>;
    } else if (detailStatus === 'succeeded' && claim) {
        // Authorization Check
        // if (userRole !== ROLES.MAKER || String(claim.assigned_reviewer_id) !== String(currentUser?.id)) {
        //     content = <Alert variant="danger">Error: Claim {claimId} is not assigned to you for review or access denied.</Alert>;
        // } else {
            // Prepare document lists
            const claimantDocuments = claim.documents?.filter(doc => !doc.is_review_document) || [];
            const reviewerDocuments = claim.documents?.filter(doc => doc.is_review_document) || [];
            const canSubmit = claim.status === STATUS_UNDER_REVIEW;

            content = (
                <Form noValidate onSubmit={handleSubmit}>
                    <Row>
                        {/* Column 1: Display Claim Details */}
                        <Col md={7} lg={8} className="mb-3 mb-md-0">
                            {/* Card: Core Info */}
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
                                        {/* Display other core fields if needed */}
                                    </Row>
                                    <p className="mb-1"><strong>Claimant Description:</strong></p>
                                    <Card body className="bg-light p-2 mb-3"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.description || 'N/A'}</small></Card>

                                    {/* Show previous reviewer notes if they exist */}
                                    {claim.reviewer_notes && (
                                        <> <hr /> <h5>Your Previous Notes:</h5>
                                            <Card body className="bg-light p-2"><small style={{ whiteSpace: 'pre-wrap' }}>{claim.reviewer_notes}</small></Card>
                                        </>
                                    )}
                                </Card.Body>
                            </Card>
                            {/* Card: Documents */}
                            <Card className="shadow-sm">
                                <Card.Header><Card.Title as="h5">Associated Documents</Card.Title></Card.Header>
                                <Card.Body>
                                    <h6>Claimant Documents</h6>
                                    {claimantDocuments.length > 0 ? (
                                        <ListGroup variant="flush">{ claimantDocuments.map(doc =>
                                            <ListGroup.Item key={`claimant-doc-${doc.id}`} className="d-flex justify-content-between align-items-center">
                                                <span title={doc.original_filename} > {/* Add download link here later */}
                                                    <i className="bi bi-file-earmark-text me-2"></i>{doc.original_filename}
                                                 </span>
                                                <Badge bg="secondary" pill>{(doc.file_size / 1024).toFixed(1)} KB</Badge>
                                            </ListGroup.Item> )}
                                        </ListGroup>
                                    ) : <p className="text-muted small">None.</p>}
                                    <hr />
                                    <h6>Your Uploaded Documents</h6>
                                    {reviewerDocuments.length > 0 ? (
                                        <ListGroup variant="flush">{ reviewerDocuments.map(doc =>
                                            <ListGroup.Item key={`reviewer-doc-${doc.id}`} className="d-flex justify-content-between align-items-center">
                                                <span title={doc.original_filename} > {/* Add download link here later */}
                                                    <i className="bi bi-file-earmark-check me-2"></i>{doc.original_filename}
                                                </span>
                                                <Badge bg="info" text="dark" pill>{(doc.file_size / 1024).toFixed(1)} KB</Badge>
                                            </ListGroup.Item> )}
                                        </ListGroup>
                                    ) : <p className="text-muted small">None added yet.</p>}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Column 2: Reviewer Actions */}
                        <Col md={5} lg={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header><Card.Title as="h5">Review & Submit</Card.Title></Card.Header>
                                <Card.Body className="d-flex flex-column">
                                    {/* Submission Action Alerts */}
                                    {showSuccessAlert && <Alert variant="success" onClose={handleDismissSuccess} dismissible>Submitted successfully! Redirecting...</Alert>}
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
                                            <Form.Group controlId="reviewerDocuments" className="mb-3">
                                                <Form.Label>Upload Your Documents (Optional)</Form.Label>
                                                <Form.Control type="file" multiple onChange={(e) => setReviewerDocs(e.target.files)} isInvalid={!!formError && formError.toLowerCase().includes('file')} disabled={isActionLoading} />
                                            </Form.Group>
                                        </>
                                    ) : (
                                        <Alert variant='info' className='text-center'> This claim is not in "{STATUS_UNDER_REVIEW}" status and cannot be submitted. </Alert>
                                    )}

                                    {/* Submit Button (conditionally enabled) */}
                                    <div className="mt-auto d-grid">
                                        <Button variant="success" type="submit" disabled={!canSubmit || isActionLoading}>
                                            {isActionLoading ? ( <><Spinner size="sm" animation="border"/> Submitting...</> ) : ( 'Submit for Final Approval' )}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            ); // End main form block
        // } // End canView else
    } else { // Fallback / Idle initial state
        content = <Alert variant="info">Loading claim data...</Alert>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3 d-flex justify-content-start">
                {/* Back Button */}
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
            </div>
            {content}
        </Container>
    );
};

export default ReviewClaimDetailPage;