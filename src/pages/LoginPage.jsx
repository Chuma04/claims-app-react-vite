// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap'; // Added Row, Col
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuthError } from '../store/slices/authSlice'; // Import clearAuthError
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation(); // To get redirect path

    const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
    const [showError, setShowError] = useState(false); // State for dismissible alert

    const from = location.state?.from?.pathname || "/"; // Redirect path after login

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true }); // Redirect to intended page or dashboard
        }
    }, [isAuthenticated, navigate, from]);

    // Show error alert when error state changes
    useEffect(() => {
        if(error) {
            setShowError(true);
        }
    }, [error]);

    const handleLogin = (event) => {
        event.preventDefault();
        setShowError(false); // Hide previous errors on new submit
        dispatch(clearAuthError()); // Clear error state in Redux
        if (!email || !password) return;
        dispatch(loginUser({ email, password }));
    };

    const handleDismissError = () => {
        setShowError(false);
        dispatch(clearAuthError()); // Clear error in Redux store as well
    }

    return (
        // Style similar to template's auth pages if available, else basic Bootstrap
        <Container fluid className="d-flex vh-100 justify-content-center align-items-center bg-light">
            <Row className="justify-content-center w-100">
                <Col md={6} lg={5} xl={4}> {/* Control width */}
                    <Card className="shadow-sm"> {/* Added shadow */}
                        <Card.Header className="text-center bg-primary text-white"> {/* Styled header */}
                            <Card.Title as="h3" className="mb-0">Insurance Portal Login</Card.Title>
                        </Card.Header>
                        <Card.Body className="p-4"> {/* Added padding */}
                            {/* Dismissible Error Alert */}
                            {showError && error && (
                                <Alert variant="danger" onClose={handleDismissError} dismissible>
                                    <Alert.Heading as="h5" style={{ fontSize: '0.9rem' }}>Login Failed</Alert.Heading>
                                    <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
                                        {error}
                                    </p>
                                </Alert>
                            )}

                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3" controlId="formBasicEmail">
                                    <Form.Label>Email address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formBasicPassword">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </Form.Group>

                                <div className="d-grid"> {/* Make button full width */}
                                    <Button variant="primary" type="submit" disabled={loading} size="lg"> {/* Larger button */}
                                        {loading ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                <span className="ms-2">Logging in...</span>
                                            </>
                                        ) : (
                                            'Login'
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                        {/* Optional Footer */}
                        {/* <Card.Footer className="text-muted text-center small"> Demo credentials or links </Card.Footer> */}
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default LoginPage;