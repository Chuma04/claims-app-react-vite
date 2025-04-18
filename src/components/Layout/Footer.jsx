// src/components/Layout/Footer.jsx
import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';

const Footer = () => {
    // Get the current year
    const currentYear = new Date().getFullYear();

    return (
        <div className="footer"> {/* Keep original footer class */}
            <Container fluid> {/* Or just Container based on template */}
                <Row className="justify-content-between align-items-center">
                    <Col>
                        <p className="fs-6 mb-0">© Kuala Tech {currentYear} <span className="d-none d-sm-inline-block">

                        </span></p>
                    </Col>
                    <Col xs="auto">
                        <Nav className="list-inline list-separator">
                            <Nav.Item as="li" className="list-inline-item">
                                <Nav.Link href="#" className="list-separator-link">FAQ</Nav.Link>
                            </Nav.Item>
                            <Nav.Item as="li" className="list-inline-item">
                                <Nav.Link href="#" className="list-separator-link">License</Nav.Link>
                            </Nav.Item>
                            <Nav.Item as="li" className="list-inline-item">
                                {/* Placeholder for Keyboard Shortcuts Toggle */}
                                <button className="btn btn-ghost-secondary btn btn-icon btn-ghost-secondary rounded-circle" type="button">
                                    <i className="bi-command"></i>
                                </button>
                            </Nav.Item>
                        </Nav>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Footer;