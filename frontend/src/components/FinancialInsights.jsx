import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertOctagon, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/metrics';

const FinancialInsights = () => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5001/api/insights/financial', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setInsights(data);
                }
            } catch (error) {
                console.error('Error fetching financial insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    if (loading || !insights) return null;

    // Only show if there's something significant to show
    if (insights.wastedSpend === 0 && insights.opportunityOrders === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Money Saved / Wasted Spend Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertOctagon className="w-24 h-24 text-red-500" />
                </div>

                <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Potential Savings
                </h3>

                <div className="relative z-10">
                    <p className="text-3xl font-bold text-white mb-1">
                        {formatCurrency(insights.wastedSpend)}
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                        wasted on non-performing ads recently
                    </p>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-sm text-red-200">
                            By pausing low-performing SKUs, you could avoid this loss immediately.
                        </p>
                    </div>
                </div>
            </div>

            {/* Profit Opportunity Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-24 h-24 text-green-500" />
                </div>

                <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Growth Opportunity
                </h3>

                <div className="relative z-10">
                    <p className="text-3xl font-bold text-white mb-1">
                        +{insights.opportunityOrders} Orders
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                        estimated gain from budget reallocation
                    </p>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <p className="text-sm text-green-200">
                            Reallocating budget to your top <strong>{insights.topSkuCount} best SKUs</strong> could yield this growth.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialInsights;
