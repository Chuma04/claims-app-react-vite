import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';

// Define colors (match Bootstrap theme or choose distinct ones)
const STATUS_COLORS = {
    Pending: '#6c757d',      // Bootstrap secondary
    'Under Review': '#ffc107', // Bootstrap warning
    Approved: '#198754',     // Bootstrap success
    Denied: '#dc3545',       // Bootstrap danger
};

const StatusPieChart = ({ data }) => {
    // Ensure data has colors mapped
    const coloredData = data.map(entry => ({
        ...entry,
        fill: STATUS_COLORS[entry.name] || '#adb5bd' // Default color if status not found
    }));

    if (!data || data.length === 0) {
        return <p className="text-center text-muted">No status data to display.</p>;
    }

    return (
        // Set a reasonable aspect ratio or height
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={coloredData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Optional: Label on slices
                    outerRadius={80}
                    fill="#8884d8" // Default fill (overridden by Cell)
                    dataKey="value"
                    nameKey="name"
                >
                    {coloredData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} claims`, name]} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

StatusPieChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
    })).isRequired,
};

export default StatusPieChart;