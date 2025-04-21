// src/pages/UserManagementPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    fetchUsers,
    createUser,
    selectUserList,
    selectUserListStatus,
    selectUserListError,
    selectUserCreateStatus,
    selectUserCreateError,
    resetCreateStatus,
    resetListStatus,
    // TODO: Import delete/update later
} from '../store/slices/userManagementSlice';
import {
    fetchClaimTypes, // <-- NEW: Import claim types fetch action
    selectClaimTypesList,
    selectClaimTypesStatus,
    resetClaimTypesStatus // <-- NEW: Reset for claim types
} from '../store/slices/claimsSlice';
import {selectUserRole} from "../store/slices/authSlice.js";

// Use ROLES constant
const ROLES = { CLAIMANT: 'claimant', MAKER: 'reviewer', CHECKER: 'checker' };

// --- Add User Form Sub-Component (or keep within main component) ---
const AddUserForm = ({ show, handleClose, currentRoles }) => {
    const dispatch = useDispatch();
    const createUserStatus = useSelector(selectUserCreateStatus);
    const createUserError = useSelector(selectUserCreateError);
    const claimTypes = useSelector(selectClaimTypesList); // <-- Get claim types
    const claimTypesStatus = useSelector(selectClaimTypesStatus);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        defaultValues: { username: '', email: '', password: '', password_confirm: '', role: '', claimTypeIds: [] } // Add claimTypeIds
    });
    const password = watch("password");
    const selectedRole = watch("role"); // Watch role to show/hide policy types
    const isLoading = createUserStatus === 'loading';

    // Fetch claim types when modal opens (only if adding claimant)
    useEffect(() => {
        // Fetch only if needed and not already loading/fetched
        if (show && claimTypesStatus === 'idle') {
            dispatch(fetchClaimTypes());
        }
        // Reset form and status when modal visibility changes
        if (!show) {
            reset(); // Clear form on close
            dispatch(resetCreateStatus());
            // Optional: Reset claim type status if needed, depends on lifecycle needs
            // dispatch(resetClaimTypesStatus());
        }
    }, [show, claimTypesStatus, dispatch, reset]);


    const onSubmit = (data) => {
        dispatch(resetCreateStatus());
        const { password_confirm, ...userData } = data;

        // Only include claimTypeIds if the role is Claimant and types are selected
        if (userData.role !== ROLES.CLAIMANT) {
            delete userData.claimTypeIds; // Remove if not claimant
        } else if (!userData.claimTypeIds || userData.claimTypeIds.length === 0) {
            // If claimant, require selection? Or default to all/none?
            // For now, let's assume backend handles empty array ok, or add validation
            // alert("Please select at least one policy type for a claimant.");
            // return;
            userData.claimTypeIds = []; // Ensure it's an empty array if nothing selected
        }


        console.log("Submitting New User Data:", userData);
        dispatch(createUser(userData))
            .unwrap()
            .then(() => {
                // Keep modal open on success? Show message? Close it?
                // For now, reset and rely on success alert (needs state in parent)
                // Or close immediately: handleClose();
            })
            .catch(() => { /* Error displayed via selector */ });
    };

    return (
        <Modal show={show} onHide={handleClose} backdrop="static" centered size="lg"> {/* static backdrop, larger modal */}
            <Modal.Header closeButton>
                <Modal.Title>Add New User</Modal.Title>
            </Modal.Header>
            <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                <Modal.Body>
                    {/* Error Alert for creation */}
                    {createUserStatus === 'failed' && <Alert variant="danger" onClose={() => dispatch(resetCreateStatus())} dismissible>Error: {createUserError}</Alert>}

                    <Row> {/* Username & Email */}
                        <Col md={6}> <Form.Group className="mb-3" controlId="addUsername"> {/* Unique IDs for modal */}
                            <Form.Label>Username <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="text" {...register("username", { required: "Username required." })} isInvalid={!!errors.username} disabled={isLoading} />
                            <Form.Control.Feedback type="invalid">{errors.username?.message}</Form.Control.Feedback>
                        </Form.Group> </Col>
                        <Col md={6}> <Form.Group className="mb-3" controlId="addEmail">
                            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="email" {...register("email", { required: "Email required.", pattern: { value: /^\S+@\S+$/i, message: "Invalid email."} })} isInvalid={!!errors.email} disabled={isLoading} />
                            <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
                        </Form.Group> </Col>
                    </Row>
                    <Row> {/* Password & Confirmation */}
                        <Col md={6}> <Form.Group className="mb-3" controlId="addPassword">
                            <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="password" {...register("password", { required: "Password required.", minLength: { value: 8, message: "Min 8 characters." }})} isInvalid={!!errors.password} disabled={isLoading} />
                            <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
                        </Form.Group> </Col>
                        <Col md={6}> <Form.Group className="mb-3" controlId="addPasswordConfirm">
                            <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="password" {...register("password_confirm", { required: "Confirm password.", validate: value => value === password || "Passwords don't match."})} isInvalid={!!errors.password_confirm} disabled={isLoading} />
                            <Form.Control.Feedback type="invalid">{errors.password_confirm?.message}</Form.Control.Feedback>
                        </Form.Group> </Col>
                    </Row>
                    <Row> {/* Role Selection */}
                        <Col md={6}> <Form.Group className="mb-3" controlId="addRole">
                            <Form.Label>Assign Role <span className="text-danger">*</span></Form.Label>
                            <Form.Select {...register("role", { required: "Select a role." })} isInvalid={!!errors.role} disabled={isLoading}>
                                <option value="">-- Select --</option>
                                {/* Use currentRoles from props if we want to restrict adding higher roles */}
                                <option value={ROLES.CLAIMANT}>Claimant</option>
                                <option value={ROLES.MAKER}>Reviewer</option>
                                <option value={ROLES.CHECKER}>Checker</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">{errors.role?.message}</Form.Control.Feedback>
                        </Form.Group> </Col>
                    </Row>

                    {/* --- Conditional Policy Types for Claimant --- */}
                    {selectedRole === ROLES.CLAIMANT && (
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3" controlId="addClaimTypes">
                                    <Form.Label>Allowed Policy Types (for Claimant)</Form.Label>
                                    {claimTypesStatus === 'loading' && <Spinner size="sm" />}
                                    {claimTypesStatus === 'succeeded' && claimTypes.length > 0 && (
                                        <div className="border p-2 rounded" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {claimTypes.map(type => (
                                                <Form.Check
                                                    type="checkbox"
                                                    key={type.id}
                                                    id={`claim-type-${type.id}`}
                                                    label={type.name}
                                                    value={type.id}
                                                    disabled={isLoading}
                                                    {...register("claimTypeIds")} // Register as checkbox group
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {claimTypesStatus === 'succeeded' && claimTypes.length === 0 && <Alert variant='info' size='sm'>No policy types found.</Alert>}
                                    {claimTypesStatus === 'failed' && <Alert variant='warning' size='sm'>Could not load policy types.</Alert>}
                                    {/* You might add validation error display for this field if required */}
                                </Form.Group>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}> Cancel </Button>
                    <Button variant="primary" type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner size="sm" className="me-1"/> : ''} Create User
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};


// --- Main User Management Page Component ---
const UserManagementPage = () => {
    console.log("UserManagementPage: Rendering");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const users = useSelector(selectUserList);
    const listStatus = useSelector(selectUserListStatus);
    const listError = useSelector(selectUserListError);
    const createStatus = useSelector(selectUserCreateStatus); // Status for add user action
    const currentUserRole = useSelector(selectUserRole); // Get checker's role for context potentially

    const [roleFilter, setRoleFilter] = useState(''); // State for the filter dropdown
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateSuccess, setShowCreateSuccess] = useState(false); // Local state for success alert

    // Fetch users when filter changes or on initial load if needed
    useEffect(() => {
        // Fetch based on filter, always trigger if filter changes,
        // or if idle/failed on mount.
        console.log(`UserManagementPage: Fetching users. Filter: '${roleFilter || 'all'}', Status: ${listStatus}`);
        dispatch(fetchUsers(roleFilter ? { role: roleFilter } : {})); // Pass filter object
    }, [roleFilter, dispatch]); // Fetch whenever filter changes

    // Effect to show success message after user creation
    useEffect(() => {
        if (createStatus === 'succeeded') {
            setShowCreateSuccess(true);
            // Hide after some time
            const timer = setTimeout(() => setShowCreateSuccess(false), 4000);
            // Optionally refetch the user list here if adding the user didn't update it correctly
            // dispatch(fetchUsers(roleFilter ? { role: roleFilter } : {}));
            return () => clearTimeout(timer);
        }
    }, [createStatus, roleFilter, dispatch]); // Re-check if status or filter changes


    const handleShowAddModal = () => setShowAddModal(true);
    const handleCloseAddModal = () => setShowAddModal(false);

    const handleFilterChange = (event) => {
        setRoleFilter(event.target.value);
        // Reset list status so useEffect triggers refetch
        // (Slice might need adjustment if status doesn't reset automatically)
        dispatch(resetListStatus()); // Trigger refetch by setting status to idle
    };

    // --- Render Table Content ---
    let tableContent;
    if (listStatus === 'loading') {
        tableContent = <tr><td colSpan="6" className="text-center"><Spinner animation="border" size="sm"/> Loading users...</td></tr>;
    } else if (listStatus === 'failed') {
        tableContent = <tr><td colSpan="6"><Alert variant="danger" onClose={() => dispatch(resetListStatus())} dismissible>Error loading users: {listError}</Alert></td></tr>;
    } else if (listStatus === 'succeeded' && users.length === 0) {
        tableContent = <tr><td colSpan="6" className="text-center">No users found matching the filter.</td></tr>;
    } else if (listStatus === 'succeeded') {
        tableContent = users.map(user => (
            <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                {/* Display first group name as role */}
                <td><Badge bg="info" text="white">{user.group_name || 'N/A'}</Badge></td>
                <td><Badge bg={user.active ? 'success' : 'secondary'}>{user.active ? 'Active' : 'Inactive'}</Badge></td>
                <td>{user.created_at ? new Date(user.created_at.date || user.created_at).toLocaleDateString() : 'N/A'}</td> {/* Adjust date parsing */}
                {/*<td>*/}
                {/*    /!* Add Edit/Delete placeholders *!/*/}
                {/*    <Button variant="outline-secondary" size="sm" className="me-1" title="Edit (Not Implemented)"><i className="bi bi-pencil-fill"></i></Button>*/}
                {/*    <Button variant="outline-danger" size="sm" title="Delete (Not Implemented)"><i className="bi bi-trash-fill"></i></Button>*/}
                {/*</td>*/}
            </tr>
        ));
    } else { // Idle
        tableContent = <tr><td colSpan="6" className="text-center text-muted">Select a filter or load users.</td></tr>;
    }

    return (
        <Container fluid className="pt-4 pb-4">
            {/* Success alert for user creation */}
            {showCreateSuccess && <Alert variant="success" onClose={() => setShowCreateSuccess(false)} dismissible>New user created successfully!</Alert>}

            {/* User List Card */}
            <Card className="shadow-sm">
                <Card.Header>
                    <Row className="align-items-center">
                        <Col md={4}> <Card.Title as="h3" className="mb-0">User Management</Card.Title> </Col>
                        <Col md={4}>
                            {/* Filter Dropdown */}
                            <Form.Group controlId="roleFilter" className="d-flex align-items-center">
                                <Form.Label className="me-2 mb-0 small text-nowrap">Filter by Role:</Form.Label>
                                <Form.Select size="sm" value={roleFilter} onChange={handleFilterChange}>
                                    <option value="">All Roles</option>
                                    <option value={ROLES.CLAIMANT}>Claimant</option>
                                    <option value={ROLES.MAKER}>Reviewer</option>
                                    <option value={ROLES.CHECKER}>Checker</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="text-end">
                            <Button variant="primary" size="sm" onClick={handleShowAddModal}>
                                <i className="bi bi-plus-lg me-1"></i> Add New User
                            </Button>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body>
                    <Table striped bordered hover responsive size="sm">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>{tableContent}</tbody>
                    </Table>
                    {/* Pagination placeholder if needed */}
                </Card.Body>
            </Card>

            {/* Add User Modal */}
            <AddUserForm
                show={showAddModal}
                handleClose={handleCloseAddModal}
                currentRoles={[ROLES.CLAIMANT, ROLES.MAKER, ROLES.CHECKER]} // Pass allowed roles
            />
        </Container>
    );
};

export default UserManagementPage;