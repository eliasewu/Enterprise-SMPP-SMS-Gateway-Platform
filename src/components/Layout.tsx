import { useState } from 'react';
import {
  LayoutDashboard, Users, Building2, DollarSign, FileText,
  Settings, LogOut, ChevronLeft, ChevronRight, MessageSquare,
  CreditCard, Zap, Menu, X, Radio, Globe, BarChart3, Receipt, ScrollText, Smartphone
} from 'lucide-react';
import type { User } from '../types';

export type Page =
  | 'dashboard'
  | 'suppliers'
  | 'clients'
  | 'supplier-rates'
  | 'client-rates'
  | 'supplier-billing'
  | 'client-billing'
  | 'payments'
  | 'force-dlr'
  | 'sms-logs'
  | 'channels'
  | 'countries'
  | 'invoices'
  | 'reports'
  | 'test-sms'
  | 'settings';

interface Props {
  user: User;
  currentPage: Page;
  onPageChange: (page: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: { page: Page; label: string; icon: React.ElementType; group?: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'suppliers', label: 'Suppliers', icon: Building2, group: 'Management' },
  { page: 'clients', label: 'Clients', icon: Users, group: 'Management' },
  { page: 'channels', label: 'Channels (SMPP/HTTP)', icon: Radio, group: 'Management' },
  { page: 'supplier-rates', label: 'Supplier Rates', icon: DollarSign, group: 'Rates' },
  { page: 'client-rates', label: 'Client Rates', icon: DollarSign, group: 'Rates' },
  { page: 'countries', label: 'MCC/MNC & Prefix', icon: Globe, group: 'Rates' },
  { page: 'supplier-billing', label: 'Supplier Billing', icon: FileText, group: 'Billing' },
  { page: 'client-billing', label: 'Client Billing', icon: FileText, group: 'Billing' },
  { page: 'invoices', label: 'Invoices', icon: Receipt, group: 'Billing' },
  { page: 'sms-logs', label: 'SMS Logs', icon: ScrollText, group: 'Logs & Reports' },
  { page: 'reports', label: 'Reports', icon: BarChart3, group: 'Logs & Reports' },
  { page: 'test-sms', label: 'Test SMS/OTP', icon: Smartphone, group: 'Testing' },
  { page: 'payments', label: 'Payments', icon: CreditCard, group: 'Finance' },
  { page: 'force-dlr', label: 'Force DLR', icon: Zap, group: 'Config' },
  { page: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ user, currentPage, onPageChange, onLogout, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  let lastGroup = '';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static z-50 h-full flex flex-col bg-slate-900 text-white transition-all duration-300
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Enterprise SMS</h2>
                <p className="text-[10px] text-slate-400">Billing System</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const showGroup = !collapsed && item.group && item.group !== lastGroup;
            if (item.group) lastGroup = item.group;
            const Icon = item.icon;
            const active = currentPage === item.page;
            return (
              <div key={item.page}>
                {showGroup && (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-4 mb-1 px-3">
                    {item.group}
                  </p>
                )}
                <button
                  onClick={() => { onPageChange(item.page); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-700/50">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-bold shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 capitalize">
            {currentPage.replace(/-/g, ' ')}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
