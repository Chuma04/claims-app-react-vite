// src/pages/DashboardPage.jsx
import React, { useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import {
    // --- CORRECTED IMPORT: Remove fetchClaims, Add role-specific ones ---
    fetchClaimantClaims,
    fetchReviewerClaims,
    fetchCheckerClaims,
    // --- Keep necessary selectors/actions ---
    selectAllClaims,
    selectListStatus,
    selectListError,
    clearListError
} from '../store/slices/claimsSlice';
// Import needed selectors from authSlice
import { selectUserRole } from '../store/slices/authSlice'; // Using named selector for consistency if added

// Define Roles constant (can be imported from a shared file)
const ROLES = { CLAIMANT: 'claimant', REVIEWER: 'reviewer', CHECKER: 'checker' };

// --- Reusable Components ---

// Simple Stat Card Component (Unchanged)
const DashboardStatCard = ({ title, value, variant = 'light', icon }) => (
    <Card className={`shadow-sm mb-3 bg-${variant} ${variant !== 'light' ? 'text-white': ''}`}>
        <Card.Body>
            <div className="d-flex align-items-center">
                {icon && <i className={`${icon} fs-2 me-3`}></i>}
                <div>
                    <Card.Title as="h5" className="mb-1">{title}</Card.Title>
                    <Card.Text className="fs-4 fw-bold">{value ?? '-'}</Card.Text>
                </div>
            </div>
        </Card.Body>
    </Card>
);

// Active Claim Highlight Component (Unchanged)
const ActiveClaimHighlight = ({ claim }) => (
    <Card border="warning" className="mb-3 shadow-sm h-100">
        <Card.Header className="bg-warning text-dark py-2">
            <Card.Title as="h6" className="mb-0 d-flex justify-content-between">
                <span>Claim ID: {claim.id}</span>
                <Badge pill bg={claim.status === 'Pending Approval' ? 'info' : 'dark'} text={claim.status === 'Pending Approval' ? 'dark' : null}>
                    {claim.status}
                </Badge>
            </Card.Title>
        </Card.Header>
        <Card.Body className="py-2 px-3">
            <Card.Text className="mb-1 small"><strong>Type:</strong> {claim.claim_type_name || claim.type || 'N/A'}</Card.Text>
            <Card.Text className="small">
                <strong>Assigned:</strong> { claim.assigned_reviewer_id ? (claim.reviewer_name || `Reviewer ID: ${claim.assigned_reviewer_id}`) : (claim.status === 'Pending' ? 'Pending Assignment' : 'Unassigned') }
            </Card.Text>
        </Card.Body>
    </Card>
);

const DashboardPage = () => {
    console.log('DashboardPage rendering');
    const dispatch = useDispatch();
    const userRole = useSelector(selectUserRole);
    const currentUser = useSelector((state) => state.auth.user);

    const claims = useSelector(selectAllClaims);
    const listStatus = useSelector(selectListStatus);
    const listError = useSelector(selectListError);

    useEffect(() => {
        if (userRole && (listStatus === 'idle')) {
            console.log(`DashboardPage: Fetching data for role: ${userRole}`);
            dispatch(clearListError());
            switch(userRole) {
                case ROLES.CLAIMANT: dispatch(fetchClaimantClaims()); break;
                case ROLES.REVIEWER: dispatch(fetchReviewerClaims()); break;
                case ROLES.CHECKER: dispatch(fetchCheckerClaims()); break;
                default: console.warn("DashboardPage: Unknown role.");
            }
        }
    }, [userRole, listStatus, dispatch]);

    const dashboardStats = useMemo(() => {
        // --- Calculation logic remains the same as previous correct version ---
        if (!claims || listStatus !== 'succeeded') {
            return { total: 0, active: [], approvedCount: 0, pendingReviewCount: 0, pendingApprovalCount: 0, pendingAssignmentCount: 0, totalSystemClaims: 0 };
        }
        let stats = { total: 0, active: [], approvedCount: 0, pendingReviewCount: 0, pendingApprovalCount: 0, pendingAssignmentCount: 0, totalSystemClaims: 0 };
        stats.pendingApprovalCount = claims.filter(c => c.status === 'Pending Approval').length;
        stats.pendingAssignmentCount = claims.filter(c => c.status === 'Pending' && !c.assigned_reviewer_id).length;
        stats.totalSystemClaims = claims.length;
        switch (userRole) {
            case ROLES.CLAIMANT:
                stats.total = claims.length;
                stats.active = claims.filter(c => ['Pending', 'Under Review', 'Pending Approval'].includes(c.status));
                stats.approvedCount = claims.filter(c => c.status === 'Approved').length;
                break;
            case ROLES.REVIEWER:
                stats.total = claims.length;
                stats.pendingReviewCount = claims.filter(c => c.status === 'Under Review').length;
                break;
            case ROLES.CHECKER:
                stats.total = stats.totalSystemClaims;
                break;
        }
        return stats;
    }, [claims, listStatus, userRole]);

    // --- Render Logic ---
    let dashboardContent;

    if (listStatus === 'loading') {
        dashboardContent = <div className="text-center p-5"><Spinner animation="border" /> Loading Dashboard...</div>;
    } else if (listStatus === 'failed') {
        dashboardContent = <Alert variant="danger" onClose={() => dispatch(clearListError())} dismissible>Could not load dashboard data: {listError}</Alert>; // Added dismissible
    } else if (listStatus === 'succeeded') {
        // --- Render based on Role ---
        if (userRole === ROLES.CLAIMANT) { /* ... Claimant Content using dashboardStats ... */ }
        else if (userRole === ROLES.REVIEWER) { /* ... Reviewer Content using dashboardStats ... */ }
        else if (userRole === ROLES.CHECKER) { /* ... Checker Content using dashboardStats ... */ }
        else { /* ... Unknown role alert ... */ }
        // Ensure the content inside these role blocks uses the correct `dashboardStats` values
        // (Keeping the rendering logic from the previous correct answer)

        // --- EXAMPLE rendering logic for claimant (ensure it uses dashboardStats) ---
        if (userRole === ROLES.CLAIMANT) {
            dashboardContent = (
                <>
                    <Row className="mb-4">
                        <Col md={4}><DashboardStatCard title="Total Claims" value={dashboardStats.total} variant="primary" icon="bi bi-journal-text" /></Col>
                        <Col md={4}><DashboardStatCard title="Active Claims" value={dashboardStats.active.length} variant="warning" icon="bi bi-hourglass-split" /></Col>
                        <Col md={4}><DashboardStatCard title="Approved Claims" value={dashboardStats.approvedCount} variant="success" icon="bi bi-check2-circle" /></Col>
                    </Row>
                    <h4>Active Claims Overview</h4><hr />
                    {dashboardStats.active.length > 0 ? (
                        <Row> {dashboardStats.active.map(claim => (<Col md={6} lg={4} key={claim.id}><ActiveClaimHighlight claim={claim} /></Col>))} </Row>
                    ) : ( <Alert variant="info">You have no active claims.</Alert> )}
                </>
            );
        }
        // --- EXAMPLE rendering logic for reviewer ---
        else if (userRole === ROLES.REVIEWER) {
            dashboardContent = (
                <>
                    <Row className="mb-4">
                        <Col md={6}><DashboardStatCard title="Total Claims In Your Queue" value={dashboardStats.total} variant="info" icon="bi bi-person-check" /></Col>
                        <Col md={6}><DashboardStatCard title="Claims Ready for Review" value={dashboardStats.pendingReviewCount} variant="warning" icon="bi bi-pencil-square" /></Col>
                    </Row>
                    <Alert variant="info">Please see the "Review Claims" page for your task list.</Alert>
                </>
            );
        }
        // --- EXAMPLE rendering logic for checker ---
        else if (userRole === ROLES.CHECKER) {
            dashboardContent = (
                <>
                    <Row className="mb-4">
                        <Col md={4}><DashboardStatCard title="Pending Final Action" value={dashboardStats.pendingApprovalCount} variant="info" text="dark" icon="bi bi-clipboard2-check" /></Col>
                        <Col md={4}><DashboardStatCard title="Pending Reviewer Assignment" value={dashboardStats.pendingAssignmentCount} variant="secondary" icon="bi bi-person-plus" /></Col>
                        <Col md={4}><DashboardStatCard title="Total Claims (Visible)" value={dashboardStats.total} variant="light" icon="bi bi-database" /></Col>
                    </Row>
                    <Alert variant="info">Your primary actions are on the "Claims Management" page.</Alert>
                </>
            );
        }
        else {
            dashboardContent = <Alert variant="secondary">Welcome! Your dashboard is loading or not configured.</Alert>;
        }
    } else { // Idle state
        dashboardContent = <p>Initializing...</p>;
    }

    return (
        <>
            <div className="page-header pt-3 pb-2 px-5 mb-3 border-bottom">
                <h1 className="page-header-title">Dashboard {currentUser?.name ? `- Welcome, ${currentUser.name}!` : ''}</h1>
            </div>
            <Container fluid className="pt-3">
                {dashboardContent}
            </Container>
        </>
    );
};

export default DashboardPage;