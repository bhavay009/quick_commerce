import API_BASE from '../config/api';
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { History, Trash2, Calendar, FileText } from 'lucide-react';

const ImportHistory = () => {
    const [imports, setImports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [undoing, setUndoing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchImports();
    }, []);

    const fetchImports = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/imports`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setImports(data);
            }
        } catch (error) {
            console.error('Error fetching imports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUndo = async () => {
        if (!window.confirm('Are you sure you want to undo the latest import? This action cannot be irrelevant.')) return;

        setUndoing(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/imports/latest`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                setMessage('Last import undone successfully. Your dashboard has been restored.');
                fetchImports(); // Refresh list
            } else {
                const data = await response.json();
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('Failed to undo import.');
        } finally {
            setUndoing(false);
            // Clear message after 3 seconds
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">Import History</h1>
                            <p className="text-gray-400 mt-1">Track and manage your data imports.</p>
                        </div>
                        {imports.length > 0 && (
                            <button
                                onClick={handleUndo}
                                disabled={undoing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${undoing ? 'bg-red-800 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                                    }`}
                            >
                                <Trash2 className="w-4 h-4" />
                                {undoing ? 'Undoing...' : 'Undo Last Import'}
                            </button>
                        )}
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-lg border ${message.includes('Error') ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-green-900/50 border-green-500 text-green-200'}`}>
                            {message}
                        </div>
                    )}

                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Loading history...</div>
                        ) : imports.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No import history found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/50 text-gray-400 font-medium text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Filename</th>
                                        <th className="px-6 py-4 text-center">SKUs Affected</th>
                                        <th className="px-6 py-4 text-right">Rows</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {imports.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${index === 0 ? 'bg-green-500/10 text-green-500' : 'bg-gray-700 text-gray-400'}`}>
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <span className={index === 0 ? 'text-white font-medium' : 'text-gray-300'}>
                                                    {formatDate(item.created_at)}
                                                </span>
                                                {index === 0 && <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Latest</span>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                    {item.filename || 'Manual Entry'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-300">{item.sku_count || 1}</td>
                                            <td className="px-6 py-4 text-right text-gray-300">{item.row_count || 1}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportHistory;
