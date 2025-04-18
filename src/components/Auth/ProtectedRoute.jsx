// src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const location = useLocation();

    if (!isAuthenticated) {
        // User not logged in
        console.log('ProtectedRoute: Not authenticated, redirecting to login.');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if roles are required and if user has one of the allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role;
        console.log(`ProtectedRoute: Checking role. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
        if (!userRole || !allowedRoles.includes(userRole)) {
            // User logged in but does not have the required role
            console.warn('ProtectedRoute: Role not authorized, redirecting to forbidden.');
            return <Navigate to="/forbidden" state={{ from: location }} replace />;
        }
    }

    // User is authenticated and has the required role (if specified)
    console.log('ProtectedRoute: Access granted.');
    return children;
};

export default ProtectedRoute;