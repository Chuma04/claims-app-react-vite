// src/App.jsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Page Components
import DashboardPage from './pages/DashboardPage';
import ClaimsHistoryPage from './pages/ClaimsHistoryPage'; // <-- Now used for both roles
import SubmitClaimPage from './pages/SubmitClaimPage';
import ClaimStatusPage from './pages/ClaimStatusPage';
// No longer import MyClaimsPage
import ClaimDetailPage from './pages/ClaimDetailPage';
import LoginPage from './pages/LoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import AllClaimsPage from "./pages/AllClaimsPage.jsx"; // Checker's comprehensive view
import ReviewClaimsPage from "./pages/ReviewClaimsPage.jsx"; // Reviewer's queue
import { Container } from 'react-bootstrap';
import ReviewClaimDetailPage from "./pages/ReviewClaimDetailPage.jsx";


// Define Roles (Use constants for clarity)
const ROLES = {
    CLAIMANT: 'claimant',
    MAKER: 'reviewer',
    CHECKER: 'checker'
};

function App() {
    const location = useLocation();
    const showLayout = location.pathname !== '/login' && location.pathname !== '/forbidden';

    const LayoutWrapper = ({ children }) => {
        return showLayout ? <Layout>{children}</Layout> : <>{children}</>;
    }

    return (
        <LayoutWrapper>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                {/* Protected Routes */}
                {/* Dashboard accessible by all authenticated users */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                {/* Claimant Routes */}
                <Route path="/submit-claim" element={<ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}><SubmitClaimPage /></ProtectedRoute>} />
                <Route path="/claim-status" element={<ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}><ClaimStatusPage /></ProtectedRoute>} />
                {/* --- CORRECTED: Use ClaimsHistoryPage for claimant --- */}
                <Route
                    path="/claims"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CLAIMANT]}>
                            <ClaimsHistoryPage />
                        </ProtectedRoute>
                    }
                />

                {/* --- Generic Claim Detail Route (Authorization checked inside or by backend) --- */}
                {/* Allow all roles to potentially access, backend must enforce ownership/assignment */}
                <Route
                    path="/claims/:claimId"
                    element={
                        <ProtectedRoute> {/* No specific role, rely on backend/component */}
                            <ClaimDetailPage />
                        </ProtectedRoute>
                    }
                />

                {/* --- Reviewer (Maker) Routes --- */}
                <Route
                    path="/review-claims" // List page for reviewer
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.MAKER]}>
                            <ReviewClaimsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reviewer/claims/:claimId/review" // Detail/Action page for reviewer
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.MAKER]}>
                            {/* Need to create/import ReviewClaimDetailPage */}
                            <ReviewClaimDetailPage />
                        </ProtectedRoute>
                    }
                />


                {/* --- Checker Routes --- */}
                {/* Checker might view ALL claims history here, or specific filtered views */}
                <Route
                    path="/admin/claims-history" // A separate route if checker needs a dedicated "all history" view
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                            <ClaimsHistoryPage /> {/* Re-use component, fetches data based on Checker role */}
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/all-claims" // Checker's main task/management view
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                            <AllClaimsPage />
                        </ProtectedRoute>
                    }
                />
                {/* Main Admin route might point to AllClaimsPage or a different dashboard */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.CHECKER]}>
                            <AllClaimsPage /> {/* Or redirect to /admin/all-claims */}
                        </ProtectedRoute>
                    }
                />


                {/* Not Found Route - Should be last */}
                <Route path="*" element={
                    <Container fluid className="pt-4 pb-4 text-center"><h2>404 - Page Not Found</h2></Container>
                } />
            </Routes>
        </LayoutWrapper>
    );
}

export default App;