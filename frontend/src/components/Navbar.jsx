import React from 'react';
import { Menu, Search, Bell, Building2, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navbar = ({ setMobileOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200/80 shadow-sm sm:px-6 lg:px-8">
      {/* Mobile toggle & Search */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden sm:block w-72 md:w-96">
          <Search className="absolute w-4 h-4 text-slate-400 left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets, customers, IMEI, SKU..."
            className="w-full py-1.5 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition"
          />
        </div>
      </div>

      {/* Top right actions */}
      <div className="flex items-center space-x-3">
        {/* Business Badge */}
        {user?.business && (
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[160px]">{user.business.name}</span>
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Pill */}
        <div className="flex items-center pl-2 space-x-2 border-l border-slate-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200">
            {user?.first_name ? user.first_name[0] : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-none">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{user?.role_display}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
