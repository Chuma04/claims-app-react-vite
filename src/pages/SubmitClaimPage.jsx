// src/pages/SubmitClaimPage.jsx
import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { submitClaim, selectSubmitStatus, selectSubmitError, resetSubmitStatus } from '../store/slices/claimsSlice';

// Define File size limit in MB and KB
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_KB = MAX_FILE_SIZE_MB * 1024;

const SubmitClaimPage = () => {
    const dispatch = useDispatch();
    const submitStatus = useSelector(selectSubmitStatus);
    const submitError = useSelector(selectSubmitError);
    const { user: currentUser } = useSelector((state) => state.auth); // Get current user for prefill
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);

    // --- React Hook Form Setup ---
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        mode: 'onTouched', // Validate on blur/change
        defaultValues: {
            claimType: '',
            incident_date: '', // Match name expected by backend validation
            // claimantName: currentUser?.name || '', // Pre-fill name (Not sending this)
            description: '', // Match name expected by backend validation
            documents: null, // react-hook-form uses FileList here
        }
    });
    // --- End React Hook Form Setup ---

    // Reset default values if user info loads after component mount
    useEffect(() => {
        reset({
            claimType: '',
            incident_date: '',
            description: '',
            documents: null,
        });
    }, [currentUser, reset]);


    // Reset submit status on mount/unmount
    useEffect(() => {
        dispatch(resetSubmitStatus());
        return () => {
            dispatch(resetSubmitStatus());
        };
    }, [dispatch]);

    // Show alerts based on Redux status
    useEffect(() => {
        if (submitStatus === 'succeeded') {
            setShowSuccessAlert(true);
            setShowErrorAlert(false);
            reset(); // Reset form to default values
            const timer = setTimeout(() => setShowSuccessAlert(false), 5000);
            return () => clearTimeout(timer);
        }
        if (submitStatus === 'failed') {
            setShowErrorAlert(true);
            setShowSuccessAlert(false);
        }
    }, [submitStatus, reset]);

    const handleDismissError = () => {
        setShowErrorAlert(false);
        dispatch(resetSubmitStatus()); // Clear error/status in Redux too
    };
    const handleDismissSuccess = () => {
        setShowSuccessAlert(false);
        // Optional: dispatch(resetSubmitStatus()) if needed
    };

    // Form submission using FormData
    const onSubmit = (data) => {
        console.log("Raw Form Data:", data);
        setShowSuccessAlert(false);
        setShowErrorAlert(false);

        // Create FormData object
        const formData = new FormData();

        // Append form fields (match keys expected by backend's $this->request->getPost())
        formData.append('claimType', data.claimType);
        formData.append('incident_date', data.incident_date); // Use the name registered
        formData.append('description', data.description); // Use the name registered

        // Append files (ensure field name 'documents[]' matches backend expectation)
        if (data.documents && data.documents.length > 0) {
            for (let i = 0; i < data.documents.length; i++) {
                if (data.documents[i] instanceof File) { // Safety check
                    formData.append('documents[]', data.documents[i]); // Key matches CodeIgniter expectation for multiple files
                }
            }
        }

        // Dispatch the submitClaim action with FormData
        dispatch(submitClaim(formData));
    };

    // --- FILE VALIDATION LOGIC ---
    // Add specific validation rules for files if needed
    const validateFiles = (files) => {
        if (!files) return true; // Optional files are okay if empty
        if (files.length > 5) return 'You can upload a maximum of 5 files.';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue; // Skip if not a File object

            if (file.size > MAX_FILE_SIZE_KB * 1024) { // Check size in bytes
                return `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
            }
            // You could add mime type checks here if needed
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i;
            if (!allowedExtensions.exec(file.name)) {
                return `File "${file.name}" has an invalid type. Allowed types: png, jpg, jpeg, pdf, doc, docx.`;
            }
        }
        return true; // All files are valid
    };


    return (
        <Container fluid className="pt-4 pb-4">
            <Card className="mb-3 mb-lg-5 shadow-sm">
                <Card.Header>
                    <Card.Title as="h2">Submit New Claim</Card.Title>
                </Card.Header>
                <Card.Body>
                    {/* Alerts */}
                    {showSuccessAlert && <Alert variant="success" onClose={handleDismissSuccess} dismissible>Claim submitted successfully!</Alert>}
                    {showErrorAlert && submitError && <Alert variant="danger" onClose={handleDismissError} dismissible><Alert.Heading as="h6">Submission Failed</Alert.Heading>{submitError}</Alert>}

                    {/* Form */}
                    <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                        <Row className="mb-3">
                            {/* Claim Type */}
                            <Form.Group as={Col} md="6" controlId="claimType">
                                <Form.Label>Claim Type <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    {...register("claimType", { required: "Claim type is required" })}
                                    isInvalid={!!errors.claimType}
                                    disabled={isSubmitting || submitStatus === 'loading'}
                                >
                                    <option value="">Choose...</option>
                                    {/* These values MUST match what backend ClaimTypeModel uses */}
                                    <option value="Auto Accident">Auto Accident</option>
                                    <option value="Home Damage">Home Damage</option>
                                    <option value="Travel Medidcal">Travel Medical</option>
                                    <option value="Other">Other</option>
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.claimType?.message}</Form.Control.Feedback>
                            </Form.Group>

                            {/* Incident Date */}
                            {/* IMPORTANT: Use name 'incident_date' to match backend getPost() key */}
                            <Form.Group as={Col} md="6" controlId="incidentDate">
                                <Form.Label>Date of Incident <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    {...register("incident_date", { // REGISTER WITH CORRECT KEY
                                        required: "Date of incident is required",
                                        validate: value => !value || new Date(value) <= new Date() || "Incident date cannot be in the future"
                                    })}
                                    isInvalid={!!errors.incident_date}
                                    disabled={isSubmitting || submitStatus === 'loading'}
                                />
                                <Form.Control.Feedback type="invalid">{errors.incident_date?.message}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>

                        {/* Description */}
                        {/* IMPORTANT: Use name 'description' to match backend getPost() key */}
                        <Form.Group className="mb-3" controlId="incidentDescription">
                            <Form.Label>Description of Incident <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Provide details about the incident..."
                                {...register("description", { // REGISTER WITH CORRECT KEY
                                    required: "Description is required",
                                    maxLength: { value: 5000, message: "Description cannot exceed 5000 characters" }
                                })}
                                isInvalid={!!errors.description}
                                disabled={isSubmitting || submitStatus === 'loading'}
                            />
                            <Form.Control.Feedback type="invalid">{errors.description?.message}</Form.Control.Feedback>
                        </Form.Group>

                        {/* Documents */}
                        {/* IMPORTANT: Backend expects files under name 'documents' */}
                        <Form.Group controlId="claimDocuments" className="mb-4">
                            <Form.Label>Upload Supporting Documents (Optional, Max {MAX_FILE_SIZE_MB}MB each, Max 5 files)</Form.Label>
                            <Form.Control
                                type="file"
                                multiple
                                {...register("documents", { // REGISTER WITH CORRECT KEY
                                    validate: validateFiles // Add custom file validation
                                })}
                                isInvalid={!!errors.documents}
                                disabled={isSubmitting || submitStatus === 'loading'}
                                // Use standard isInvalid, error message displayed below
                            />
                            {/* Display file validation error */}
                            {errors.documents && (
                                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                    {errors.documents.message}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        {/* Submit Button */}
                        <div className="d-flex justify-content-end">
                            <Button variant="primary" type="submit" disabled={isSubmitting || submitStatus === 'loading'}>
                                {(isSubmitting || submitStatus === 'loading') ? (
                                    <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/><span className="ms-2">Submitting...</span></>
                                ) : (
                                    'Submit Claim'
                                )}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};
export default SubmitClaimPage;