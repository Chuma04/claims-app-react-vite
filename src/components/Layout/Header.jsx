import React from 'react';
import { Navbar, Nav, NavDropdown, Button, Image, Container, Spinner } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';


const Header = ({ onToggleSidebar }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const user = useSelector((state) => state.auth.user);
    const authLoading = useSelector((state) => state.auth.loading);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <Navbar bg="white" expand="xl" className="navbar-expand-xl navbar-fixed navbar-height navbar-container navbar-bordered" fixed="top">
            <Container fluid>
                <div className="d-flex align-items-center me-auto">

                    {/* Logo */}
                    <Navbar.Brand as={Link} to="/" aria-label="Front" className="me-3">
                        <Image className="navbar-brand-logo" src="/assets/svg/logos/logo.svg" alt="Logo" />
                        <Image className="navbar-brand-logo-mini" src="/assets/svg/logos/logo-short.svg" alt="Mini Logo" style={{ display: 'none' }}/>
                    </Navbar.Brand>

                    {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/forbidden' && (
                        <Button
                            variant="link"
                            onClick={onToggleSidebar}
                            className="js-navbar-vertical-aside-toggle-invoker navbar-aside-toggler d-none d-xl-block p-0"
                        >
                            <i className="bi-arrow-bar-left navbar-toggler-short-align"></i>
                            <i className="bi-arrow-bar-right navbar-toggler-full-align" style={{ display: 'none' }}></i>
                        </Button>
                    )}
                </div>

                <Nav className="d-flex justify-content-end align-items-center">
                    {isAuthenticated ? (
                        <Nav.Item>
                            <NavDropdown
                                title={
                                    <div className="avatar avatar-sm avatar-circle">
                                        <Image className="avatar-img" src="/assets/img/160x160/img6.jpg" alt={user?.name || 'User Avatar'} roundedCircle/>
                                        <span className="avatar-status avatar-sm-status avatar-status-success"></span>
                                    </div>
                                }
                                id="account-navbar-dropdown"
                                align="end"
                                className="navbar-dropdown-account-wrapper ms-2"
                            >
                                <div className="dropdown-item-text">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar avatar-sm avatar-circle">
                                            <Image className="avatar-img" src="/assets/img/160x160/img6.jpg" alt="User Avatar" roundedCircle />
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h5 className="mb-0 text-truncate" style={{maxWidth: '150px'}}>{user?.name || 'User'}</h5>
                                            <p className="card-text text-body small text-capitalize">{user?.role || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <NavDropdown.Divider />

                                <LinkContainer to="/profile">
                                    <NavDropdown.Item>Profile</NavDropdown.Item>
                                </LinkContainer>
                                <LinkContainer to="/settings">
                                    <NavDropdown.Item>Settings</NavDropdown.Item>
                                </LinkContainer>

                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogout}>Sign out</NavDropdown.Item>
                            </NavDropdown>
                        </Nav.Item>
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