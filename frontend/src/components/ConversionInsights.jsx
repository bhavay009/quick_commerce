import React, { useState, useEffect } from 'react';
import { Eye, MousePointerClick, AlertCircle, TrendingDown, MapPin } from 'lucide-react';

const ConversionInsights = () => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5001/api/optimization/insights', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setInsights(data);
                }
            } catch (error) {
                console.error('Error fetching optimization insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    if (loading) return <div className="text-center py-8 text-gray-500">Analyzing conversion funnel...</div>;
    if (!insights) return null;

    const hasInsights = Object.values(insights).some(arr => arr.length > 0);

    if (!hasInsights) return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg mb-8 text-center">
            <h3 className="text-gray-300 font-medium">Conversion Engine Active</h3>
            <p className="text-sm text-gray-500 mt-2">No critical issues detected. Your ads are performing within normal ranges.</p>
        </div>
    );

    const categories = [
        {
            key: 'visibility',
            title: 'Visibility Issues',
            icon: Eye,
            color: 'text-blue-400',
            bg: 'bg-blue-900/20',
            border: 'border-blue-900/50',
            desc: 'Ads are being seen but ignored (High Impressions, Low Click-Through Rate).'
        },
        {
            key: 'interaction',
            title: 'Interaction Issues',
            icon: MousePointerClick,
            color: 'text-purple-400',
            bg: 'bg-purple-900/20',
            border: 'border-purple-900/50',
            desc: 'Users are clicking but not buying (High Clicks, Zero Orders).'
        },
        {
            key: 'leakage',
            title: 'Budget Leakage',
            icon: AlertCircle,
            color: 'text-red-500',
            bg: 'bg-red-900/20',
            border: 'border-red-900/50',
            desc: 'Burning budget with absolutely no return.'
        },
        {
            key: 'conversion',
            title: 'Conversion Friction',
            icon: TrendingDown,
            color: 'text-orange-400',
            bg: 'bg-orange-900/20',
            border: 'border-orange-900/50',
            desc: 'Generating orders but at a loss (Low ROAS).'
        },
        {
            key: 'placement',
            title: 'Placement Optimization',
            icon: MapPin,
            color: 'text-green-400',
            bg: 'bg-green-900/20',
            border: 'border-green-900/50',
            desc: 'Opportunities to shift budget based on placement performance.'
        }
    ];

    return (
        <div className="space-y-6 mb-12">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Conversion Optimization Engine</h2>
                <span className="text-xs bg-purple-600 px-2 py-1 rounded text-white">BETA</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {categories.map(cat => {
                    const items = insights[cat.key];
                    if (!items || items.length === 0) return null;

                    return (
                        <div key={cat.key} className={`rounded-xl border ${cat.border} ${cat.bg} p-6`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg bg-gray-900/50 ${cat.color}`}>
                                    <cat.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-lg font-bold ${cat.color} mb-1`}>{cat.title}</h3>
                                    <p className="text-sm text-gray-400 mb-4">{cat.desc}</p>

                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium text-white">{item.sku || item.placement}</span>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded bg-gray-800 ${cat.color}`}>
                                                        {item.metric}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300 mb-2">{item.message}</p>
                                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                    <span className="text-gray-500">Action:</span>
                                                    {item.action}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConversionInsights;
