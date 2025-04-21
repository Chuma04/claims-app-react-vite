import React, { useState, useRef, useEffect } from 'react';
import { Navbar, Nav, Dropdown, Button, Image, Container, Spinner } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';

const Header = ({ onToggleSidebar, sidebarCollapsed }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const user = useSelector((state) => state.auth.user);
    const authLoading = useSelector((state) => state.auth.loading);
    const dropdownRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <Navbar bg="white" expand="xl" className="navbar-expand-xl navbar-fixed navbar-height navbar-container navbar-bordered" fixed="top">
            <Container fluid>
                <div className="d-flex align-items-center me-auto">
                    {/* Logo */}
                    <Navbar.Brand as={Link} to="/" aria-label="Front" className="me-3">
                        <Image className="navbar-brand-logo" src="./assets/img/logos/kualalogo.jpg" alt="Logo" />
                        <Image className="navbar-brand-logo-mini" src="/assets/svg/logos/logo-short.svg" alt="Mini Logo" style={{ display: 'none' }}/>
                    </Navbar.Brand>

                    {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/forbidden' && (
                        <Button
                            variant="link"
                            onClick={onToggleSidebar}
                            className="js-navbar-vertical-aside-toggle-invoker navbar-aside-toggler d-none d-xl-block p-0"
                        >
                            <i
                                className="bi-arrow-bar-left navbar-toggler-short-align"
                                style={{ display: sidebarCollapsed ? 'none' : 'inline-block' }}
                            ></i>
                            <i
                                className="bi-arrow-bar-right navbar-toggler-full-align"
                                style={{ display: sidebarCollapsed ? 'inline-block' : 'none' }}
                            ></i>
                        </Button>
                    )}
                </div>

                <Nav className="d-flex justify-content-end align-items-center">
                    {isAuthenticated ? (
                        <div ref={dropdownRef} className="position-relative">
                            <Button variant="white" onClick={toggleDropdown} className="d-flex align-items-center">
                                <span className="me-2">{user?.name || 'User'}</span>
                                <i className="bi bi-caret-down-fill"></i>
                            </Button>

                            <Dropdown.Menu show={isOpen} align="end">
                                <Dropdown.ItemText className="text-center small text-capitalize">{user?.role || 'N/A'}</Dropdown.ItemText>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={handleLogout}>Sign out</Dropdown.Item>
                            </Dropdown.Menu>
                        </div>
                    ) : (
                        <>
                            {location.pathname !== '/login' && !authLoading && (
                                <Nav.Item>
                                    <Button variant="primary" size="sm" onClick={() => navigate('/login')}>Login</Button>
                                </Nav.Item>
                            )}
                            {authLoading && (
                                <Nav.Item>
                                    <Spinner animation="border" size="sm" variant="secondary"/>
                                </Nav.Item>
                            )}
                        </>
                    )}
                </Nav>
            </Container>
        </Navbar>
    );
};

export default Header;