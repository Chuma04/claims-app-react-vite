// src/App.jsx
import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// --- Page Components ---
import DashboardPage from './pages/DashboardPage';
// Claimant Pages
import ClaimsHistoryPage from './pages/ClaimsHistoryPage';
import SubmitClaimPage from './pages/SubmitClaimPage';
import ClaimStatusPage from './pages/ClaimStatusPage';
import ClaimDetailPage from './pages/ClaimDetailPage';
// Reviewer Pages
import ReviewClaimsPage from "./pages/ReviewClaimsPage.jsx";
import ReviewClaimDetailPage from "./pages/ReviewClaimDetailPage.jsx";
// Checker Pages
import AllClaimsPage from "./pages/AllClaimsPage.jsx";
import UserManagementPage from './pages/UserManagementPage.jsx';
// Other Shared Pages
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';

const ROLES = {
    CLAIMANT: 'claimant',
    MAKER: 'reviewer',
    CHECKER: 'checker'
};

// --- App Component ---
function App() {
    const location = useLocation();
    const showLayout = location.pathname !== '/login' && location.pathname !== '/forbidden';
    const LayoutWrapper = ({ children }) => (showLayout ? <Layout>{children}</Layout> : <>{children}</>);

    return (
        <LayoutWrapper>
            <Routes>
                {/* --- Public Routes --- */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                {/* --- Authenticated Routes --- */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                {/* --- Claimant Routes --- */}
                <Route
                    path="/submit-claim"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}>
                            <SubmitClaimPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/claim-status"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}>
                            <ClaimStatusPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/claims"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}>
                            <ClaimsHistoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/claims/:claimId"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CLAIMANT, ROLES.CHECKER]}>
                            <ClaimDetailPage />
                        </ProtectedRoute>
                    }
                />

                {/* --- Reviewer Routes --- */}
                <Route
                    path="/review-claims"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.MAKER]}>
                            <ReviewClaimsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reviewer/claims/:claimId/review"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.MAKER]}>
                            <ReviewClaimDetailPage />
                        </ProtectedRoute>
                    }
                />

                {/* --- Checker Routes --- */}
                <Route
                    path="/admin/all-claims"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                            <AllClaimsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/manage-users"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                            <UserManagementPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/admin" element={<Navigate to="/admin/all-claims" replace />} />

                {/* --- Not Found Route (Catch All) --- */}
                <Route path="*" element={showLayout ? <Layout><Container fluid className="pt-4 pb-4 text-center"><h2>404 - Page Not Found</h2></Container></Layout> : <Container fluid className="pt-4 pb-4 text-center"><h2>404 - Page Not Found</h2></Container>} />
            </Routes>
        </LayoutWrapper>
    );
}

export default App;