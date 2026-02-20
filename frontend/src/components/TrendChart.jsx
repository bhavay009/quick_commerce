import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TrendChart = ({ data }) => {
    // Transform data for chart if needed, or use as is if it matches
    // Expecting data to have sku_name, spend, revenue

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis
                            dataKey="sku_name"
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF' }}
                            axisLine={{ stroke: '#4B5563' }}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF' }}
                            axisLine={{ stroke: '#4B5563' }}
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Bar dataKey="spend" fill="#ef4444" name="Spend" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TrendChart;
