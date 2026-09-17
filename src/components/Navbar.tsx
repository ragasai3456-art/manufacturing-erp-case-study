import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Factory,
  FileSpreadsheet,
  FileCheck2,
  PackageCheck,
  Boxes,
  LogOut,
  Shield,
  Briefcase,
} from 'lucide-react';

interface NavbarProps {
  currentScreen: 'enquiries' | 'quotations' | 'sales-orders' | 'inventory';
  onSelectScreen: (screen: 'enquiries' | 'quotations' | 'sales-orders' | 'inventory') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentScreen, onSelectScreen }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg border ${
                isAdmin
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                  : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-base tracking-tight">MANUFACTURING ERP</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider border ${
                    isAdmin
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  {isAdmin ? 'ADMIN' : 'SALES'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex space-x-1">
            <button
              id="nav-enquiries"
              onClick={() => onSelectScreen('enquiries')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentScreen === 'enquiries'
                  ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Enquiries</span>
            </button>

            <button
              id="nav-quotations"
              onClick={() => onSelectScreen('quotations')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentScreen === 'quotations'
                  ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Quotations</span>
            </button>

            <button
              id="nav-sales-orders"
              onClick={() => onSelectScreen('sales-orders')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentScreen === 'sales-orders'
                  ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Sales Orders</span>
            </button>

            {/* Inventory Navigation: ADMIN ONLY */}
            {isAdmin && (
              <button
                id="nav-inventory"
                onClick={() => onSelectScreen('inventory')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentScreen === 'inventory'
                    ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory</span>
              </button>
            )}
          </nav>

          {/* Read-Only Role Badge, User Info & Logout */}
          <div className="flex items-center space-x-3">
            {/* Read-Only Role Badge */}
            <div
              id="user-role-badge"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider shadow-xs ${
                isAdmin
                  ? 'bg-purple-950/90 text-purple-200 border border-purple-500/60'
                  : 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/60'
              }`}
              title={`Authenticated role: ${user.role}`}
            >
              {isAdmin ? <Shield className="w-4 h-4 text-purple-400" /> : <Briefcase className="w-4 h-4 text-emerald-400" />}
              <span>{user.role}</span>
            </div>

            {/* User details */}
            <div className="text-right hidden md:block">
              <div className="text-xs font-medium text-slate-200">{user.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
            </div>

            {/* Logout button */}
            <button
              id="btn-logout"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
