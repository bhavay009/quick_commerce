import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Filter, Download } from 'lucide-react';
import { calculateROAS, calculateCPO, getStatus, formatCurrency } from '../utils/metrics';

const SKUPerformance = () => {
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

                    // Enrich data with calculated metrics
                    const enrichedData = data.map(sku => {
                        const roas = calculateROAS(sku.revenue, sku.spend);
                        const cpo = calculateCPO(sku.spend, sku.orders);
                        const status = getStatus(roas);
                        return { ...sku, roas, cpo, status };
                    });

                    setSkus(enrichedData);
                }
            } catch (error) {
                console.error('Error fetching SKUs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSkus();
    }, []);

    const filteredSkus = skus.filter(sku =>
        sku.sku_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">SKU Performance</h1>
                            <p className="text-gray-400 mt-1">Detailed analysis of your product performance.</p>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                            <div className="relative w-96">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search SKUs..."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                                    <Filter className="w-4 h-4" />
                                    Filter
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/50 text-gray-400 font-medium text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">SKU Name</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Spend</th>
                                        <th className="px-6 py-4 text-right">Revenue</th>
                                        <th className="px-6 py-4 text-right">ROAS</th>
                                        <th className="px-6 py-4 text-right">Orders</th>
                                        <th className="px-6 py-4 text-right">CPO</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading data...</td>
                                        </tr>
                                    ) : filteredSkus.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No SKUs found.</td>
                                        </tr>
                                    ) : (
                                        filteredSkus.map((sku) => (
                                            <tr key={sku.id} className="hover:bg-gray-750 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{sku.sku_name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${sku.status === 'Push' ? 'bg-green-900/30 text-green-400 border-green-800' :
                                                            sku.status === 'Pause' ? 'bg-red-900/30 text-red-400 border-red-800' :
                                                                'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                                                        }`}>
                                                        {sku.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-300">{formatCurrency(sku.spend)}</td>
                                                <td className="px-6 py-4 text-right text-gray-300">{formatCurrency(sku.revenue)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-medium ${sku.roas >= 2.0 ? 'text-green-400' :
                                                            sku.roas < 1.0 ? 'text-red-400' :
                                                                'text-yellow-400'
                                                        }`}>
                                                        {sku.roas}x
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-300">{sku.orders}</td>
                                                <td className="px-6 py-4 text-right text-gray-300">{formatCurrency(sku.cpo)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SKUPerformance;
