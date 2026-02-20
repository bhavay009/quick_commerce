
import { LayoutDashboard, BarChart2, Upload, LogOut, History } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'SKU Performance', href: '/sku-performance', icon: BarChart2 },
        { name: 'Import History', href: '/import-history', icon: History },
        { name: 'Data Input', href: '/data-input', icon: Upload },
    ];

    return (
        <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800">
            <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-800">
                <span className="text-xl font-bold text-white">Ads Intelligence</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    className={`mr-3 flex-shrink-0 h-6 w-6 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors group"
                >
                    <LogOut
                        className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-white"
                        aria-hidden="true"
                    />
                    Logout
                </button>
            </div>
        </div >
    );
};

export default Sidebar;
