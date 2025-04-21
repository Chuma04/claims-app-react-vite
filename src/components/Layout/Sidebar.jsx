// src/components/Layout/Sidebar.jsx
import React from 'react'; // Removed useState as it's not used currently
import { Nav, Image, Button } from 'react-bootstrap'; // Removed Collapse
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
// Assuming selectUserRole is correctly exported from your authSlice
import { selectUserRole } from '../../store/slices/authSlice';

// Define Roles constant (ensure consistency with other files)
const ROLES = {
    CLAIMANT: 'claimant',
    MAKER: 'reviewer',
    CHECKER: 'checker'
};

// Sidebar Component
const Sidebar = ({ isSidebarMini }) => { // Removed onToggleSidebar if not used
    const userRole = useSelector(selectUserRole);

    // Helper function for NavLink active class styling
    const getNavLinkClass = ({ isActive }) => isActive ? "nav-link active" : "nav-link";

    // Helper function to check if the logged-in user has one of the specified roles
    const hasRole = (requiredRoles = []) => {
        if (!userRole) return false; // Ensure userRole exists
        return requiredRoles.includes(userRole);
    };

    // Dynamically set sidebar classes based on the 'isSidebarMini' prop
    const asideClasses = `js-navbar-vertical-aside navbar navbar-vertical-aside navbar-vertical navbar-vertical-fixed navbar-expand-xl navbar-bordered bg-white ${isSidebarMini ? 'navbar-vertical-aside-mini' : 'navbar-vertical-aside-show-xl'}`;

    return (
        <aside className={asideClasses}>
            <div className="navbar-vertical-container">
                <div className="navbar-vertical-footer-offset"> {/* Wraps content and footer */}

                    {/* Logo section */}
                    <div className="navbar-brand-wrapper justify-content-between">
                        <NavLink to="/" className="navbar-brand">
                            <Image className="navbar-brand-logo" src="/assets/svg/logos/logo.svg" alt="Logo" />
                            <Image className="navbar-brand-logo-mini" src="/assets/svg/logos/logo-short.svg" alt="Mini Logo" />
                        </NavLink>
                        {/* Internal toggle button removed, assuming control from Header */}
                    </div>

                    {/* Navigation Links */}
                    <div className="navbar-vertical-content">
                        <Nav className="nav-pills nav-vertical card-navbar-nav" id="navbarVerticalMenu" as="ul">

                            {/* --- Dashboard (Common) --- */}
                            <Nav.Item as="li" className="nav-item">
                                <NavLink to="/" end className={getNavLinkClass}> {/* `end` ensures exact match for root */}
                                    <i className="bi-house-door nav-icon"></i>
                                    <span className="nav-link-title">Dashboard</span>
                                </NavLink>
                            </Nav.Item>

                            {/* --- Claimant Section --- */}
                            {hasRole([ROLES.CLAIMANT]) && (
                                <>
                                    <Nav.Item as="li"><span className="dropdown-header mt-4">My Claims</span></Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/submit-claim" className={getNavLinkClass}>
                                            <i className="bi-pencil-square nav-icon"></i>
                                            <span className="nav-link-title">Submit Claim</span>
                                        </NavLink>
                                    </Nav.Item>
                                    {/*<Nav.Item as="li" className="nav-item">*/}
                                    {/*    <NavLink to="/claim-status" className={getNavLinkClass}>*/}
                                    {/*        <i className="bi-check2-circle nav-icon"></i>*/}
                                    {/*        <span className="nav-link-title">Track Claim Status</span>*/}
                                    {/*    </NavLink>*/}
                                    {/*</Nav.Item>*/}
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/claims" className={getNavLinkClass}>
                                            <i className="bi-list-ul nav-icon"></i>
                                            <span className="nav-link-title">Claims History</span>
                                        </NavLink>
                                    </Nav.Item>
                                </>
                            )}

                            {/* --- Reviewer (Maker) Section --- */}
                            {hasRole([ROLES.MAKER]) && (
                                <>
                                    <Nav.Item as="li"><span className="dropdown-header mt-4">Processing Queue</span></Nav.Item>
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/review-claims" className={getNavLinkClass}>
                                            <i className="bi-binoculars nav-icon"></i>
                                            <span className="nav-link-title">Review Claims</span>
                                        </NavLink>
                                    </Nav.Item>
                                </>
                            )}

                            {hasRole([ROLES.CHECKER]) && (
                                <>
                                    <Nav.Item as="li"><span className="dropdown-header mt-4">Administration</span></Nav.Item>
                                    {/* Link to the main checker claims management page */}
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/admin/all-claims" className={getNavLinkClass}>
                                            <i className="bi-shield-check nav-icon"></i>
                                            <span className="nav-link-title">Claims Management</span>
                                        </NavLink>
                                    </Nav.Item>
                                    {/* Optional History link if needed */}
                                    {/* <Nav.Item as="li" className="nav-item"> <NavLink to="/admin/claims-history" className={getNavLinkClass}>...</NavLink> </Nav.Item> */}

                                    {/* User Management Sub-section */}
                                    <Nav.Item as="li" className="nav-item">
                                        <NavLink to="/admin/manage-users" className={getNavLinkClass}> {/* <-- Point to manage-users */}
                                            <i className="bi bi-people-fill nav-icon"></i>
                                            <span className="nav-link-title">Manage Users</span> {/* <-- Updated Title */}
                                        </NavLink>
                                    </Nav.Item>
                                    {/* Consider adding: Manage Reviewers, Manage Checkers links */}
                                </>
                            )}

                        </Nav>
                    </div>
                    {/* End Sidebar Content */}

                    {/* Sidebar Footer (Placeholders for Theme/Help) */}
                    {/*<div className="navbar-vertical-footer">*/}
                    {/*    <ul className="navbar-vertical-footer-list">*/}
                    {/*        <li className="navbar-vertical-footer-list-item">*/}
                    {/*            <Button variant="ghost-secondary" className="btn-icon rounded-circle" title="Toggle Theme (placeholder)">*/}
                    {/*                <i className="bi bi-moon-stars"></i>*/}
                    {/*            </Button>*/}
                    {/*        </li>*/}
                    {/*        <li className="navbar-vertical-footer-list-item">*/}
                    {/*            <Button variant="ghost-secondary" className="btn-icon rounded-circle" title="Help (placeholder)">*/}
                    {/*                <i className="bi bi-info-circle"></i>*/}
                    {/*            </Button>*/}
                    {/*        </li>*/}
                    {/*    </ul>*/}
                    {/*</div>*/}
                    {/* End Sidebar Footer */}

                </div>
            </div>
        </aside>
    );
};

export default Sidebar;