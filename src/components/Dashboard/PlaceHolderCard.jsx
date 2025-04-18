// src/components/Dashboard/PlaceholderCard.jsx
import React from 'react';
import { Card } from 'react-bootstrap';

const PlaceholderCard = ({ title }) => {
    return (
        <Card className="mb-3 mb-lg-5">
            <Card.Header>
                <Card.Title>{title || 'Placeholder Card'}</Card.Title>
            </Card.Header>
            <Card.Body>
                <p>Content for {title || 'this card'} will go here.</p>
                {/* You can add specific styling or height based on original template */}
            </Card.Body>
            {/* Optional Footer */}
            {/* <Card.Footer>Card Footer</Card.Footer> */}
        </Card>
    );
};

export default PlaceholderCard;