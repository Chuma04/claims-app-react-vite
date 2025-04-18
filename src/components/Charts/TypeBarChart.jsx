import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PropTypes from 'prop-types';

const TypeBarChart = ({ data }) => {

    if (!data || data.length === 0) {
        return <p className="text-center text-muted">No claim type data to display.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{
                    top: 5, right: 30, left: 20, bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0"/>
                <XAxis dataKey="name" stroke="#495057" />
                <YAxis allowDecimals={false} stroke="#495057" />
                <Tooltip formatter={(value, name) => [value, 'Count']} />
                <Legend />
                <Bar dataKey="value" name="Claims by Type" fill="#0d6efd" /> {/* Bootstrap primary blue */}
            </BarChart>
        </ResponsiveContainer>
    );
};

TypeBarChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
    })).isRequired,
};

export default TypeBarChart;