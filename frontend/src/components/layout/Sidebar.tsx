import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Plus, Users, Building2,
  BarChart3, FolderOpen, Settings, Shield, ClipboardList,
  PhoneCall, ChevronDown, ChevronRight, LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface NavItem {
  label: string;
  to?: string;
  icon: React.ElementType;
  children?: NavItem[];
  roles?: string[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  {
    label: 'Sales',
    icon: FileText,
    children: [
      { label: 'Offer Register', to: '/offers', icon: ClipboardList },
      { label: 'New Offer', to: '/offers/new', icon: Plus },
      { label: 'Follow-ups', to: '/followups', icon: PhoneCall },
    ],
  },
  { label: 'Customers', to: '/customers', icon: Building2 },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Documents', to: '/documents', icon: FolderOpen },
  {
    label: 'Administration',
    icon: Settings,
    roles: ['ADMIN', 'MANAGEMENT'],
    children: [
      { label: 'Users', to: '/users', icon: Users, roles: ['ADMIN'] },
      { label: 'Audit Logs', to: '/audit', icon: Shield, roles: ['ADMIN', 'MANAGEMENT'] },
    ],
  },
];

function NavItemComp({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.to && location.pathname.startsWith(c.to));
    }
    return false;
  });

  if (item.roles && user && !item.roles.includes(user.role)) return null;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white/10 hover:text-white transition-colors"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {open && (
          <div className="mt-0.5 ml-3 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavItemComp key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to!}
      end={item.to === '/'}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-white/15 text-white'
          : 'text-gray-400 hover:bg-white/10 hover:text-white'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-brand-900 flex flex-col z-30">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="text-white font-bold text-lg leading-tight">CHIRAB</div>
        <div className="text-brand-300 text-xs mt-0.5">Sales Offer Management</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => (
          <NavItemComp key={item.label} item={item} />
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-brand-400 truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="text-brand-400 hover:text-white transition-colors p-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
