import API_BASE from '../config/api';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const AddSKU = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        sku_name: '',
        spend: '',
        impressions: '',
        orders: '',
        revenue: '',
        clicks: '',
        placement: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/skus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to add SKU');
            }

            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-8">Add New SKU Data</h1>

                    <div className="max-w-2xl bg-gray-800 rounded-xl p-8 shadow-xl border border-gray-700">
                        {error && <div className="bg-red-900/50 text-red-200 p-4 rounded mb-6 border border-red-500">{error}</div>}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">SKU Name</label>
                                <input
                                    type="text"
                                    name="sku_name"
                                    value={formData.sku_name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., Premium Coffee Blend"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Spend (₹)</label>
                                    <input
                                        type="number"
                                        name="spend"
                                        value={formData.spend}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Revenue (₹)</label>
                                    <input
                                        type="number"
                                        name="revenue"
                                        value={formData.revenue}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Impressions</label>
                                    <input
                                        type="number"
                                        name="impressions"
                                        value={formData.impressions}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Orders</label>
                                    <input
                                        type="number"
                                        name="orders"
                                        value={formData.orders}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg hover:shadow-purple-500/30"
                                >
                                    Add Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddSKU;
