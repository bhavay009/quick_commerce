
import API_BASE from '../config/api';
import React, { useState } from 'react';
import Layout from '../components/Layout';

const DataInput = () => {
    const [formData, setFormData] = useState({
        sku: '',
        date: '',
        spend: '',
        impressions: '',
        orders: '',
        revenue: '',
        clicks: '',
        placement: ''
    });

    // CSV State
    const [csvData, setCsvData] = useState([]);
    const [csvError, setCsvError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const submitData = async (payload) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // If payload is array (CSV) use bulk endpoint, else use single add (which we might not strictly need here if form changes, but keeping for compatibility)
            // Actually the form also submits to /api/ads which is wrong now.
            // Let's fix both.

            const isBulk = Array.isArray(payload);
            const url = isBulk ? `${API_BASE}/api/skus/bulk` : `${API_BASE}/api/skus`;
            const body = isBulk ? JSON.stringify({ skus: payload, filename: 'Upload from Data Input' }) : JSON.stringify({
                sku_name: payload.sku,
                spend: payload.spend,
                impressions: payload.impressions,
                orders: payload.orders,
                revenue: payload.revenue
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body
            });

            if (response.ok) {
                alert('Data saved successfully!');
                setFormData({ sku: '', date: '', spend: '', impressions: '', orders: '', revenue: '', clicks: '', placement: '' });
                setCsvData([]);
            } else {
                alert('Failed to save data.');
            }
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Error saving data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitData(formData);
    };

    const handleCsvSubmit = () => {
        if (csvData.length === 0) return;
        submitData(csvData);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setCsvError('');

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            try {
                const rows = text.split('\n').map(row => row.split(','));
                const headers = rows[0].map(h => h.trim().toLowerCase());

                // Basic validation of headers
                const requiredHeaders = ['sku', 'spend', 'orders', 'revenue'];
                const missing = requiredHeaders.filter(h => !headers.includes(h));

                if (missing.length > 0) {
                    setCsvError(`Missing columns: ${missing.join(', ')}`);
                    return;
                }

                const parsedData = rows.slice(1).filter(r => r.length === headers.length).map(row => {
                    const obj = {};
                    headers.forEach((h, i) => {
                        obj[h] = row[i]?.trim();
                    });

                    // Add date if missing in CSV, default to today
                    if (!obj.date) obj.date = new Date().toISOString();

                    return obj;
                });

                setCsvData(parsedData);
            } catch (err) {
                setCsvError('Failed to parse CSV. Please ensure it is a valid CSV file.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Data Input</h1>
                <p className="mt-1 text-sm text-gray-500">Manually enter ad performance data.</p>
            </div>

            <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Add Daily Performance</h3>
                    <div className="mt-5 max-w-xl">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">SKU Name</label>
                                <input type="text" name="sku" required value={formData.sku} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                <input type="date" name="date" required value={formData.date} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Spend (₹)</label>
                                    <input type="number" name="spend" required value={formData.spend} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Revenue (₹)</label>
                                    <input type="number" name="revenue" required value={formData.revenue} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Impressions</label>
                                    <input type="number" name="impressions" required value={formData.impressions} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Orders</label>
                                    <input type="number" name="orders" required value={formData.orders} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Clicks (Optional)</label>
                                    <input type="number" name="clicks" value={formData.clicks || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Placement (Optional)</label>
                                    <select name="placement" value={formData.placement || ''} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" onChange={handleChange}>
                                        <option value="">Select...</option>
                                        <option value="Search">Search</option>
                                        <option value="Category">Category</option>
                                        <option value="Recommendation">Recommendation</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                                {loading ? 'Saving...' : 'Save Data'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Upload CSV</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>Upload a CSV file with columns: <code>sku, date, spend, impressions, orders, revenue</code>.</p>
                    </div>
                    <div className="mt-5">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                    {csvError && <p className="mt-2 text-sm text-red-600">{csvError}</p>}
                    {csvData.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-green-600">Parsed {csvData.length} rows successfully.</p>
                            <button
                                onClick={handleCsvSubmit}
                                disabled={loading}
                                className="mt-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                            >
                                {loading ? 'Uploading...' : 'Upload Parsed Data'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default DataInput;
