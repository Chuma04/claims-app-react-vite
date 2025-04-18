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
import { selectUserRole } from '../store/slices/authSlice'; // Assuming this selects the auth.user object

// Define File size limit in MB and bytes, and max file count
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_REVIEWER_FILES = 3; // Example limit

const ReviewClaimDetailPage = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Selectors
    const claim = useSelector(selectCurrentClaim);
    const detailStatus = useSelector(selectDetailStatus);
    const detailError = useSelector(selectDetailError);
    const submitApprovalStatus = useSelector(selectSubmitApprovalStatus);
    const submitApprovalError = useSelector(selectSubmitApprovalError);
    const currentUser = useSelector((state) => state.auth.user);


    // Local State
    const [reviewerNotes, setReviewerNotes] = useState('');
    const [reviewerDocs, setReviewerDocs] = useState(null); // Holds FileList
    const [formError, setFormError] = useState(''); // Local validation errors
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showSubmitErrorAlert, setShowSubmitErrorAlert] = useState(false);

    // Fetch claim details
    useEffect(() => {
        if (claimId) {
            // Dispatch fetch using 'reviewer' role context
            dispatch(fetchClaimById({ claimId, role: 'reviewer' }));
        }
        // Cleanup on unmount
        return () => {
            dispatch(clearCurrentClaim());
            dispatch(resetSubmitApprovalStatus());
        };
    }, [claimId, dispatch]);

    // Handle alert visibility based on submit status
    useEffect(() => {
        if (submitApprovalStatus === 'succeeded') {
            setShowSuccessAlert(true);
            setShowSubmitErrorAlert(false);
            const timer = setTimeout(() => navigate('/reviewer/claims'), 3500); // Redirect after success
            return () => clearTimeout(timer);
        }
        if (submitApprovalStatus === 'failed') {
            setShowSubmitErrorAlert(true);
            setShowSuccessAlert(false);
        }
    }, [submitApprovalStatus, navigate]);

    // --- File Validation ---
    const validateReviewerFiles = (files) => {
        if (!files || files.length === 0) return true; // Optional files are valid if none are selected
        if (files.length > MAX_REVIEWER_FILES) {
            return `You can upload a maximum of ${MAX_REVIEWER_FILES} reviewer documents.`;
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue; // Should not happen with input type=file
            if (file.size > MAX_FILE_SIZE_BYTES) {
                return `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
            }
            // Example: Add allowed extension check
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i;
            if (!allowedExtensions.exec(file.name)) {
                return `File "${file.name}" has an invalid type. Allowed: png, jpg, jpeg, pdf, doc, docx.`;
            }
        }
        return true; // Validation passes
    };

    // --- Form Submission ---
    const handleSubmit = (event) => {
        event.preventDefault();
        setFormError(''); // Clear previous local validation errors
        setShowSubmitErrorAlert(false); // Clear previous submit errors
        dispatch(resetSubmitApprovalStatus()); // Reset status for new attempt

        // 1. Local validation
        if (!reviewerNotes.trim()) {
            setFormError('Reviewer comments are required to submit for approval.');
            return;
        }
        const fileValidationResult = validateReviewerFiles(reviewerDocs);
        if (fileValidationResult !== true) {
            setFormError(fileValidationResult);
            return;
        }

        // 2. Prepare FormData
        const formData = new FormData();
        formData.append('reviewer_notes', reviewerNotes);
        if (reviewerDocs && reviewerDocs.length > 0) {
            for (let i = 0; i < reviewerDocs.length; i++) {
                formData.append('reviewer_documents[]', reviewerDocs[i]);
            }
        }

        // 3. Dispatch action
        dispatch(submitForApproval({ claimId: claim.id, formData }));
    };

    // --- Helper for Badges ---
    const renderStatusBadge = (status) => { /* ... see previous version ... */ };

    // --- Render Logic ---
    let content;
    if (detailStatus === 'loading') { /* ... Spinner ... */ }
    else if (detailStatus === 'failed') { content = <Alert variant="danger">Error loading claim: {detailError}</Alert>; }
    else if (detailStatus === 'succeeded' && claim) {
        // Secondary Authorization check on frontend
        if (String(claim.assigned_reviewer_id) !== String(currentUser?.id)) {
            content = <Alert variant="danger">Error: Claim {claimId} is not assigned to you.</Alert>;
        } else {
            const claimantDocuments = claim.documents?.filter(doc => !doc.is_review_document) || [];
            const reviewerDocuments = claim.documents?.filter(doc => doc.is_review_document) || [];
            const canSubmit = claim.status === 'Under Review'; // Determine if submit button should be active

            content = (
                <Form noValidate onSubmit={handleSubmit}>
                    <Row>
                        {/* Column 1: Claim Details */}
                        <Col md={7} lg={8} className="mb-3 mb-md-0">
                            <Card className="shadow-sm h-100">
                                <Card.Header>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <Card.Title as="h4" className="mb-0">Claim Details: {claim.id}</Card.Title>
                                        {renderStatusBadge(claim.status)}
                                    </div>
                                </Card.Header>
                                <Card.Body>
                                    {/* Claim Info (Type, Dates, Claimant, Desc) */}
                                    {/* ... display claim details ... */}
                                    <p><strong>Claimant:</strong> {claim.claimant_name || 'N/A'}</p>
                                    <p><strong>Description:</strong></p>
                                    <p style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>{claim.description || 'N/A'}</p>


                                    <hr />
                                    {/* Claimant Docs */}
                                    <h5>Claimant Documents</h5>
                                    {claimantDocuments.length > 0 ? <ListGroup variant="flush">{claimantDocuments.map(doc => <ListGroup.Item key={doc.id}> {/* ... Doc display ... */} </ListGroup.Item>)}</ListGroup> : <p className="text-muted">None submitted.</p>}

                                    {/* Previously added Reviewer Docs */}
                                    {reviewerDocuments.length > 0 && <>
                                        <hr />
                                        <h5>Your Previous Documents</h5>
                                        <ListGroup variant="flush">{reviewerDocuments.map(doc => <ListGroup.Item key={doc.id}> {/* ... Doc display ... */} </ListGroup.Item>)}</ListGroup>
                                    </>}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Column 2: Reviewer Actions */}
                        <Col md={5} lg={4}>
                            <Card className="shadow-sm h-100">
                                <Card.Header><Card.Title as="h5">Review & Submit</Card.Title></Card.Header>
                                <Card.Body className="d-flex flex-column"> {/* Flex column for spacing */}
                                    {/* Alerts */}
                                    {showSuccessAlert && <Alert variant="success" onClose={() => setShowSuccessAlert(false)} dismissible>Submitted successfully! Redirecting...</Alert>}
                                    {showSubmitErrorAlert && submitApprovalError && <Alert variant="danger" onClose={() => { setShowSubmitErrorAlert(false); dispatch(resetSubmitApprovalStatus()); }} dismissible>{submitApprovalError}</Alert>}
                                    {formError && <Alert variant="warning" onClose={() => setFormError('')} dismissible>{formError}</Alert>}

                                    {/* Allow input only if in correct status */}
                                    {canSubmit ? <>
                                        {/* Reviewer Notes */}
                                        <Form.Group className="mb-3" controlId="reviewerNotes">
                                            <Form.Label>Your Comments <span className="text-danger">*</span></Form.Label>
                                            <Form.Control as="textarea" rows={5} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} isInvalid={!!formError && !reviewerNotes.trim()} disabled={submitApprovalStatus === 'loading'}/>
                                        </Form.Group>
                                        {/* Reviewer Documents */}
                                        <Form.Group controlId="reviewerDocuments" className="mb-3">
                                            <Form.Label>Upload Your Documents (Optional)</Form.Label>
                                            <Form.Control type="file" multiple onChange={(e) => setReviewerDocs(e.target.files)} isInvalid={!!formError && formError.includes('upload')} disabled={submitApprovalStatus === 'loading'}/>
                                        </Form.Group>
                                    </> : <Alert variant='info' className='mb-3'>This claim cannot be submitted for approval in its current status ({claim.status}).</Alert>}

                                    <div className="mt-auto d-grid"> {/* Pushes button down, makes it full width */}
                                        <Button variant="success" type="submit" disabled={!canSubmit || submitApprovalStatus === 'loading'}>
                                            {submitApprovalStatus === 'loading' ? ( <><Spinner size="sm" /> Submitting...</> ) : ('Submit for Final Approval')}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            );
        }
    } else { // Default / No Claim case
        content = <Alert variant="info">Claim data is not available.</Alert>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            <div className="mb-3">
                <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}> {/* Better back navigation */}
                    <i className="bi bi-arrow-left me-1"></i> Back
                </Button>
            </div>
            {content}
        </Container>
    );
};

export default ReviewClaimDetailPage;