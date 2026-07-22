import React, { useState, useEffect } from 'react';
import {
  getAuthToken,
  getCurrentUser,
  fetchMe,
  logout,
  ROLES,
} from './api';
import LoginPage from './pages/LoginPage';
import PaymentsPage from './pages/PaymentsPage';
import BusinessContactsPage from './pages/BusinessContactsPage';
import MachinesPage from './pages/MachinesPage';
import MachineryContactsPage from './pages/MachineryContactsPage';
import CommercialPaymentsPage from './pages/CommercialPaymentsPage';
import MachineryPaymentsPage from './pages/MachineryPaymentsPage';
import SalaryPaymentsPage from './pages/SalaryPaymentsPage';
import PersonnelContactsPage from './pages/PersonnelContactsPage';
import PermissionSerialsPage from './pages/PermissionSerialsPage';
import ExcelOperationsPage from './pages/ExcelOperationsPage';
import UsersPage from './pages/UsersPage';

const TABS = [
  { id: 'payments', label: 'پرداخت‌ها', icon: '💰' },
  { id: 'excel', label: 'Excel', icon: '📊' },
  { id: 'permission-serials', label: 'مجوز پرداخت', icon: '🔐' },
  { id: 'commercial-payments', label: 'پرداخت‌های تجاری', icon: '🛒' },
  { id: 'machinery-payments', label: 'پرداخت ماشین‌آلات', icon: '🚧' },
  { id: 'salary-payments', label: 'پرداخت حقوق', icon: '💼' },
  { id: 'business', label: 'مخاطبین تجاری', icon: '🏢' },
  { id: 'personnel', label: 'مخاطبین پرسنل', icon: '👤' },
  { id: 'machines', label: 'ماشین‌ها', icon: '🚜' },
  { id: 'machinery', label: 'مخاطبین ماشین‌آلات', icon: '👷' },
  { id: 'users', label: 'کاربران', icon: '👥', adminOnly: true },
];

function App() {
  const [authenticated, setAuthenticated] = useState(Boolean(getAuthToken()));
  const [user, setUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState('payments');
  const [booting, setBooting] = useState(Boolean(getAuthToken()));

  const refreshSession = async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    if (getAuthToken()) {
      refreshSession();
    } else {
      setBooting(false);
    }

    const onLogout = () => {
      setAuthenticated(false);
      setUser(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const handleLoginSuccess = async () => {
    await refreshSession();
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <p className="text-slate-500">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || user?.role === 'admin');

  const renderPage = () => {
    switch (activeTab) {
      case 'payments':
        return <PaymentsPage />;
      case 'excel':
        return <ExcelOperationsPage />;
      case 'permission-serials':
        return <PermissionSerialsPage />;
      case 'commercial-payments':
        return <CommercialPaymentsPage />;
      case 'machinery-payments':
        return <MachineryPaymentsPage />;
      case 'salary-payments':
        return <SalaryPaymentsPage />;
      case 'business':
        return <BusinessContactsPage />;
      case 'personnel':
        return <PersonnelContactsPage />;
      case 'machines':
        return <MachinesPage />;
      case 'machinery':
        return <MachineryContactsPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <PaymentsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-right" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-black text-slate-800 border-r-4 border-blue-600 pr-3">
              مدیریت مالی
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                <span className="font-bold">{user?.name}</span>
                <span className="text-slate-400 mx-2">|</span>
                <span>{ROLES[user?.role]?.label || user?.role}</span>
              </div>
              <button type="button" onClick={handleLogout}
                className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold">
                خروج
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 mt-6">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <main>{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
