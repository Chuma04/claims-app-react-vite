import React from 'react';
import { Container, Card, Table, Badge, Button } from 'react-bootstrap';

const AdminDashboardPage = () => {
    // Mock Data for Admin View
    const pendingClaims = [
        { id: 'C1002', type: 'Home Damage (Water)', date: '2024-03-20', status: 'Under Review', assignedTo: 'Adjuster B' },
        { id: 'C1003', type: 'Travel Medical', date: '2024-03-22', status: 'Pending', assignedTo: null },
        { id: 'C1004', type: 'Auto Minor', date: '2024-03-28', status: 'Pending', assignedTo: null },
    ];

    const handleApprove = (id) => alert(`Approve action for ${id} (simulation)`);
    const handleDeny = (id) => alert(`Deny action for ${id} (simulation)`);
    const handleAssign = (id) => alert(`Assign action for ${id} (simulation)`);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending': return <Badge bg="secondary">Pending</Badge>;
            case 'Under Review': return <Badge bg="warning" text="dark">Under Review</Badge>; // Using text="dark" for better contrast on yellow
            default: return <Badge bg="light" text="dark">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="pt-4 pb-4">
            <Card className="mb-3 mb-lg-5">
                <Card.Header>
                    <Card.Title as="h2">Admin Dashboard - Claim Processing</Card.Title>
                </Card.Header>
                <Card.Body>
                    <h4 className="mb-3">Claims Awaiting Action</h4>
                    <Table striped bordered hover responsive size="sm"> {/* Added responsive and size */}
                        <thead>
                        <tr>
                            <th>Claim ID</th>
                            <th>Type</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Actions (Maker/Checker)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pendingClaims.map(claim => (
                            <tr key={claim.id}>
                                <td>{claim.id}</td>
                                <td>{claim.type}</td>
                                <td>{claim.date}</td>
                                <td>{getStatusBadge(claim.status)}</td>
                                <td>{claim.assignedTo || '-'}</td>
                                <td>
                                    {/* Simulate different actions based on status/role */}
                                    {claim.status === 'Pending' && <Button variant="outline-info" size="sm" className="me-1" onClick={() => handleAssign(claim.id)}>Assign</Button>}
                                    {claim.status === 'Under Review' && <Button variant="outline-success" size="sm" className="me-1" onClick={() => handleApprove(claim.id)}>Approve</Button>}
                                    {claim.status === 'Under Review' && <Button variant="outline-danger" size="sm" onClick={() => handleDeny(claim.id)}>Deny</Button>}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};
export default AdminDashboardPage;