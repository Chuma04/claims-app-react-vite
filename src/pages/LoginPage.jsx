// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Image, InputGroup } from 'react-bootstrap'; // Added Image, InputGroup
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/slices/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';

// --- Import your logo ---
// Make sure this path is correct relative to LoginPage.jsx
// import kualaLogo from '../../assets/img/logos/kualalogo.png';
import kualaLogo from '../assets/img/logos/kualalogo.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
    const [showError, setShowError] = useState(false);

    const from = location.state?.from?.pathname || "/";

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // Show dismissible error alert when 'error' state changes
    useEffect(() => {
        if (error) {
            setShowError(true);
        }
    }, [error]);

    const handleLogin = (event) => {
        event.preventDefault();
        setShowError(false); // Hide previous errors
        dispatch(clearAuthError()); // Clear redux error state
        if (!email || !password) return; // Basic client check
        dispatch(loginUser({ email, password }));
    };

    // Dismiss error alert and clear error state
    const handleDismissError = () => {
        setShowError(false);
        dispatch(clearAuthError());
    };

    return (
        // Use a slightly different background and ensure centering
        <Container fluid className="d-flex vh-100 justify-content-center align-items-center px-md-0" style={{ backgroundColor: '#f8f9fa' }}> {/* bg-light equivalent */}
            <Row className="justify-content-center w-100">
                {/* Adjusted column width for better proportion */}
                <Col xs={11} sm={8} md={7} lg={5} xl={4}>

                    {/* Logo Display Above Card */}
                    <div className="text-center mb-4">
                        <Image src={kualaLogo} alt="Kuala Insurance Logo" fluid style={{ maxWidth: '200px', height: 'auto' }} />
                    </div>

                    {/* Cleaner Card Styling */}
                    <Card className="shadow-lg border-0 rounded-4"> {/* More shadow, no border, rounder */}
                        {/* Removed Card.Header for cleaner look */}
                        <Card.Body className="p-4 p-sm-5"> {/* More padding */}
                            <Card.Title as="h2" className="text-center mb-4 fw-bold text-primary">
                                Portal Login
                            </Card.Title>

                            {/* Error Alert */}
                            {showError && error && (
                                <Alert variant="danger" onClose={handleDismissError} dismissible className="d-flex align-items-center small p-2">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    <div>{error}</div>
                                </Alert>
                            )}

                            <Form noValidate onSubmit={handleLogin}>
                                {/* Email with Icon */}
                                <Form.Group className="mb-4" controlId="loginEmail"> {/* Increased spacing */}
                                    <Form.Label>Email address</Form.Label>
                                    <InputGroup hasValidation> {/* Wrap for icon and validation */}
                                        <InputGroup.Text><i className="bi bi-envelope-fill"></i></InputGroup.Text>
                                        <Form.Control
                                            type="email"
                                            placeholder="email@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required // HTML5 required
                                            disabled={loading}
                                            aria-describedby="loginEmailFeedback"
                                            // Basic pattern validation can be added here if needed,
                                            // but relying on type="email" and backend is often sufficient
                                        />
                                        {/* Consider adding validation feedback if using react-hook-form */}
                                        {/* <Form.Control.Feedback type="invalid" id="loginEmailFeedback">
                                            Please provide a valid email.
                                        </Form.Control.Feedback> */}
                                    </InputGroup>
                                </Form.Group>

                                {/* Password with Icon */}
                                <Form.Group className="mb-4" controlId="loginPassword">
                                    <Form.Label>Password</Form.Label>
                                    <InputGroup hasValidation>
                                        <InputGroup.Text><i className="bi bi-lock-fill"></i></InputGroup.Text>
                                        <Form.Control
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required // HTML5 required
                                            disabled={loading}
                                            aria-describedby="loginPasswordFeedback"
                                        />
                                        {/* <Form.Control.Feedback type="invalid" id="loginPasswordFeedback">
                                            Password is required.
                                        </Form.Control.Feedback> */}
                                    </InputGroup>
                                </Form.Group>

                                {/* Optional: Remember Me / Forgot Password */}
                                {/* <div className="d-flex justify-content-between align-items-center mb-4">
                                    <Form.Check type="checkbox" label="Remember me" />
                                    <a href="#forgot" className="small text-decoration-none">Forgot password?</a>
                                </div> */}

                                {/* Submit Button */}
                                <div className="d-grid mt-4"> {/* Ensure button is below optional links */}
                                    <Button variant="primary" type="submit" disabled={loading} size="lg">
                                        {loading ? (
                                            <> <Spinner as="span" animation="border" size="sm"/> <span className="ms-1">Logging In...</span> </>
                                        ) : ( 'Login' )}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LoginPage;