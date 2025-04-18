import React, {useState} from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';

const ClaimStatusPage = () => {
    const [claimId, setClaimId] = useState('');
    const [claimStatus, setClaimStatus] = useState(null); // null, 'Pending', 'Under Review', 'Approved', 'Denied', 'NotFound'
    const [isLoading, setIsLoading] = useState(false);

    const handleTrackClaim = (event) => {
        event.preventDefault();
        if (!claimId) return;
        setIsLoading(true);
        setClaimStatus(null); // Reset previous status

        // Simulate API call
        console.log(`Tracking claim: ${claimId}`);
        setTimeout(() => {
            // Mock finding status based on ID
            const statuses = {
                'C1001': 'Approved',
                'C1002': 'Under Review',
                'C1003': 'Pending',
                'C9999': 'Denied',
            };
            const foundStatus = statuses[claimId.toUpperCase()] || 'NotFound';
            setClaimStatus(foundStatus);
            setIsLoading(false);
        }, 1500);
    };

    const renderStatusAlert = () => {
        if (!claimStatus) return null;

        switch (claimStatus) {
            case 'Pending':
                return <Alert variant="info">Status for claim <strong>{claimId}</strong>: Pending submission review.</Alert>;
            case 'Under Review':
                return <Alert variant="warning">Status for claim <strong>{claimId}</strong>: Currently under review by an adjuster.</Alert>;
            case 'Approved':
                return <Alert variant="success">Status for claim <strong>{claimId}</strong>: Approved. Payment processing initiated.</Alert>;
            case 'Denied':
                return <Alert variant="danger">Status for claim <strong>{claimId}</strong>: Denied. Please check your email for details.</Alert>;
            case 'NotFound':
            default:
                return <Alert variant="secondary">Claim ID <strong>{claimId}</strong> not found.</Alert>;
        }
    };


    return (
        <Container fluid className="pt-4 pb-4">
            <Card className="mb-3 mb-lg-5">
                <Card.Header>
                    <Card.Title as="h2">Track Claim Status</Card.Title>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleTrackClaim}>
                        <Form.Group className="mb-3" controlId="claimIdInput">
                            <Form.Label column={true}>Enter Claim ID</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., C1001"
                                value={claimId}
                                onChange={(e) => setClaimId(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            {isLoading ? 'Tracking...' : 'Track Claim'}
                        </Button>
                    </Form>

                    <div className="mt-4">
                        {renderStatusAlert()}
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};
export default ClaimStatusPage;