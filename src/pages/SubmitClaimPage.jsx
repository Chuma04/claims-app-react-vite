// src/pages/SubmitClaimPage.jsx
import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
    submitClaim,
    selectSubmitStatus,
    selectSubmitError,
    resetSubmitStatus,
    fetchClaimTypesForClaimant,
    selectClaimTypes,
    selectClaimTypesStatus,
    selectClaimTypesError
} from '../store/slices/claimsSlice';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_KB = MAX_FILE_SIZE_MB * 1024;

const SubmitClaimPage = () => {
    const dispatch = useDispatch();
    const submitStatus = useSelector(selectSubmitStatus);
    const submitError = useSelector(selectSubmitError);
    const { user: currentUser } = useSelector((state) => state.auth);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);

    const claimTypes = useSelector(selectClaimTypes);
    const claimTypesStatus = useSelector(selectClaimTypesStatus);
    const claimTypesError = useSelector(selectClaimTypesError);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
        mode: 'onTouched',
        defaultValues: {
            claimType: '',
            incident_date: '',
            description: '',
            documents: null,
        }
    });

    useEffect(() => {
        dispatch(fetchClaimTypesForClaimant());
    }, [dispatch]);

    useEffect(() => {
        reset({
            claimType: '',
            incident_date: '',
            description: '',
            documents: null,
        });
    }, [currentUser, reset]);

    useEffect(() => {
        dispatch(resetSubmitStatus());
        return () => {
            dispatch(resetSubmitStatus());
        };
    }, [dispatch]);

    useEffect(() => {
        if (submitStatus === 'succeeded') {
            setShowSuccessAlert(true);
            setShowErrorAlert(false);
            reset();
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
        dispatch(resetSubmitStatus());
    };
    const handleDismissSuccess = () => {
        setShowSuccessAlert(false);
    };

    const onSubmit = (data) => {
        console.log("Raw Form Data:", data);
        setShowSuccessAlert(false);
        setShowErrorAlert(false);

        const formData = new FormData();
        formData.append('claimType', data.claimType);
        formData.append('incident_date', data.incident_date);
        formData.append('description', data.description);

        if (data.documents && data.documents.length > 0) {
            for (let i = 0; i < data.documents.length; i++) {
                if (data.documents[i] instanceof File) {
                    formData.append('documents[]', data.documents[i]);
                }
            }
        }

        dispatch(submitClaim(formData));
    };

    const validateFiles = (files) => {
        if (!files) return true;
        if (files.length > 5) return 'You can upload a maximum of 5 files.';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!(file instanceof File)) continue;

            if (file.size > MAX_FILE_SIZE_KB * 1024) {
                return `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
            }
            const allowedExtensions = /(\.png|\.jpg|\.jpeg|\.pdf|\.doc|\.docx)$/i;
            if (!allowedExtensions.exec(file.name)) {
                return `File "${file.name}" has an invalid type. Allowed types: png, jpg, jpeg, pdf, doc, docx.`;
            }
        }
        return true;
    };

    return (
        <Container fluid className="pt-4 pb-4">
            <Card className="mb-3 mb-lg-5 shadow-sm">
                <Card.Header>
                    <Card.Title as="h2">Submit New Claim</Card.Title>
                </Card.Header>
                <Card.Body>
                    {showSuccessAlert && <Alert variant="success" onClose={handleDismissSuccess} dismissible>Claim submitted successfully!</Alert>}
                    {showErrorAlert && submitError && <Alert variant="danger" onClose={handleDismissError} dismissible><Alert.Heading as="h6">Submission Failed</Alert.Heading>{submitError}</Alert>}

                    <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                        <Row className="mb-3">
                            <Form.Group as={Col} md="6" controlId="claimType">
                                <Form.Label>Claim Type <span className="text-danger">*</span></Form.Label>
                                <Form.Select
                                    {...register("claimType", { required: "Claim type is required" })}
                                    isInvalid={!!errors.claimType}
                                    disabled={isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading'}
                                >
                                    <option value="">Choose...</option>
                                    {claimTypesStatus === 'loading' ? (
                                        <option disabled>Loading Claim Types...</option>
                                    ) : claimTypesError ? (
                                        <option disabled>Error loading claim types: {claimTypesError}</option>
                                    ) : (
                                        claimTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))
                                    )}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{errors.claimType?.message}</Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group as={Col} md="6" controlId="incidentDate">
                                <Form.Label>Date of Incident <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="date"
                                    {...register("incident_date", {
                                        required: "Date of incident is required",
                                        validate: value => !value || new Date(value) <= new Date() || "Incident date cannot be in the future"
                                    })}
                                    isInvalid={!!errors.incident_date}
                                    disabled={isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading'}
                                />
                                <Form.Control.Feedback type="invalid">{errors.incident_date?.message}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>

                        <Form.Group className="mb-3" controlId="incidentDescription">
                            <Form.Label>Description of Incident <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Provide details about the incident..."
                                {...register("description", {
                                    required: "Description is required",
                                    maxLength: { value: 5000, message: "Description cannot exceed 5000 characters" }
                                })}
                                isInvalid={!!errors.description}
                                disabled={isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading'}
                            />
                            <Form.Control.Feedback type="invalid">{errors.description?.message}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group controlId="claimDocuments" className="mb-4">
                            <Form.Label>Upload Supporting Documents (Optional, Max {MAX_FILE_SIZE_MB}MB each, Max 5 files)</Form.Label>
                            <Form.Control
                                type="file"
                                multiple
                                {...register("documents", {
                                    validate: validateFiles
                                })}
                                isInvalid={!!errors.documents}
                                disabled={isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading'}
                            />
                            {errors.documents && (
                                <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                    {errors.documents.message}
                                </Form.Control.Feedback>
                            )}
                        </Form.Group>

                        <div className="d-flex justify-content-end">
                            <Button variant="primary" type="submit" disabled={isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading'}>
                                {(isSubmitting || submitStatus === 'loading' || claimTypesStatus === 'loading') ? (
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