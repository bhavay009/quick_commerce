import React from 'react';

const KPICard = ({ title, value, icon: Icon, trend, trendUp, color }) => {
    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center text-sm font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                        {trend}
                    </div>
                )}
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

export default KPICard;
