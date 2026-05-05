import { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import type { Page } from './components/Layout';
import type { User } from './types';
import { getCurrentUser, logout as dbLogout } from './store/database';

import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import Clients from './pages/Clients';
import SupplierRates from './pages/SupplierRates';
import ClientRates from './pages/ClientRates';
import SupplierBilling from './pages/SupplierBilling';
import ClientBilling from './pages/ClientBilling';
import Payments from './pages/Payments';
import ForceDlr from './pages/ForceDlr';
import SmsLogs from './pages/SmsLogs';
import Channels from './pages/Channels';
import Countries from './pages/Countries';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import TestSms from './pages/TestSms';
import Settings from './pages/Settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => setUser(u);

  const handleLogout = () => {
    dbLogout();
    setUser(null);
    setPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'suppliers': return <Suppliers />;
      case 'clients': return <Clients />;
      case 'supplier-rates': return <SupplierRates />;
      case 'client-rates': return <ClientRates />;
      case 'supplier-billing': return <SupplierBilling />;
      case 'client-billing': return <ClientBilling />;
      case 'payments': return <Payments />;
      case 'force-dlr': return <ForceDlr />;
      case 'sms-logs': return <SmsLogs />;
      case 'channels': return <Channels />;
      case 'countries': return <Countries />;
      case 'invoices': return <Invoices />;
      case 'reports': return <Reports />;
      case 'test-sms': return <TestSms />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout user={user} currentPage={page} onPageChange={setPage} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
}
