import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import TrendChart from '../components/TrendChart';
import RecommendationPanel from '../components/RecommendationPanel';
import FinancialInsights from '../components/FinancialInsights';
import ConversionInsights from '../components/ConversionInsights';
import { IndianRupee, ShoppingCart, TrendingUp, Activity } from 'lucide-react';
import { calculateROAS, calculateCPO, formatCurrency } from '../utils/metrics';


const Dashboard = () => {
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalSpend: 0,
        totalRevenue: 0,
        totalOrders: 0,
        avgRoas: 0,
    });

    useEffect(() => {
        const fetchSkus = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5001/api/skus', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setSkus(data);
                    calculateMetrics(data);
                }
            } catch (error) {
                console.error('Error fetching SKUs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSkus();
    }, []);

    const calculateMetrics = (data) => {
        const totalSpend = data.reduce((acc, sku) => acc + Number(sku.spend), 0);
        const totalRevenue = data.reduce((acc, sku) => acc + Number(sku.revenue), 0);
        const totalOrders = data.reduce((acc, sku) => acc + Number(sku.orders), 0);
        const avgRoas = calculateROAS(totalRevenue, totalSpend);

        setMetrics({
            totalSpend,
            totalRevenue,
            totalOrders,
            avgRoas,
        });
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">Dashboard</h1>
                            <p className="text-gray-400 mt-1">Welcome back, here's what's happening today.</p>
                        </div>
                        <div className="flex gap-4">
                            <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                                Last 30 Days
                            </button>
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg hover:shadow-purple-500/30">
                                Export Report
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">Loading data...</div>
                    ) : skus.length === 0 ? (
                        <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700">
                            <h3 className="text-xl font-bold mb-2">No Data Available</h3>
                            <p className="text-gray-400 mb-6">Add your first SKU to see performance metrics.</p>
                            <a href="/add-sku" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors">
                                Add SKU Data
                            </a>
                        </div>
                    ) : (
                        <>
                            <FinancialInsights />
                            <ConversionInsights />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                                <KPICard
                                    title="Total Spend"
                                    value={formatCurrency(metrics.totalSpend)}
                                    icon={IndianRupee}
                                    trend="+12.5%"
                                    trendUp={false}
                                    color="bg-blue-500/10 text-blue-500"
                                />
                                <KPICard
                                    title="Total Revenue"
                                    value={formatCurrency(metrics.totalRevenue)}
                                    icon={Activity}
                                    trend="+25.2%"
                                    trendUp={true}
                                    color="bg-green-500/10 text-green-500"
                                />
                                <KPICard
                                    title="Total Orders"
                                    value={metrics.totalOrders}
                                    icon={ShoppingCart}
                                    trend="+8.1%"
                                    trendUp={true}
                                    color="bg-purple-500/10 text-purple-500"
                                />
                                <KPICard
                                    title="Average ROAS"
                                    value={`${metrics.avgRoas}x`}
                                    icon={TrendingUp}
                                    trend="-2.4%"
                                    trendUp={false}
                                    color="bg-orange-500/10 text-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <h2 className="text-xl font-bold mb-4">Revenue Trend</h2>
                                    <TrendChart data={skus} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Recommendations</h2>
                                    <RecommendationPanel skus={skus} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
