import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Smartphone,
  UserCheck,
  Boxes,
  Truck,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Bell,
  Settings,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Repairs', path: '/repairs', icon: Wrench },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Devices', path: '/devices', icon: Smartphone },
  { name: 'Technicians', path: '/technicians', icon: UserCheck, roles: ['SUPER_ADMIN', 'SHOP_OWNER'] },
  { name: 'Inventory', path: '/inventory', icon: Boxes },
  { name: 'Suppliers', path: '/suppliers', icon: Truck },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Warranties', path: '/warranties', icon: ShieldCheck },
  { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'SHOP_OWNER'] },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'SHOP_OWNER'] },
];

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                FixFlow
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {user?.business?.name || 'Smart Repair Platform'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & Logout footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-700 text-white font-semibold flex items-center justify-center text-xs flex-shrink-0">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || user?.email}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate uppercase">{user?.role_display || user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
