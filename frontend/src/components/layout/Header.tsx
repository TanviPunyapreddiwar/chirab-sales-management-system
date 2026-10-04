import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/offers': 'Offer Register',
  '/offers/new': 'New Offer',
  '/customers': 'Customers',
  '/followups': 'Follow-ups',
  '/reports': 'Reports',
  '/documents': 'Documents',
  '/users': 'User Management',
  '/audit': 'Audit Logs',
};

export function Header() {
  const location = useLocation();
  const { user } = useAuth();

  const getTitle = () => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (location.pathname === path) return title;
    }
    if (location.pathname.startsWith('/offers/') && location.pathname.endsWith('/edit')) return 'Edit Offer';
    if (location.pathname.startsWith('/offers/')) return 'Offer Details';
    if (location.pathname.startsWith('/customers/')) return 'Customer Details';
    return 'Chirab Sales';
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 z-20">
      <h1 className="text-base font-semibold text-gray-900 flex-1">{getTitle()}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
          <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">{user?.role}</span>
          <span>{user?.name}</span>
        </div>
        <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
