// src/components/Layout/Sidebar.jsx
import React, { useState } from 'react';
import { Nav, Image, Button, Collapse } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector
import { selectUserRole } from '../../store/slices/authSlice'; // Import role selector

// Define Roles constant (could import from App.jsx or a shared constants file)
const ROLES = {
    CLAIMANT: 'claimant',
    MAKER: 'reviewer',
    CHECKER: 'checker'
};


const Sidebar = ({ isSidebarMini }) => {
    const userRole = useSelector(selectUserRole); // Get user role from Redux
    const [dashboardsOpen, setDashboardsOpen] = useState(true);
    // other states...

    const getNavLinkClass = ({ isActive }) => isActive ? "nav-link active" : "nav-link";

    // Helper to check if user has AT LEAST ONE of the required roles
    const hasRole = (requiredRoles = []) => {
        if (!userRole) return false; // Not logged in or no role
        return requiredRoles.includes(userRole);
    }

    const asideClasses = `...`; // Keep existing classes

    return (
        <aside className={asideClasses}>
            <div className="navbar-vertical-container">
                <div className="navbar-vertical-footer-offset">
                    {/* Logo & Toggle ... */}

                    {/* Content */}
                    <div className="navbar-vertical-content">
                        <Nav className="nav nav-pills nav-vertical card-navbar-nav" id="navbarVerticalMenu" as="ul">
                            {/* Dashboard (visible to all logged-in users) */}
                            <Nav.Item as="li" className="nav-item">
                                <NavLink to="/" end className={getNavLinkClass}>
                                    <i className="bi-house-door nav-icon"></i>
                                    <span className="nav-link-title">Dashboard</span>
                                </NavLink>
                            </Nav.Item>

                            {/* Claimant Section */}
                            {hasRole([ROLES.CLAIMANT]) && ( // Only show section if Claimant
                                <>
                                    <Nav.Item as="li"><span className="dropdown-header mt-4">My Claims</span></Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/submit-claim" className={getNavLinkClass}>
                                            <i className="bi-pencil-square nav-icon"></i>
                                            <span className="nav-link-title">Submit Claim</span>
                                        </NavLink>
                                    </Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/claim-status" className={getNavLinkClass}>
                                            <i className="bi-check2-circle nav-icon"></i>
                                            <span className="nav-link-title">Track Claim Status</span>
                                        </NavLink>
                                    </Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/claims" className={getNavLinkClass}>
                                            <i className="bi-list-ul nav-icon"></i>
                                            <span className="nav-link-title">Claims History</span>
                                        </NavLink>
                                    </Nav.Item>
                                </>
                            )}

                            {/* Maker / Checker Section */}
                            {(hasRole([ROLES.MAKER, ROLES.CHECKER])) && ( // Show section if Maker OR Checker
                                <>
                                    <Nav.Item as="li"><span className="dropdown-header mt-4">Processing</span></Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/review-claims" className={getNavLinkClass}>
                                            <i className="bi-binoculars nav-icon"></i>
                                            <span className="nav-link-title">Review Claims</span>
                                        </NavLink>
                                    </Nav.Item>
                                    {/* Add /final-check link if needed */}
                                    {hasRole([ROLES.CHECKER]) && ( // Only Checkers see Admin
                                        <Nav.Item as="li" className="nav-item">
                                            <NavLink to="/admin" className={getNavLinkClass}>
                                                <i className="bi-shield-check nav-icon"></i>
                                                <span className="nav-link-title">Admin / Final Check</span>
                                            </NavLink>
                                        </Nav.Item>
                                    )}
                                </>
                            )}

                            {/* Spacer or other sections */}
                            {/* ... */}
                        </Nav>
                    </div>
                    {/* Footer ... */}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;