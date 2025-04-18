// src/pages/ForbiddenPage.jsx
import React from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const ForbiddenPage = () => {
    const location = useLocation();
    const attemptedPath = location.state?.from?.pathname;

    return (
        <Container fluid className="d-flex vh-100 justify-content-center align-items-center bg-light">
            <Row className="justify-content-center w-100">
                <Col md={8} lg={6}>
                    <Card className="text-center shadow-sm">
                        <Card.Header className="bg-danger text-white">
                            <Card.Title as="h3"><i className="bi bi-exclamation-octagon-fill me-2"></i>Access Denied</Card.Title>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <Card.Text className="fs-5">
                                You do not have permission to access this page
                                {attemptedPath && ` (${attemptedPath})`}.
                            </Card.Text>
                            <Card.Text>
                                Please contact your administrator if you believe this is an error.
                            </Card.Text>
                            <Link to="/">
                                <Button variant="primary" className="mt-3">Go to Dashboard</Button>
                            </Link>
                            {' '} {/* Space between buttons */}
                            <Link to="/login">
                                <Button variant="outline-secondary" className="mt-3">Login as different user</Button>
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ForbiddenPage;